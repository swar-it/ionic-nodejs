var twilio = require('twilio');
var twilioClient = new twilio.RestClient('AC6999b0dc0b56d874b843de86885e2c02', '811be44e4b1725676dc4af6633528bf6');

var express = require('express');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer'); 
var request = require('request');
var request_promise = require('request-promise');
var moment = require('moment');
var fs = require('fs');
var session = require('express-session');
var validator = require('express-validator');
var http = require('http');
var https = require('https');
var url = require('url') ;
var cloudinary = require('cloudinary');
var app = express();

var ParseServer = require('parse-server').ParseServer;
var config = require('./config');

app.use('/parse', new ParseServer(config.server));

Parse.initialize(config.server.appId, config.server.masterKey, config.server.masterKey);
Parse.serverURL = config.server.serverURL;

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

app.use('/public', express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(multer());

app.use(validator({
	customValidators: {
		isValidFileType: function(param, type1, type2) {
			return param.mimetype == type1 || param.mimetype == type2;
		},
		isValidFileSize: function(param, num) {
			return param.size < num;
		},
		isValidName: function(param) {
			return (/[a-zA-Z](?:[a-zA-Z ]*[a-zA-Z])?$/g).test(param);
		},
		isValidAddress: function(param) {
			// return (/^[a-zA-Z0-9\\-_+#,\n. -]+$/).test(param);
			return (/^[a-zA-Z0-9\\\-_+#,. ]+$/).test(param);
		},
		isValidId: function(param) {
			return (/^[a-zA-Z0-9]+$/g).test(param);
		},
		isValidShId: function(param) {
			return (/^[a-zA-Z0-9-]+$/g).test(param);
		},
		isValidDate: function(param) {
			if(param)
				return moment(decodeURIComponent(param), moment.ISO_8601).isValid();
			return true;
		},
		isValidKeyfobId: function(param) {
			return (/^[a-zA-Z0-9:]+$/g).test(param);
		}
	}
}));

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

app.get('/', function(req, res) {
    res.send('Hello! Ionic Node Server');
});

app.post('/login',function(req, res) {

	var email = req.body.email || "",
		password = req.body.password || "",
		guser;

	sess = req.session;

	Parse.User.logIn(email, password).then(function(user) {

		guser = user;
		var sessionToken = user.getSessionToken();

		sess.sessionToken = sessionToken,

		res.send({code: 200, status: "Success", token: sessionToken});

	}, function(error) {
		console.log(error);
		res.send({code: 404, status: "Failure"});
	});
});

app.post('/logout',function(req,res) {

	sess = req.session;

	sessionToken = sess.sessionToken;

	console.log(sessionToken);

	sess.destroy(function(err) {
		if(err) {
			console.log(err);
		}
		else {
			Parse.User.enableUnsafeCurrentUser();
			Parse.User.become(sessionToken).then(function (user) {
				Parse.User.logOut();
				res.redirect('/login');
			}, function (error) {
				console.log(error);
				res.redirect('/login');
			});
		}
	});
});

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