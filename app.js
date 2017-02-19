var twilio = require('twilio');
var twilioClient = new twilio.RestClient('AC6999b0dc0b56d874b843de86885e2c02', '811be44e4b1725676dc4af6633528bf6');

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer'); 
var _ = require('underscore');
var request = require('request');
var request_promise = require('request-promise');
var moment = require('moment');
var fs = require('fs');
var session = require('express-session');
var jwt = require('jwt-simple');
var validator = require('express-validator');
var http = require('http');
var https = require('https');
var url = require('url') ;
var cloudinary = require('cloudinary');
var NodeGeocoder = require('node-geocoder');

var app = express();

var ParseServer = require('parse-server').ParseServer;
var config = require('./config');

app.use('/parse', new ParseServer(config.server));

Parse.initialize(config.server.appId, config.server.masterKey, config.server.masterKey);
Parse.serverURL = config.server.serverURL;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));

var secret = "u4xAS3kcVaD0&9c@1NVcsr^3"; // for JWT

var sessionOptions = {
	name: "ionicapp",
	secret: "u4xAS3kcVaD0&9c@1NVcsr^3",
    saveUninitialized: false,
	// rolling: true, // reset timer every time a new request is made
	resave: true,
	// cookie: {maxAge: 1800000} // 30 minutes
	cookie: {maxAge: null, httpOnly: true, secure: 'auto'} // cookie expires when browser is closed
};

cloudinary.config({
	cloud_name: 'ionicapp',
    api_key: '212497456353176',
    api_secret: 'Vl3Is-OGMbS0pT5pOmPnGbjw7uA'
});

app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(multer());

