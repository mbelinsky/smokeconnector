var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

var port = process.env.PORT || 80;
var host = 'http://smokeconnector.nodejitsu.com';

var responders = require('./data/responders').data;



var mongodb = require('mongodb');
             var db = new mongodb.Db('nodejitsu_justinlv_nodejitsudb3831052954',
               new mongodb.Server('ds059887.mongolab.com', 59887, {})
             );
             db.open(function (err, db_p) {
               if (err) { throw err; }
               db.authenticate('nodejitsu_justinlv', '53fbpevg76un2cappilhsukce6', function (err, replies) {
                 console.log('MongoDB connected and authenticated.')
               });
             });





app.configure('development', function(){
	port = 3000;
	host='http://localhost';
	console.log('development');
});

var twilioNumber = '+14074776653';

var justinNumber = "+13476819080";
var markNumber = "+13474669327";

var phoneNumbers=[justinNumber];
var phoneNumbers_es=[];

//var twilio = require('twilio');
//var client = new twilio.RestClient('twilio')('ACeac2f16de43f1d54afc199dc5f7ae200', '8d7f041fe6dd708664d01d472a2ed904');

var twilio = require('twilio');
var client= new twilio.RestClient('ACeac2f16de43f1d54afc199dc5f7ae200', '8d7f041fe6dd708664d01d472a2ed904');

var voiceMsg = 'Your smoke alarm has been set off. Notifications will be sent out to your selected contacts. Press 7 to cancel this alarm. Press 3 if you are not sure.';


app.set('view engine', 'ejs'); 
app.set('view options', {
    layout: false
});




/*


Update status function:
This is called whenever a change to someone's status is made. (Call answered, call ended, responded via SMS or phone input, subscribed)
It sends out a socket message to update the status.

Update response function:
This is called additonally when a response is updated. This is used to trigger an update to active calles that are waiting for updates, or
send SMS's to people that are subscribed.


*/







//Incoming call
app.post('/call', function(req, res) {
	io.sockets.emit('newNumber',{'obj':req.body });
	phoneNumbers.push(req.body.From);
	
	var resp = new twilio.TwimlResponse();
	resp.play(host+'/final.mp3');
	resp.say({voice:'woman'},'Thank you for calling from '+req.body.CallerCity+'. To subscribe in Spanish, press 2');
	resp.gather({timeout:10,action:host+'/gathered',numDigits:1},function(){
		this.say({voice:'woman',language:'es'},"To subscribe in Spanish press 2.")
	});
	res.type('text/xml');
	res.send(resp.toString());
});



app.post('/gathered', function(req, res) {
    //Validate that this request really came from Twilio...
//	console.log(req.body);
	var choice=req.body.Digits;
	
	var resp = new twilio.TwimlResponse();
	if(choice===1){
		resp.say({voice:'woman',language:'en'}, 'Thanks for your response. You are now subscribed in English.');
		phoneNumbers.push(req.body.From);
	}
	else if(choice===2){
		resp.say({voice:'woman',language:'es'}, 'Thanks for your response. You are now subscribed in Spanish.');
		phoneNumbers_es.push(req.body.From);
	}
	else {
		resp.say({voice:'woman',language:'es'}, 'You have been subscribed in English by default');
		phoneNumbers.push(req.body.From);
	}
	
//	resp.say({voice:'woman',language:'de'}, 'Hast du etwas Zeit für mich\? Dann singe ich ein Lied für dich, Von 9'+req.body.Digits+' Luftballons Auf ihrem Weg zum Horizont. Denkst du vielleicht gerad an mich Dann singe ich ein Lied für dich Von 9'+req.body.Digits+' Luftballons Und dass so was von so was kommt. ');
//	resp.say({voice:'woman',language:'es'}, 'Debe ser el '+req.body.Digits+' que usas o el agua con la que te bañas, pero cada cosita que haces, a mí me parece una hazaña, me besaste esa noche cual si fuera el único dia de tu boca 	y cada vez que me acuerdo yo siento en mi pecho el peso de una roca.');
	io.sockets.emit('subscribed',{'obj':req.body,'language': req.body.Digits});
	console.log(req);
	res.send(resp.toString());
});

app.post('/gathered2', function(req, res) {
	var choice=req.body.Digits;
	var resp = new twilio.TwimlResponse();

	res.send(resp.toString());
});


