var express = require('express')
  , app = express()
  , apnagent = require('apnagent')
  , join = require('path').join
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));



var port = process.env.PORT || 80;
var host = 'http://smokeconnector.nodejitsu.com';
var voice_url = host+'/voice/';


myToken = require('./device');


var twilioNumber = '+12406692679';//+14074776653'; 1 2406 MY CNRY
var twilioNumberSmoke = '+14074776653';

var phoneContact=[];
var contacts=[];
var thankOnly=[];

app.configure(function(){
	var agent = new apnagent.Agent();
	// configure agent
	agent 
	  .set('cert file', join(__dirname, '_certs/apnagent-dev-cert.pem'))
	  .set('key file', join(__dirname, '_certs/apnagent-dev-key.pem'))
		.set('passphrase', '')
	  .enable('sandbox');

	// mount to app
	app
	  .set('apn', agent)
	  .set('apn-env', 'live-sandbox');
});

app.configure(function () {
  var agent = app.get('apn')
    , env = app.get('apn-env');

  // common settings
  agent
    .set('expires', '1d')
    .set('reconnect delay', '1s')
    .set('cache ttl', '30m');

  // see error mitigation section
  agent.on('message:error', function (err, msg) {
    // ...
  });

  // connect needed to start message processing
  agent.connect(function (err) {
    if (err) throw err;
    console.log('[%s] apn agent running', env);
  });
});

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
	host='localhost';
	console.log('development mode! '+host+':'+port);
});

var twilio = require('twilio');
var client= new twilio.RestClient('ACeac2f16de43f1d54afc199dc5f7ae200', '8d7f041fe6dd708664d01d472a2ed904');


app.set('view engine', 'ejs'); 
app.set('view options', {
    layout: false
});




app.get('/newContact/:number/:place', function (req, res) {
	var agent = app.get('apn');
  	agent.createMessage()
    .device(myToken)

	.set('notificationType','newContact')
	.set('number',req.params.number)
	.set('place',req.params.place)
	.alert('New responder signed up')
//	.alert('action-loc-key','Action text')
    .send(function (err) {
	    if (err && err.toJSON) { res.json(400, { error: err.toJSON(false) }); } 
		else if (err) { res.json(400, { error: err.message }); }
		else {res.json({ success: true });}
    });
});

//Real shit starts here. This is for the NYTM demo with the iPhone app.


//Posts from Twilio

app.post('/signupcall', function(req, res) {
	
	var resp = new twilio.TwimlResponse();
	resp.play(host+'/final.mp3');
	var formattedNumber=req.body.From.replace('+','').replace('(','').replace(')','').replace(' ','').replace('-','');
	
	if(phoneContact.length<11){
		
		var place=req.body.CallerZip+', ' +req.body.CallerState;
		//APN add. Send formatted number and place
		
		var agent = app.get('apn');
	  	agent.createMessage()
	    .device(myToken)

		.set('notificationType','newContact')
		.set('number',formattedNumber)
		.set('place',place)
		.alert('+'+formattedNumber+' signed up')
	//	.alert('action-loc-key','Action text')
	    .send(function (err) {
		    if (err && err.toJSON) {  } 
			else if (err) { }
			else {}
	    });
		io.sockets.emit('newContact',{'number':formattedNumber,'place':place});
	
		phoneContact.push({'number':formattedNumber,'place':place});
		
		resp.say({voice:'woman', language:'en'},'Hi there. Thanks for signing up from '+req.body.CallerCity +' as a responder to emergencies at Justin\'s residence,  If there is an emergency and Justin may be in danger, you will be contacted.');
	}
	else{
		resp.say({voice:'woman', language:'en'},'Hi there. As there are already 10 responders, you will be notified of updates by text message');
		thankOnly.push(req.body.From);
	}
	
	res.type('text/xml');
	res.send(resp.toString());
});