app.use(validator({
	customValidators: {
		isValidName: function(param) {
			return (/[a-zA-Z](?:[a-zA-Z ]*[a-zA-Z])?$/g).test(param);
		},
		isValidDate: function(param) {
			if(param)
				return moment(decodeURIComponent(param), moment.ISO_8601).isValid();
			return true;
		},
		isMobileNumber: function(param) {
            return (/^[0-9+]+$/).test(param);
        },
        isToken: function(param) {
            return (/^[0-9]{4}$/g).test(param);
        },
        isStrongPassword: function(param) {
            return (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*([!-/:-@\[-`{-~])).{6,}$/g).test(param);
        },
        isEqual: function(param, param1) {
            return param == param1;
        }
	}
}));

var options = {
	provider: 'google',
	country: 'Singapore',

	// Optional depending on the providers 
	httpAdapter: 'https', // Default 
	apiKey: 'AIzaSyDjsCLbL-bkC4cFeLYIfR-a3tbN_vF7XqU', // for Mapquest, OpenCage, Google Premier 
	formatter: null         // 'gpx', 'string', ... 
};

var geocoder = NodeGeocoder(options);

app.use(session(sessionOptions));

var sess;

/*app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'accept, content-type, x-parse-application-id, x-parse-rest-api-key, x-parse-session-token');
     // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
});*/

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
	if (req.method === 'OPTIONS') {
		res.end();
	} else {
		next();
	}
});

app.get('/', function(req, res) {
    res.send('Hello! Ionic Node Server');
});

app.post('/login', function(req, res) {

	var email = req.body.email || "",
		password = req.body.password || "",
		guser;

	Parse.User.logIn(email, password).then(function(user) {

		guser = user;
		var sessionToken = user.getSessionToken();

		sess = req.session,
			sess.user = user,
			sess.userId = user.id,
			sess.sessionToken = sessionToken;

		res.send({code: 200, message: "Success", token: sessionToken, userId: sess.userId});

	}, function(error) {
		console.log(error);
		res.send({code: 404, message: "Failure"});
	});
});

app.post('/logout', function(req, res) {

	sess = req.session;
	
	// sessionToken = sess.sessionToken;

	sessionToken = req.body.sessiontoken;

	sess.sessionToken = sessionToken;

	sess.destroy(function(err) {
		if(err) {
			console.log(err);
		}
		else {
			Parse.User.enableUnsafeCurrentUser();
			Parse.User.become(sessionToken).then(function (user) {
				Parse.User.logOut();
				res.send({code: 200, message: "Success"});
			}, function (error) {
				console.log(error);
				res.send({code: 404, message: "Failure"});
			});
		}
	});
});

app.post('/signup', function(req, res) {

	/*req.checkBody("name", "Enter a valid name.").isName();
	req.checkBody("email", "Enter a valid email").isEmail();
    req.checkBody("mobilenumber", "Enter a valid mobile number.").isMobileNumber();
    req.checkBody("password1", "Enter a valid password.").isStrongPassword();
    // req.checkBody("password2", "Passwords don't match.").isEqual(req.body.password1);

    var errors = req.validationErrors();

    console.log(errors);

    if(errors && typeof errors != 'false' && errors != 'false') {
        res.send({code: 404, message: "Failure"});
    }
    else {*/

    	var email = req.body.email,
            mobilenumber = req.body.mobilenumber,
            password = req.body.password,
            // password2 = req.body.password2,
            name = req.body.name;

        checkPhoneNumberAlreadyExists(mobilenumber).then(function(user) {
            if(user) {
                return Parse.Promise.error({code: 404, message: "This phone number is already in use"});
            }
            else {
                return;
            }
        }).then(function() {

        	var userObj = new Parse.User();

            userObj.set("username", email);
            userObj.set("email", email);
            userObj.set("phoneNumber", mobilenumber);
            userObj.set("name", name);
            userObj.set("password", password);
            return userObj.signUp();
        }).then(function(userObj) {
        	if(!userObj) {
                return Parse.Promise.error({code: 404, message: "Failure"});
            }
            else {

            	return createItems(userObj, 3, 'chicken');  
            }
        }).then(function(items) {
        	res.send({code: 200, message: "Success"});
        }, function(error) {
            console.log(error);
            res.send(error);
        });
    // }
});

app.post('/getYourItems', function(req, res) {

	var userId = req.body.userid,
		itemList = [];

	var Item = Parse.Object.extend("Item");
    var itemQuery  = new Parse.Query(Item);
    itemQuery.include("owner");
    itemQuery.equalTo("owner", {
		__type: "Pointer",
		className: "_User",
		objectId: userId
	});
	itemQuery.find().then(function(items) {

		var promise = Parse.Promise.as();

		_.each(items, function(item) {
			promise = promise.then(function() {
				itemList.push({id: item.id, name: item.get('name'), expirydate: formatDate(item.get('expiryDate')), consumed: item.get('consumed')});
			});
		});
		return promise;
	}).then(function() {
		console.log(itemList);
		res.send(itemList);
	}, function(error) {
		console.log(error);
		res.send({code: 404, message: error.message});
	})
});

app.post('/consumeYourItem', function(req, res) {

	var userId = req.body.userid,
		itemId = req.body.itemid;

	var Item = Parse.Object.extend("Item");
    var itemQuery  = new Parse.Query(Item);
    itemQuery.get(itemId).then(function(item) {
    	item.set("consumed", true);
    	return item.save();
    }).then(function(item) {
    	res.send({code: 200, message: "Success"});
    }, function(error) {
    	console.log(error);
    	res.send({code: 404, message: "Failure"});
    });
});

app.post('/addYourItem', function(req, res) {

	var userId = req.body.userid,
		itemValue = req.body.itemvalue;

	if(itemValue === "apple")
			value = 7;
		else if(itemValue === "banana")
			value = 2;
		else if(itemValue === "bread")
			value = 3;
		else if(itemValue === "chicken")
			value = 4;
		else if(itemValue === "grapes")
			value = 3;
		else if(itemValue === "tofu")
			value = 3;

	var currentDate = new Date();
	var nextDate = new Date(currentDate);
	nextDate.setDate(nextDate.getDate() + value);

	var User = Parse.Object.extend("User");
	var userObj = new User();
	userObj.id = userId;

	createItems(userObj, value, itemValue).then(function(item) {
    	res.send({id: item.id, name: item.get('name'), expirydate: formatDate(item.get('expiryDate')), consumed: item.get('consumed')});
    }, function(error) {
    	console.log(error);
    	res.send({code: 404, message: "Failure"});
    });
});

app.post('/shareYourItem', function(req, res) {

	var userId = req.body.userid,
		itemId = req.body.itemid
		address = req.body.address;

	var User = Parse.Object.extend("User");
	var userObj = new User();
	userObj.id = userId;

	var Item = Parse.Object.extend("Item");
	var itemObj = new Item();
	itemObj.id = itemId;

	geocoder.geocode(address).then(function(res) {

		var AvailableItem = Parse.Object.extend("AvailableItem");
	    var availItemObj  = new AvailableItem();
		availItemObj.set("item", itemObj);
		availItemObj.set("owner", userObj);
		availItemObj.set("availability", true);
		availItemObj.set("location",  new Parse.GeoPoint({latitude: res[0].latitude, longitude: res[0].longitude}));
		return availItemObj.save();
	}).then(function(availItemObj) {
    	console.log(availItemObj);
    	res.send({code: 200, message: "Success"});
    }, function(error) {
    	console.log(error);
    	res.send({code: 404, message: "Failure"});
    });
});

app.post('/getAvailableItems', function(req, res) {

	var userId = req.body.userid,
		itemList = [];

	var AvailableItem = Parse.Object.extend("AvailableItem");
    var availItemQuery  = new Parse.Query(AvailableItem);
    availItemQuery.include("owner");
    availItemQuery.include("item");
    availItemQuery.equalTo("availability", true);
	availItemQuery.find().then(function(items) {

		var promise = Parse.Promise.as();

		_.each(items, function(item) {
			promise = promise.then(function() {

				if(item.get('owner').id !== userId)
					itemList.push({id: item.id, name: item.get('item').get('name'), expirydate: formatDate(item.get('item').get('expiryDate')), interested: (item.get('interestedUser')  && item.get('interestedUser').id) === userId, location: item.get('location')});
			});
		});
		return promise;
	}).then(function() {
		console.log(itemList);
		res.send(itemList);
	}, function(error) {
		console.log(error);
		res.send({code: 404, message: error.message});
	})
});

var createItems = function(userObj, value, itemValue, res) {

	var promise = new Parse.Promise();

	var currentDate = new Date();
	var nextDate = new Date(currentDate);
	nextDate.setDate(nextDate.getDate() + value);

	var Item = Parse.Object.extend("Item");
	var itemObj = new Item();
	itemObj.set("name", itemValue.capitalise());
	itemObj.set("owner", userObj);
	itemObj.set("expiryDate", nextDate);
	itemObj.set("consumed", false);
	itemObj.save().then(function(itemObj) {
		console.log(itemObj);
		if(!itemObj) {
			console.log("Failure");
            var error = {code: 404, message: "Failure"};
            if (res) res.error(error);
            promise.reject(error);
        }
        else {
        	console.log("Success");
            if (res) res.success(itemObj);
            promise.resolve(itemObj);
        }
	});
	return promise;

};

var checkPhoneNumberAlreadyExists = function(phoneNumber) {

    // Parse.Cloud.useMasterKey();

    var User = Parse.Object.extend("User");
    var query  = new Parse.Query(User);
    query.equalTo("phoneNumber", phoneNumber);
    return query.first().then(function(user) {
        if(user) {
            return Parse.Promise.as(user);
        }
        else {
            return Parse.Promise.as(undefined);
        }
    }, function(error) {
        return Parse.Promise.as(undefined);
    });
};

var createACL = function(userObj, read, write, res) {

    var promise = new Parse.Promise();

    var acl = new Parse.ACL();
    acl.setReadAccess(userObj, read);
    acl.setWriteAccess(userObj, write);
    if (res) res.success(acl);
        promise.resolve(acl);
    return promise;
};

var assignACL = function(userObj, acl, res) {

    var promise = new Parse.Promise();

    Parse.Cloud.useMasterKey();

    userObj.set("ACL", acl);
    userObj.save().then(function(userObj) {
        if (res) res.success(userObj);
        promise.resolve(userObj);
    }, function(error) {
        if (res) res.error(error);
        promise.reject(error);
    });

    return promise;
};

var publicDataObj = function(userObj, hubObj, res) {

    var promise = new Parse.Promise();

    var roleName = "friendsOf_" + userObj.id;
    var friendRole = new Parse.Role(roleName, new Parse.ACL(userObj));
    friendRole.save().then(function(friendRole) {
        var acl = new Parse.ACL();
        acl.setReadAccess(friendRole, true);
        acl.setReadAccess(userObj, true);
        acl.setWriteAccess(userObj, true);
        var friendData = new Parse.Object("FriendData", {
            user: userObj,
            ACL: acl,
            name: userObj.get('name'),
            phoneNumber: userObj.get('phoneNumber'),
            email: userObj.get('email'),
            address: userObj.get('address'),
            profilePicture: userObj.get('profilePicture'),
            dateOfBirth: userObj.get('dateOfBirth'),
            hub: hubObj
        });
        return friendData.save();
    }).then(function(friendData) {
        if (res) res.success(friendData);
        promise.resolve(friendData);
    }, function(error) {
        if (res) res.error(error);
        promise.reject(error);
    });

    return promise;
};

String.prototype.capitalise = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function formatDate(date) {
	return moment(date).format("Do MMMM YYYY");
};

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Page Not Found');
	err.status = 404;
	next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		console.log(err);
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

module.exports = app;