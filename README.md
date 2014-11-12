# express-dot-engine

[![GitHub version](https://badge.fury.io/gh/danlevan%2Fexpress-dot-engine.svg)](http://badge.fury.io/gh/danlevan%2Fexpress-dot-engine) [![npm version](https://badge.fury.io/js/express-dot-engine.svg)](http://badge.fury.io/js/express-dot-engine) [![Build Status](https://travis-ci.org/danlevan/express-dot-engine.svg)](https://travis-ci.org/danlevan/express-dot-engine)

> Node.js engine using the ultra fast [doT](http://olado.github.io/doT/) templating with support for layouts, partials. It's friendly for front-end web libraries (Angular, Ember, Backbone...)

## Features

* Extremely fast
* All the advantage of ([doT](http://olado.github.io/doT/))
* Layout and partial support
* Uses `[[ ]]` by default, not clashing with `{{ }}` (Angular, Ember...)
* Automatic caching in production

## Installation

Install with npm

```sh
$ npm install express-dot-engine --save
```

Then set the engine in express

```javascript
var engine = require('express-dot-engine');
...

app.engine('dot', engine.__express);
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'dot');
```

## doT template

By default, the engine uses `[[ ]]` instead of `{{ }}` on the backend. This allows the use of front-end templating libraries that already use `{{ }}`.

```
[[ ]]     for evaluation
[[= ]]    for interpolation
[[! ]]    for interpolation with encoding
[[# ]]    for compile-time evaluation/includes and partials
[[## #]]  for compile-time defines
[[? ]]    for conditionals
[[~ ]]    for array iteration
```

If you want to configure this you can change the exposed [doT settings](http://olado.github.io/doT/).

```javascript
// doT settings
engine.settings.dot = {
  evaluate:    /\[\[([\s\S]+?)\]\]/g,
  interpolate: /\[\[=([\s\S]+?)\]\]/g,
  encode:      /\[\[!([\s\S]+?)\]\]/g,
  use:         /\[\[#([\s\S]+?)\]\]/g,
  define:      /\[\[##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\]\]/g,
  conditional: /\[\[\?(\?)?\s*([\s\S]*?)\s*\]\]/g,
  iterate:     /\[\[~\s*(?:\]\]|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\]\])/g,
  varname: 'layout, model',
  strip: false,
  append: true,
  selfcontained: false,
};
```

## Layout

You can specify the layout using [yaml](http://yaml.org/) and refer to the section as you would from a model (e.g. `[[= layout.whatever ]]`).

You can also define any extra configurations (like a page title) that are inherited to the master.

### Multiple section support

`master.dot`

```html
<!doctype html>
<html lang="en">
  <head>
    <title>[[= layout.title ]]</title>
  </head>
  <body>
    Hello from master.dot <br />
    [[= layout.section1 ]] <br />
    [[= layout.section2 ]]
  </body>
</html>
```

`index.dot`
```html
---
layout: master.dot
title: Index page
---

[[##section1:
  Hello from index.dot
#]]

[[##section2:
  Hello from index.dot again
#]]
```

#### Result
```html
<!doctype html>
<html lang="en">
  <head>
    <title>Index page</title>
  </head>
  <body>
    Hello from master.dot <br />
    Hello from index.dot <br />
    Hello from index.dot again
  </body>
</html>
```

### Cascading layout support

`CEO.dot`

```html
<!doctype html>
<html lang="en">
  <head>
    <title>[[= layout.title ]]</title>
  </head>
  <body>
    Hello from CEO.dot <br />
    [[= layout.section ]]
  </body>
</html>
```

`Boss.dot`

```html
---
layout: ceo.dot
---

[[##section:
  Hello from Boss.dot <br />
  [[=layout.section]]
#]]
```

`me.dot`

```html
---
layout: boss.dot
title: Page title
---

[[##section:
  Hello from me.dot
#]]
```

#### Result
```html
<!doctype html>
<html lang="en">
  <head>
    <title>Boss page</title>
  </head>
  <body>
    Hello from CEO.dot <br />
    Hello from Boss.dot <br />
    Hello from me.dot
  </body>
</html>
```

## Partials

You can also use doT partials. The path is relative to the path of the current file.

`index.dot`

```html
<div>
  Message from partial: [[#def.partial('partials/hello.dot')]]
</div>
```

`partials/hello.dot`

```html
<span>Hello from partial</span>
```

### Result

```html
<div>
  My partial says: <span>Hello from partials/hello.dot</span>
</div>
```

## Server model

In your node application, the model passed to the engine will be available through `[[= model. ]]` in your template.

```javascript
app.get('/', function(req, res){
  res.render('index', { fromServer: 'Hello from server', });
});
```

```html
<div>
  Server says: [[= model.fromServer ]]
</div>
```

### Result

```html
<div>
  Server says: Hello from server
</div>
```

### Layouts and Partials also has access to the server models.

## Caching

Caching is enabled when express is running in production via the 'view cache' variable in express. This is done automatically. If you want to enable cache in development, you can add this

```javascript
app.set('view cache', true);
```

## How to run the examples

### 1. Install express-dot-engine

```sh
$ npm install express-dot-engine
```

### 2. Install express

```sh
$ npm install express
```

### 3. Run the example

```sh
$ node node_module/express-dot-engine/examples
```

Open your browser to `http://localhost:2015`

## License
[MIT](LICENSE)
