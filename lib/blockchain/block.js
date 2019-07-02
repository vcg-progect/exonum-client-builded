'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.protocol = undefined;
exports.verifyBlock = verifyBlock;

var _long = require('long');

var Long = _interopRequireWildcard(_long);

var _protocol = require('../../proto/protocol.js');

var protocol = _interopRequireWildcard(_protocol);

var _message2 = require('../types/message');

var _convert = require('../types/convert');

var _hexadecimal = require('../types/hexadecimal');

var _crypto = require('../crypto');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

/**
 * Validate block and each precommit in block
 * @param {Object} data
 * @param {Array} validators
 * @return {Promise}
 */
function verifyBlock(data, validators) {
  return new Promise(function (resolve) {
    var block = {
      prev_hash: { data: (0, _convert.hexadecimalToUint8Array)(data.block.prev_hash) },
      tx_hash: { data: (0, _convert.hexadecimalToUint8Array)(data.block.tx_hash) },
      state_hash: { data: (0, _convert.hexadecimalToUint8Array)(data.block.state_hash) }
    };
    var blockHash = void 0;

    if (data.block.proposer_id !== 0) {
      block.proposer_id = data.block.proposer_id;
    }

    if (data.block.height !== 0) {
      block.height = data.block.height;
    }

    if (data.block.tx_count !== 0) {
      block.tx_count = data.block.tx_count;
    }

    var message = protocol.exonum.Block.create(block);
    var buffer = new Uint8Array(protocol.exonum.Block.encode(message).finish());

    blockHash = (0, _crypto.hash)(buffer);

    for (var i = 0; i < data.precommits.length; i++) {
      var precommit = data.precommits[i];
      var _buffer = (0, _convert.hexadecimalToUint8Array)(precommit);
      var _message = protocol.exonum.consensus.Precommit.decode(new Uint8Array(_buffer.slice(34, _buffer.length - _message2.SIGNATURE_LENGTH)));
      var plain = protocol.exonum.consensus.Precommit.toObject(_message);

      if (Long.fromValue(plain.height).compare(Long.fromValue(data.block.height)) !== 0) {
        throw new Error('Precommit height is not match with block height');
      }

      if ((0, _convert.uint8ArrayToHexadecimal)(plain.block_hash.data) !== blockHash) {
        throw new Error('Precommit block hash is not match with calculated block hash');
      }

      var publicKey = validators[plain.validator || 0];
      if ((0, _convert.uint8ArrayToHexadecimal)(_buffer.slice(0, _hexadecimal.PUBLIC_KEY_LENGTH)) !== publicKey) {
        throw new Error('Precommit public key is not match with buffer');
      }

      var signature = (0, _convert.uint8ArrayToHexadecimal)(_buffer.slice(_buffer.length - _message2.SIGNATURE_LENGTH, _buffer.length));

      if (!(0, _crypto.verifySignature)(signature, publicKey, _buffer.slice(0, _buffer.length - _message2.SIGNATURE_LENGTH))) {
        throw new Error('Precommit signature is wrong');
      }
    }

    resolve();
  });
}

exports.protocol = protocol;
