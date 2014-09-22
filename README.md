express-dot-engine
==================

Node.js engine using the ultra fast [doT](http://olado.github.io/doT/) templating with support for layouts, partials and friendly for front-end web libraries (Angular, Ember, Backbone...)

Features
--------

* Only 1 dependency (doT)
* Extremely fast ([all the advantages of doT](http://olado.github.io/doT/))
* Plays well with client libraries using the curly {{ }} syntax
* Layout support, partial support
* Cache support

Installation
------------

Install with npm
    `npm install express-dot-engine --save`

Then in your code

    `var engine = require('express-dot-engine');
    var express = require('express');
    var app = express();
    app.engine('dot', engine.__express);
    app.set('views', path.join(__dirname, './views'));
    app.set('view engine', 'dot');`

Plays well with Angular, Ember, Backbone, etc
---------------------------------------------

By default, the engine uses [[ ]] instead of {{ }} on the backend. This allows the use of front-end templating system that uses {{ }}.

If you want to configure this you can change

    `engine.setting.layout = /\[\[###([\s\S]+?)\]\]/g;
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
    }`

Layout
------

### Supports multiple sections.

**master.dot**
    `<!doctype html>
    <html lang="en">
      <head>
        <title>Volunteerily</title>
      </head>
      <body>
        Hello from master.dot <br />

        [[=layout.body]] <br />

        [[=layout.body2]]

      </body>
    </html>`

**index.dot**
    `[[###master.dot]]

    [[##body:
      Hello from index.dot
    #]]

    [[##body2:
      Hello from index.dot again
    #]]`

### Supports cascading layouts.

**master.dot**
    `<!doctype html>
    <html lang="en">
      <head>
        <title>Volunteerily</title>
      </head>
      <body>
        Hello from master.dot <br />

        [[=layout.body]]
      </body>
    </html>`

**wife.dot**
    `[[###master.dot]]

    [[##body:
      Hello from wife.dot

      [[=layout.body]]
    #]]`

**index.dot**
    `[[###layout.dot]]

    [[##body:
      Hello from index.dot
    #]]`

Partials
--------

index.dot
    `<div>
      My partial says: [[#def.partial('partials/hello.dot')]]
    </div>`

partials/hello.dot
    `<span>Hello from partials/hello.dot</span>`

Caching
-------

Caching is enabled when express is running in production via the 'view cache' variable in express. This is done automatically. If you want to enable cache in development, you can add this

    `app.set('view cache', true);`
