var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

var port = process.env.PORT || 80;
var host = 'http://smokeconnector.nodejitsu.com';


app.configure('development', function(){
	port = 3000;
	host='http://localhost';
	console.log('development');
});



var justinNumber = "+13476819080";
var markNumber = "+13474669327";
var twilioNumber = '+14074776653';


var phoneNumbers=[justinNumber];

//var twilio = require('twilio');
//var client = new twilio.RestClient('twilio')('ACeac2f16de43f1d54afc199dc5f7ae200', '8d7f041fe6dd708664d01d472a2ed904');

var client = require('twilio')('ACeac2f16de43f1d54afc199dc5f7ae200', '8d7f041fe6dd708664d01d472a2ed904');

var voiceMsg = 'Your smoke alarm has been set off. Notifications will be sent out to your selected contacts. Press 7 to cancel this alarm. Press 3 if you are not sure.';


app.set('view engine', 'ejs'); 
app.set('view options', {
    layout: false
});


app.post('/call', function(req, res) {
    //Validate that this request really came from Twilio...
//	console.log(req.body);
	io.sockets.emit('newNumber',{'number':req.body });
	phoneNumbers.push(req.body.From);
        res.type('text/xml');
        res.send('');
});





app.get('/alert',function(request, responseHttp){

	console.log(request.body);
	io.sockets.emit('alert', { 'timeReceived':23162});
	
	
	phoneNumbers.forEach(function(thisNumber)
	{
		console.log(thisNumber);
		client.sendSms({
		    to:thisNumber, 
		    from: twilioNumber, 
		    body: 'Air quality alert detected at New Work City venue monitoring node at time 24129ms'
			}, function(err, responseData) { //this function is executed when a response is received from Twilio
			    if (!err) { // "err" is an error received during the request, if any
			        console.log(responseData.from);
					io.sockets.emit('messageSent', { 'from':responseData.from,'to':responseData.to}); //request.body.eventTime, "connectionTime":request.body.connectionTime ,"alarmType":request.body.alarmType });
					}
		});
	
	});

	
//	console.log('Occured at:'+ request.body.eventTime + 'ms  Connection time:' + request.body.connectionTime + 'ms  ');
	responseHttp.send('Subscribers: '+phoneNumbers.length);// echo the result back});
});





app.get('/', function(req, res){
	console.log(req.url);
	res.render('dash', {
		server : host+':'+port
	});
});

server.listen(port, function() {
  console.log("Listening on " + port);
});


