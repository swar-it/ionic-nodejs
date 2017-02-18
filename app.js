var twilio = require('twilio');
var twilioClient = new twilio.RestClient('AC6999b0dc0b56d874b843de86885e2c02', '811be44e4b1725676dc4af6633528bf6');

var express = require('express');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer'); 
var request = require('request');
var request_promise = require('request-promise');
var moment = require('moment');
var fs = require('fs');
var session = require('express-session');
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

cloudinary.config({
	cloud_name: 'ionicapp',
    api_key: '212497456353176',
    api_secret: 'Vl3Is-OGMbS0pT5pOmPnGbjw7uA'
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(multer());
app.use(require('less-middleware')(path.join(__dirname, 'public')));

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

app.post('/login',function(req, res) {

	var email = req.body.email || "",
		password = req.body.password || "",
		guser;

	Parse.User.logIn(email, password).then(function(user) {

		guser = user;

		var sessionToken = user.getSessionToken();

		res.success("login");

	}, function(error) {
		console.log(error);
		res.error("error");
	});
});