//Twiml response
app.post('/call/new', function(req, res) {
	var resp = new twilio.TwimlResponse();
	
	io.sockets.emit('logthis',{'obj':req.body,'info':'New call initiated' });
	
	
//	Called
//	CallSid
	
	resp.gather({timeout:60,action:host+'/response/1',numDigits:1},function(){
		this.say({voice:'woman'},'Your smoke connector has gone off in your kitchen. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
		.say({voice:'woman', language:'en-gb'},'Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
		.say({voice:'woman'},'Your smoke connector has gone off in your kitchen. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
	});
	
	res.type('text/xml');
	res.send(resp.toString());
	
});

app.post('/call/update', function(req, res) {
	
	
});

//Used for updating status of each callee
app.post('/call/ended', function(req,res){
	//Call update status
	io.sockets.emit('logthis',{'obj':req.body,'info':'Call ended' });
	
});



app.post('/response/1', function(req, res) {
	
	io.sockets.emit('logthis',{'obj':req.body,'info':'First response made' });
	var number=req.body.Called;

	var resp = new twilio.TwimlResponse();

	switch(req.body.Digits)
	{
		case 1:
			io.sockets.emit('response',{'number':number,'response':'' });
			// Assign false to DB entry with this number.
			// Call updated response function
			this.say({voice:'woman'},'Phew! That was a close one. The rest of your household will be notified that this was just a false alarm. To change your response, press 7. Otherwise, tell your housemates what happened with a short recorded message. Leave your message after the tone and press # to send.');
			break;
		case 3:
			// Assign unsure to DB entry with this number
			// Call updated response function			
			this.say({voice:'woman'},'Keep calm and stay on the line. The smoke connector has gone off. We\'re contacting your housemates to see what happened and will update you whether it\'s an emergency or false alarm. To change your response, press 7.');
			break;
		case 9:
			// Assign emergency to DB entry with this number
			// Call updated response function
			this.say({voice:'woman'},'Stay calm. We\'re alerting your housemates. Please call 9-1-1 immediately. To change your response, press 7. Otherwise, please hang up and dial 9-1-1.');
			break;
		default:
			this.say({voice:'woman'},'Text here - Obviously you were listening to our presentation and not what number you were suppose to press.');
	}
	
	
/*	resp.gather({timeout:60,action:host+'/response/2',numDigits:1},function(){
		switch(req.body.Digits)
		{
			case 1:
				break;
			case 3:
				break;
			case 9:
				break;
			default:
		}
	});*/
	
	
	res.type('text/xml');
	res.send(resp.toString());
	
	
});

app.post('/response/2', function(req, res) {
	
});




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





app.get('/alert',function(request, responseHttp){

	console.log(request.body);
	io.sockets.emit('alert', { 'timeReceived':23162});
	
	
	responders.forEach(function(responder,index,respondersArray)
	{
		console.log(responder.name);
		io.sockets.emit('logthis',{'obj':responder.name,'msg':'Caller:' });
		
/*		client.sendSms({
		    to:responder.number, 
		    from: twilioNumber, 
		    body: 'Name: ' +responder.name+' Status: '+responder.notification.status+' Response: '+responder.notification.response,
			}, function(err, responseData) { //this function is executed when a response is received from Twilio
			    if (!err) { // "err" is an error received during the request, if any
			        console.log(responseData.from);
					io.sockets.emit('messageSent', { 'from':responseData.from,'to':responseData.to}); //request.body.eventTime, "connectionTime":request.body.connectionTime ,"alarmType":request.body.alarmType });
					}
		});
		*/
		respondersArray(index).status='contacting';
		
		
		client.calls.create({
		    url: host+'/call/new',
			status_callback: host+'/call/ended', //Notifies about ended call
		    to: responder.number,
		    from: twilioNumber,
		}, function(err, call) {
			if (!err) { // "err" is an error received during the request, if any
		        console.log(call);
				io.sockets.emit('logthis',{'obj':call,'info':'Successfully called' });
				}
				else{io.sockets.emit('logthis',{'obj':err,'info':'Call error' });
				}		
				
			});
	});

	responseHttp.send('Subscribers: '+responders.length);// echo the result back});
});


app.get('/status', function(req, res){
	console.log(req.url);
	res.render('status', {
		server : host+':'+port
	});
});




app.get('/testdata/:phone', function(req, res){
	var data = responders.filter(
		function(responder){
			return(responder.number===req.params.phone);
		});
		if (data.length>0){
			res.send(data[0].name);
		} else {
			res.status(404).send('Number doesn\'t exist')
		}
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


