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

var twilioNumber = '+14074776653';

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
	resp.play(voice_url+'welcome.mp3');
	
	resp.say({voice:'woman'},'Thank you for calling from '+req.body.CallerCity+'. ');
	
	resp.gather({timeout:10,action:host+'/gathered',numDigits:1},function(){
		this.say({voice:'woman',language:'en'},"To subscribe in English press 1. Spanish press 2. French press 3.")
	});
	
	res.type('text/xml');
	res.send(resp.toString());
});



app.post('/gathered', function(req, res) {
    //Validate that this request really came from Twilio...
//	console.log(req.body);
	var choice=req.body.Digits;
	
	if(choice==='*'){
		client.calls(req.body.CallSid).post({
		    url:host+'/call'
		}, function(err, text) {});
	}
	
	var lang='en';
	if(choice==='1'){
		lang='en';		
	}
	else if(choice==='2'){
		lang='fr';		
	}
	else {
		lang='de';		
	}
	
	var resp = new twilio.TwimlResponse();
//	resp.play(host+'/final_'+lang+'.mp3');
	resp.gather( {timeout:30,action:host+'/gathered/2/'+lang,numDigits:1},function(){
		this.say({voice:'woman',language:lang},"Thank you for calling. Pick a number and I will say it over and over again in my language.")
//		this.play(host+'/final_'+lang+'.mp3');
		});
	
//	phoneContact.push({'number':req.body.From,'language':lang});
//	io.sockets.emit('subscribed',{'number':req.body.From,'choice': choice});
	
	res.send(resp.toString());
});

app.post('/gathered/2/:language', function(req, res) {
	var lang=req.params.language;
	var choice=req.body.Digits;

	if(choice==='*'){
		client.calls(req.body.CallSid).post({
		    url:host+'/call'
		}, function(err, text) {});
	} 
	
	var resp = new twilio.TwimlResponse();
//	resp.play(host+'/title_'+lang+'.mp3');
	
	resp.gather({timeout:30,action:host+'/gathered/2/'+lang,numDigits:1},function(){
		this.say({voice:'woman',language:lang}, choice +' and '+choice + ' and '+choice+ '. Ok now pick another number, or 5 for a high five');
		this.play(host+'/final.mp3');
	});
		
	if(choice==='5')
		client.sms.messages.create({
		    to:req.body.From,
		    from:twilioNumber,
		    body:'You pressed 5. High five! Oh and your language was '+lang
		}, function(error, message) {});	
	
	res.send(resp.toString());
});


//Twiml response



//Used for updating status of each callee
app.post('/call/ended', function(req,res){
	//Call update status
	io.sockets.emit('logthis',{'obj':req.body,'info':'Call ended' });
	
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

	res.send('Sent socket message newEvent with number: '+ req.params.number+' status:'+req.params.mytext);
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
		this.say({voice:'woman', language:lang},'Justin\'s Canary has reported a fire alarm at City Camp. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
		.say({voice:'woman', language:lang},'Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
		.pause({ length:3 })
		.say({voice:'woman', language:lang},'Justin\'s Canary has reported a fire alarm at City Camp. Press 1 if you know it\'s a false alarm. Press 3 if you are not sure. Press 9 if this is an emergency.')
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
			io.sockets.emit('update',{'number':number,'status':'notsure' });
			
			// Assign unsure to DB entry with this number
			// Call updated response function			
			resp.say({voice:'woman'},'Keep calm. The smoke connector has gone off. We\'re contacting your housemates to see what happened.');
			break;
		case 9:
			io.sockets.emit('update',{'number':number,'status':'emergency' });
		
			// Assign emergency to DB entry with this number
			// Call updated response function
			resp.say({voice:'woman'},'Stay calm. We\'re alerting your housemates. Please call 9-1-1 immediately. To change your response, press 7. Otherwise, please hang up and dial 9-1-1.');
			break;
		default:
			io.sockets.emit('update',{'number':number,'status':'Wrong number pressed' });
		
			resp.say({voice:'woman'},'Text here - Obviously you were listening to our presentation and not what number you were suppose to press.');
	}
	
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
		    from: twilioNumber,
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

server.listen(port, function() {
  console.log("Listening on " + port);
});