app.post('/newsms', function(req, res) {
	var message=req.body.Body;
	var number=req.body.From.replace('+','').replace('(','').replace(')','').replace(' ','').replace('-','');
	
	var toSend='';
	
	//Filter number to remove +'s etc.
	
	var data = phoneContact.filter(function(contact){return(contact.number===number);});
	
	if (data.length>0){
		//Send message via APNS to app, with data.number and data
			var agent = app.get('apn');
		  	agent.createMessage()
		    .device(myToken)

			.set('notificationType','newMessage')
			.set('number',number)
			.set('content',message)
			.alert('+'+number+': '+message)
		//	.alert('action-loc-key','Action text')
		    .send(function (err) {
			    if (err && err.toJSON) {} 
				else if (err) {}
				else {}
		    });
	} else {
		thankOnly.push(req.body.From);
		//Send thank you message back (or not), and don't do anything else.
	}

	res.send('');
});


//Posts from App

app.post('/settoken', function(req, responseHttp) {
//	req.body.token
	myToken=req.body.token;
	console.log('Token received is: '+req.body.token);
	responseHttp.send('');
});

app.post('/newMessage', function(req, responseHttp) {
	console.log('New message from '+req.body.number+': '+req.body.content);
//Relay message to all responders	
	phoneContact.forEach(function(contact)
	{
		client.sms.messages.create({
		    to:number,
		    from:twilioNumber,
		    body:'Justin: '+req.body.content
		}, function(error, message) {
		    if (!error) {}
		    else {}
		});	
	});
	
	responseHttp.send('');
});

app.post('/addContact', function(req, responseHttp) {
	phoneContact.push({'number':req.body.number,'place':req.body.firstName+' '+req.body.lastName});	
	responseHttp.send('');
});

app.get('/reset',function(request, responseHttp){
	phoneContact=[];
});

app.post('/thank', function(req, responseHttp) {
	thankOnly.forEach(function(tosms)
	{
		client.sms.messages.create({
		    to:tosms,
		    from:twilioNumberSmoke,
		    body:'Thanks for viewing our test demo, we hope you liked the Birdi smart smoke detector. There are great things to come. To learn more, check out birdi.co'
		}, function(error, message) {});
	});
});







//Posts from device

app.get('/reset',function(request, responseHttp){
	phoneContact=[];
	responseHttp.send('Subscribers: '+phoneContact.length);
});

app.get('/alert',function(request, responseHttp){

	console.log(request.body);
	io.sockets.emit('alert', { 'time':getDateTime() });

	//Send APN
	
	phoneContact.forEach(function(contact)
	{
		client.calls.create({
		    url: host+'/call/new',
			status_callback: host+'/call/ended', //Notifies about ended call
		    to: contact.number,
		    from: twilioNumberSmoke,
		}, function(err, call) {
			if (!err) { // "err" is an error received during the request, if any
		        console.log(call);
				io.sockets.emit('updateStatus',{'number':contact.number,'status':'Calling' }); //mobile
				io.sockets.emit('updateResponder',{'number':contact.number,'status':'Calling' }); //iOS
				
				}
			else{
				io.sockets.emit('updateStatus',{'number':contact.number,'status':'Not Available' }); //mobile
				io.sockets.emit('updateResponder',{'number':contact.number,'status':'Not Available' }); //iOS
				//Send text message
			}				
			});
	});
	responseHttp.send('Hard alert. Subscribers: '+phoneContact.length+'. Time occurred: '+getDateTime());// echo the result back});
});

//Call out in response to real alert
app.post('/call/new', function(req, res) {
	var resp = new twilio.TwimlResponse();
	var lang='en';
//	Called
//	CallSid
	
	resp.gather({timeout:60,action:host+'/response/1',numDigits:1},function(){
		this.say({voice:'woman', language:lang},'Justin\'s birdy has reported a fire alarm. Press 9 if this is an emergency. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. ')
		.pause({ length:3 })
		.say({voice:'woman', language:lang},'Press 9 if this is an emergency. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. ')
		.pause({ length:3 })
		.say({voice:'woman', language:lang},'Justin\'s birdy has reported a fire alarm. Press 9 if this is an emergency. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. ')
		.pause({ length:3 })
	});
	res.type('text/xml');
	res.send(resp.toString());
});

