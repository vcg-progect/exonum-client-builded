'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SIGNATURE_LENGTH = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.newTransaction = newTransaction;
exports.isTransaction = isTransaction;
exports.newPrecommit = newPrecommit;

var _primitive = require('./primitive');

var _hexadecimal = require('./hexadecimal');

var _crypto = require('../crypto');

var crypto = _interopRequireWildcard(_crypto);

var _transport = require('../blockchain/transport');

var _helpers = require('../helpers');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SIGNATURE_LENGTH = exports.SIGNATURE_LENGTH = 64;
var TRANSACTION_CLASS = 0;
var TRANSACTION_TYPE = 0;
var PRECOMMIT_CLASS = 1;
var PRECOMMIT_TYPE = 0;

var Message = function Message(type) {
  _classCallCheck(this, Message);

  this.schema = type.schema;
  this.author = type.author;
  this.cls = type.cls;
  this.type = type.type;
};

/**
 * @constructor
 * @param {Object} type
 */


var Transaction = function (_Message) {
  _inherits(Transaction, _Message);

  function Transaction(type) {
    _classCallCheck(this, Transaction);

    var _this = _possibleConstructorReturn(this, (Transaction.__proto__ || Object.getPrototypeOf(Transaction)).call(this, type));

    _this.cls = TRANSACTION_CLASS;
    _this.type = TRANSACTION_TYPE;
    _this.service_id = type.service_id;
    _this.message_id = type.message_id;
    _this.signature = type.signature;
    return _this;
  }

  /**
   * Serialization header
   * @returns {Array}
   */


  _createClass(Transaction, [{
    key: 'serializeHeader',
    value: function serializeHeader() {
      var buffer = [];
      _hexadecimal.PublicKey.serialize(this.author, buffer, buffer.length);
      _primitive.Uint8.serialize(this.cls, buffer, buffer.length);
      _primitive.Uint8.serialize(this.type, buffer, buffer.length);
      _primitive.Uint16.serialize(this.service_id, buffer, buffer.length);
      _primitive.Uint16.serialize(this.message_id, buffer, buffer.length);
      return buffer;
    }

    /**
     * Serialize into array of 8-bit integers
     * @param {Object} data
     * @returns {Array}
     */

  }, {
    key: 'serialize',
    value: function serialize(data) {
      var object = (0, _helpers.cleanZeroValuedFields)(data, {});
      var buffer = this.serializeHeader();
      var body = this.schema.encode(object).finish();

      body.forEach(function (element) {
        buffer.push(element);
      });

      if (this.signature) {
        _hexadecimal.Digest.serialize(this.signature, buffer, buffer.length);
      }

      return buffer;
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

    /**
     * Send transaction to the blockchain
     * @param {string} explorerBasePath
     * @param {Object} data
     * @param {string} secretKey
     * @param {number} attempts
     * @param {number} timeout
     * @param {Object} body
     * @param {Object} headers
     * @returns {Promise}
     */

  }, {
    key: 'send',
    value: function send(explorerBasePath, data, secretKey, attempts, timeout, body, headers) {
      return (0, _transport.send)(explorerBasePath, this, data, secretKey, attempts, timeout, body, headers);
    }
  }]);

  return Transaction;
}(Message);

/**
 * Create element of Transaction class
 * @param {Object} type
 * @returns {Transaction}
 */


function newTransaction(type) {
  return new Transaction(type);
}

/**
 * Check if passed object is of type Transaction
 * @param type
 * @returns {boolean}
 */
function isTransaction(type) {
  return type instanceof Transaction;
}

/**
 * @constructor
 * @param {Object} type
 */

var Precommit = function (_Message2) {
  _inherits(Precommit, _Message2);

  function Precommit(type) {
    _classCallCheck(this, Precommit);

    var _this2 = _possibleConstructorReturn(this, (Precommit.__proto__ || Object.getPrototypeOf(Precommit)).call(this, type));

    _this2.cls = PRECOMMIT_CLASS;
    _this2.type = PRECOMMIT_TYPE;
    return _this2;
  }

  /**
   * Serialization header
   * @returns {Array}
   */


  _createClass(Precommit, [{
    key: 'serializeHeader',
    value: function serializeHeader() {
      var buffer = [];
      _hexadecimal.PublicKey.serialize(this.author, buffer, buffer.length);
      _primitive.Uint8.serialize(this.cls, buffer, buffer.length);
      _primitive.Uint8.serialize(this.type, buffer, buffer.length);
      return buffer;
    }

    /**
     * Serialize data into array of 8-bit integers
     * @param {Object} data
     * @returns {Array}
     */

  }, {
    key: 'serialize',
    value: function serialize(data) {
      var object = (0, _helpers.cleanZeroValuedFields)(data, {});
      var buffer = this.serializeHeader();
      var body = this.schema.encode(object).finish();

      body.forEach(function (element) {
        buffer.push(element);
      });

      return buffer;
    }
  }]);

  return Precommit;
}(Message);

/**
 * Create element of Precommit class
 * @param {Object} type
 * @returns {Precommit}
 */


function newPrecommit(type) {
  return new Precommit(type);
}
