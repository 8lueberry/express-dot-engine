var engine = require('../');
var express = require('express');
var path = require('path');

var app = express();

app.engine('dot', engine.__express);
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'dot');

app.get('/', function(req, res) {
  res.render('index', { fromServer: 'Hello from server', });
});

app.get('/layout', function(req, res) {
  res.render('layout/index');
});

app.get('/cascade', function(req, res) {
  res.render('cascade/me');
});

app.get('/partial', function(req, res) {
  res.render('partial/index');
});

app.get('/helper', function(req, res) {

  // helper as a property
  engine.helper.myHelperProperty = 'Hello from server property helper';

  // helper as a method
  engine.helper.myHelperMethod = function(param) {
    return 'Hello from server method helper (parameter: ' + param + ', server model: ' + this.model.fromServer + ')';
  }

  res.render('helper/index', { fromServer: 'Hello from server', });
});

var server = app.listen(2015, function() {
  console.log('Run the example at http://locahost:%d', server.address().port);
});