app.post('/response/1', function(req, res) {
	
	io.sockets.emit('logthis',{'obj':req.body,'info':'First response made' });
	var number=req.body.Called.replace('+','').replace('(','').replace(')','').replace(' ','').replace('-','');
	var choice=parseInt(req.body.Digits);
	var resp = new twilio.TwimlResponse();
	var report='unsure';
	
	switch(choice)
	{
		case 1:
			io.sockets.emit('updateStatus',{'number':number,'status':'false' });
			// Assign false to DB entry with this number.
			// Call updated response function
			status='false';
			
			report='false alarm';
			resp.say({voice:'woman'},'Phew! That was a close one. The rest of your household will be notified that this was just a false alarm.');
			break;
		case 3:
			io.sockets.emit('updateStatus',{'number':number,'status':'uncertain' });
			status='notsure';
			// Assign unsure to DB entry with this number
			// Call updated response function			
			resp.say({voice:'woman'},'Keep calm. The smoke detector has gone off. We\'re contacting your housemates to see what happened.');
			break;
		case 9:
			io.sockets.emit('updateStatus',{'number':number,'status':'emergency' });
			status='emergency';
			report='an emergency';
			
			// Assign emergency to DB entry with this number
			// Call updated response function
			resp.say({voice:'woman'},'Stay calm. We\'re alerting your housemates. Please call 9 1 1 immediately. To change your response, press 7. Otherwise, please hang up and dial 9 1 1.');
			break;
		default:
			io.sockets.emit('updateStatus',{'number':number,'status':'uncertain' });
			resp.say({voice:'woman'},'Obviously you were listening to our presentation and not what number you were suppose to press.');
	}
	
		var agent = app.get('apn');
	  	agent.createMessage()
	    .device(myToken)

		.set('notificationType','updateFeedback')
		.set('number',number)
		.set('content',status)
		.alert(number+' reported '+report)
	//	.alert('action-loc-key','Action text')
	    .send(function (err) {
		    if (err && err.toJSON) {  } 
			else if (err) {  } 
			else {  } 
	    });
	
	res.type('text/xml');
	res.send(resp.toString());
	
});

app.get('/responderslist', function(req, res){
	console.log(req.url);
	res.send(phoneContact);
});





//APNS tests


app.get('test/newStatus/:statusType', function (req, res) {
	var agent = app.get('apn');
	var alertText ='Updated status';
	
	if(req.params.statusType=='emergency'){
		alertText='Fire detected at your home';
	}
	else if(req.params.statusType=='cancelled'){
		alertText='Alert cancelled';
	}
	
  	agent.createMessage()
    .device(myToken)
	.set('notificationType','newStatus')
	.set('statusType',req.params.statusType)
	.alert(alertText)
//	.alert('action-loc-key','Action text')
    .send(function (err) {
	    if (err && err.toJSON) { res.json(400, { error: err.toJSON(false) }); } 
		else if (err) { res.json(400, { error: err.message }); }
		else {res.json({ success: true });}
    });
});


app.get('test/newContact/:number/:place', function (req, res) {
	
	io.sockets.emit('newContact',{'number':req.params.number,'place':req.params.place  });
	
	var agent = app.get('apn');
  	agent.createMessage()
    .device(myToken)

	.set('notificationType','newContact')
	.set('number',req.params.number)
	.set('place',req.params.place)
	.alert('New responder signed up')
//	.alert('action-loc-key','Action text')
    .send(function (err) {
	    if (err && err.toJSON) { res.json(400, { error: err.toJSON(false) }); } 
		else if (err) { res.json(400, { error: err.message }); }
		else {res.json({ success: true });}
    });
});


app.get('test/updateFeedback/:number/:content', function (req, res) {
	
	io.sockets.emit('updateStatus',{'number':req.params.number,'status':req.params.content });
	
	var agent = app.get('apn');
  	agent.createMessage()
    .device(myToken)

	.set('notificationType','updateFeedback')
	.set('number',req.params.number)
	.set('content',req.params.content)
	.alert('New response from +'+req.params.number)
//	.alert('action-loc-key','Action text')
    .send(function (err) {
	    if (err && err.toJSON) { res.json(400, { error: err.toJSON(false) }); } 
		else if (err) { res.json(400, { error: err.message }); }
		else {res.json({ success: true });}
    });
});

