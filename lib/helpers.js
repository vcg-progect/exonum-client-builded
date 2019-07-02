'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.isObject = isObject;
exports.verifyElement = verifyElement;
exports.cleanZeroValuedFields = cleanZeroValuedFields;
function isStrictTypedArray(arr) {
  return arr instanceof Int8Array || arr instanceof Int16Array || arr instanceof Int32Array || arr instanceof Uint8Array || arr instanceof Uint8ClampedArray || arr instanceof Uint16Array || arr instanceof Uint32Array || arr instanceof Float32Array || arr instanceof Float64Array;
}

/**
 * Check if element is of type Object
 * @param obj
 * @returns {boolean}
 */
function isObject(obj) {
  return (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && !Array.isArray(obj) && obj !== null && !(obj instanceof Date);
}

/**
 * @param {Object} element
 * @returns {boolean}
 */
function verifyElement(element) {
  switch (typeof element === 'undefined' ? 'undefined' : _typeof(element)) {
    case 'string':
      return element !== '0' && element.length !== 0;
    case 'number':
      return element !== 0;
  }
  return true;
}

/**
 * @param {Object} data
 * @param {Object} object
 * @returns {Object}
 */
function cleanZeroValuedFields(data, object) {
  var keys = Object.keys(data);
  keys.forEach(function (key) {
    if (isStrictTypedArray(data[key]) || data[key] instanceof Array) {
      object[key] = data[key];
    } else {
      if (_typeof(data[key]) === 'object') {
        object[key] = cleanZeroValuedFields(data[key], {});
      } else {
        if (verifyElement(data[key])) {
          object[key] = data[key];
        }
      }
    }
  });
  return object;
}
