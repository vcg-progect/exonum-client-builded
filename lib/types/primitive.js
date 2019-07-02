'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Bool = exports.Uint16 = exports.Uint8 = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bigInteger = require('big-integer');

var _bigInteger2 = _interopRequireDefault(_bigInteger);

var _validate = require('./validate');

var validate = _interopRequireWildcard(_validate);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MAX_UINT8 = 255;
var MAX_UINT16 = 65535;

/**
 * Insert number into array as as little-endian
 * @param {number|bigInt} number
 * @param {Array} buffer
 * @param {number} from
 * @param {number} size
 * @returns {boolean}
 */
function insertIntegerToByteArray(number, buffer, from, size) {
  var value = (0, _bigInteger2.default)(number); // convert a number-like object into a big integer

  for (var pos = 0; pos < size; pos++) {
    var divmod = value.divmod(256);
    buffer[from + pos] = divmod.remainder.toJSNumber();
    value = divmod.quotient;
  }

  return buffer;
}

var Uint8 = exports.Uint8 = function () {
  function Uint8() {
    _classCallCheck(this, Uint8);
  }

  _createClass(Uint8, null, [{
    key: 'size',
    value: function size() {
      return 1;
    }

    /**
     * @param {number} value
     * @param {Array} buffer
     * @param {number} from
     * @returns {Array}
     */

  }, {
    key: 'serialize',
    value: function serialize(value, buffer, from) {
      if (!validate.validateInteger(value, 0, MAX_UINT8, from, this.size())) {
        throw new TypeError('Uint8 of wrong type is passed: ' + value);
      }

      return insertIntegerToByteArray(value, buffer, from, this.size());
    }
  }]);

  return Uint8;
}();

var Uint16 = exports.Uint16 = function () {
  function Uint16() {
    _classCallCheck(this, Uint16);
  }

  _createClass(Uint16, null, [{
    key: 'size',
    value: function size() {
      return 2;
    }

    /**
     * @param {number} value
     * @param {Array} buffer
     * @param {number} from
     * @returns {Array}
     */

  }, {
    key: 'serialize',
    value: function serialize(value, buffer, from) {
      if (!validate.validateInteger(value, 0, MAX_UINT16, from, this.size())) {
        throw new TypeError('Uint16 of wrong type is passed: ' + value);
      }

      return insertIntegerToByteArray(value, buffer, from, this.size());
    }
  }]);

  return Uint16;
}();

var Bool = exports.Bool = function () {
  function Bool() {
    _classCallCheck(this, Bool);
  }

  _createClass(Bool, null, [{
    key: 'size',
    value: function size() {
      return 1;
    }

    /**
     * @param {boolean} value
     * @param {Array} buffer
     * @param {number} from
     * @returns {Array}
     */

  }, {
    key: 'serialize',
    value: function serialize(value, buffer, from) {
      if (typeof value !== 'boolean') {
        throw new TypeError('Wrong data type is passed as Boolean. Boolean is required');
      }

      return insertIntegerToByteArray(value ? 1 : 0, buffer, from, this.size());
    }
  }]);

  return Bool;
}();
