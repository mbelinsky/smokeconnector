var apnagent = require('apnagent')
  , express = require('express')
  , join = require('path').join
  , port = process.env.PORT || 8080
	;

myToken = require('./device');

/**
 * Create application
 */

var app = express()
  , server = require('http').createServer(app);

/**
 * Configure Express
 */

app.configure(function () {
  app.use(express.bodyParser());
});

/**
 * Use a MockAgent for dev/test envs
 */

app.configure('development', 'test', function () {
//  var agent = new apnagent.MockAgent();

  // no configuration needed

  // mount to app
  //app
    //.set('apn', agent)
    //.set('apn-env', 'mock');
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

/**
 * Usa a live Agent with sandbox certificates
 * for our staging environment.
 */

app.configure('staging', function () {
  var agent = new apnagent.Agent();

  // configure agent
  agent 
    .set('cert file', join(__dirname, '_certs/apnagent-dev-cert.pem'))
    .set('key file', join(__dirname, '_certs/apnagent-dev-key.pem'))
//	.set('passphrase', 'sealteam')
    .enable('sandbox');

  // mount to app
  app
    .set('apn', agent)
    .set('apn-env', 'live-sandbox');
});

/**
 * Use a live Agent with production certificates
 * for our production environment.
 */

app.configure('production', function () {
  var agent = new apnagent.Agent();

  // configure agent
  agent 
    .set('cert file', join(__dirname, '_certs/apnagent-dev-cert.pem'))
    .set('key file', join(__dirname, '_certs/apnagent-dev-key.pem'))
	.set('passphrase', 'sealteam');


  // mount to app
  app
    .set('apn', agent)
    .set('apn-env', 'live-production');
});

/**
 * Set our environment independant configuration
 * and event listeners.
 */

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

/**
 * Sample endpoint
 */

app.get('/newStatus/:statusType', function (req, res) {
	var agent = app.get('apn');
	var alertText ='Updated status';
	
	if(req.params.statusType=='emergency'){
		alertText='Fire detected at your home';
	}
	else if(req.params.statusType=='cancelled'){
		alertText='Emergency reported';
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


app.get('/updateFeedback/:number/:content', function (req, res) {
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

app.get('/newMessage/:number/:content', function (req, res) {
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

/**
 * Start server
 */

server.listen(port, function () {
  console.log('http started on port %d', server.address().port);
});