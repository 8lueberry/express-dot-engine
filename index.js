var _ = require('lodash');
var fs = require('fs');
var dot = require('dot');
var path = require('path');
var yaml = require('js-yaml');

/**
* Engine settings
*/
var settings = {
  config: /^---([\s\S]+?)---/g,
  comment: /<!--([\s\S]+?)-->/g,
  header: '',

  stripComment: false,
  stripWhitespace: false, // shortcut to dot.strip

  dot: {
    evaluate: /\[\[([\s\S]+?)]]/g,
    interpolate: /\[\[=([\s\S]+?)]]/g,
    encode: /\[\[!([\s\S]+?)]]/g,
    use: /\[\[#([\s\S]+?)]]/g,
    define: /\[\[##\s*([\w\.$]+)\s*(:|=)([\s\S]+?)#]]/g,
    conditional: /\[\[\?(\?)?\s*([\s\S]*?)\s*]]/g,
    iterate: /\[\[~\s*(?:]]|([\s\S]+?)\s*:\s*([\w$]+)\s*(?::\s*([\w$]+))?\s*]])/g,
    varname: 'layout, partial, locals, model',
    strip: false,
    append: true,
    selfcontained: false
  }
};

/**
* Cache store
*/
var cache = {
  cache: {},

  get: function(key) {
    return this.cache[key];
  },
  set: function(key, value) {
    this.cache[key] = value;
  },
  clear: function() {
    this.cache = {};
  }
};

/**
* Server-side helper
*/
function DotDef(options) {
  this.options = options;
  this.dirname = options.dirname;
  this.model = options;
}

DotDef.prototype = {

  partial: function(partialPath) {

    console.log('DEPRECATED: ' +
    'Please use the new syntax for partials' +
    ' [[= partial(\'path/to/partial\') ]]'
    );

    var template = getTemplate(
      path.join(this.dirname || this.model.settings.views, partialPath),
      this.model
    );

    return template.render({ model: this.model, isPartial: true, } );
  }

};

/**
* @constructor Template object with a layout structure. This object is cached
* if the 'options.cache' set by express is true.
* @param {Object} options The constructor parameters:
*
* {Object} engine The option from the engine
*
* There are 2 options
*
* Case 1: A layout view
* {String} master The master template filename
* {Object} sections A key/value containing the sections of the template
*
* Case 2: A standalone view
* {String} body The template string
*/
function Template(options) {
  this.options = options;

  // layout
  this.isLayout = !!options.config.layout;
  this.master = this.isLayout ?
    path.join(options.dirname, options.config.layout) :
    null;

  // build the doT templates
  this.templates = {};
  this.settings = _.clone(settings.dot);
  this.def = new DotDef(options);

  // view data
  this.viewData = [];
  if (_.has(options.express, 'settings')
    && _.has(options.express.settings, 'view data')
  ) {
    this.settings.varname = _.reduce(
      options.express.settings['view data'],
      function(result, value, key) {
        this.viewData.push(value);
        return result + ', ' + key;
      },
      settings.dot.varname,
      this
    );
  }

  // view shortcut
  this.shortcuts = [];
  if (_.has(options.express, 'settings')
    && _.has(options.express.settings, 'view shortcut')
  ) {
    this.shortcuts = options.express.settings['view shortcut'];
    this.settings.varname += ', ' + _.keys(this.shortcuts).join();
  }

  // doT template
  for (var key in options.sections) {
    if (options.sections.hasOwnProperty(key)) {
      this.templates[key] = dot.template(
        options.sections[key],
        this.settings,
        this.def
      );
    }
  }
}

/**
* Partial method helper
* @param {Object} layout The layout to pass to the view
* @param {Object} model The model to pass to the view
*/
Template.prototype.createPartialHelper = function(layout, model) {
  return function(partialPath) {
    var args = [].slice.call(arguments, 1);
    var template = getTemplate(
      path.join(this.options.dirname || this.options.express.settings.views, partialPath),
      this.options.express
    );

    if (args.length) {
      model = _.assign.apply(_, [
        {},
        model
      ].concat(args));
    }

    return template.render({ layout: layout, model: model, isPartial: true, });
  }.bind(this);
};

/**
* Renders the template.
* If callback is passed, it will be called asynchronously.
* @param {Object} options Options to pass to the view
* @param {Object} [options.layout] The layout key/value
* @param {Object} options.model The model to pass to the view
* @param {Function} [callback] (Optional) The async node style callback
*/
Template.prototype.render = function(options, callback) {
  var isAsync = callback && typeof callback === 'function';
  var layout = options.layout;
  var model = options.model;
  var layoutModel = _.merge({}, this.options.config, layout);

  // render the sections
  for (var key in this.templates) {
    if (this.templates.hasOwnProperty(key)) {
      try {

        var viewModel = _.union(
          [
            layoutModel,
            this.createPartialHelper(layoutModel, model),
            options.model._locals || {},
            model
          ],
          this.viewData,
          _.chain(this.shortcuts)
          .keys()
          .map(function(shortcut) {
            return options.model._locals[this.shortcuts[shortcut]] || null;
          }, this)
          .valueOf()
        );

        layoutModel[key] = this.templates[key].apply(
          this.templates[key],
          viewModel
        );
      }
      catch (err) {
        var error = new Error(
          'Failed to render with doT' +
          ' (' + this.options.filename + ')' +
          ' - ' + err.toString()
        );

        if (isAsync) {
          callback(error);
          return;
        }
        throw error;
      }
    }
  }

  // no layout
  if (!this.isLayout) {

    // append the header to the master page
    var result = (!options.isPartial ? settings.header : '') + layoutModel.body;

    if (isAsync) {
      callback(null, result);
    }
    return result;
  }

  // render the master sync
  if (!isAsync) {
    var masterTemplate = getTemplate(this.master, this.options.express);
    return masterTemplate.render({ layout: layoutModel, model: model, });
  }

  // render the master async
  getTemplate(this.master, this.options.express, function(err, masterTemplate) {
    if (err) {
      callback(err);
      return;
    }

    return masterTemplate.render({ layout: layoutModel, model: model, }, callback);
  });
};

/**
* Retrieves a template given a filename.
* Uses cache for optimization (if options.cache is true).
* If callback is passed, it will be called asynchronously.
* @param {String} filename The path to the template
* @param {Object} options The option sent by express
* @param {Function} [callback] (Optional) The async node style callback
*/
function getTemplate(filename, options, callback) {

  // cache
  if (options && options.cache) {
    var fromCache = cache.get(filename);
    if (fromCache) {
      //console.log('cache hit');
      return callback(null, fromCache);
    }
    //console.log('cache miss');
  }

  var isAsync = callback && typeof callback === 'function';

  // function to call when retieved template
  function done(err, template) {

    // cache
    if (options && options.cache && template) {
      cache.set(filename, template);
    }

    if (isAsync) {
      callback(err, template);
    }

    return template;
  }

  // sync
  if (!isAsync) {
    return done(null, buildTemplateFromFile(filename, options));
  }

  // async
  buildTemplateFromFile(filename, options, done);
}

/**
* Builds a template from a file
* If callback is passed, it will be called asynchronously.
* @param {String} filename The path to the template
* @param {Object} options The options sent by express
* @param {Function} callback (Optional) The async node style callback
*/
function buildTemplateFromFile(filename, options, callback) {
  var isAsync = callback && typeof callback === 'function';

  // sync
  if (!isAsync) {
    return builtTemplateFromString(
      fs.readFileSync(filename, 'utf8'),
      filename,
      options
    );
  }

  // async
  fs.readFile(filename, 'utf8', function(err, str) {
    if (err) {
      callback(new Error('Failed to open view file (' + filename + ')'));
      return;
    }

    try {
      callback(null, builtTemplateFromString(str, filename, options));
    }
    catch (err) {
      callback(err);
    }
  });
}

/**
* Builds a template from a string
* @param {String} str The template string
* @param {String} filename The path to the template
* @param {Object} options The options sent by express
* @return {Template} The template object
*/
function builtTemplateFromString(str, filename, options) {

  var config = {};

  // config at the beginning of the file
  str.replace(settings.config, function(m, conf) {
    config = yaml.safeLoad(conf);
  });

  // strip comments
  if (settings.stripComment) {
    str = str.replace(settings.comment, function(m, code, assign, value) {
      return '';
    });
  }

  // strip whitespace
  if (settings.stripWhitespace) {
    settings.dot.strip = settings.stripWhitespace;
  }

  // layout sections
  var sections = {};

  if (!config.layout) {
    sections.body = str;
  }
  else {
    str.replace(settings.dot.define, function(m, code, assign, value) {
      sections[code] = value;
    });
  }

  try {
    return new Template({
      express: _.pick(options, ['settings']),
      config: config,
      sections: sections,
      dirname: path.dirname(filename),
      filename: filename
    });
  }
  catch (err) {
    throw new Error(
      'Failed to build template' +
      ' (' + filename + ')' +
      ' - ' + err.toString()
    );
  }
}

/**
* Render a template
* @param {String} filename The path to the file
* @param {Object} options The model to pass to the view
* @param {Function} callback (Optional) The async node style callback
*/
function render(filename, options, callback) {
  var isAsync = callback && typeof callback === 'function';

  if (!isAsync) {
    return renderSync(filename, options)
  }

  getTemplate(filename, options, function(err, template) {
    if (err) {
      return callback(err);
    }

    template.render({ model: options, }, callback);
  });
}

/**
* Renders a template sync
* @param {String} filename The path to the file
* @param {Object} options The model to pass to the view
*/
function renderSync(filename, options) {
  var template = getTemplate(filename, options);
  return template.render({ model: options, });
}

/**
* Render directly from a string
* @param {String} templateString The template string
* @param {Object} options The model to pass to the view
* @param {Function} callback (Optional) The async node style callback
*/
function renderString(templateString, options, callback) {
  var template = builtTemplateFromString(templateString, '', options);
  return template.render({ model: options, }, callback);
}

module.exports = {
  __express: render,
  render: render,
  renderString: renderString,
  cache: cache,
  settings: settings,
  helper: DotDef.prototype
};
