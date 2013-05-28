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

var twilio = require('twilio');
var client= new twilio.RestClient('ACeac2f16de43f1d54afc199dc5f7ae200', '8d7f041fe6dd708664d01d472a2ed904');

var voiceMsg = 'Your smoke alarm has been set off. Notifications will be sent out to your selected contacts. Press 7 to cancel this alarm. Press 3 if you are not sure.';


app.set('view engine', 'ejs'); 
app.set('view options', {
    layout: false
});

//Incoming call
app.post('/call', function(req, res) {
	io.sockets.emit('newNumber',{'obj':req.body });
	phoneNumbers.push(req.body.From);
	
	var resp = new twilio.TwimlResponse();
	resp.play(host+'/final.mp3');
	resp.say({voice:'woman'},'Thank you for calling Airlert, from '+req.body.CallerCity+'. Your number is now added to the subscriber list for air quality alerts.');
	resp.gather({timeout:10,action:host+'/gathered',numDigits:1},function(){
		this.say("Press a number and see it appear Live.")
	});
	res.type('text/xml');
	res.send(resp.toString());
});

//Twiml responses
app.post('/call/new', function(req, res) {
	var resp = new twilio.TwimlResponse();
	
	resp.gather({timeout:60,action:host+'/response/1',numDigits:1},function(){
		this.say({voice:'woman'},'Your smoke connector has gone off in your kitchen. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
		.say({voice:'woman', language:'en-gb'},'Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
		.say({voice:'woman'},'Your smoke connector has gone off in your kitchen. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
	});
	
    resp.gather({timeout:60,action:host+'/gathered',numDigits:1},function(){
		this.say("Press a number and see it appear Live.")
	});
	res.type('text/xml');
	res.send(resp.toString());
	
});

app.post('/call/update', function(req, res) {
	
	
});


app.post('/response/1', function(req, res) {
    //Validate that this request really came from Twilio...
//	console.log(req.body);
	
	var resp = new twilio.TwimlResponse();
	
	resp.gather({timeout:60,action:host+'/response/2',numDigits:1},function(){
		switch(req.body.Digits)
		{
			case 1:
				this.say({voice:'woman'},'Phew! That was a close one. The rest of your household will be notified that this was just a false alarm. To change your response, press 7. Otherwise, tell your housemates what happened with a short recorded message. Leave your message after the tone and press # to send.
				');
				break;
			case 3:
				this.say({voice:'woman'},'Keep calm and stay on the line. The smoke connector has gone off. We\'re contacting your housemates to see what happened and will update you whether it\'s an emergency or false alarm. To change your response, press 7.
				');
				break;
			case 9:
				this.say({voice:'woman'},'Stay calm. We\'re alerting your housemates. Please call 9-1-1 immediately. To change your response, press 7. Otherwise, please hang up and dial 9-1-1.
				');
				break;
		}
	};
	
});

app.post('/response/2', function(req, res) {
	
}








//Incoming SMS incomingsms
app.post('/incomingsms', function(req, res) {
	io.sockets.emit('newmessage',{'obj':req.body });
	var message=req.body.Body;
	if(message.toLowerCase().match('fire')){
		io.sockets.emit('update',{'response': 'yes','number':req.body.From});
	}
	else if(message.toLowerCase().match('false')){
		io.sockets.emit('update',{'response': 'no','number':req.body.From});
	}
	else {
		io.sockets.emit('update',{'response': 'Comment: '+message,'number':req.body.From});
	}
	
	res.send('');
});

app.post('/gathered', function(req, res) {
    //Validate that this request really came from Twilio...
//	console.log(req.body);
	
	var resp = new twilio.TwimlResponse();
	resp.say({voice:'woman',language:'en'}, 'Thanks for your response.');
	
//	resp.say({voice:'woman',language:'de'}, 'Hast du etwas Zeit für mich\? Dann singe ich ein Lied für dich, Von 9'+req.body.Digits+' Luftballons Auf ihrem Weg zum Horizont. Denkst du vielleicht gerad an mich Dann singe ich ein Lied für dich Von 9'+req.body.Digits+' Luftballons Und dass so was von so was kommt. ');
//	resp.say({voice:'woman',language:'es'}, 'Debe ser el '+req.body.Digits+' que usas o el agua con la que te bañas, pero cada cosita que haces, a mí me parece una hazaña, me besaste esa noche cual si fuera el único dia de tu boca 	y cada vez que me acuerdo yo siento en mi pecho el peso de una roca.');
	io.sockets.emit('numberPress',{'theobject':req.body,'number': req.body.Digits});
	console.log(req);
	res.send(resp.toString());
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


app.get('/status', function(req, res){
	console.log(req.url);
	res.render('status', {
		server : host+':'+port
	});
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


