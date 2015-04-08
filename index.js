'use strict';

// TODO: refactor JSDoc
// TODO: add tests

var chai = require('chai');
var webdriver = require('selenium-webdriver');
var queue = require('./lib/queue');
var PropertyAssertion = require('./lib/assertions/property-assertion');
var StateAssertion = require('./lib/assertions/state-assertion');
var tinto = require('./lib/tinto');

module.exports = tinto;

module.exports.Assertable = require('./lib/assertable');
module.exports.Component = require('./lib/component');
module.exports.ComponentCollection = require('./lib/component-collection');
module.exports.Evaluator = require('./lib/evaluator');

var evaluator = new module.exports.Evaluator();

// TODO: remove this from public interface
module.exports.evaluator = evaluator;
module.exports.inherits = require('./lib/utils/inherits');
module.exports.key = webdriver.Key;
module.exports.open = evaluator.open.bind(evaluator);
module.exports.close = evaluator.close.bind(evaluator);
module.exports.done = queue.process.bind(queue);

// TODO: replace with built in assertions
chai.use(require('./lib/assertions'));

// Default states
StateAssertion.register('empty');

// Default properties
PropertyAssertion.register('text');
PropertyAssertion.register('value');
