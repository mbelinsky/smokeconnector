var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);


app.use(express.bodyParser());


var primaryNumber = "+13476819080";//"+13474669327";//
var secondaryNumber = "0";
var twilioNumber = '+13473346102';
var mode='Testing';

var client = require('twilio')('AC04996bfe824e324bc0740bc4eecec3b9', 'aa50d305cde9ce2cca2be786538f7f51');
//var phone = client.getPhoneNumber(twilioNumber);
var voiceMsg = 'Your smoke alarm has been set off. Notifications will be sent out to your selected contacts. Press 7 to cancel this alarm. Press 3 if you are not sure.';

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs'); 
app.set('view options', {
    layout: false
});

app.post('/alert',function(request, responseHttp){
/*	if(request.body.eventTime){
	data.primaryNumber=request.body.eventTime;
	data.sunlight=request.body.connectionTime;
	data.water=request.body.alarmType;};
*/	
	console.log("Smoke detected!!!");
	console.log(request.body);
	io.sockets.emit('detected', { 'timeReceived':request.body.eventTime, "connectionTime":request.body.connectionTime ,"alarmType":request.body.alarmType });
	
/*	
	client.calls.create({
	    url: "http://demo.twilio.com/docs/voice.xml",
	    to: primaryNumber,
	    from: twilioNumber
	}, function(err, call) {
	    console.log(call.sid);
	});
	
*/	
	
	client.sendSms({
	    to:primaryNumber, 
	    from: twilioNumber, 
	    body: 'Justin pressed the button at '+request.body.eventTime+'ms. There was a '+request.body.connectionTime+'ms connection time. The alarm type is: '+request.body.alarmType+'. Have a good day'
		}, function(err, responseData) { //this function is executed when a response is received from Twilio
		    if (!err) { // "err" is an error received during the request, if any
		        console.log(responseData.from);
				io.sockets.emit('notified', { 'from':responseData.from,'to':responseData.to}); //request.body.eventTime, "connectionTime":request.body.connectionTime ,"alarmType":request.body.alarmType });
				}
	});

	
//	console.log('Occured at:'+ request.body.eventTime + 'ms  Connection time:' + request.body.connectionTime + 'ms  ');
	responseHttp.send(undefined);// echo the result back});
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

server.listen(3000);