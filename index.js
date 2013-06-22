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
	console.log('development mode! '+host+':'+port);
});

var twilioNumber = '+12406692679';//+14074776653'; 1 2406 MY CNRY

var twilioNumberSmoke = '+14074776653';

var justinNumber = "+13476819080";
var markNumber = "+13474669327";


var voice_url = host+'/voice/';

var phoneNumbers=[];
var phoneNumbers_es=[];
var phoneContact=[];

//phoneContact.push({'number':justinNumber,'language':'es'});

//var twilio = require('twilio');
//var client = new twilio.RestClient('twilio')('ACeac2f16de43f1d54afc199dc5f7ae200', '8d7f041fe6dd708664d01d472a2ed904');

var twilio = require('twilio');
var client= new twilio.RestClient('ACeac2f16de43f1d54afc199dc5f7ae200', '8d7f041fe6dd708664d01d472a2ed904');

var voiceMsg = 'Your smoke alarm has been set off. Notifications will be sent out to your selected contacts. Press 7 to cancel this alarm. Press 3 if you are not sure.';
var smsMsg = '⊕ battery ♨ fire☀ air ⚠ monoxide ❁ pollen';

app.set('view engine', 'ejs'); 
app.set('view options', {
    layout: false
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

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

}

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
	
//	phoneContact.push({'number':req.body.From,'language':lang});
//	io.sockets.emit('subscribed',{'number':req.body.From,'choice': choice});
	
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
	
	
	
	/*	client.calls(req.body.CallSid).post({
		    url:host+'/call'
		}, function(err, text) {}); */

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
	io.sockets.emit('logthis',{'obj':req.body,'info':'Call ended' });
	
});


app.post('/signupcall', function(req, res) {
	io.sockets.emit('newNumber',{'obj':req.body });
	io.sockets.emit('logthis',{'obj':req.body,'info':'New subscriber' });
	
	phoneContact.push({'number':req.body.From,'language':'en'});
	
	io.sockets.emit('newContact',{'number':req.body.From,'zip':req.body.CallerZip,'state':req.body.CallerState});
	
	var resp = new twilio.TwimlResponse();
	resp.play(host+'/final.mp3');
	resp.say({voice:'woman', language:'en'},'Hi there. Thanks for signing up from '+req.body.CallerCity +' as a responder to emergencies at Mark\'s residence,  If there is an emergency and Mark may be in danger, you will be contacted.')
	res.type('text/xml');
	res.send(resp.toString());
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
	
	
	phoneContact.push({'number':req.body.From,'language':lang});


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
	io.sockets.emit('newContact',{'number':req.body.From,'zip':zip,'lang':lang  });
	
	io.sockets.emit('logthis',{'obj':zip,'info':'Zip extracted'});
	
	res.send('');
});


app.get('/reset',function(request, responseHttp){
	phoneContact=[];
	responseHttp.send('Subscribers: '+phoneContact.length);
});





//Socket testing

app.get('/sock',function(request, responseHttp){

	console.log(request.body);
	io.sockets.emit('testSock', { 'number':justinNumber, 'zip':'10001'});

	responseHttp.send('Socket test message sent');// echo the result back});
});


app.get('/alerttest',function(request, responseHttp){
	io.sockets.emit('hardAlert', { 'time':getDateTime()});
	
});

app.get('/softalert',function(request, responseHttp){
	console.log(request.body);
	var timeNow=getDateTime();
	io.sockets.emit('softAlert', { 'time':timeNow});
	responseHttp.send('Soft alert. Subscribers: '+phoneContact.length+'. Time occurred: '+timeNow);// echo the result back});
});

app.get('/testdata/:phone', function(req, res){
	
	var data = phoneContact.filter(
		function(contact){
			return(contact.number===req.params.phone);
		});
		if (data.length>0){
			res.send(data[0].language);
		} else {
			res.status(404).send('Number doesn\'t exist')
		}
});

app.get('/test/:mytext/:number', function(req, res){
	io.sockets.emit('update',{'number':req.params.number,'status':req.params.mytext });
	res.send('Sent socket message update with number: '+ req.params.number+' status:'+req.params.mytext);
});

app.get('/testNew/:number/:zip/:state', function(req, res){
	io.sockets.emit('newContact',{'number':req.params.number,'zip':req.params.zip,'state':req.params.state });
	res.send('Sent socket message newContact with number: '+ req.params.number+' zip:'+req.params.zip);
});

//Call out in response to real alert
app.post('/call/new', function(req, res) {
	var resp = new twilio.TwimlResponse();
	
	io.sockets.emit('logthis',{'obj':req.body,'info':'New call initiated' });
	
	var lang='en';
//	Called
//	CallSid
	
	var data = phoneContact.filter(
		function(contact){
			return(contact.number===req.body.Called);
		});
		if (data.length>0){
			lang=data[0].language;
		}
	
	resp.gather({timeout:60,action:host+'/response/1',numDigits:1},function(){
		this.say({voice:'woman', language:lang},'Mark\'s Canary has reported a fire alarm. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
		.say({voice:'woman', language:lang},'Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
		.say({voice:'woman', language:lang},'Mark\'s Canary has reported a fire alarm. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
	});
	
	res.type('text/xml');
	res.send(resp.toString());
	
});

app.post('/response/1', function(req, res) {
	
	io.sockets.emit('logthis',{'obj':req.body,'info':'First response made' });
	var number=req.body.Called;
	var choice=parseInt(req.body.Digits);
	var resp = new twilio.TwimlResponse();

	switch(choice)
	{
		case 1:
			io.sockets.emit('update',{'number':number,'status':'false' });
			// Assign false to DB entry with this number.
			// Call updated response function
			resp.say({voice:'woman'},'Phew! That was a close one. The rest of your household will be notified that this was just a false alarm.');
			break;
		case 3:
			io.sockets.emit('update',{'number':number,'status':'uncertain' });
			
			// Assign unsure to DB entry with this number
			// Call updated response function			
			resp.say({voice:'woman'},'Keep calm. The smoke detector has gone off. We\'re contacting your housemates to see what happened.');
			break;
		case 9:
			io.sockets.emit('update',{'number':number,'status':'emergency' });
		
			// Assign emergency to DB entry with this number
			// Call updated response function
			resp.say({voice:'woman'},'Stay calm. We\'re alerting your housemates. Please call 911 immediately. To change your response, press 7. Otherwise, please hang up and dial 911.');
			break;
		default:
			io.sockets.emit('update',{'number':number,'status':'uncertain' });
		
			resp.say({voice:'woman'},'Text here - Obviously you were listening to our presentation and not what number you were suppose to press.');
	}
	
	client.sms.messages.create({
	    to:req.body.Called,
	    from:twilioNumberSmoke,
	    body:'Thanks for trialling our prototype. There are great things to come. To view data from the event you just saw, go to http://goo.gl/rXJOU'//smokeconnector.nodejitsu.com/eventData
	}, function(error, message) {});
	
	res.type('text/xml');
	res.send(resp.toString());
	
	
});

//Trigger real alert
app.get('/alert',function(request, responseHttp){

	console.log(request.body);
	io.sockets.emit('hardAlert', { 'time':getDateTime() });
	
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
				io.sockets.emit('update',{'number':contact.number,'status':'calling' });
				}				
			});
	});

	responseHttp.send('Hard alert. Subscribers: '+phoneContact.length+'. Time occurred: '+getDateTime());// echo the result back});
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


app.get('/eventData', function(req, res){
	console.log(req.url);
	
	res.render('graph', {
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


