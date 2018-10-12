var express = require('express');
var cors = require('cors');
var main = require('./public/main.js');
var exphbs  = require('express-handlebars');
var bodyParser = require('body-parser');
const url = require('url'); 
var fs = require("fs");
var json = require("./public/data/candidates.json");

var app = express();

app.disable('x-powered-by');

app.use( function(req, res, next) {

  if (req.originalUrl && req.originalUrl.split("/").pop() === 'favicon.ico') {
    return res.sendStatus(204);
  }

  return next();

});

var handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.engine('handlebars', handlebars.engine);

app.set('view engine', 'handlebars');

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('port', process.env.PORT || 4000);

app.use('/public', express.static('public'));

app.get('/', function(req, res){
  res.render('home');
});

app.get('/home', function(req, res){
  res.render('home');
});

app.put('/home', async function(req, res){
  var address = req.body;
  var promise = await main.wrapper(address);
  if (promise == false){
      res.send({data: 'false'});
      } else if (promise !== false){
      res.send({data: 'true'});
      app.set('data', promise);
    }
});

app.get('/candidates', function(req, res) {
  res.render('candidates', {data : JSON.stringify(app.get('data'))});
});

app.put('/candidateinfo', async function(req, res) {
  var promise = await main.canInfo(req.body);
  if (promise == false){
    res.send({data: 'false'});
    } else if (promise !== false){
    res.send({data: 'true'});
    app.set('canData', promise);
  }
});

app.get('/candidateinfo/:state/:name', async function(req, res) {
  res.render('info', {data : JSON.stringify(app.get('canData'))});
});

app.get('/candidateinfo/:body/:state/:name', async function(req, res) {
  var promise = await main.canInfo(req.params);
  res.render('info', {data: JSON.stringify(promise) });
});

app.post('/orginfo', async function(req, res){
  var org = req.body.name;
  var promise = await main.orginfo(org);
  res.send( {data: promise} );
});

app.get('/about', function(req, res){
  res.render('about');
});

app.get('/contact', function(req, res){
  res.render('contact');
});

app.get('/support', function(req, res){
  res.render('support');
});

// app.post('/contact', function(req, res){
//   console.log(req.body);
//   if (req.body.name !== "" && req.body.email !== "" && req.body.message !== "") { 
//   res.render('contact-success');
//   } else {
//   res.render('contact-error');
//   }
// });

app.use(function (err, req, res, next){
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

app.use(function (req, res){
  res.type('text/html');
  res.status(404);
  res.render('404');
});

// app.listen(process.env.PORT || port, function(){
//   console.log("Express server running");
// });

app.listen(app.get('port'), function(){
  console.log("Express started on http://localhost:" + app.get('port') + 'press Ctrl-C to terminate');
});
