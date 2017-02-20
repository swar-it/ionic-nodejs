var moment = require('moment');
var request = require('request');
var _ = require('underscore');
var ParseServer = require('parse-server').ParseServer;
var twilio = require('twilio');

var twilioClient = new twilio.RestClient('AC6999b0dc0b56d874b843de86885e2c02', '811be44e4b1725676dc4af6633528bf6');

var config = {};
config.server = {
	appId: '84f20369-f89a-42fa-a2a7-1ffa2933c4f8',
	databaseURI: 'mongodb://ionicparseserverdb-parse:cy3GiYWZLzyQavSkVTGGYWppYKW5Gxcicv0JdGhDLfOi1KG4tCq9sIx83Bdx5nwAvh3o0bOA0SInTco2NYmgHQ==@ionicparseserverdb-parse.documents.azure.com:10250/parse?ssl=true', // Connection string for your MongoDB database
	masterKey: '2f4b4404-89e3-4074-b13b-a1830af890d0',
	serverURL: 'https://ionicparseserver.azurewebsites.net/parse'};

Parse.initialize(config.server.appId, config.server.masterKey, config.server.masterKey);
Parse.serverURL = config.server.serverURL;


var currentDate = moment(),
	currentHour = currentDate.hour(),
	currentMin = currentDate.minute(),
	your_msg = "",
	receiver,
	promises = [];

var currentTS = new Date().toISOString();

var query = new Parse.Query("Item");
query.include('owner');
query.limit(1000);
query.find().then(function(itemobjs) {

	var promise = Parse.Promise.as();

	_.each(itemobjs, function(item) {

		promise = promise.then(function() {

			var expiryDate = moment(item.get('expiryDate'),"YYYY-MM-DDTHH:mm:ss Z");
			var expiryDateTS = item.get('expiryDate');
			var expiryHour = expiryDate.hour();
			var expiryMin = expiryDate.minute();

			if(!isNaN(expiryDate) && !isNaN(expiryMin) && !item.get("consumed")) {

				var hours = moment(expiryDateTS, 'DD/MM/YYYY').diff(currentTS, 'hours');
				
				receiver = item.get('owner');
				itemname = item.get('name');

				if(hours < 72 && hours >= 48)
					your_msg = 'Your '  + itemname + ' will expire in less than 3 days';
				else if(hours < 48 && hours >= 24 )
					your_msg = 'Your '  + itemname + ' will expire in less than 2 days';
				else
					your_msg = 'Your '  + itemname + ' are expiring tomorrow';

				if(hours < 72 && (currentDate.month() == expiryDate.month()) && (currentDate.year() == expiryDate.year())) {

					/*console.log(moment(expiryDateTS, 'DD/MM/YYYY'));
					console.log(currentTS);

					console.log(item.get('owner').get('name') + '\'s ' + item.get('name') + ' expiring in ' +  hours + ' hours');*/

					var mobilenumber = receiver.get('phoneNumber');

					if(mobilenumber === '+6598060481') {
						return sendSMS(mobilenumber, your_msg);
						// return;
					}
				}
			}
		}).then(function () {
			return;
		});
		promises.push(promise);
	});
	return Parse.Promise.when(promises);
}).then(function() {
	res.send("Success");
}, function(error) {
	console.log(error);
	res.status(404).send("Failure");
});

var sendSMS = function (phoneNumber, message, res) {

    var promise = new Parse.Promise();

    if(phoneNumber) {

        twilioClient.messages.create({
            to: phoneNumber,
            from:'+1 818-946-0853',
            body: message
        }).then(function(message) {
            if (res) res.success(message);
            promise.resolve(message);
        }, function(error) {
            if (res) res.error(error);
            promise.reject(error);
        });
        return promise;
    }
};