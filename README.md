express-dot-engine
==================

Node.js engine using the ultra fast [doT](http://olado.github.io/doT/) templating with support for layouts, partials and friendly for front-end web libraries (Angular, Ember, Backbone...)

Features
--------

* Only 1 dependency (doT)
* Extremely fast ([all the advantages of doT](http://olado.github.io/doT/))
* Plays well with client libraries that use the curly {{ }} syntax (Angular, Ember, Backbone...)
* Layout support, partial support
* Cache support

Installation
------------

Install with npm

    > npm install express-dot-engine --save

Then in your code

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

Plays well with Angular, Ember, Backbone, etc
---------------------------------------------

By default, the engine uses [[ ]] instead of {{ }} on the backend. This allows the use of front-end templating libraries that already use {{ }}.

If you want to configure this you can change the library settings and doT settings.

    engine.setting.layout = /\[\[###([\s\S]+?)\]\]/g;
    engine.settings.dot = {
      evaluate:    /\[\[([\s\S]+?)\]\]/g,
      interpolate: /\[\[=([\s\S]+?)\]\]/g,
      encode:      /\[\[!([\s\S]+?)\]\]/g,
      use:         /\[\[#([\s\S]+?)\]\]/g,
      define:      /\[\[##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\]\]/g,
      conditional: /\[\[\?(\?)?\s*([\s\S]*?)\s*\]\]/g,
      iterate:     /\[\[~\s*(?:\]\]|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\]\])/g,
      varname: 'layout, server',
      strip: false,
      append: true,
      selfcontained: false,
    };

Layout
------

### Supports multiple sections

**master.dot**

    <!doctype html>
    <html lang="en">
      <head>
        <title>Test page</title>
      </head>
      <body>
        Hello from master.dot <br />

        [[=layout.body]] <br />

        [[=layout.body2]]

      </body>
    </html>

**index.dot**

    [[###master.dot]]

    [[##body:
      Hello from index.dot
    #]]

    [[##body2:
      Hello from index.dot again
    #]]

### Supports cascading layouts

**master.dot**

    <!doctype html>
    <html lang="en">
      <head>
        <title>Test page</title>
      </head>
      <body>
        Hello from master.dot <br />

        [[=layout.body]]
      </body>
    </html>

**wife.dot**

    [[###master.dot]]

    [[##body:
      Hello from wife.dot

      [[=layout.body]]
    #]]

**index.dot**

    [[###wife.dot]]

    [[##body:
      Hello from index.dot
    #]]

### Supports Partials

index.dot

    <div>
      My partial says: [[#def.partial('partials/hello.dot')]]
    </div>

partials/hello.dot

    <span>Hello from partials/hello.dot</span>

Server model
------------

In your application, you can render the view by calling

**index.js**
    app.get('/', function(req, res){
      res.render('index', { fromServer: 'Hello from server', });
    });

On the view, you can access the model by calling

**index.dot**
    Server says: [[=server.fromServer]]

Partials and master layouts also has access to the server models.

Caching
-------

Caching is enabled when express is running in production via the 'view cache' variable in express. This is done automatically. If you want to enable cache in development, you can add this
    app.set('view cache', true);

How to run the examples
-----------------------

Install express-dot-engine

    > npm install express-dot-engine

Then cd to the directory

    > cd express-dot-engine

Install the example dependencies (yes install express-dot-engine within itself whoa!)

    > npm install express
    > npm install express-dot-engine

Then run the example you want

    > node examples/simple

or

    > node examples/cascade

or

    > node examples/partials
