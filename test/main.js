var engine = require('../');
var mock = require('mock-fs');
var path = require('path');
var should = require('should');

var expressOptions = {};

describe('express-dot-engine', function() {

  afterEach(function() {
    mock.restore();
  });

  //////////////////////////////////////////////////////////////////////////////
  // SERVER MODEL
  //////////////////////////////////////////////////////////////////////////////
  describe('server model', function() {

    it('should have access to server model', function(done) {
      // prepare
      mock({
        'path/views': {
          'child.dot': 'test-view [[= model.test ]]',
        },
      });

      // run
      engine.__express(
        'path/views/child.dot',
        { test: 'test-model', },
        function(err, result) {
          should(err).not.be.ok;
          should(result).equal('test-view test-model');
          done();
        });
    });

    it('should have access to server model in a layout', function(done) {
      // prepare
      mock({
        'path/views': {
          'master.dot': 'test-master [[= model.test ]]',
          'child.dot': '---\nlayout: master.dot\n---\n',
        },
      });

      // run
      engine.__express(
        'path/views/child.dot',
        { test: 'test-model', },
        function(err, result) {
          should(err).not.be.ok;
          should(result).equal('test-master test-model');
          done();
        });
    });

    it('should have access to server model in a partial', function(done) {
      // prepare
      mock({
        'path/views': {
          'partial.dot': 'test-partial [[= model.test ]]',
          'child.dot': 'test-child [[#def.partial(\'partial.dot\')]]',
        },
      });

      // run
      engine.__express(
        'path/views/child.dot',
        { test: 'test-model', },
        function(err, result) {
          should(err).not.be.ok;
          should(result).equal('test-child test-partial test-model');
          done();
        });
    });

  });

  //////////////////////////////////////////////////////////////////////////////
  // LAYOUT
  //////////////////////////////////////////////////////////////////////////////
  describe('layout', function() {

    it('should support 2 levels', function(done) {
      // prepare
      mock({
        'path/views': {
          'master.dot': 'test-master [[= layout.section ]]',
          'child.dot': '---\nlayout: master.dot\n---\n[[##section:test-child#]]',
        },
      });

      // run
      engine.__express(
        'path/views/child.dot', {},
        function(err, result) {
          should(err).not.be.ok;
          should(result).equal('test-master test-child');
          done();
        });
    });

    it('should support 3 levels', function(done) {
      // prepare
      mock({
        'path/views': {
          'master.dot': 'test-master [[= layout.section ]]',
          'middle.dot': '---\nlayout: master.dot\n---\n[[##section:test-middle [[= layout.section ]]#]]',
          'child.dot': '---\nlayout: middle.dot\n---\n[[##section:test-child#]]',
        },
      });

      // run
      engine.__express(
        'path/views/child.dot', {},
        function(err, result) {
          should(err).not.be.ok;
          should(result).equal('test-master test-middle test-child');
          done();
        });
    });

  });

  //////////////////////////////////////////////////////////////////////////////
  // PARTIAL
  //////////////////////////////////////////////////////////////////////////////
  describe('partial', function() {

    it('should work', function(done) {
      // prepare
      mock({
        'path/views': {
          'partial.dot': 'test-partial',
          'child.dot': 'test-child [[#def.partial(\'partial.dot\')]]',
        },
      });

      // run
      engine.__express(
        'path/views/child.dot',
        { test: 'test-model', },
        function(err, result) {
          should(err).not.be.ok;
          should(result).equal('test-child test-partial');
          done();
        });
    });

  });
});
