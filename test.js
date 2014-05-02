var express = require('express')
  , http = require('http')
  , path = require('path')
  , util = require('util');

var app = express();

function rawBody(req, res, next) {
  req.setEncoding('utf8');
  req.rawBody = '';
  req.on('data', function(chunk) {
    req.rawBody += chunk;
  });
  req.on('end', function(){
    next();
  });
}

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(rawBody);
  //app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

app.post('/test', function(req, res) {
  console.log(req.is('text/*'));
  console.log(req.is('json'));
  console.log('RB: ' + req.rawBody);
  console.log('B: ' + JSON.stringify(req.body));
  res.send('got it');
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});