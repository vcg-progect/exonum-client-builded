'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.verifyTable = verifyTable;

var _crypto = require('../crypto');

var _primitive = require('../types/primitive');

var _hexadecimal = require('../types/hexadecimal');

var _merklePatricia = require('./merkle-patricia');

/**
 * Serialization table key
 * @param {number} serviceId
 * @param {number} tableIndex
 * @returns {Array}
 */
function serializeKey(serviceId, tableIndex) {
  var buffer = [];
  _primitive.Uint16.serialize(serviceId, buffer, buffer.length);
  _primitive.Uint16.serialize(tableIndex, buffer, buffer.length);
  return buffer;
}

/**
 * Validate path from tree root to some table
 * @param {Object} proof
 * @param {string} stateHash
 * @param {number} serviceId
 * @param {number} tableIndex
 * @returns {string}
 */
function verifyTable(proof, stateHash, serviceId, tableIndex) {
  var keyBuffer = serializeKey(serviceId, tableIndex);

  // calculate key of table in the root tree
  var key = (0, _crypto.hash)(keyBuffer);

  // validate proof of table existence in root tree
  var tableProof = new _merklePatricia.MapProof(proof, _hexadecimal.Hash, _hexadecimal.Hash);

  if (tableProof.merkleRoot !== stateHash) {
    throw new Error('Table proof is corrupted');
  }

  // get root hash of the table
  var rootHash = tableProof.entries.get(key);

  if (typeof rootHash === 'undefined') {
    throw new Error('Table not found in the root tree');
  }

  return rootHash;
}