app.get('test/newMessage/:number/:content', function (req, res) {
	var agent = app.get('apn');
  	agent.createMessage()
    .device(myToken)

	.set('notificationType','newMessage')
	.set('number',req.params.number)
	.set('content',req.params.content)
	.alert('+'+req.params.number+': '+req.params.content)
//	.alert('action-loc-key','Action text')
    .send(function (err) {
	    if (err && err.toJSON) { res.json(400, { error: err.toJSON(false) }); } 
		else if (err) { res.json(400, { error: err.message }); }
		else {res.json({ success: true });}
    });
});


app.get('test/updateResponder/:number/:content', function (req, res) {
	
	
	io.sockets.emit('updateResponder',{'number':req.params.number,'content':req.params.content });
	res.send('number: '+req.params.number +'content: '+req.params.content );
	
});














//-------------
//Call in stuff.


app.post('/call', function(req, res) {
	var resp = new twilio.TwimlResponse();
	resp.play(host+'/final.mp3');
	resp.gather({timeout:10,action:host+'/gathered',numDigits:1},function(){
		this.play(voice_url+'welcome.mp3');	
		this.play(voice_url+'choose_intro.mp3');
		this.play(voice_url+'choose_ch.mp3');
		this.play(voice_url+'choose_ru.mp3');
		this.play(voice_url+'choose_af.mp3');
		this.play(voice_url+'choose_canarynoise.mp3');
	});
	res.type('text/xml');
	res.send(resp.toString());
});

app.post('/gathered', function(req, res) {
	var choice=req.body.Digits;

	if(choice==='*'){
		client.calls(req.body.CallSid).post({
		    url:host+'/call'
		}, function(err, text) {});
	}
	var lang='en';
	var resp = new twilio.TwimlResponse();
	switch(choice)
	{
	case '1':
		lang='en';
		break;
	case '3':
		lang='ch';
		break;
	case '4':
		lang='ru';
		break;
	case '8':
		lang='af';
		break;
	case '9':
		resp.play(voice_url+'canary1.mp3');
		resp.play(voice_url+'canary2.mp3');
		resp.play(voice_url+'canarynoise.mp3');
		resp.play(voice_url+'canary3.mp3');
	
		break;
	default:
		lang='en';
	}

	resp.gather( {timeout:30,action:host+'/gathered/2/'+lang,numDigits:1},function(){
		this.play(voice_url+'updates_'+lang+'.mp3');
		});

	res.send(resp.toString());
});

app.post('/gathered/2/:language', function(req, res) {
	var toMsg=false;
	var lang=req.params.language;
	var choice=req.body.Digits;

	var twimlLang=lang;
	if(twimlLang==='af'|twimlLang==='ru'|twimlLang==='ch'){
		twimlLang='en';
	}

	var resp = new twilio.TwimlResponse();
	switch(choice)
	{
	case '1': //Home
			resp.play(voice_url+'home1_'+lang+'.mp3');
			resp.say({voice:'man', language:twimlLang}, '42' );
			resp.play(voice_url+'home2_'+lang+'.mp3');
			resp.say({voice:'man', language:twimlLang}, '54' );
		break;
	case '2': //Outdoor
			var zipSay=req.body.FromZip;
			resp.play(voice_url+'outdoor1_'+lang+'.mp3');
			resp.say({voice:'man', language:twimlLang}, zipSay[0]+' '+zipSay[1]+' '+zipSay[2]+' '+zipSay[3]+' '+zipSay[4] );
			resp.play(voice_url+'outdoor2_'+lang+'.mp3');
			resp.say({voice:'man', language:twimlLang}, '43' );
			resp.play(voice_url+'outdoor3_'+lang+'.mp3');
			resp.say({voice:'man', language:twimlLang}, '21' );
			resp.play(voice_url+'outdoor4_'+lang+'.mp3');
		break;
	case '3': //CO
			resp.play(voice_url+'co1_'+lang+'.mp3');
			resp.say({voice:'man', language:twimlLang}, '11' );
			resp.play(voice_url+'co2_'+lang+'.mp3');
		break;
	
	case '4': //Smoke
			resp.play(voice_url+'smoke_'+lang+'.mp3');
		break;
	
	case '5': //Battery
		resp.play(voice_url+'battery_'+lang+'.mp3');
		resp.play(voice_url+'battery2_'+lang+'.mp3');
		break;
	case '9':
		resp.play(voice_url+'5thanks_en.mp3'); 
		resp.play(voice_url+'canary2.mp3');
		break;
	
	case '0':
		resp.play(voice_url+'5thanks_en.mp3'); 
		resp.play(voice_url+'canary2.mp3');
	
		toMsg=true;
	
	case '*':
		client.calls(req.body.CallSid).post({
		    url:host+'/call'
		}, function(err, text) {});
		break;
	default:
		client.calls(req.body.CallSid).post({
		    url:host+'/call'
		}, function(err, text) {});
	}
	resp.gather( {timeout:30,action:host+'/gathered/3/'+lang,numDigits:1},function(){	
		this.play(voice_url+'detailsback_'+lang+'.mp3');
	});
	res.send(resp.toString());
	if(toMsg){
		client.sms.messages.create({
		    to:req.body.From,
		    from:twilioNumber,
		    body:'Awesome. Team Canary thanks you for the high five. Follow us on @canarydetect or visit http://canarydetector.com!'
		}, function(error, message) {});
	
		client.sms.messages.create({
		    to:justinNumber,
		    from:twilioNumber,
		    body:req.body.From+' high fived you from '+req.body.FromZip+'! He listened to language '+lang
		}, function(error, message) {});
	}
});

