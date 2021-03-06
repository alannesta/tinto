'use strict';

// TODO: support find() by Component class and instance
// TODO: handle element removed

var util = require('util');
var Q = require('q');
var queue = require('./queue');
var Entity = require('./entity');
var AssertionResult = require('./assertion-result');
var ComponentCollection = require('./component-collection');
var ElementNotFoundError = require('./errors/element-not-found-error');
var Locator = require('./utils/locator');
var extend = require('./utils/extend');
var inherits = require('./utils/inherits');
var evaluator = require('./utils/evaluator');
var bundles = require('./tinto');
var tinto = {};

/**
 * @param {tinto.Locator} locator
 * @constructor
 * @extends tinto.Entity
 */
tinto.Component = function Component(locator) {
  Entity.call(this);

  this._locator = locator;

  this.state('available', available);
  this.state('missing', missing);
};

inherits(tinto.Component, Entity);

/**
 * @param {Object} [protoProps]
 * @param {Object} [staticProps]
 * @returns {function(this:tinto.Component,new:tinto.Component,Promise)}
 */
tinto.Component.extend = function(protoProps, staticProps) {
  return extend.call(this, protoProps, staticProps);
};

/**
 * @param {tinto.Component} component
 * @returns {tinto.Component}
 */
tinto.Component.from = function(component) {
  return new this(component._locator);
};

/**
 * @returns {string}
 */
tinto.Component.prototype.toString = function() {
  if (this._locator.id) {
    return '[' + this.constructor.name + ':' + this._locator.id + ']';
  } else {
    return this._locator.getMessage();
  }
};

/**
 * @template T
 * @param {T} type
 * @returns {T}
 */
tinto.Component.prototype.as = function(type) {
  return tinto.Component.from.call(type, this);
};

/**
 * @param {...tinto.Component} components
 * @returns {function() : Promise.<tinto.AssertionResult>}
 */
tinto.Component.prototype.contains = function(components) {
  var self = this;

  components = Array.prototype.slice.call(arguments, 0);

  return function() {
    return Q.all(components.map(function(component) {
      return component.getElement().then(function(element) {
        return self.execute(function(element) {
          return this.contains(element);
        }, element).then(function(result) {
          return new AssertionResult(result, component.toString());
        });
      });
    }));
  };
};

/**
 * @param {tinto.Component} component
 * @returns {function() : Promise.<tinto.AssertionResult>}
 */
tinto.Component.prototype.equals = function(component) {
  var self = this;

  return function() {
    return component.getElement().then(function(element) {
      return self.execute(function(element) {
        return this === element;
      }, element).then(function(result) {
        return new AssertionResult(result, component.toString(), self.toString());
      });
    });
  };
};

/**
 * @param {string} name
 * @param {function} [matcher]
 * @param {Array.<*>} [args]
 */
tinto.Component.prototype.state = function(name, matcher, args) {
  support.call(this, 'state', 'states', name, matcher, args, 'State "%s" does not exist');
};

/**
 * @param {string} name
 * @param {function} [matcher]
 * @param {Array.<*>} [args]
 */
tinto.Component.prototype.property = function(name, matcher, args) {
  support.call(this, 'property', 'properties', name, matcher, args, 'Property "%s" does not exist');
};

/**
 * @returns {Promise.<webdriver.WebElement>}
 */
tinto.Component.prototype.getElement = function() {
  var self = this;

  return Q.when(evaluator.getDriver().wait(this._locator.locate.bind(this._locator), 200))
    .catch(function() {
      throw new ElementNotFoundError(self._locator);
    });
};

/**
 * @returns {Promise.<string>}
 */
tinto.Component.prototype.getText = function() {
  return this.getElement().then(function(element) {
    return element.getText();
  });
};

/**
 * @param {string} name
 * @returns {Promise.<string>}
 */
tinto.Component.prototype.getAttribute = function(name) {
  return this.getElement().then(function(element) {
    return element.getAttribute(name);
  });
};

/**
 * @returns {tinto.Component}
 */
tinto.Component.prototype.click = function() {
  var self = this;

  queue.push(function() {
    return self.getElement().then(function(element) {
      return element.click();
    });
  });

  return this;
};

/**
 * @param {...string} keys
 * @returns {tinto.Component}
 */
tinto.Component.prototype.enter = function(keys) {
  var self = this;

  keys = arguments;

  queue.push(function() {
    return self.getElement().then(function(element) {
      return element.sendKeys.apply(element, keys);
    });
  });
};

/**
 * @param {string} selector
 * @param {Boolean} cache
 * @returns {tinto.ComponentCollection.<tinto.Component>}
 */
tinto.Component.prototype.find = function(selector, cache) {
  return new ComponentCollection(tinto.Component, new Locator(selector, {
    parent: this,
    cache: cache
  }));
};

/**
 * @param {!function(this:tinto.Component)} callback
 * @param {...*} [args]
 * @returns {Promise}
 */
tinto.Component.prototype.execute = function(callback, args) {
  args = Array.prototype.slice.call(arguments, 0);

  return evaluator.execute.apply(evaluator, [this.getElement()].concat(args));
};

/**
 * @private
 * @param {string} type
 * @param {string} pluralType
 * @param {string} name
 * @param {function} matcher
 * @param {Array.<*>} args
 * @param {string} message
 */
function support(type, pluralType, name, matcher, args, message) {
  if (matcher instanceof Array) {
    args = matcher;
    matcher = null;
  }

  if (!matcher && this.__bundle__) {
    matcher = bundles[this.__bundle__][pluralType] && bundles[this.__bundle__][pluralType][name];
  }

  if (!matcher) {
    matcher = bundles.html[pluralType] && bundles.html[pluralType][name];
  }

  if (!matcher) {
    throw new Error(util.format(message, name));
  }

  Entity.prototype[type].call(this, name, matcher, args);
}

/**
 * @private
 * @this tinto.Component
 * @returns {Promise.<Boolean>}
 */
function available() {
  return this.is('missing')().then(function(result) {
    return !result.outcome;
  });
}

/**
 * @private
 * @this tinto.Component
 * @returns {Promise.<Boolean>}
 */
function missing() {
  return this._locator.locate().then(function(element) {
    return element === undefined;
  });
}

module.exports = tinto.Component;
