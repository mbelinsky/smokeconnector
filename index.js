var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);


app.use(express.bodyParser());
var accsid='ACeac2f16de43f1d54afc199dc5f7ae200';
var authtoken='8d7f041fe6dd708664d01d472a2ed904';


var port = process.env.PORT || 80;

var primaryNumber = "+13476819080";//"+13474669327";//
var secondaryNumber = "0";
var twilioNumber = '+14074776653';
var mode='Testing';

var serverName='';

var phoneNumbers=[];

//var twilio = require('twilio');
//var client = new twilio.RestClient('twilio')('ACeac2f16de43f1d54afc199dc5f7ae200', '8d7f041fe6dd708664d01d472a2ed904');

var client = require('twilio')('ACeac2f16de43f1d54afc199dc5f7ae200', '8d7f041fe6dd708664d01d472a2ed904');


var voiceMsg = 'Your smoke alarm has been set off. Notifications will be sent out to your selected contacts. Press 7 to cancel this alarm. Press 3 if you are not sure.';

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs'); 
app.set('view options', {
    layout: false
});


app.post('/call', function(req, res) {
    //Validate that this request really came from Twilio...
//	console.log(req.body);
	io.sockets.emit('newnumber',{'number':req.body });
	phoneNumbers.push(req.body.From);
        res.type('text/xml');
        res.send('');
});



app.get('/test',function(request, responseHttp){

	phoneNumbers.forEach(function(thisNumber)
	{
		console.log(thisNumber);
		client.sendSms({
	    to:thisNumber, 
	    from: twilioNumber, 
	    body: 'A fire alarm was detected at'
		}, function(err, responseData) { //this function is executed when a response is received from Twilio
		    if (!err) { // "err" is an error received during the request, if any
		        console.log(responseData.from);
				io.sockets.emit('notified', { 'from':responseData.from,'to':responseData.to}); //request.body.eventTime, "connectionTime":request.body.connectionTime ,"alarmType":request.body.alarmType });
				}
			});
		});
responseHttp.send('Hey!');// echo

});


app.get('/alert',function(request, responseHttp){
/*	if(request.body.eventTime){
	data.primaryNumber=request.body.eventTime;
	data.sunlight=request.body.connectionTime;
	data.water=request.body.alarmType;};
*/	
	
	console.log(request.body);
	io.sockets.emit('detected', { 'timeReceived':23162});
	
/*	
	client.calls.create({
	    url: "http://demo.twilio.com/docs/voice.xml",
	    to: primaryNumber,
	    from: twilioNumber
	}, function(err, call) {
	    console.log(call.sid);
	});
	
*/	
	
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
					io.sockets.emit('notified', { 'from':responseData.from,'to':responseData.to}); //request.body.eventTime, "connectionTime":request.body.connectionTime ,"alarmType":request.body.alarmType });
					}
		});
	
	});

	
//	console.log('Occured at:'+ request.body.eventTime + 'ms  Connection time:' + request.body.connectionTime + 'ms  ');
	responseHttp.send(primaryNumber);// echo the result back});
});


app.post("/configure",function(req, res){
  console.log(req.url);
  res.send(undefined); //make sure connection is closed by sending response - irrelevant
});



app.get('/', function(req, res){
	console.log(req.url);
	res.render('dash', {
	    number1 : primaryNumber,
		number2 : secondaryNumber,
		mode : mode
	});
});

server.listen(port, function() {
  console.log("Listening on " + port);
});


