'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.newType = newType;
exports.isType = isType;

var _crypto = require('../crypto');

var crypto = _interopRequireWildcard(_crypto);

var _helpers = require('../helpers');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @constructor
 * @param {Object} schema
 */
var Type = function () {
  function Type(schema) {
    _classCallCheck(this, Type);

    this.schema = schema;
  }

  /**
   * Serialize data into array of 8-bit integers
   * @param {Object} data
   * @returns {Array}
   */


  _createClass(Type, [{
    key: 'serialize',
    value: function serialize(data) {
      var object = (0, _helpers.cleanZeroValuedFields)(data, {});

      return Array.from(this.schema.encode(object).finish());
    }

    /**
     * Get SHA256 hash
     * @param {Object} data
     * @returns {string}
     */

  }, {
    key: 'hash',
    value: function hash(data) {
      return crypto.hash(data, this);
    }

    /**
     * Get ED25519 signature
     * @param {string} secretKey
     * @param {Object} data
     * @returns {string}
     */

  }, {
    key: 'sign',
    value: function sign(secretKey, data) {
      return crypto.sign(secretKey, data, this);
    }

    /**
     * Verifies ED25519 signature
     * @param {string} signature
     * @param {string} publicKey
     * @param {Object} data
     * @returns {boolean}
     */

  }, {
    key: 'verifySignature',
    value: function verifySignature(signature, publicKey, data) {
      return crypto.verifySignature(signature, publicKey, data, this);
    }
  }]);

  return Type;
}();

/**
 * Create element of Type class
 * @param {Object} type
 * @returns {Type}
 */


function newType(type) {
  return new Type(type);
}

/**
 * Check if passed object is of type Type
 * @param {Object} type
 * @returns {boolean}
 */
function isType(type) {
  return type instanceof Type;
}
