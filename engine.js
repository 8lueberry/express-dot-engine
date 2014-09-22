var fs = require('fs');
var dot = require('dot');
var path = require('path');

/**
 * Engine settings
 */
var settings = {

  // used for defining master pages
  layout: /\[\[###([\s\S]+?)\]\]/g,

  // dot settings
  dot: {
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
  },
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
  },
};

/**
 * Server-side helper
 */
var dotDef = {

  // injected
  options: { },

  // supports partial
  partial: function(partialPath) {

    var template = getTemplate(
      path.join(this.options.settings.views, partialPath),
      this.options
    );

    return template.render({}, this.options);
	},
};

/**
 * @constructor Template object with a layout structure. This object is cached
 * if the 'options.cache' set by express is true.
 * @param {Object} options The constructor parameters:
 *
 * {Object} options The option from the engine
 *
 * There are 2 options
 *
 * Case 1: A layout view
 * {String} masterFilename The master template filename
 * {Object} sections A key/value containing the sections of the template
 *
 * Case 2: A standalone view
 * {String} templateStr The template string
 */
function Template(options) {

  // standalone view
  if (options.templateStr) {
    this.isLayout = false;
    options.sectionStrList = { body: options.templateStr, };
  }
  else {
    this.masterFilename = options.masterFilename;
    this.isLayout = true;
  }

  // build the doT templates

  dotDef.options = options.options;

  this.sectionDotTemplates = {};
  for (var key in options.sectionStrList) {
    this.sectionDotTemplates[key] = dot.template(
      options.sectionStrList[key],
      settings.dot,
      dotDef
    );
  }
}

/**
 * Renders the template.
 * If callback is passed, it will be called asynchronously.
 * @param {Object} layout The layout key/value
 * @param {Object} data The model to pass to the view
 * @param {Function} callback (Optional) The async node style callback
 */
Template.prototype.render = function(layout, options, callback) {
  var isAsync = callback && typeof callback === 'function';

  // render the sections
  var renderedSections = [];
  try {
    for (var key in this.sectionDotTemplates) {
      renderedSections[key] = this.sectionDotTemplates[key](layout, options);
    }
  }
  catch(err) {
    if (isAsync) { callback(err); return; }
    throw err;
  }

  // no layout
  if (!this.isLayout) {
    if (isAsync) { callback(null, renderedSections.body); }
    return renderedSections.body;
  }

  // render the master sync
  if (!isAsync) {
    var masterTemplate = getTemplate(this.masterFilename, options);
    return masterTemplate.render(renderedSections, options);
  }

  // render the master async
  getTemplate(this.masterFilename, options, function(err, masterTemplate) {
    if (err) {
      callback(err);
      return;
    }

    return masterTemplate.render(renderedSections, options, callback);
  });
};

/**
 * Retrieves a template given a filename.
 * Uses cache for optimization (if options.cache is true).
 * If callback is passed, it will be called asynchronously.
 * @param {String} filename The path to the template
 * @param {Object} options The option sent by express
 * @param {Function} callback (Optional) The async node style callback
 */
function getTemplate(filename, options, callback) {

  // cache
  if (options.cache) {
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
    if (options.cache && template) {
      cache.set(filename, template);
    }

    if (isAsync) {
      callback(err, template);
    }

    return template;
  }

  // sync
  if (!isAsync) {
    return done(null, buildTemplate(filename, options));
  }

  // async
  buildTemplate(filename, options, done);
}

/**
 * Builds a template from a file
 * If callback is passed, it will be called asynchronously.
 * @param {String} filename The path to the template
 * @param {Object} options The options sent by express
 * @param {Function} callback (Optional) The async node style callback
 */
function buildTemplate(filename, options, callback) {
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
    catch(err) {
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

  // check if a layout is needed
  var masterFilename = null;
  str = str.replace(settings.layout, function(m, master) {
    masterFilename = path.join(path.dirname(filename), master);
  });

  // normal view, no layouts
  if (masterFilename === null) {
    return new Template({ options: options, templateStr: str, });
  }

  // layout sections
  var sections = {};
  str = str.replace(settings.dot.define, function(m, code, assign, value) {
    sections[code] = value;
  });

  return new Template({
    options: options,
    masterFilename: masterFilename,
    sectionStrList: sections,
  });
}

/**
 * Express view engine
 * @param {String} filename
 * @param {Object} options The model to pass to the view
 * @param {Function} callback The async node style callback
 */
function engine(filename, options, callback) {
  getTemplate(
    filename,
    options,
    function(err, template) {
      if (err) { callback(err); return; }

      template.render(
        {},
        options,
        callback
      );
    }
  );
}

module.exports = {
  __express: engine,
  cache: cache,
  settings: settings,
};
