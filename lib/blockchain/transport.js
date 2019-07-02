'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.send = send;
exports.sendQueue = sendQueue;

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _helpers = require('../helpers');

var _crypto = require('../crypto');

var _validate = require('../types/validate');

var validate = _interopRequireWildcard(_validate);

var _convert = require('../types/convert');

var _message = require('../types/message');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ATTEMPTS = 10;
var ATTEMPT_TIMEOUT = 500;

/**
 * Send transaction to the blockchain
 * @param {string} explorerBasePath
 * @param {Transaction} type
 * @param {Object} data
 * @param {string} secretKey
 * @param {number} attempts
 * @param {number} timeout
 * @param {Object} body
 * @param {Object} headers
 * @return {Promise}
 */
function send(explorerBasePath, type, data, secretKey, attempts, timeout, body, headers) {
  if (typeof explorerBasePath !== 'string') {
    throw new TypeError('Explorer base path endpoint of wrong data type is passed. String is required.');
  }
  if (!(0, _message.isTransaction)(type)) {
    throw new TypeError('Transaction of wrong type is passed.');
  }
  if (!(0, _helpers.isObject)(data)) {
    throw new TypeError('Data of wrong data type is passed. Object is required.');
  }
  if (!validate.validateHexadecimal(secretKey, 64)) {
    throw new TypeError('secretKey of wrong type is passed. Hexadecimal expected.');
  }
  if (typeof attempts !== 'undefined') {
    if (isNaN(parseInt(attempts)) || attempts < 0) {
      throw new TypeError('Attempts of wrong type is passed.');
    }
  } else {
    attempts = ATTEMPTS;
  }
  if (typeof timeout !== 'undefined') {
    if (isNaN(parseInt(timeout)) || timeout <= 0) {
      throw new TypeError('Timeout of wrong type is passed.');
    }
  } else {
    timeout = ATTEMPT_TIMEOUT;
  }

  // clone type
  var typeCopy = (0, _message.newTransaction)(type);

  // sign transaction
  typeCopy.signature = typeCopy.sign(secretKey, data);

  // serialize transaction header and body
  var buffer = typeCopy.serialize(data);

  // convert buffer into hexadecimal string
  var txBody = (0, _convert.uint8ArrayToHexadecimal)(new Uint8Array(buffer));

  // get transaction hash
  var txHash = (0, _crypto.hash)(buffer);
  // expand request body
  var requestBody = Object.assign(body, { tx_body: txBody });

  return _axios2.default.post('' + explorerBasePath, requestBody, headers).then(function () {
    if (attempts === 0) {
      return txHash;
    }

    var count = attempts;

    return function attempt() {
      if (count-- === 0) {
        return new Error('The transaction was not accepted to the block for the expected period.');
      }

      return _axios2.default.get(explorerBasePath + '?hash=' + txHash).then(function (response) {
        if (response.data.type === 'committed') {
          return txHash;
        }

        return new Promise(function (resolve) {
          setTimeout(resolve, timeout);
        }).then(attempt);
      }).catch(function () {
        if (count === 0) {
          return new Error('The request failed or the blockchain node did not respond.');
        }

        return new Promise(function (resolve) {
          setTimeout(resolve, timeout);
        }).then(attempt);
      });
    }();
  });
}

/**
 * Send transaction to the blockchain
 * @param {string} explorerBasePath
 * @param {Array} transactions
 * @param {string} secretKey
 * @param {number} attempts
 * @param {number} timeout
 * @return {Promise}
 */
function sendQueue(explorerBasePath, transactions, secretKey, attempts, timeout) {
  var index = 0;
  var responses = [];

  return function shift() {
    var transaction = transactions[index++];

    return send(explorerBasePath, transaction.type, transaction.data, secretKey, attempts, timeout).then(function (response) {
      responses.push(response);
      if (index < transactions.length) {
        return shift();
      } else {
        return responses;
      }
    });
  }();
}