app.post('/gathered/3/:language', function(req, res) {
	if(req.body.Digits==='*'){
		client.calls(req.body.CallSid).post({
		    url:host+'/call'
		}, function(err, text) {});
	}
	var resp = new twilio.TwimlResponse();
	resp.play(voice_url+'thanks.mp3'); 
	resp.play(voice_url+'canary2.mp3'); 

	res.send(resp.toString());

	client.sms.messages.create({
	    to:req.body.From,
	    from:twilioNumber,
	    body:'Thank you for your call. For more information on how we plan on changing how New Yorkers view air quality data, visit canarydetector.com'
	}, function(error, message) {});

});
//Twiml response

//Used for updating status of each callee
app.post('/call/ended', function(req,res){
	//Call update status
});

//Incoming SMS incomingsms
app.post('/incomingsms', function(req, res) {
	var message=req.body.Body;
	var zip = '10001';
	var lang='en';
	if(message.match(/\d{5}/)){
		zip = String(message.match(/\d{5}/));
	}
	else
	{
		zip = req.body.FromZip;	
	}
	var random = Math.floor(Math.random() * (160 - 50 + 1)) + 50;

	var smsResp='Thanks for signing up to Justin\'s Canary. The air quality at NYLS is Good: 42. The air quality in '+zip +' is OK: '+random+'. The pollen count is: Normal';


	if(message.toLowerCase().indexOf('russian')!==-1){
		lang = 'en-gb';
		smsResp='Спасибо за регистрацию на Канарских. качество воздуха в ваше '+zip +'является OK: 54 пыльцы High.';
	}
	if(message.toLowerCase().indexOf('spanish')!==-1){
		lang = 'es';
		smsResp='Gracias por suscribirse al Canario. La calidad del aire en NYLS es Buena: 42. La calidad del aire en '+zip +' es OK: 54. La densidad polen es: Alta';
	}
//	phoneContact.push({'number':req.body.From,'language':lang});

	client.sms.messages.create({
	    to:req.body.From,
	    from:twilioNumber,
	    body:smsResp
	}, function(error, message) {
	    if (!error) {
			io.sockets.emit('logthis',{'obj':req.body.From,'info':'SMS sent' });
	    }
	    else {
			io.sockets.emit('logthis',{'obj':req.body.From,'info':'Error sending' });
	    }
	});

	res.send('');
});














function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return hour + ":" + min + ":" + sec;

}








app.get('/', function(req, res){
	console.log(req.url);
	
	res.render('dash', {
		server : host+':'+port
	});
});

app.get('/responses', function(req, res){
	console.log(req.url);
	res.render('responses', {
		server : host+':'+port
	});
});


server.listen(port, function() {
  console.log("Listening on " + port);
});


