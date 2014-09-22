var engine = require('express-dot-engine');
var express = require('express');
var path = require('path');

var app = express();

app.engine('dot', engine.__express);
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'dot');

app.get('/', function(req, res){
  res.render('index', { fromServer: 'Hello from server', });
});

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});
