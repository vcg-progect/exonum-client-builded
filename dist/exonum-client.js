(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Exonum = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
module.exports = asPromise;

/**
 * Callback as used by {@link util.asPromise}.
 * @typedef asPromiseCallback
 * @type {function}
 * @param {Error|null} error Error, if any
 * @param {...*} params Additional arguments
 * @returns {undefined}
 */

/**
 * Returns a promise from a node-style callback function.
 * @memberof util
 * @param {asPromiseCallback} fn Function to call
 * @param {*} ctx Function context
 * @param {...*} params Function arguments
 * @returns {Promise<*>} Promisified function
 */
function asPromise(fn, ctx/*, varargs */) {
    var params  = new Array(arguments.length - 1),
        offset  = 0,
        index   = 2,
        pending = true;
    while (index < arguments.length)
        params[offset++] = arguments[index++];
    return new Promise(function executor(resolve, reject) {
        params[offset] = function callback(err/*, varargs */) {
            if (pending) {
                pending = false;
                if (err)
                    reject(err);
                else {
                    var params = new Array(arguments.length - 1),
                        offset = 0;
                    while (offset < params.length)
                        params[offset++] = arguments[offset];
                    resolve.apply(null, params);
                }
            }
        };
        try {
            fn.apply(ctx || null, params);
        } catch (err) {
            if (pending) {
                pending = false;
                reject(err);
            }
        }
    });
}

},{}],2:[function(require,module,exports){
"use strict";

/**
 * A minimal base64 implementation for number arrays.
 * @memberof util
 * @namespace
 */
var base64 = exports;

/**
 * Calculates the byte length of a base64 encoded string.
 * @param {string} string Base64 encoded string
 * @returns {number} Byte length
 */
base64.length = function length(string) {
    var p = string.length;
    if (!p)
        return 0;
    var n = 0;
    while (--p % 4 > 1 && string.charAt(p) === "=")
        ++n;
    return Math.ceil(string.length * 3) / 4 - n;
};

// Base64 encoding table
var b64 = new Array(64);

// Base64 decoding table
var s64 = new Array(123);

// 65..90, 97..122, 48..57, 43, 47
for (var i = 0; i < 64;)
    s64[b64[i] = i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i - 59 | 43] = i++;

/**
 * Encodes a buffer to a base64 encoded string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} Base64 encoded string
 */
base64.encode = function encode(buffer, start, end) {
    var parts = null,
        chunk = [];
    var i = 0, // output index
        j = 0, // goto index
        t;     // temporary
    while (start < end) {
        var b = buffer[start++];
        switch (j) {
            case 0:
                chunk[i++] = b64[b >> 2];
                t = (b & 3) << 4;
                j = 1;
                break;
            case 1:
                chunk[i++] = b64[t | b >> 4];
                t = (b & 15) << 2;
                j = 2;
                break;
            case 2:
                chunk[i++] = b64[t | b >> 6];
                chunk[i++] = b64[b & 63];
                j = 0;
                break;
        }
        if (i > 8191) {
            (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
            i = 0;
        }
    }
    if (j) {
        chunk[i++] = b64[t];
        chunk[i++] = 61;
        if (j === 1)
            chunk[i++] = 61;
    }
    if (parts) {
        if (i)
            parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
        return parts.join("");
    }
    return String.fromCharCode.apply(String, chunk.slice(0, i));
};

var invalidEncoding = "invalid encoding";

/**
 * Decodes a base64 encoded string to a buffer.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Number of bytes written
 * @throws {Error} If encoding is invalid
 */
base64.decode = function decode(string, buffer, offset) {
    var start = offset;
    var j = 0, // goto index
        t;     // temporary
    for (var i = 0; i < string.length;) {
        var c = string.charCodeAt(i++);
        if (c === 61 && j > 1)
            break;
        if ((c = s64[c]) === undefined)
            throw Error(invalidEncoding);
        switch (j) {
            case 0:
                t = c;
                j = 1;
                break;
            case 1:
                buffer[offset++] = t << 2 | (c & 48) >> 4;
                t = c;
                j = 2;
                break;
            case 2:
                buffer[offset++] = (t & 15) << 4 | (c & 60) >> 2;
                t = c;
                j = 3;
                break;
            case 3:
                buffer[offset++] = (t & 3) << 6 | c;
                j = 0;
                break;
        }
    }
    if (j === 1)
        throw Error(invalidEncoding);
    return offset - start;
};

/**
 * Tests if the specified string appears to be base64 encoded.
 * @param {string} string String to test
 * @returns {boolean} `true` if probably base64 encoded, otherwise false
 */
base64.test = function test(string) {
    return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(string);
};

},{}],3:[function(require,module,exports){
"use strict";
module.exports = EventEmitter;

/**
 * Constructs a new event emitter instance.
 * @classdesc A minimal event emitter.
 * @memberof util
 * @constructor
 */
function EventEmitter() {

    /**
     * Registered listeners.
     * @type {Object.<string,*>}
     * @private
     */
    this._listeners = {};
}

/**
 * Registers an event listener.
 * @param {string} evt Event name
 * @param {function} fn Listener
 * @param {*} [ctx] Listener context
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.on = function on(evt, fn, ctx) {
    (this._listeners[evt] || (this._listeners[evt] = [])).push({
        fn  : fn,
        ctx : ctx || this
    });
    return this;
};

/**
 * Removes an event listener or any matching listeners if arguments are omitted.
 * @param {string} [evt] Event name. Removes all listeners if omitted.
 * @param {function} [fn] Listener to remove. Removes all listeners of `evt` if omitted.
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.off = function off(evt, fn) {
    if (evt === undefined)
        this._listeners = {};
    else {
        if (fn === undefined)
            this._listeners[evt] = [];
        else {
            var listeners = this._listeners[evt];
            for (var i = 0; i < listeners.length;)
                if (listeners[i].fn === fn)
                    listeners.splice(i, 1);
                else
                    ++i;
        }
    }
    return this;
};

/**
 * Emits an event by calling its listeners with the specified arguments.
 * @param {string} evt Event name
 * @param {...*} args Arguments
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.emit = function emit(evt) {
    var listeners = this._listeners[evt];
    if (listeners) {
        var args = [],
            i = 1;
        for (; i < arguments.length;)
            args.push(arguments[i++]);
        for (i = 0; i < listeners.length;)
            listeners[i].fn.apply(listeners[i++].ctx, args);
    }
    return this;
};

},{}],4:[function(require,module,exports){
"use strict";

module.exports = factory(factory);

/**
 * Reads / writes floats / doubles from / to buffers.
 * @name util.float
 * @namespace
 */

/**
 * Writes a 32 bit float to a buffer using little endian byte order.
 * @name util.float.writeFloatLE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Writes a 32 bit float to a buffer using big endian byte order.
 * @name util.float.writeFloatBE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Reads a 32 bit float from a buffer using little endian byte order.
 * @name util.float.readFloatLE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Reads a 32 bit float from a buffer using big endian byte order.
 * @name util.float.readFloatBE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Writes a 64 bit double to a buffer using little endian byte order.
 * @name util.float.writeDoubleLE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Writes a 64 bit double to a buffer using big endian byte order.
 * @name util.float.writeDoubleBE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Reads a 64 bit double from a buffer using little endian byte order.
 * @name util.float.readDoubleLE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Reads a 64 bit double from a buffer using big endian byte order.
 * @name util.float.readDoubleBE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

// Factory function for the purpose of node-based testing in modified global environments
function factory(exports) {

    // float: typed array
    if (typeof Float32Array !== "undefined") (function() {

        var f32 = new Float32Array([ -0 ]),
            f8b = new Uint8Array(f32.buffer),
            le  = f8b[3] === 128;

        function writeFloat_f32_cpy(val, buf, pos) {
            f32[0] = val;
            buf[pos    ] = f8b[0];
            buf[pos + 1] = f8b[1];
            buf[pos + 2] = f8b[2];
            buf[pos + 3] = f8b[3];
        }

        function writeFloat_f32_rev(val, buf, pos) {
            f32[0] = val;
            buf[pos    ] = f8b[3];
            buf[pos + 1] = f8b[2];
            buf[pos + 2] = f8b[1];
            buf[pos + 3] = f8b[0];
        }

        /* istanbul ignore next */
        exports.writeFloatLE = le ? writeFloat_f32_cpy : writeFloat_f32_rev;
        /* istanbul ignore next */
        exports.writeFloatBE = le ? writeFloat_f32_rev : writeFloat_f32_cpy;

        function readFloat_f32_cpy(buf, pos) {
            f8b[0] = buf[pos    ];
            f8b[1] = buf[pos + 1];
            f8b[2] = buf[pos + 2];
            f8b[3] = buf[pos + 3];
            return f32[0];
        }

        function readFloat_f32_rev(buf, pos) {
            f8b[3] = buf[pos    ];
            f8b[2] = buf[pos + 1];
            f8b[1] = buf[pos + 2];
            f8b[0] = buf[pos + 3];
            return f32[0];
        }

        /* istanbul ignore next */
        exports.readFloatLE = le ? readFloat_f32_cpy : readFloat_f32_rev;
        /* istanbul ignore next */
        exports.readFloatBE = le ? readFloat_f32_rev : readFloat_f32_cpy;

    // float: ieee754
    })(); else (function() {

        function writeFloat_ieee754(writeUint, val, buf, pos) {
            var sign = val < 0 ? 1 : 0;
            if (sign)
                val = -val;
            if (val === 0)
                writeUint(1 / val > 0 ? /* positive */ 0 : /* negative 0 */ 2147483648, buf, pos);
            else if (isNaN(val))
                writeUint(2143289344, buf, pos);
            else if (val > 3.4028234663852886e+38) // +-Infinity
                writeUint((sign << 31 | 2139095040) >>> 0, buf, pos);
            else if (val < 1.1754943508222875e-38) // denormal
                writeUint((sign << 31 | Math.round(val / 1.401298464324817e-45)) >>> 0, buf, pos);
            else {
                var exponent = Math.floor(Math.log(val) / Math.LN2),
                    mantissa = Math.round(val * Math.pow(2, -exponent) * 8388608) & 8388607;
                writeUint((sign << 31 | exponent + 127 << 23 | mantissa) >>> 0, buf, pos);
            }
        }

        exports.writeFloatLE = writeFloat_ieee754.bind(null, writeUintLE);
        exports.writeFloatBE = writeFloat_ieee754.bind(null, writeUintBE);

        function readFloat_ieee754(readUint, buf, pos) {
            var uint = readUint(buf, pos),
                sign = (uint >> 31) * 2 + 1,
                exponent = uint >>> 23 & 255,
                mantissa = uint & 8388607;
            return exponent === 255
                ? mantissa
                ? NaN
                : sign * Infinity
                : exponent === 0 // denormal
                ? sign * 1.401298464324817e-45 * mantissa
                : sign * Math.pow(2, exponent - 150) * (mantissa + 8388608);
        }

        exports.readFloatLE = readFloat_ieee754.bind(null, readUintLE);
        exports.readFloatBE = readFloat_ieee754.bind(null, readUintBE);

    })();

    // double: typed array
    if (typeof Float64Array !== "undefined") (function() {

        var f64 = new Float64Array([-0]),
            f8b = new Uint8Array(f64.buffer),
            le  = f8b[7] === 128;

        function writeDouble_f64_cpy(val, buf, pos) {
            f64[0] = val;
            buf[pos    ] = f8b[0];
            buf[pos + 1] = f8b[1];
            buf[pos + 2] = f8b[2];
            buf[pos + 3] = f8b[3];
            buf[pos + 4] = f8b[4];
            buf[pos + 5] = f8b[5];
            buf[pos + 6] = f8b[6];
            buf[pos + 7] = f8b[7];
        }

        function writeDouble_f64_rev(val, buf, pos) {
            f64[0] = val;
            buf[pos    ] = f8b[7];
            buf[pos + 1] = f8b[6];
            buf[pos + 2] = f8b[5];
            buf[pos + 3] = f8b[4];
            buf[pos + 4] = f8b[3];
            buf[pos + 5] = f8b[2];
            buf[pos + 6] = f8b[1];
            buf[pos + 7] = f8b[0];
        }

        /* istanbul ignore next */
        exports.writeDoubleLE = le ? writeDouble_f64_cpy : writeDouble_f64_rev;
        /* istanbul ignore next */
        exports.writeDoubleBE = le ? writeDouble_f64_rev : writeDouble_f64_cpy;

        function readDouble_f64_cpy(buf, pos) {
            f8b[0] = buf[pos    ];
            f8b[1] = buf[pos + 1];
            f8b[2] = buf[pos + 2];
            f8b[3] = buf[pos + 3];
            f8b[4] = buf[pos + 4];
            f8b[5] = buf[pos + 5];
            f8b[6] = buf[pos + 6];
            f8b[7] = buf[pos + 7];
            return f64[0];
        }

        function readDouble_f64_rev(buf, pos) {
            f8b[7] = buf[pos    ];
            f8b[6] = buf[pos + 1];
            f8b[5] = buf[pos + 2];
            f8b[4] = buf[pos + 3];
            f8b[3] = buf[pos + 4];
            f8b[2] = buf[pos + 5];
            f8b[1] = buf[pos + 6];
            f8b[0] = buf[pos + 7];
            return f64[0];
        }

        /* istanbul ignore next */
        exports.readDoubleLE = le ? readDouble_f64_cpy : readDouble_f64_rev;
        /* istanbul ignore next */
        exports.readDoubleBE = le ? readDouble_f64_rev : readDouble_f64_cpy;

    // double: ieee754
    })(); else (function() {

        function writeDouble_ieee754(writeUint, off0, off1, val, buf, pos) {
            var sign = val < 0 ? 1 : 0;
            if (sign)
                val = -val;
            if (val === 0) {
                writeUint(0, buf, pos + off0);
                writeUint(1 / val > 0 ? /* positive */ 0 : /* negative 0 */ 2147483648, buf, pos + off1);
            } else if (isNaN(val)) {
                writeUint(0, buf, pos + off0);
                writeUint(2146959360, buf, pos + off1);
            } else if (val > 1.7976931348623157e+308) { // +-Infinity
                writeUint(0, buf, pos + off0);
                writeUint((sign << 31 | 2146435072) >>> 0, buf, pos + off1);
            } else {
                var mantissa;
                if (val < 2.2250738585072014e-308) { // denormal
                    mantissa = val / 5e-324;
                    writeUint(mantissa >>> 0, buf, pos + off0);
                    writeUint((sign << 31 | mantissa / 4294967296) >>> 0, buf, pos + off1);
                } else {
                    var exponent = Math.floor(Math.log(val) / Math.LN2);
                    if (exponent === 1024)
                        exponent = 1023;
                    mantissa = val * Math.pow(2, -exponent);
                    writeUint(mantissa * 4503599627370496 >>> 0, buf, pos + off0);
                    writeUint((sign << 31 | exponent + 1023 << 20 | mantissa * 1048576 & 1048575) >>> 0, buf, pos + off1);
                }
            }
        }

        exports.writeDoubleLE = writeDouble_ieee754.bind(null, writeUintLE, 0, 4);
        exports.writeDoubleBE = writeDouble_ieee754.bind(null, writeUintBE, 4, 0);

        function readDouble_ieee754(readUint, off0, off1, buf, pos) {
            var lo = readUint(buf, pos + off0),
                hi = readUint(buf, pos + off1);
            var sign = (hi >> 31) * 2 + 1,
                exponent = hi >>> 20 & 2047,
                mantissa = 4294967296 * (hi & 1048575) + lo;
            return exponent === 2047
                ? mantissa
                ? NaN
                : sign * Infinity
                : exponent === 0 // denormal
                ? sign * 5e-324 * mantissa
                : sign * Math.pow(2, exponent - 1075) * (mantissa + 4503599627370496);
        }

        exports.readDoubleLE = readDouble_ieee754.bind(null, readUintLE, 0, 4);
        exports.readDoubleBE = readDouble_ieee754.bind(null, readUintBE, 4, 0);

    })();

    return exports;
}

// uint helpers

function writeUintLE(val, buf, pos) {
    buf[pos    ] =  val        & 255;
    buf[pos + 1] =  val >>> 8  & 255;
    buf[pos + 2] =  val >>> 16 & 255;
    buf[pos + 3] =  val >>> 24;
}

function writeUintBE(val, buf, pos) {
    buf[pos    ] =  val >>> 24;
    buf[pos + 1] =  val >>> 16 & 255;
    buf[pos + 2] =  val >>> 8  & 255;
    buf[pos + 3] =  val        & 255;
}

function readUintLE(buf, pos) {
    return (buf[pos    ]
          | buf[pos + 1] << 8
          | buf[pos + 2] << 16
          | buf[pos + 3] << 24) >>> 0;
}

function readUintBE(buf, pos) {
    return (buf[pos    ] << 24
          | buf[pos + 1] << 16
          | buf[pos + 2] << 8
          | buf[pos + 3]) >>> 0;
}

},{}],5:[function(require,module,exports){
"use strict";
module.exports = inquire;

/**
 * Requires a module only if available.
 * @memberof util
 * @param {string} moduleName Module to require
 * @returns {?Object} Required module if available and not empty, otherwise `null`
 */
function inquire(moduleName) {
    try {
        var mod = eval("quire".replace(/^/,"re"))(moduleName); // eslint-disable-line no-eval
        if (mod && (mod.length || Object.keys(mod).length))
            return mod;
    } catch (e) {} // eslint-disable-line no-empty
    return null;
}

},{}],6:[function(require,module,exports){
"use strict";
module.exports = pool;

/**
 * An allocator as used by {@link util.pool}.
 * @typedef PoolAllocator
 * @type {function}
 * @param {number} size Buffer size
 * @returns {Uint8Array} Buffer
 */

/**
 * A slicer as used by {@link util.pool}.
 * @typedef PoolSlicer
 * @type {function}
 * @param {number} start Start offset
 * @param {number} end End offset
 * @returns {Uint8Array} Buffer slice
 * @this {Uint8Array}
 */

/**
 * A general purpose buffer pool.
 * @memberof util
 * @function
 * @param {PoolAllocator} alloc Allocator
 * @param {PoolSlicer} slice Slicer
 * @param {number} [size=8192] Slab size
 * @returns {PoolAllocator} Pooled allocator
 */
function pool(alloc, slice, size) {
    var SIZE   = size || 8192;
    var MAX    = SIZE >>> 1;
    var slab   = null;
    var offset = SIZE;
    return function pool_alloc(size) {
        if (size < 1 || size > MAX)
            return alloc(size);
        if (offset + size > SIZE) {
            slab = alloc(SIZE);
            offset = 0;
        }
        var buf = slice.call(slab, offset, offset += size);
        if (offset & 7) // align to 32 bit
            offset = (offset | 7) + 1;
        return buf;
    };
}

},{}],7:[function(require,module,exports){
"use strict";

/**
 * A minimal UTF8 implementation for number arrays.
 * @memberof util
 * @namespace
 */
var utf8 = exports;

/**
 * Calculates the UTF8 byte length of a string.
 * @param {string} string String
 * @returns {number} Byte length
 */
utf8.length = function utf8_length(string) {
    var len = 0,
        c = 0;
    for (var i = 0; i < string.length; ++i) {
        c = string.charCodeAt(i);
        if (c < 128)
            len += 1;
        else if (c < 2048)
            len += 2;
        else if ((c & 0xFC00) === 0xD800 && (string.charCodeAt(i + 1) & 0xFC00) === 0xDC00) {
            ++i;
            len += 4;
        } else
            len += 3;
    }
    return len;
};

/**
 * Reads UTF8 bytes as a string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} String read
 */
utf8.read = function utf8_read(buffer, start, end) {
    var len = end - start;
    if (len < 1)
        return "";
    var parts = null,
        chunk = [],
        i = 0, // char offset
        t;     // temporary
    while (start < end) {
        t = buffer[start++];
        if (t < 128)
            chunk[i++] = t;
        else if (t > 191 && t < 224)
            chunk[i++] = (t & 31) << 6 | buffer[start++] & 63;
        else if (t > 239 && t < 365) {
            t = ((t & 7) << 18 | (buffer[start++] & 63) << 12 | (buffer[start++] & 63) << 6 | buffer[start++] & 63) - 0x10000;
            chunk[i++] = 0xD800 + (t >> 10);
            chunk[i++] = 0xDC00 + (t & 1023);
        } else
            chunk[i++] = (t & 15) << 12 | (buffer[start++] & 63) << 6 | buffer[start++] & 63;
        if (i > 8191) {
            (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
            i = 0;
        }
    }
    if (parts) {
        if (i)
            parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
        return parts.join("");
    }
    return String.fromCharCode.apply(String, chunk.slice(0, i));
};

/**
 * Writes a string as UTF8 bytes.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Bytes written
 */
utf8.write = function utf8_write(string, buffer, offset) {
    var start = offset,
        c1, // character 1
        c2; // character 2
    for (var i = 0; i < string.length; ++i) {
        c1 = string.charCodeAt(i);
        if (c1 < 128) {
            buffer[offset++] = c1;
        } else if (c1 < 2048) {
            buffer[offset++] = c1 >> 6       | 192;
            buffer[offset++] = c1       & 63 | 128;
        } else if ((c1 & 0xFC00) === 0xD800 && ((c2 = string.charCodeAt(i + 1)) & 0xFC00) === 0xDC00) {
            c1 = 0x10000 + ((c1 & 0x03FF) << 10) + (c2 & 0x03FF);
            ++i;
            buffer[offset++] = c1 >> 18      | 240;
            buffer[offset++] = c1 >> 12 & 63 | 128;
            buffer[offset++] = c1 >> 6  & 63 | 128;
            buffer[offset++] = c1       & 63 | 128;
        } else {
            buffer[offset++] = c1 >> 12      | 224;
            buffer[offset++] = c1 >> 6  & 63 | 128;
            buffer[offset++] = c1       & 63 | 128;
        }
    }
    return offset - start;
};

},{}],8:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":10}],9:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var buildURL = require('./../helpers/buildURL');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for ready state
    request.onreadystatechange = function handleLoad() {
      if (!request || request.readyState !== 4) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(createError('Request aborted', config, 'ECONNABORTED', request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      var cookies = require('./../helpers/cookies');

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
        if (config.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

},{"../core/createError":16,"./../core/settle":20,"./../helpers/buildURL":24,"./../helpers/cookies":26,"./../helpers/isURLSameOrigin":28,"./../helpers/parseHeaders":30,"./../utils":32}],10:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"./cancel/Cancel":11,"./cancel/CancelToken":12,"./cancel/isCancel":13,"./core/Axios":14,"./core/mergeConfig":19,"./defaults":22,"./helpers/bind":23,"./helpers/spread":31,"./utils":32}],11:[function(require,module,exports){
'use strict';

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;

},{}],12:[function(require,module,exports){
'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./Cancel":11}],13:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],14:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig(this.defaults, config);
  config.method = config.method ? config.method.toLowerCase() : 'get';

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;

},{"../helpers/buildURL":24,"./../utils":32,"./InterceptorManager":15,"./dispatchRequest":17,"./mergeConfig":19}],15:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":32}],16:[function(require,module,exports){
'use strict';

var enhanceError = require('./enhanceError');

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};

},{"./enhanceError":18}],17:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/isCancel":13,"../defaults":22,"./../helpers/combineURLs":25,"./../helpers/isAbsoluteURL":27,"./../utils":32,"./transformData":21}],18:[function(require,module,exports){
'use strict';

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }

  error.request = request;
  error.response = response;
  error.isAxiosError = true;

  error.toJSON = function() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code
    };
  };
  return error;
};

},{}],19:[function(require,module,exports){
'use strict';

var utils = require('../utils');

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
module.exports = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  utils.forEach(['url', 'method', 'params', 'data'], function valueFromConfig2(prop) {
    if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    }
  });

  utils.forEach(['headers', 'auth', 'proxy'], function mergeDeepProperties(prop) {
    if (utils.isObject(config2[prop])) {
      config[prop] = utils.deepMerge(config1[prop], config2[prop]);
    } else if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    } else if (utils.isObject(config1[prop])) {
      config[prop] = utils.deepMerge(config1[prop]);
    } else if (typeof config1[prop] !== 'undefined') {
      config[prop] = config1[prop];
    }
  });

  utils.forEach([
    'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
    'timeout', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
    'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'maxContentLength',
    'validateStatus', 'maxRedirects', 'httpAgent', 'httpsAgent', 'cancelToken',
    'socketPath'
  ], function defaultToConfig2(prop) {
    if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    } else if (typeof config1[prop] !== 'undefined') {
      config[prop] = config1[prop];
    }
  });

  return config;
};

},{"../utils":32}],20:[function(require,module,exports){
'use strict';

var createError = require('./createError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};

},{"./createError":16}],21:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};

},{"./../utils":32}],22:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  // Only Node.JS has a process variable that is of [[Class]] process
  if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  } else if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this,require('_process'))
},{"./adapters/http":9,"./adapters/xhr":9,"./helpers/normalizeHeaderName":29,"./utils":32,"_process":42}],23:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],24:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":32}],25:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

},{}],26:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
    (function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + '=' + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push('expires=' + new Date(expires).toGMTString());
          }

          if (utils.isString(path)) {
            cookie.push('path=' + path);
          }

          if (utils.isString(domain)) {
            cookie.push('domain=' + domain);
          }

          if (secure === true) {
            cookie.push('secure');
          }

          document.cookie = cookie.join('; ');
        },

        read: function read(name) {
          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove: function remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      };
    })() :

  // Non standard browser env (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return {
        write: function write() {},
        read: function read() { return null; },
        remove: function remove() {}
      };
    })()
);

},{"./../utils":32}],27:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

},{}],28:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
    (function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement('a');
      var originURL;

      /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
      function resolveURL(url) {
        var href = url;

        if (msie) {
        // IE needs attribute set twice to normalize properties
          urlParsingNode.setAttribute('href', href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute('href', href);

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
      return function isURLSameOrigin(requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
        return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
      };
    })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    })()
);

},{"./../utils":32}],29:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":32}],30:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

},{"./../utils":32}],31:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],32:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');
var isBuffer = require('is-buffer');

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Function equal to merge with the difference being that no reference
 * to original objects is kept.
 *
 * @see merge
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function deepMerge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = deepMerge(result[key], val);
    } else if (typeof val === 'object') {
      result[key] = deepMerge({}, val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  deepMerge: deepMerge,
  extend: extend,
  trim: trim
};

},{"./helpers/bind":23,"is-buffer":40}],33:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],34:[function(require,module,exports){
var bigInt = (function (undefined) {
    "use strict";

    var BASE = 1e7,
        LOG_BASE = 7,
        MAX_INT = 9007199254740992,
        MAX_INT_ARR = smallToArray(MAX_INT),
        DEFAULT_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

    var supportsNativeBigInt = typeof BigInt === "function";

    function Integer(v, radix, alphabet, caseSensitive) {
        if (typeof v === "undefined") return Integer[0];
        if (typeof radix !== "undefined") return +radix === 10 && !alphabet ? parseValue(v) : parseBase(v, radix, alphabet, caseSensitive);
        return parseValue(v);
    }

    function BigInteger(value, sign) {
        this.value = value;
        this.sign = sign;
        this.isSmall = false;
    }
    BigInteger.prototype = Object.create(Integer.prototype);

    function SmallInteger(value) {
        this.value = value;
        this.sign = value < 0;
        this.isSmall = true;
    }
    SmallInteger.prototype = Object.create(Integer.prototype);

    function NativeBigInt(value) {
        this.value = value;
    }
    NativeBigInt.prototype = Object.create(Integer.prototype);

    function isPrecise(n) {
        return -MAX_INT < n && n < MAX_INT;
    }

    function smallToArray(n) { // For performance reasons doesn't reference BASE, need to change this function if BASE changes
        if (n < 1e7)
            return [n];
        if (n < 1e14)
            return [n % 1e7, Math.floor(n / 1e7)];
        return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 1e14)];
    }

    function arrayToSmall(arr) { // If BASE changes this function may need to change
        trim(arr);
        var length = arr.length;
        if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
            switch (length) {
                case 0: return 0;
                case 1: return arr[0];
                case 2: return arr[0] + arr[1] * BASE;
                default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
            }
        }
        return arr;
    }

    function trim(v) {
        var i = v.length;
        while (v[--i] === 0);
        v.length = i + 1;
    }

    function createArray(length) { // function shamelessly stolen from Yaffle's library https://github.com/Yaffle/BigInteger
        var x = new Array(length);
        var i = -1;
        while (++i < length) {
            x[i] = 0;
        }
        return x;
    }

    function truncate(n) {
        if (n > 0) return Math.floor(n);
        return Math.ceil(n);
    }

    function add(a, b) { // assumes a and b are arrays with a.length >= b.length
        var l_a = a.length,
            l_b = b.length,
            r = new Array(l_a),
            carry = 0,
            base = BASE,
            sum, i;
        for (i = 0; i < l_b; i++) {
            sum = a[i] + b[i] + carry;
            carry = sum >= base ? 1 : 0;
            r[i] = sum - carry * base;
        }
        while (i < l_a) {
            sum = a[i] + carry;
            carry = sum === base ? 1 : 0;
            r[i++] = sum - carry * base;
        }
        if (carry > 0) r.push(carry);
        return r;
    }

    function addAny(a, b) {
        if (a.length >= b.length) return add(a, b);
        return add(b, a);
    }

    function addSmall(a, carry) { // assumes a is array, carry is number with 0 <= carry < MAX_INT
        var l = a.length,
            r = new Array(l),
            base = BASE,
            sum, i;
        for (i = 0; i < l; i++) {
            sum = a[i] - base + carry;
            carry = Math.floor(sum / base);
            r[i] = sum - carry * base;
            carry += 1;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    BigInteger.prototype.add = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.subtract(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall) {
            return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
        }
        return new BigInteger(addAny(a, b), this.sign);
    };
    BigInteger.prototype.plus = BigInteger.prototype.add;

    SmallInteger.prototype.add = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.subtract(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            if (isPrecise(a + b)) return new SmallInteger(a + b);
            b = smallToArray(Math.abs(b));
        }
        return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
    };
    SmallInteger.prototype.plus = SmallInteger.prototype.add;

    NativeBigInt.prototype.add = function (v) {
        return new NativeBigInt(this.value + parseValue(v).value);
    }
    NativeBigInt.prototype.plus = NativeBigInt.prototype.add;

    function subtract(a, b) { // assumes a and b are arrays with a >= b
        var a_l = a.length,
            b_l = b.length,
            r = new Array(a_l),
            borrow = 0,
            base = BASE,
            i, difference;
        for (i = 0; i < b_l; i++) {
            difference = a[i] - borrow - b[i];
            if (difference < 0) {
                difference += base;
                borrow = 1;
            } else borrow = 0;
            r[i] = difference;
        }
        for (i = b_l; i < a_l; i++) {
            difference = a[i] - borrow;
            if (difference < 0) difference += base;
            else {
                r[i++] = difference;
                break;
            }
            r[i] = difference;
        }
        for (; i < a_l; i++) {
            r[i] = a[i];
        }
        trim(r);
        return r;
    }

    function subtractAny(a, b, sign) {
        var value;
        if (compareAbs(a, b) >= 0) {
            value = subtract(a, b);
        } else {
            value = subtract(b, a);
            sign = !sign;
        }
        value = arrayToSmall(value);
        if (typeof value === "number") {
            if (sign) value = -value;
            return new SmallInteger(value);
        }
        return new BigInteger(value, sign);
    }

    function subtractSmall(a, b, sign) { // assumes a is array, b is number with 0 <= b < MAX_INT
        var l = a.length,
            r = new Array(l),
            carry = -b,
            base = BASE,
            i, difference;
        for (i = 0; i < l; i++) {
            difference = a[i] + carry;
            carry = Math.floor(difference / base);
            difference %= base;
            r[i] = difference < 0 ? difference + base : difference;
        }
        r = arrayToSmall(r);
        if (typeof r === "number") {
            if (sign) r = -r;
            return new SmallInteger(r);
        } return new BigInteger(r, sign);
    }

    BigInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.add(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall)
            return subtractSmall(a, Math.abs(b), this.sign);
        return subtractAny(a, b, this.sign);
    };
    BigInteger.prototype.minus = BigInteger.prototype.subtract;

    SmallInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.add(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            return new SmallInteger(a - b);
        }
        return subtractSmall(b, Math.abs(a), a >= 0);
    };
    SmallInteger.prototype.minus = SmallInteger.prototype.subtract;

    NativeBigInt.prototype.subtract = function (v) {
        return new NativeBigInt(this.value - parseValue(v).value);
    }
    NativeBigInt.prototype.minus = NativeBigInt.prototype.subtract;

    BigInteger.prototype.negate = function () {
        return new BigInteger(this.value, !this.sign);
    };
    SmallInteger.prototype.negate = function () {
        var sign = this.sign;
        var small = new SmallInteger(-this.value);
        small.sign = !sign;
        return small;
    };
    NativeBigInt.prototype.negate = function () {
        return new NativeBigInt(-this.value);
    }

    BigInteger.prototype.abs = function () {
        return new BigInteger(this.value, false);
    };
    SmallInteger.prototype.abs = function () {
        return new SmallInteger(Math.abs(this.value));
    };
    NativeBigInt.prototype.abs = function () {
        return new NativeBigInt(this.value >= 0 ? this.value : -this.value);
    }


    function multiplyLong(a, b) {
        var a_l = a.length,
            b_l = b.length,
            l = a_l + b_l,
            r = createArray(l),
            base = BASE,
            product, carry, i, a_i, b_j;
        for (i = 0; i < a_l; ++i) {
            a_i = a[i];
            for (var j = 0; j < b_l; ++j) {
                b_j = b[j];
                product = a_i * b_j + r[i + j];
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
                r[i + j + 1] += carry;
            }
        }
        trim(r);
        return r;
    }

    function multiplySmall(a, b) { // assumes a is array, b is number with |b| < BASE
        var l = a.length,
            r = new Array(l),
            base = BASE,
            carry = 0,
            product, i;
        for (i = 0; i < l; i++) {
            product = a[i] * b + carry;
            carry = Math.floor(product / base);
            r[i] = product - carry * base;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    function shiftLeft(x, n) {
        var r = [];
        while (n-- > 0) r.push(0);
        return r.concat(x);
    }

    function multiplyKaratsuba(x, y) {
        var n = Math.max(x.length, y.length);

        if (n <= 30) return multiplyLong(x, y);
        n = Math.ceil(n / 2);

        var b = x.slice(n),
            a = x.slice(0, n),
            d = y.slice(n),
            c = y.slice(0, n);

        var ac = multiplyKaratsuba(a, c),
            bd = multiplyKaratsuba(b, d),
            abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));

        var product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
        trim(product);
        return product;
    }

    // The following function is derived from a surface fit of a graph plotting the performance difference
    // between long multiplication and karatsuba multiplication versus the lengths of the two arrays.
    function useKaratsuba(l1, l2) {
        return -0.012 * l1 - 0.012 * l2 + 0.000015 * l1 * l2 > 0;
    }

    BigInteger.prototype.multiply = function (v) {
        var n = parseValue(v),
            a = this.value, b = n.value,
            sign = this.sign !== n.sign,
            abs;
        if (n.isSmall) {
            if (b === 0) return Integer[0];
            if (b === 1) return this;
            if (b === -1) return this.negate();
            abs = Math.abs(b);
            if (abs < BASE) {
                return new BigInteger(multiplySmall(a, abs), sign);
            }
            b = smallToArray(abs);
        }
        if (useKaratsuba(a.length, b.length)) // Karatsuba is only faster for certain array sizes
            return new BigInteger(multiplyKaratsuba(a, b), sign);
        return new BigInteger(multiplyLong(a, b), sign);
    };

    BigInteger.prototype.times = BigInteger.prototype.multiply;

    function multiplySmallAndArray(a, b, sign) { // a >= 0
        if (a < BASE) {
            return new BigInteger(multiplySmall(b, a), sign);
        }
        return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
    }
    SmallInteger.prototype._multiplyBySmall = function (a) {
        if (isPrecise(a.value * this.value)) {
            return new SmallInteger(a.value * this.value);
        }
        return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
    };
    BigInteger.prototype._multiplyBySmall = function (a) {
        if (a.value === 0) return Integer[0];
        if (a.value === 1) return this;
        if (a.value === -1) return this.negate();
        return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
    };
    SmallInteger.prototype.multiply = function (v) {
        return parseValue(v)._multiplyBySmall(this);
    };
    SmallInteger.prototype.times = SmallInteger.prototype.multiply;

    NativeBigInt.prototype.multiply = function (v) {
        return new NativeBigInt(this.value * parseValue(v).value);
    }
    NativeBigInt.prototype.times = NativeBigInt.prototype.multiply;

    function square(a) {
        //console.assert(2 * BASE * BASE < MAX_INT);
        var l = a.length,
            r = createArray(l + l),
            base = BASE,
            product, carry, i, a_i, a_j;
        for (i = 0; i < l; i++) {
            a_i = a[i];
            carry = 0 - a_i * a_i;
            for (var j = i; j < l; j++) {
                a_j = a[j];
                product = 2 * (a_i * a_j) + r[i + j] + carry;
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
            }
            r[i + l] = carry;
        }
        trim(r);
        return r;
    }

    BigInteger.prototype.square = function () {
        return new BigInteger(square(this.value), false);
    };

    SmallInteger.prototype.square = function () {
        var value = this.value * this.value;
        if (isPrecise(value)) return new SmallInteger(value);
        return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
    };

    NativeBigInt.prototype.square = function (v) {
        return new NativeBigInt(this.value * this.value);
    }

    function divMod1(a, b) { // Left over from previous version. Performs faster than divMod2 on smaller input sizes.
        var a_l = a.length,
            b_l = b.length,
            base = BASE,
            result = createArray(b.length),
            divisorMostSignificantDigit = b[b_l - 1],
            // normalization
            lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)),
            remainder = multiplySmall(a, lambda),
            divisor = multiplySmall(b, lambda),
            quotientDigit, shift, carry, borrow, i, l, q;
        if (remainder.length <= a_l) remainder.push(0);
        divisor.push(0);
        divisorMostSignificantDigit = divisor[b_l - 1];
        for (shift = a_l - b_l; shift >= 0; shift--) {
            quotientDigit = base - 1;
            if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
                quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
            }
            // quotientDigit <= base - 1
            carry = 0;
            borrow = 0;
            l = divisor.length;
            for (i = 0; i < l; i++) {
                carry += quotientDigit * divisor[i];
                q = Math.floor(carry / base);
                borrow += remainder[shift + i] - (carry - q * base);
                carry = q;
                if (borrow < 0) {
                    remainder[shift + i] = borrow + base;
                    borrow = -1;
                } else {
                    remainder[shift + i] = borrow;
                    borrow = 0;
                }
            }
            while (borrow !== 0) {
                quotientDigit -= 1;
                carry = 0;
                for (i = 0; i < l; i++) {
                    carry += remainder[shift + i] - base + divisor[i];
                    if (carry < 0) {
                        remainder[shift + i] = carry + base;
                        carry = 0;
                    } else {
                        remainder[shift + i] = carry;
                        carry = 1;
                    }
                }
                borrow += carry;
            }
            result[shift] = quotientDigit;
        }
        // denormalization
        remainder = divModSmall(remainder, lambda)[0];
        return [arrayToSmall(result), arrayToSmall(remainder)];
    }

    function divMod2(a, b) { // Implementation idea shamelessly stolen from Silent Matt's library http://silentmatt.com/biginteger/
        // Performs faster than divMod1 on larger input sizes.
        var a_l = a.length,
            b_l = b.length,
            result = [],
            part = [],
            base = BASE,
            guess, xlen, highx, highy, check;
        while (a_l) {
            part.unshift(a[--a_l]);
            trim(part);
            if (compareAbs(part, b) < 0) {
                result.push(0);
                continue;
            }
            xlen = part.length;
            highx = part[xlen - 1] * base + part[xlen - 2];
            highy = b[b_l - 1] * base + b[b_l - 2];
            if (xlen > b_l) {
                highx = (highx + 1) * base;
            }
            guess = Math.ceil(highx / highy);
            do {
                check = multiplySmall(b, guess);
                if (compareAbs(check, part) <= 0) break;
                guess--;
            } while (guess);
            result.push(guess);
            part = subtract(part, check);
        }
        result.reverse();
        return [arrayToSmall(result), arrayToSmall(part)];
    }

    function divModSmall(value, lambda) {
        var length = value.length,
            quotient = createArray(length),
            base = BASE,
            i, q, remainder, divisor;
        remainder = 0;
        for (i = length - 1; i >= 0; --i) {
            divisor = remainder * base + value[i];
            q = truncate(divisor / lambda);
            remainder = divisor - q * lambda;
            quotient[i] = q | 0;
        }
        return [quotient, remainder | 0];
    }

    function divModAny(self, v) {
        var value, n = parseValue(v);
        if (supportsNativeBigInt) {
            return [new NativeBigInt(self.value / n.value), new NativeBigInt(self.value % n.value)];
        }
        var a = self.value, b = n.value;
        var quotient;
        if (b === 0) throw new Error("Cannot divide by zero");
        if (self.isSmall) {
            if (n.isSmall) {
                return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
            }
            return [Integer[0], self];
        }
        if (n.isSmall) {
            if (b === 1) return [self, Integer[0]];
            if (b == -1) return [self.negate(), Integer[0]];
            var abs = Math.abs(b);
            if (abs < BASE) {
                value = divModSmall(a, abs);
                quotient = arrayToSmall(value[0]);
                var remainder = value[1];
                if (self.sign) remainder = -remainder;
                if (typeof quotient === "number") {
                    if (self.sign !== n.sign) quotient = -quotient;
                    return [new SmallInteger(quotient), new SmallInteger(remainder)];
                }
                return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
            }
            b = smallToArray(abs);
        }
        var comparison = compareAbs(a, b);
        if (comparison === -1) return [Integer[0], self];
        if (comparison === 0) return [Integer[self.sign === n.sign ? 1 : -1], Integer[0]];

        // divMod1 is faster on smaller input sizes
        if (a.length + b.length <= 200)
            value = divMod1(a, b);
        else value = divMod2(a, b);

        quotient = value[0];
        var qSign = self.sign !== n.sign,
            mod = value[1],
            mSign = self.sign;
        if (typeof quotient === "number") {
            if (qSign) quotient = -quotient;
            quotient = new SmallInteger(quotient);
        } else quotient = new BigInteger(quotient, qSign);
        if (typeof mod === "number") {
            if (mSign) mod = -mod;
            mod = new SmallInteger(mod);
        } else mod = new BigInteger(mod, mSign);
        return [quotient, mod];
    }

    BigInteger.prototype.divmod = function (v) {
        var result = divModAny(this, v);
        return {
            quotient: result[0],
            remainder: result[1]
        };
    };
    NativeBigInt.prototype.divmod = SmallInteger.prototype.divmod = BigInteger.prototype.divmod;


    BigInteger.prototype.divide = function (v) {
        return divModAny(this, v)[0];
    };
    NativeBigInt.prototype.over = NativeBigInt.prototype.divide = SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;

    BigInteger.prototype.mod = function (v) {
        return divModAny(this, v)[1];
    };
    NativeBigInt.prototype.mod = NativeBigInt.prototype.remainder = SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;

    BigInteger.prototype.pow = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value,
            value, x, y;
        if (b === 0) return Integer[1];
        if (a === 0) return Integer[0];
        if (a === 1) return Integer[1];
        if (a === -1) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.sign) {
            return Integer[0];
        }
        if (!n.isSmall) throw new Error("The exponent " + n.toString() + " is too large.");
        if (this.isSmall) {
            if (isPrecise(value = Math.pow(a, b)))
                return new SmallInteger(truncate(value));
        }
        x = this;
        y = Integer[1];
        while (true) {
            if (b & 1 === 1) {
                y = y.times(x);
                --b;
            }
            if (b === 0) break;
            b /= 2;
            x = x.square();
        }
        return y;
    };
    SmallInteger.prototype.pow = BigInteger.prototype.pow;

    var pow;
    if (supportsNativeBigInt) {
        // forced to use eval because ** is a syntax error on pre-ECMAScript2017 environments.
        pow = eval("(a,b)=>a**b");
    }

    NativeBigInt.prototype.pow = function (v) {
        var n = parseValue(v);
        var a = this.value, b = n.value;
        if (b === BigInt(0)) return Integer[1];
        if (a === BigInt(0)) return Integer[0];
        if (a === BigInt(1)) return Integer[1];
        if (a === BigInt(-1)) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.isNegative()) return new NativeBigInt(BigInt(0));
        return new NativeBigInt(pow(a, b));
    }

    BigInteger.prototype.modPow = function (exp, mod) {
        exp = parseValue(exp);
        mod = parseValue(mod);
        if (mod.isZero()) throw new Error("Cannot take modPow with modulus 0");
        var r = Integer[1],
            base = this.mod(mod);
        while (exp.isPositive()) {
            if (base.isZero()) return Integer[0];
            if (exp.isOdd()) r = r.multiply(base).mod(mod);
            exp = exp.divide(2);
            base = base.square().mod(mod);
        }
        return r;
    };
    NativeBigInt.prototype.modPow = SmallInteger.prototype.modPow = BigInteger.prototype.modPow;

    function compareAbs(a, b) {
        if (a.length !== b.length) {
            return a.length > b.length ? 1 : -1;
        }
        for (var i = a.length - 1; i >= 0; i--) {
            if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
        }
        return 0;
    }

    BigInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) return 1;
        return compareAbs(a, b);
    };
    SmallInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = Math.abs(this.value),
            b = n.value;
        if (n.isSmall) {
            b = Math.abs(b);
            return a === b ? 0 : a > b ? 1 : -1;
        }
        return -1;
    };
    NativeBigInt.prototype.compareAbs = function (v) {
        var a = this.value;
        var b = parseValue(v).value;
        a = a >= 0 ? a : -a;
        b = b >= 0 ? b : -b;
        return a === b ? 0 : a > b ? 1 : -1;
    }

    BigInteger.prototype.compare = function (v) {
        // See discussion about comparison with Infinity:
        // https://github.com/peterolson/BigInteger.js/issues/61
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (this.sign !== n.sign) {
            return n.sign ? 1 : -1;
        }
        if (n.isSmall) {
            return this.sign ? -1 : 1;
        }
        return compareAbs(a, b) * (this.sign ? -1 : 1);
    };
    BigInteger.prototype.compareTo = BigInteger.prototype.compare;

    SmallInteger.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) {
            return a == b ? 0 : a > b ? 1 : -1;
        }
        if (a < 0 !== n.sign) {
            return a < 0 ? -1 : 1;
        }
        return a < 0 ? 1 : -1;
    };
    SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;

    NativeBigInt.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }
        var a = this.value;
        var b = parseValue(v).value;
        return a === b ? 0 : a > b ? 1 : -1;
    }
    NativeBigInt.prototype.compareTo = NativeBigInt.prototype.compare;

    BigInteger.prototype.equals = function (v) {
        return this.compare(v) === 0;
    };
    NativeBigInt.prototype.eq = NativeBigInt.prototype.equals = SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;

    BigInteger.prototype.notEquals = function (v) {
        return this.compare(v) !== 0;
    };
    NativeBigInt.prototype.neq = NativeBigInt.prototype.notEquals = SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;

    BigInteger.prototype.greater = function (v) {
        return this.compare(v) > 0;
    };
    NativeBigInt.prototype.gt = NativeBigInt.prototype.greater = SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;

    BigInteger.prototype.lesser = function (v) {
        return this.compare(v) < 0;
    };
    NativeBigInt.prototype.lt = NativeBigInt.prototype.lesser = SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;

    BigInteger.prototype.greaterOrEquals = function (v) {
        return this.compare(v) >= 0;
    };
    NativeBigInt.prototype.geq = NativeBigInt.prototype.greaterOrEquals = SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;

    BigInteger.prototype.lesserOrEquals = function (v) {
        return this.compare(v) <= 0;
    };
    NativeBigInt.prototype.leq = NativeBigInt.prototype.lesserOrEquals = SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;

    BigInteger.prototype.isEven = function () {
        return (this.value[0] & 1) === 0;
    };
    SmallInteger.prototype.isEven = function () {
        return (this.value & 1) === 0;
    };
    NativeBigInt.prototype.isEven = function () {
        return (this.value & BigInt(1)) === BigInt(0);
    }

    BigInteger.prototype.isOdd = function () {
        return (this.value[0] & 1) === 1;
    };
    SmallInteger.prototype.isOdd = function () {
        return (this.value & 1) === 1;
    };
    NativeBigInt.prototype.isOdd = function () {
        return (this.value & BigInt(1)) === BigInt(1);
    }

    BigInteger.prototype.isPositive = function () {
        return !this.sign;
    };
    SmallInteger.prototype.isPositive = function () {
        return this.value > 0;
    };
    NativeBigInt.prototype.isPositive = SmallInteger.prototype.isPositive;

    BigInteger.prototype.isNegative = function () {
        return this.sign;
    };
    SmallInteger.prototype.isNegative = function () {
        return this.value < 0;
    };
    NativeBigInt.prototype.isNegative = SmallInteger.prototype.isNegative;

    BigInteger.prototype.isUnit = function () {
        return false;
    };
    SmallInteger.prototype.isUnit = function () {
        return Math.abs(this.value) === 1;
    };
    NativeBigInt.prototype.isUnit = function () {
        return this.abs().value === BigInt(1);
    }

    BigInteger.prototype.isZero = function () {
        return false;
    };
    SmallInteger.prototype.isZero = function () {
        return this.value === 0;
    };
    NativeBigInt.prototype.isZero = function () {
        return this.value === BigInt(0);
    }

    BigInteger.prototype.isDivisibleBy = function (v) {
        var n = parseValue(v);
        if (n.isZero()) return false;
        if (n.isUnit()) return true;
        if (n.compareAbs(2) === 0) return this.isEven();
        return this.mod(n).isZero();
    };
    NativeBigInt.prototype.isDivisibleBy = SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;

    function isBasicPrime(v) {
        var n = v.abs();
        if (n.isUnit()) return false;
        if (n.equals(2) || n.equals(3) || n.equals(5)) return true;
        if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5)) return false;
        if (n.lesser(49)) return true;
        // we don't know if it's prime: let the other functions figure it out
    }

    function millerRabinTest(n, a) {
        var nPrev = n.prev(),
            b = nPrev,
            r = 0,
            d, t, i, x;
        while (b.isEven()) b = b.divide(2), r++;
        next: for (i = 0; i < a.length; i++) {
            if (n.lesser(a[i])) continue;
            x = bigInt(a[i]).modPow(b, n);
            if (x.isUnit() || x.equals(nPrev)) continue;
            for (d = r - 1; d != 0; d--) {
                x = x.square().mod(n);
                if (x.isUnit()) return false;
                if (x.equals(nPrev)) continue next;
            }
            return false;
        }
        return true;
    }

    // Set "strict" to true to force GRH-supported lower bound of 2*log(N)^2
    BigInteger.prototype.isPrime = function (strict) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined) return isPrime;
        var n = this.abs();
        var bits = n.bitLength();
        if (bits <= 64)
            return millerRabinTest(n, [2, 325, 9375, 28178, 450775, 9780504, 1795265022]);
        var logN = Math.log(2) * bits.toJSNumber();
        var t = Math.ceil((strict === true) ? (2 * Math.pow(logN, 2)) : logN);
        for (var a = [], i = 0; i < t; i++) {
            a.push(bigInt(i + 2));
        }
        return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isPrime = SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;

    BigInteger.prototype.isProbablePrime = function (iterations) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined) return isPrime;
        var n = this.abs();
        var t = iterations === undefined ? 5 : iterations;
        for (var a = [], i = 0; i < t; i++) {
            a.push(bigInt.randBetween(2, n.minus(2)));
        }
        return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isProbablePrime = SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;

    BigInteger.prototype.modInv = function (n) {
        var t = bigInt.zero, newT = bigInt.one, r = parseValue(n), newR = this.abs(), q, lastT, lastR;
        while (!newR.isZero()) {
            q = r.divide(newR);
            lastT = t;
            lastR = r;
            t = newT;
            r = newR;
            newT = lastT.subtract(q.multiply(newT));
            newR = lastR.subtract(q.multiply(newR));
        }
        if (!r.isUnit()) throw new Error(this.toString() + " and " + n.toString() + " are not co-prime");
        if (t.compare(0) === -1) {
            t = t.add(n);
        }
        if (this.isNegative()) {
            return t.negate();
        }
        return t;
    };

    NativeBigInt.prototype.modInv = SmallInteger.prototype.modInv = BigInteger.prototype.modInv;

    BigInteger.prototype.next = function () {
        var value = this.value;
        if (this.sign) {
            return subtractSmall(value, 1, this.sign);
        }
        return new BigInteger(addSmall(value, 1), this.sign);
    };
    SmallInteger.prototype.next = function () {
        var value = this.value;
        if (value + 1 < MAX_INT) return new SmallInteger(value + 1);
        return new BigInteger(MAX_INT_ARR, false);
    };
    NativeBigInt.prototype.next = function () {
        return new NativeBigInt(this.value + BigInt(1));
    }

    BigInteger.prototype.prev = function () {
        var value = this.value;
        if (this.sign) {
            return new BigInteger(addSmall(value, 1), true);
        }
        return subtractSmall(value, 1, this.sign);
    };
    SmallInteger.prototype.prev = function () {
        var value = this.value;
        if (value - 1 > -MAX_INT) return new SmallInteger(value - 1);
        return new BigInteger(MAX_INT_ARR, true);
    };
    NativeBigInt.prototype.prev = function () {
        return new NativeBigInt(this.value - BigInt(1));
    }

    var powersOfTwo = [1];
    while (2 * powersOfTwo[powersOfTwo.length - 1] <= BASE) powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
    var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];

    function shift_isSmall(n) {
        return Math.abs(n) <= BASE;
    }

    BigInteger.prototype.shiftLeft = function (v) {
        var n = parseValue(v).toJSNumber();
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        if (n < 0) return this.shiftRight(-n);
        var result = this;
        if (result.isZero()) return result;
        while (n >= powers2Length) {
            result = result.multiply(highestPower2);
            n -= powers2Length - 1;
        }
        return result.multiply(powersOfTwo[n]);
    };
    NativeBigInt.prototype.shiftLeft = SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;

    BigInteger.prototype.shiftRight = function (v) {
        var remQuo;
        var n = parseValue(v).toJSNumber();
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        if (n < 0) return this.shiftLeft(-n);
        var result = this;
        while (n >= powers2Length) {
            if (result.isZero() || (result.isNegative() && result.isUnit())) return result;
            remQuo = divModAny(result, highestPower2);
            result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
            n -= powers2Length - 1;
        }
        remQuo = divModAny(result, powersOfTwo[n]);
        return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
    };
    NativeBigInt.prototype.shiftRight = SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;

    function bitwise(x, y, fn) {
        y = parseValue(y);
        var xSign = x.isNegative(), ySign = y.isNegative();
        var xRem = xSign ? x.not() : x,
            yRem = ySign ? y.not() : y;
        var xDigit = 0, yDigit = 0;
        var xDivMod = null, yDivMod = null;
        var result = [];
        while (!xRem.isZero() || !yRem.isZero()) {
            xDivMod = divModAny(xRem, highestPower2);
            xDigit = xDivMod[1].toJSNumber();
            if (xSign) {
                xDigit = highestPower2 - 1 - xDigit; // two's complement for negative numbers
            }

            yDivMod = divModAny(yRem, highestPower2);
            yDigit = yDivMod[1].toJSNumber();
            if (ySign) {
                yDigit = highestPower2 - 1 - yDigit; // two's complement for negative numbers
            }

            xRem = xDivMod[0];
            yRem = yDivMod[0];
            result.push(fn(xDigit, yDigit));
        }
        var sum = fn(xSign ? 1 : 0, ySign ? 1 : 0) !== 0 ? bigInt(-1) : bigInt(0);
        for (var i = result.length - 1; i >= 0; i -= 1) {
            sum = sum.multiply(highestPower2).add(bigInt(result[i]));
        }
        return sum;
    }

    BigInteger.prototype.not = function () {
        return this.negate().prev();
    };
    NativeBigInt.prototype.not = SmallInteger.prototype.not = BigInteger.prototype.not;

    BigInteger.prototype.and = function (n) {
        return bitwise(this, n, function (a, b) { return a & b; });
    };
    NativeBigInt.prototype.and = SmallInteger.prototype.and = BigInteger.prototype.and;

    BigInteger.prototype.or = function (n) {
        return bitwise(this, n, function (a, b) { return a | b; });
    };
    NativeBigInt.prototype.or = SmallInteger.prototype.or = BigInteger.prototype.or;

    BigInteger.prototype.xor = function (n) {
        return bitwise(this, n, function (a, b) { return a ^ b; });
    };
    NativeBigInt.prototype.xor = SmallInteger.prototype.xor = BigInteger.prototype.xor;

    var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
    function roughLOB(n) { // get lowestOneBit (rough)
        // SmallInteger: return Min(lowestOneBit(n), 1 << 30)
        // BigInteger: return Min(lowestOneBit(n), 1 << 14) [BASE=1e7]
        var v = n.value,
            x = typeof v === "number" ? v | LOBMASK_I :
                typeof v === "bigint" ? v | BigInt(LOBMASK_I) :
                    v[0] + v[1] * BASE | LOBMASK_BI;
        return x & -x;
    }

    function integerLogarithm(value, base) {
        if (base.compareTo(value) <= 0) {
            var tmp = integerLogarithm(value, base.square(base));
            var p = tmp.p;
            var e = tmp.e;
            var t = p.multiply(base);
            return t.compareTo(value) <= 0 ? { p: t, e: e * 2 + 1 } : { p: p, e: e * 2 };
        }
        return { p: bigInt(1), e: 0 };
    }

    BigInteger.prototype.bitLength = function () {
        var n = this;
        if (n.compareTo(bigInt(0)) < 0) {
            n = n.negate().subtract(bigInt(1));
        }
        if (n.compareTo(bigInt(0)) === 0) {
            return bigInt(0);
        }
        return bigInt(integerLogarithm(n, bigInt(2)).e).add(bigInt(1));
    }
    NativeBigInt.prototype.bitLength = SmallInteger.prototype.bitLength = BigInteger.prototype.bitLength;

    function max(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.greater(b) ? a : b;
    }
    function min(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.lesser(b) ? a : b;
    }
    function gcd(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        if (a.equals(b)) return a;
        if (a.isZero()) return b;
        if (b.isZero()) return a;
        var c = Integer[1], d, t;
        while (a.isEven() && b.isEven()) {
            d = min(roughLOB(a), roughLOB(b));
            a = a.divide(d);
            b = b.divide(d);
            c = c.multiply(d);
        }
        while (a.isEven()) {
            a = a.divide(roughLOB(a));
        }
        do {
            while (b.isEven()) {
                b = b.divide(roughLOB(b));
            }
            if (a.greater(b)) {
                t = b; b = a; a = t;
            }
            b = b.subtract(a);
        } while (!b.isZero());
        return c.isUnit() ? a : a.multiply(c);
    }
    function lcm(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        return a.divide(gcd(a, b)).multiply(b);
    }
    function randBetween(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        var low = min(a, b), high = max(a, b);
        var range = high.subtract(low).add(1);
        if (range.isSmall) return low.add(Math.floor(Math.random() * range));
        var digits = toBase(range, BASE).value;
        var result = [], restricted = true;
        for (var i = 0; i < digits.length; i++) {
            var top = restricted ? digits[i] : BASE;
            var digit = truncate(Math.random() * top);
            result.push(digit);
            if (digit < top) restricted = false;
        }
        return low.add(Integer.fromArray(result, BASE, false));
    }

    var parseBase = function (text, base, alphabet, caseSensitive) {
        alphabet = alphabet || DEFAULT_ALPHABET;
        text = String(text);
        if (!caseSensitive) {
            text = text.toLowerCase();
            alphabet = alphabet.toLowerCase();
        }
        var length = text.length;
        var i;
        var absBase = Math.abs(base);
        var alphabetValues = {};
        for (i = 0; i < alphabet.length; i++) {
            alphabetValues[alphabet[i]] = i;
        }
        for (i = 0; i < length; i++) {
            var c = text[i];
            if (c === "-") continue;
            if (c in alphabetValues) {
                if (alphabetValues[c] >= absBase) {
                    if (c === "1" && absBase === 1) continue;
                    throw new Error(c + " is not a valid digit in base " + base + ".");
                }
            }
        }
        base = parseValue(base);
        var digits = [];
        var isNegative = text[0] === "-";
        for (i = isNegative ? 1 : 0; i < text.length; i++) {
            var c = text[i];
            if (c in alphabetValues) digits.push(parseValue(alphabetValues[c]));
            else if (c === "<") {
                var start = i;
                do { i++; } while (text[i] !== ">" && i < text.length);
                digits.push(parseValue(text.slice(start + 1, i)));
            }
            else throw new Error(c + " is not a valid character");
        }
        return parseBaseFromArray(digits, base, isNegative);
    };

    function parseBaseFromArray(digits, base, isNegative) {
        var val = Integer[0], pow = Integer[1], i;
        for (i = digits.length - 1; i >= 0; i--) {
            val = val.add(digits[i].times(pow));
            pow = pow.times(base);
        }
        return isNegative ? val.negate() : val;
    }

    function stringify(digit, alphabet) {
        alphabet = alphabet || DEFAULT_ALPHABET;
        if (digit < alphabet.length) {
            return alphabet[digit];
        }
        return "<" + digit + ">";
    }

    function toBase(n, base) {
        base = bigInt(base);
        if (base.isZero()) {
            if (n.isZero()) return { value: [0], isNegative: false };
            throw new Error("Cannot convert nonzero numbers to base 0.");
        }
        if (base.equals(-1)) {
            if (n.isZero()) return { value: [0], isNegative: false };
            if (n.isNegative())
                return {
                    value: [].concat.apply([], Array.apply(null, Array(-n.toJSNumber()))
                        .map(Array.prototype.valueOf, [1, 0])
                    ),
                    isNegative: false
                };

            var arr = Array.apply(null, Array(n.toJSNumber() - 1))
                .map(Array.prototype.valueOf, [0, 1]);
            arr.unshift([1]);
            return {
                value: [].concat.apply([], arr),
                isNegative: false
            };
        }

        var neg = false;
        if (n.isNegative() && base.isPositive()) {
            neg = true;
            n = n.abs();
        }
        if (base.isUnit()) {
            if (n.isZero()) return { value: [0], isNegative: false };

            return {
                value: Array.apply(null, Array(n.toJSNumber()))
                    .map(Number.prototype.valueOf, 1),
                isNegative: neg
            };
        }
        var out = [];
        var left = n, divmod;
        while (left.isNegative() || left.compareAbs(base) >= 0) {
            divmod = left.divmod(base);
            left = divmod.quotient;
            var digit = divmod.remainder;
            if (digit.isNegative()) {
                digit = base.minus(digit).abs();
                left = left.next();
            }
            out.push(digit.toJSNumber());
        }
        out.push(left.toJSNumber());
        return { value: out.reverse(), isNegative: neg };
    }

    function toBaseString(n, base, alphabet) {
        var arr = toBase(n, base);
        return (arr.isNegative ? "-" : "") + arr.value.map(function (x) {
            return stringify(x, alphabet);
        }).join('');
    }

    BigInteger.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    SmallInteger.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    NativeBigInt.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    BigInteger.prototype.toString = function (radix, alphabet) {
        if (radix === undefined) radix = 10;
        if (radix !== 10) return toBaseString(this, radix, alphabet);
        var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
        while (--l >= 0) {
            digit = String(v[l]);
            str += zeros.slice(digit.length) + digit;
        }
        var sign = this.sign ? "-" : "";
        return sign + str;
    };

    SmallInteger.prototype.toString = function (radix, alphabet) {
        if (radix === undefined) radix = 10;
        if (radix != 10) return toBaseString(this, radix, alphabet);
        return String(this.value);
    };

    NativeBigInt.prototype.toString = SmallInteger.prototype.toString;

    NativeBigInt.prototype.toJSON = BigInteger.prototype.toJSON = SmallInteger.prototype.toJSON = function () { return this.toString(); }

    BigInteger.prototype.valueOf = function () {
        return parseInt(this.toString(), 10);
    };
    BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;

    SmallInteger.prototype.valueOf = function () {
        return this.value;
    };
    SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;
    NativeBigInt.prototype.valueOf = NativeBigInt.prototype.toJSNumber = function () {
        return parseInt(this.toString(), 10);
    }

    function parseStringValue(v) {
        if (isPrecise(+v)) {
            var x = +v;
            if (x === truncate(x))
                return supportsNativeBigInt ? new NativeBigInt(BigInt(x)) : new SmallInteger(x);
            throw new Error("Invalid integer: " + v);
        }
        var sign = v[0] === "-";
        if (sign) v = v.slice(1);
        var split = v.split(/e/i);
        if (split.length > 2) throw new Error("Invalid integer: " + split.join("e"));
        if (split.length === 2) {
            var exp = split[1];
            if (exp[0] === "+") exp = exp.slice(1);
            exp = +exp;
            if (exp !== truncate(exp) || !isPrecise(exp)) throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
            var text = split[0];
            var decimalPlace = text.indexOf(".");
            if (decimalPlace >= 0) {
                exp -= text.length - decimalPlace - 1;
                text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
            }
            if (exp < 0) throw new Error("Cannot include negative exponent part for integers");
            text += (new Array(exp + 1)).join("0");
            v = text;
        }
        var isValid = /^([0-9][0-9]*)$/.test(v);
        if (!isValid) throw new Error("Invalid integer: " + v);
        if (supportsNativeBigInt) {
            return new NativeBigInt(BigInt(sign ? "-" + v : v));
        }
        var r = [], max = v.length, l = LOG_BASE, min = max - l;
        while (max > 0) {
            r.push(+v.slice(min, max));
            min -= l;
            if (min < 0) min = 0;
            max -= l;
        }
        trim(r);
        return new BigInteger(r, sign);
    }

    function parseNumberValue(v) {
        if (supportsNativeBigInt) {
            return new NativeBigInt(BigInt(v));
        }
        if (isPrecise(v)) {
            if (v !== truncate(v)) throw new Error(v + " is not an integer.");
            return new SmallInteger(v);
        }
        return parseStringValue(v.toString());
    }

    function parseValue(v) {
        if (typeof v === "number") {
            return parseNumberValue(v);
        }
        if (typeof v === "string") {
            return parseStringValue(v);
        }
        if (typeof v === "bigint") {
            return new NativeBigInt(v);
        }
        return v;
    }
    // Pre-define numbers in range [-999,999]
    for (var i = 0; i < 1000; i++) {
        Integer[i] = parseValue(i);
        if (i > 0) Integer[-i] = parseValue(-i);
    }
    // Backwards compatibility
    Integer.one = Integer[1];
    Integer.zero = Integer[0];
    Integer.minusOne = Integer[-1];
    Integer.max = max;
    Integer.min = min;
    Integer.gcd = gcd;
    Integer.lcm = lcm;
    Integer.isInstance = function (x) { return x instanceof BigInteger || x instanceof SmallInteger || x instanceof NativeBigInt; };
    Integer.randBetween = randBetween;

    Integer.fromArray = function (digits, base, isNegative) {
        return parseBaseFromArray(digits.map(parseValue), parseValue(base || 10), isNegative);
    };

    return Integer;
})();

// Node.js check
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
    module.exports = bigInt;
}

//amd check
if (typeof define === "function" && define.amd) {
    define("big-integer", [], function () {
        return bigInt;
    });
}

},{}],35:[function(require,module,exports){
module.exports = function(haystack, needle, comparator, low, high) {
  var mid, cmp;

  if(low === undefined)
    low = 0;

  else {
    low = low|0;
    if(low < 0 || low >= haystack.length)
      throw new RangeError("invalid lower bound");
  }

  if(high === undefined)
    high = haystack.length - 1;

  else {
    high = high|0;
    if(high < low || high >= haystack.length)
      throw new RangeError("invalid upper bound");
  }

  while(low <= high) {
    /* Note that "(low + high) >>> 1" may overflow, and results in a typecast
     * to double (which gives the wrong results). */
    mid = low + (high - low >> 1);
    cmp = +comparator(haystack[mid], needle, mid, haystack);

    /* Too low. */
    if(cmp < 0.0)
      low  = mid + 1;

    /* Too high. */
    else if(cmp > 0.0)
      high = mid - 1;

    /* Key found. */
    else
      return mid;
  }

  /* Key not found. */
  return ~low;
}

},{}],36:[function(require,module,exports){

},{}],37:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":33,"ieee754":38}],38:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],39:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],40:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

module.exports = function isBuffer (obj) {
  return obj != null && obj.constructor != null &&
    typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

},{}],41:[function(require,module,exports){
module.exports = Long;

/**
 * wasm optimizations, to do native i64 multiplication and divide
 */
var wasm = null;

try {
  wasm = new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 13, 2, 96, 0, 1, 127, 96, 4, 127, 127, 127, 127, 1, 127, 3, 7, 6, 0, 1, 1, 1, 1, 1, 6, 6, 1, 127, 1, 65, 0, 11, 7, 50, 6, 3, 109, 117, 108, 0, 1, 5, 100, 105, 118, 95, 115, 0, 2, 5, 100, 105, 118, 95, 117, 0, 3, 5, 114, 101, 109, 95, 115, 0, 4, 5, 114, 101, 109, 95, 117, 0, 5, 8, 103, 101, 116, 95, 104, 105, 103, 104, 0, 0, 10, 191, 1, 6, 4, 0, 35, 0, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 126, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 127, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 128, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 129, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 130, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11
  ])), {}).exports;
} catch (e) {
  // no wasm support :(
}

/**
 * Constructs a 64 bit two's-complement integer, given its low and high 32 bit values as *signed* integers.
 *  See the from* functions below for more convenient ways of constructing Longs.
 * @exports Long
 * @class A Long class for representing a 64 bit two's-complement integer value.
 * @param {number} low The low (signed) 32 bits of the long
 * @param {number} high The high (signed) 32 bits of the long
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @constructor
 */
function Long(low, high, unsigned) {

    /**
     * The low 32 bits as a signed value.
     * @type {number}
     */
    this.low = low | 0;

    /**
     * The high 32 bits as a signed value.
     * @type {number}
     */
    this.high = high | 0;

    /**
     * Whether unsigned or not.
     * @type {boolean}
     */
    this.unsigned = !!unsigned;
}

// The internal representation of a long is the two given signed, 32-bit values.
// We use 32-bit pieces because these are the size of integers on which
// Javascript performs bit-operations.  For operations like addition and
// multiplication, we split each number into 16 bit pieces, which can easily be
// multiplied within Javascript's floating-point representation without overflow
// or change in sign.
//
// In the algorithms below, we frequently reduce the negative case to the
// positive case by negating the input(s) and then post-processing the result.
// Note that we must ALWAYS check specially whether those values are MIN_VALUE
// (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
// a positive number, it overflows back into a negative).  Not handling this
// case would often result in infinite recursion.
//
// Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from*
// methods on which they depend.

/**
 * An indicator used to reliably determine if an object is a Long or not.
 * @type {boolean}
 * @const
 * @private
 */
Long.prototype.__isLong__;

Object.defineProperty(Long.prototype, "__isLong__", { value: true });

/**
 * @function
 * @param {*} obj Object
 * @returns {boolean}
 * @inner
 */
function isLong(obj) {
    return (obj && obj["__isLong__"]) === true;
}

/**
 * Tests if the specified object is a Long.
 * @function
 * @param {*} obj Object
 * @returns {boolean}
 */
Long.isLong = isLong;

/**
 * A cache of the Long representations of small integer values.
 * @type {!Object}
 * @inner
 */
var INT_CACHE = {};

/**
 * A cache of the Long representations of small unsigned integer values.
 * @type {!Object}
 * @inner
 */
var UINT_CACHE = {};

/**
 * @param {number} value
 * @param {boolean=} unsigned
 * @returns {!Long}
 * @inner
 */
function fromInt(value, unsigned) {
    var obj, cachedObj, cache;
    if (unsigned) {
        value >>>= 0;
        if (cache = (0 <= value && value < 256)) {
            cachedObj = UINT_CACHE[value];
            if (cachedObj)
                return cachedObj;
        }
        obj = fromBits(value, (value | 0) < 0 ? -1 : 0, true);
        if (cache)
            UINT_CACHE[value] = obj;
        return obj;
    } else {
        value |= 0;
        if (cache = (-128 <= value && value < 128)) {
            cachedObj = INT_CACHE[value];
            if (cachedObj)
                return cachedObj;
        }
        obj = fromBits(value, value < 0 ? -1 : 0, false);
        if (cache)
            INT_CACHE[value] = obj;
        return obj;
    }
}

/**
 * Returns a Long representing the given 32 bit integer value.
 * @function
 * @param {number} value The 32 bit integer in question
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {!Long} The corresponding Long value
 */
Long.fromInt = fromInt;

/**
 * @param {number} value
 * @param {boolean=} unsigned
 * @returns {!Long}
 * @inner
 */
function fromNumber(value, unsigned) {
    if (isNaN(value))
        return unsigned ? UZERO : ZERO;
    if (unsigned) {
        if (value < 0)
            return UZERO;
        if (value >= TWO_PWR_64_DBL)
            return MAX_UNSIGNED_VALUE;
    } else {
        if (value <= -TWO_PWR_63_DBL)
            return MIN_VALUE;
        if (value + 1 >= TWO_PWR_63_DBL)
            return MAX_VALUE;
    }
    if (value < 0)
        return fromNumber(-value, unsigned).neg();
    return fromBits((value % TWO_PWR_32_DBL) | 0, (value / TWO_PWR_32_DBL) | 0, unsigned);
}

/**
 * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
 * @function
 * @param {number} value The number in question
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {!Long} The corresponding Long value
 */
Long.fromNumber = fromNumber;

/**
 * @param {number} lowBits
 * @param {number} highBits
 * @param {boolean=} unsigned
 * @returns {!Long}
 * @inner
 */
function fromBits(lowBits, highBits, unsigned) {
    return new Long(lowBits, highBits, unsigned);
}

/**
 * Returns a Long representing the 64 bit integer that comes by concatenating the given low and high bits. Each is
 *  assumed to use 32 bits.
 * @function
 * @param {number} lowBits The low 32 bits
 * @param {number} highBits The high 32 bits
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {!Long} The corresponding Long value
 */
Long.fromBits = fromBits;

/**
 * @function
 * @param {number} base
 * @param {number} exponent
 * @returns {number}
 * @inner
 */
var pow_dbl = Math.pow; // Used 4 times (4*8 to 15+4)

/**
 * @param {string} str
 * @param {(boolean|number)=} unsigned
 * @param {number=} radix
 * @returns {!Long}
 * @inner
 */
function fromString(str, unsigned, radix) {
    if (str.length === 0)
        throw Error('empty string');
    if (str === "NaN" || str === "Infinity" || str === "+Infinity" || str === "-Infinity")
        return ZERO;
    if (typeof unsigned === 'number') {
        // For goog.math.long compatibility
        radix = unsigned,
        unsigned = false;
    } else {
        unsigned = !! unsigned;
    }
    radix = radix || 10;
    if (radix < 2 || 36 < radix)
        throw RangeError('radix');

    var p;
    if ((p = str.indexOf('-')) > 0)
        throw Error('interior hyphen');
    else if (p === 0) {
        return fromString(str.substring(1), unsigned, radix).neg();
    }

    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = fromNumber(pow_dbl(radix, 8));

    var result = ZERO;
    for (var i = 0; i < str.length; i += 8) {
        var size = Math.min(8, str.length - i),
            value = parseInt(str.substring(i, i + size), radix);
        if (size < 8) {
            var power = fromNumber(pow_dbl(radix, size));
            result = result.mul(power).add(fromNumber(value));
        } else {
            result = result.mul(radixToPower);
            result = result.add(fromNumber(value));
        }
    }
    result.unsigned = unsigned;
    return result;
}

/**
 * Returns a Long representation of the given string, written using the specified radix.
 * @function
 * @param {string} str The textual representation of the Long
 * @param {(boolean|number)=} unsigned Whether unsigned or not, defaults to signed
 * @param {number=} radix The radix in which the text is written (2-36), defaults to 10
 * @returns {!Long} The corresponding Long value
 */
Long.fromString = fromString;

/**
 * @function
 * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val
 * @param {boolean=} unsigned
 * @returns {!Long}
 * @inner
 */
function fromValue(val, unsigned) {
    if (typeof val === 'number')
        return fromNumber(val, unsigned);
    if (typeof val === 'string')
        return fromString(val, unsigned);
    // Throws for non-objects, converts non-instanceof Long:
    return fromBits(val.low, val.high, typeof unsigned === 'boolean' ? unsigned : val.unsigned);
}

/**
 * Converts the specified value to a Long using the appropriate from* function for its type.
 * @function
 * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val Value
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {!Long}
 */
Long.fromValue = fromValue;

// NOTE: the compiler should inline these constant values below and then remove these variables, so there should be
// no runtime penalty for these.

/**
 * @type {number}
 * @const
 * @inner
 */
var TWO_PWR_16_DBL = 1 << 16;

/**
 * @type {number}
 * @const
 * @inner
 */
var TWO_PWR_24_DBL = 1 << 24;

/**
 * @type {number}
 * @const
 * @inner
 */
var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;

/**
 * @type {number}
 * @const
 * @inner
 */
var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;

/**
 * @type {number}
 * @const
 * @inner
 */
var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;

/**
 * @type {!Long}
 * @const
 * @inner
 */
var TWO_PWR_24 = fromInt(TWO_PWR_24_DBL);

/**
 * @type {!Long}
 * @inner
 */
var ZERO = fromInt(0);

/**
 * Signed zero.
 * @type {!Long}
 */
Long.ZERO = ZERO;

/**
 * @type {!Long}
 * @inner
 */
var UZERO = fromInt(0, true);

/**
 * Unsigned zero.
 * @type {!Long}
 */
Long.UZERO = UZERO;

/**
 * @type {!Long}
 * @inner
 */
var ONE = fromInt(1);

/**
 * Signed one.
 * @type {!Long}
 */
Long.ONE = ONE;

/**
 * @type {!Long}
 * @inner
 */
var UONE = fromInt(1, true);

/**
 * Unsigned one.
 * @type {!Long}
 */
Long.UONE = UONE;

/**
 * @type {!Long}
 * @inner
 */
var NEG_ONE = fromInt(-1);

/**
 * Signed negative one.
 * @type {!Long}
 */
Long.NEG_ONE = NEG_ONE;

/**
 * @type {!Long}
 * @inner
 */
var MAX_VALUE = fromBits(0xFFFFFFFF|0, 0x7FFFFFFF|0, false);

/**
 * Maximum signed value.
 * @type {!Long}
 */
Long.MAX_VALUE = MAX_VALUE;

/**
 * @type {!Long}
 * @inner
 */
var MAX_UNSIGNED_VALUE = fromBits(0xFFFFFFFF|0, 0xFFFFFFFF|0, true);

/**
 * Maximum unsigned value.
 * @type {!Long}
 */
Long.MAX_UNSIGNED_VALUE = MAX_UNSIGNED_VALUE;

/**
 * @type {!Long}
 * @inner
 */
var MIN_VALUE = fromBits(0, 0x80000000|0, false);

/**
 * Minimum signed value.
 * @type {!Long}
 */
Long.MIN_VALUE = MIN_VALUE;

/**
 * @alias Long.prototype
 * @inner
 */
var LongPrototype = Long.prototype;

/**
 * Converts the Long to a 32 bit integer, assuming it is a 32 bit integer.
 * @returns {number}
 */
LongPrototype.toInt = function toInt() {
    return this.unsigned ? this.low >>> 0 : this.low;
};

/**
 * Converts the Long to a the nearest floating-point representation of this value (double, 53 bit mantissa).
 * @returns {number}
 */
LongPrototype.toNumber = function toNumber() {
    if (this.unsigned)
        return ((this.high >>> 0) * TWO_PWR_32_DBL) + (this.low >>> 0);
    return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
};

/**
 * Converts the Long to a string written in the specified radix.
 * @param {number=} radix Radix (2-36), defaults to 10
 * @returns {string}
 * @override
 * @throws {RangeError} If `radix` is out of range
 */
LongPrototype.toString = function toString(radix) {
    radix = radix || 10;
    if (radix < 2 || 36 < radix)
        throw RangeError('radix');
    if (this.isZero())
        return '0';
    if (this.isNegative()) { // Unsigned Longs are never negative
        if (this.eq(MIN_VALUE)) {
            // We need to change the Long value before it can be negated, so we remove
            // the bottom-most digit in this base and then recurse to do the rest.
            var radixLong = fromNumber(radix),
                div = this.div(radixLong),
                rem1 = div.mul(radixLong).sub(this);
            return div.toString(radix) + rem1.toInt().toString(radix);
        } else
            return '-' + this.neg().toString(radix);
    }

    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = fromNumber(pow_dbl(radix, 6), this.unsigned),
        rem = this;
    var result = '';
    while (true) {
        var remDiv = rem.div(radixToPower),
            intval = rem.sub(remDiv.mul(radixToPower)).toInt() >>> 0,
            digits = intval.toString(radix);
        rem = remDiv;
        if (rem.isZero())
            return digits + result;
        else {
            while (digits.length < 6)
                digits = '0' + digits;
            result = '' + digits + result;
        }
    }
};

/**
 * Gets the high 32 bits as a signed integer.
 * @returns {number} Signed high bits
 */
LongPrototype.getHighBits = function getHighBits() {
    return this.high;
};

/**
 * Gets the high 32 bits as an unsigned integer.
 * @returns {number} Unsigned high bits
 */
LongPrototype.getHighBitsUnsigned = function getHighBitsUnsigned() {
    return this.high >>> 0;
};

/**
 * Gets the low 32 bits as a signed integer.
 * @returns {number} Signed low bits
 */
LongPrototype.getLowBits = function getLowBits() {
    return this.low;
};

/**
 * Gets the low 32 bits as an unsigned integer.
 * @returns {number} Unsigned low bits
 */
LongPrototype.getLowBitsUnsigned = function getLowBitsUnsigned() {
    return this.low >>> 0;
};

/**
 * Gets the number of bits needed to represent the absolute value of this Long.
 * @returns {number}
 */
LongPrototype.getNumBitsAbs = function getNumBitsAbs() {
    if (this.isNegative()) // Unsigned Longs are never negative
        return this.eq(MIN_VALUE) ? 64 : this.neg().getNumBitsAbs();
    var val = this.high != 0 ? this.high : this.low;
    for (var bit = 31; bit > 0; bit--)
        if ((val & (1 << bit)) != 0)
            break;
    return this.high != 0 ? bit + 33 : bit + 1;
};

/**
 * Tests if this Long's value equals zero.
 * @returns {boolean}
 */
LongPrototype.isZero = function isZero() {
    return this.high === 0 && this.low === 0;
};

/**
 * Tests if this Long's value equals zero. This is an alias of {@link Long#isZero}.
 * @returns {boolean}
 */
LongPrototype.eqz = LongPrototype.isZero;

/**
 * Tests if this Long's value is negative.
 * @returns {boolean}
 */
LongPrototype.isNegative = function isNegative() {
    return !this.unsigned && this.high < 0;
};

/**
 * Tests if this Long's value is positive.
 * @returns {boolean}
 */
LongPrototype.isPositive = function isPositive() {
    return this.unsigned || this.high >= 0;
};

/**
 * Tests if this Long's value is odd.
 * @returns {boolean}
 */
LongPrototype.isOdd = function isOdd() {
    return (this.low & 1) === 1;
};

/**
 * Tests if this Long's value is even.
 * @returns {boolean}
 */
LongPrototype.isEven = function isEven() {
    return (this.low & 1) === 0;
};

/**
 * Tests if this Long's value equals the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.equals = function equals(other) {
    if (!isLong(other))
        other = fromValue(other);
    if (this.unsigned !== other.unsigned && (this.high >>> 31) === 1 && (other.high >>> 31) === 1)
        return false;
    return this.high === other.high && this.low === other.low;
};

/**
 * Tests if this Long's value equals the specified's. This is an alias of {@link Long#equals}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.eq = LongPrototype.equals;

/**
 * Tests if this Long's value differs from the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.notEquals = function notEquals(other) {
    return !this.eq(/* validates */ other);
};

/**
 * Tests if this Long's value differs from the specified's. This is an alias of {@link Long#notEquals}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.neq = LongPrototype.notEquals;

/**
 * Tests if this Long's value differs from the specified's. This is an alias of {@link Long#notEquals}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.ne = LongPrototype.notEquals;

/**
 * Tests if this Long's value is less than the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.lessThan = function lessThan(other) {
    return this.comp(/* validates */ other) < 0;
};

/**
 * Tests if this Long's value is less than the specified's. This is an alias of {@link Long#lessThan}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.lt = LongPrototype.lessThan;

/**
 * Tests if this Long's value is less than or equal the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.lessThanOrEqual = function lessThanOrEqual(other) {
    return this.comp(/* validates */ other) <= 0;
};

/**
 * Tests if this Long's value is less than or equal the specified's. This is an alias of {@link Long#lessThanOrEqual}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.lte = LongPrototype.lessThanOrEqual;

/**
 * Tests if this Long's value is less than or equal the specified's. This is an alias of {@link Long#lessThanOrEqual}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.le = LongPrototype.lessThanOrEqual;

/**
 * Tests if this Long's value is greater than the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.greaterThan = function greaterThan(other) {
    return this.comp(/* validates */ other) > 0;
};

/**
 * Tests if this Long's value is greater than the specified's. This is an alias of {@link Long#greaterThan}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.gt = LongPrototype.greaterThan;

/**
 * Tests if this Long's value is greater than or equal the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.greaterThanOrEqual = function greaterThanOrEqual(other) {
    return this.comp(/* validates */ other) >= 0;
};

/**
 * Tests if this Long's value is greater than or equal the specified's. This is an alias of {@link Long#greaterThanOrEqual}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.gte = LongPrototype.greaterThanOrEqual;

/**
 * Tests if this Long's value is greater than or equal the specified's. This is an alias of {@link Long#greaterThanOrEqual}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.ge = LongPrototype.greaterThanOrEqual;

/**
 * Compares this Long's value with the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {number} 0 if they are the same, 1 if the this is greater and -1
 *  if the given one is greater
 */
LongPrototype.compare = function compare(other) {
    if (!isLong(other))
        other = fromValue(other);
    if (this.eq(other))
        return 0;
    var thisNeg = this.isNegative(),
        otherNeg = other.isNegative();
    if (thisNeg && !otherNeg)
        return -1;
    if (!thisNeg && otherNeg)
        return 1;
    // At this point the sign bits are the same
    if (!this.unsigned)
        return this.sub(other).isNegative() ? -1 : 1;
    // Both are positive if at least one is unsigned
    return (other.high >>> 0) > (this.high >>> 0) || (other.high === this.high && (other.low >>> 0) > (this.low >>> 0)) ? -1 : 1;
};

/**
 * Compares this Long's value with the specified's. This is an alias of {@link Long#compare}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {number} 0 if they are the same, 1 if the this is greater and -1
 *  if the given one is greater
 */
LongPrototype.comp = LongPrototype.compare;

/**
 * Negates this Long's value.
 * @returns {!Long} Negated Long
 */
LongPrototype.negate = function negate() {
    if (!this.unsigned && this.eq(MIN_VALUE))
        return MIN_VALUE;
    return this.not().add(ONE);
};

/**
 * Negates this Long's value. This is an alias of {@link Long#negate}.
 * @function
 * @returns {!Long} Negated Long
 */
LongPrototype.neg = LongPrototype.negate;

/**
 * Returns the sum of this and the specified Long.
 * @param {!Long|number|string} addend Addend
 * @returns {!Long} Sum
 */
LongPrototype.add = function add(addend) {
    if (!isLong(addend))
        addend = fromValue(addend);

    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

    var a48 = this.high >>> 16;
    var a32 = this.high & 0xFFFF;
    var a16 = this.low >>> 16;
    var a00 = this.low & 0xFFFF;

    var b48 = addend.high >>> 16;
    var b32 = addend.high & 0xFFFF;
    var b16 = addend.low >>> 16;
    var b00 = addend.low & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
};

/**
 * Returns the difference of this and the specified Long.
 * @param {!Long|number|string} subtrahend Subtrahend
 * @returns {!Long} Difference
 */
LongPrototype.subtract = function subtract(subtrahend) {
    if (!isLong(subtrahend))
        subtrahend = fromValue(subtrahend);
    return this.add(subtrahend.neg());
};

/**
 * Returns the difference of this and the specified Long. This is an alias of {@link Long#subtract}.
 * @function
 * @param {!Long|number|string} subtrahend Subtrahend
 * @returns {!Long} Difference
 */
LongPrototype.sub = LongPrototype.subtract;

/**
 * Returns the product of this and the specified Long.
 * @param {!Long|number|string} multiplier Multiplier
 * @returns {!Long} Product
 */
LongPrototype.multiply = function multiply(multiplier) {
    if (this.isZero())
        return ZERO;
    if (!isLong(multiplier))
        multiplier = fromValue(multiplier);

    // use wasm support if present
    if (wasm) {
        var low = wasm.mul(this.low,
                           this.high,
                           multiplier.low,
                           multiplier.high);
        return fromBits(low, wasm.get_high(), this.unsigned);
    }

    if (multiplier.isZero())
        return ZERO;
    if (this.eq(MIN_VALUE))
        return multiplier.isOdd() ? MIN_VALUE : ZERO;
    if (multiplier.eq(MIN_VALUE))
        return this.isOdd() ? MIN_VALUE : ZERO;

    if (this.isNegative()) {
        if (multiplier.isNegative())
            return this.neg().mul(multiplier.neg());
        else
            return this.neg().mul(multiplier).neg();
    } else if (multiplier.isNegative())
        return this.mul(multiplier.neg()).neg();

    // If both longs are small, use float multiplication
    if (this.lt(TWO_PWR_24) && multiplier.lt(TWO_PWR_24))
        return fromNumber(this.toNumber() * multiplier.toNumber(), this.unsigned);

    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.

    var a48 = this.high >>> 16;
    var a32 = this.high & 0xFFFF;
    var a16 = this.low >>> 16;
    var a00 = this.low & 0xFFFF;

    var b48 = multiplier.high >>> 16;
    var b32 = multiplier.high & 0xFFFF;
    var b16 = multiplier.low >>> 16;
    var b00 = multiplier.low & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
};

/**
 * Returns the product of this and the specified Long. This is an alias of {@link Long#multiply}.
 * @function
 * @param {!Long|number|string} multiplier Multiplier
 * @returns {!Long} Product
 */
LongPrototype.mul = LongPrototype.multiply;

/**
 * Returns this Long divided by the specified. The result is signed if this Long is signed or
 *  unsigned if this Long is unsigned.
 * @param {!Long|number|string} divisor Divisor
 * @returns {!Long} Quotient
 */
LongPrototype.divide = function divide(divisor) {
    if (!isLong(divisor))
        divisor = fromValue(divisor);
    if (divisor.isZero())
        throw Error('division by zero');

    // use wasm support if present
    if (wasm) {
        // guard against signed division overflow: the largest
        // negative number / -1 would be 1 larger than the largest
        // positive number, due to two's complement.
        if (!this.unsigned &&
            this.high === -0x80000000 &&
            divisor.low === -1 && divisor.high === -1) {
            // be consistent with non-wasm code path
            return this;
        }
        var low = (this.unsigned ? wasm.div_u : wasm.div_s)(
            this.low,
            this.high,
            divisor.low,
            divisor.high
        );
        return fromBits(low, wasm.get_high(), this.unsigned);
    }

    if (this.isZero())
        return this.unsigned ? UZERO : ZERO;
    var approx, rem, res;
    if (!this.unsigned) {
        // This section is only relevant for signed longs and is derived from the
        // closure library as a whole.
        if (this.eq(MIN_VALUE)) {
            if (divisor.eq(ONE) || divisor.eq(NEG_ONE))
                return MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
            else if (divisor.eq(MIN_VALUE))
                return ONE;
            else {
                // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                var halfThis = this.shr(1);
                approx = halfThis.div(divisor).shl(1);
                if (approx.eq(ZERO)) {
                    return divisor.isNegative() ? ONE : NEG_ONE;
                } else {
                    rem = this.sub(divisor.mul(approx));
                    res = approx.add(rem.div(divisor));
                    return res;
                }
            }
        } else if (divisor.eq(MIN_VALUE))
            return this.unsigned ? UZERO : ZERO;
        if (this.isNegative()) {
            if (divisor.isNegative())
                return this.neg().div(divisor.neg());
            return this.neg().div(divisor).neg();
        } else if (divisor.isNegative())
            return this.div(divisor.neg()).neg();
        res = ZERO;
    } else {
        // The algorithm below has not been made for unsigned longs. It's therefore
        // required to take special care of the MSB prior to running it.
        if (!divisor.unsigned)
            divisor = divisor.toUnsigned();
        if (divisor.gt(this))
            return UZERO;
        if (divisor.gt(this.shru(1))) // 15 >>> 1 = 7 ; with divisor = 8 ; true
            return UONE;
        res = UZERO;
    }

    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    rem = this;
    while (rem.gte(divisor)) {
        // Approximate the result of division. This may be a little greater or
        // smaller than the actual value.
        approx = Math.max(1, Math.floor(rem.toNumber() / divisor.toNumber()));

        // We will tweak the approximate result by changing it in the 48-th digit or
        // the smallest non-fractional digit, whichever is larger.
        var log2 = Math.ceil(Math.log(approx) / Math.LN2),
            delta = (log2 <= 48) ? 1 : pow_dbl(2, log2 - 48),

        // Decrease the approximation until it is smaller than the remainder.  Note
        // that if it is too large, the product overflows and is negative.
            approxRes = fromNumber(approx),
            approxRem = approxRes.mul(divisor);
        while (approxRem.isNegative() || approxRem.gt(rem)) {
            approx -= delta;
            approxRes = fromNumber(approx, this.unsigned);
            approxRem = approxRes.mul(divisor);
        }

        // We know the answer can't be zero... and actually, zero would cause
        // infinite recursion since we would make no progress.
        if (approxRes.isZero())
            approxRes = ONE;

        res = res.add(approxRes);
        rem = rem.sub(approxRem);
    }
    return res;
};

/**
 * Returns this Long divided by the specified. This is an alias of {@link Long#divide}.
 * @function
 * @param {!Long|number|string} divisor Divisor
 * @returns {!Long} Quotient
 */
LongPrototype.div = LongPrototype.divide;

/**
 * Returns this Long modulo the specified.
 * @param {!Long|number|string} divisor Divisor
 * @returns {!Long} Remainder
 */
LongPrototype.modulo = function modulo(divisor) {
    if (!isLong(divisor))
        divisor = fromValue(divisor);

    // use wasm support if present
    if (wasm) {
        var low = (this.unsigned ? wasm.rem_u : wasm.rem_s)(
            this.low,
            this.high,
            divisor.low,
            divisor.high
        );
        return fromBits(low, wasm.get_high(), this.unsigned);
    }

    return this.sub(this.div(divisor).mul(divisor));
};

/**
 * Returns this Long modulo the specified. This is an alias of {@link Long#modulo}.
 * @function
 * @param {!Long|number|string} divisor Divisor
 * @returns {!Long} Remainder
 */
LongPrototype.mod = LongPrototype.modulo;

/**
 * Returns this Long modulo the specified. This is an alias of {@link Long#modulo}.
 * @function
 * @param {!Long|number|string} divisor Divisor
 * @returns {!Long} Remainder
 */
LongPrototype.rem = LongPrototype.modulo;

/**
 * Returns the bitwise NOT of this Long.
 * @returns {!Long}
 */
LongPrototype.not = function not() {
    return fromBits(~this.low, ~this.high, this.unsigned);
};

/**
 * Returns the bitwise AND of this Long and the specified.
 * @param {!Long|number|string} other Other Long
 * @returns {!Long}
 */
LongPrototype.and = function and(other) {
    if (!isLong(other))
        other = fromValue(other);
    return fromBits(this.low & other.low, this.high & other.high, this.unsigned);
};

/**
 * Returns the bitwise OR of this Long and the specified.
 * @param {!Long|number|string} other Other Long
 * @returns {!Long}
 */
LongPrototype.or = function or(other) {
    if (!isLong(other))
        other = fromValue(other);
    return fromBits(this.low | other.low, this.high | other.high, this.unsigned);
};

/**
 * Returns the bitwise XOR of this Long and the given one.
 * @param {!Long|number|string} other Other Long
 * @returns {!Long}
 */
LongPrototype.xor = function xor(other) {
    if (!isLong(other))
        other = fromValue(other);
    return fromBits(this.low ^ other.low, this.high ^ other.high, this.unsigned);
};

/**
 * Returns this Long with bits shifted to the left by the given amount.
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shiftLeft = function shiftLeft(numBits) {
    if (isLong(numBits))
        numBits = numBits.toInt();
    if ((numBits &= 63) === 0)
        return this;
    else if (numBits < 32)
        return fromBits(this.low << numBits, (this.high << numBits) | (this.low >>> (32 - numBits)), this.unsigned);
    else
        return fromBits(0, this.low << (numBits - 32), this.unsigned);
};

/**
 * Returns this Long with bits shifted to the left by the given amount. This is an alias of {@link Long#shiftLeft}.
 * @function
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shl = LongPrototype.shiftLeft;

/**
 * Returns this Long with bits arithmetically shifted to the right by the given amount.
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shiftRight = function shiftRight(numBits) {
    if (isLong(numBits))
        numBits = numBits.toInt();
    if ((numBits &= 63) === 0)
        return this;
    else if (numBits < 32)
        return fromBits((this.low >>> numBits) | (this.high << (32 - numBits)), this.high >> numBits, this.unsigned);
    else
        return fromBits(this.high >> (numBits - 32), this.high >= 0 ? 0 : -1, this.unsigned);
};

/**
 * Returns this Long with bits arithmetically shifted to the right by the given amount. This is an alias of {@link Long#shiftRight}.
 * @function
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shr = LongPrototype.shiftRight;

/**
 * Returns this Long with bits logically shifted to the right by the given amount.
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shiftRightUnsigned = function shiftRightUnsigned(numBits) {
    if (isLong(numBits))
        numBits = numBits.toInt();
    numBits &= 63;
    if (numBits === 0)
        return this;
    else {
        var high = this.high;
        if (numBits < 32) {
            var low = this.low;
            return fromBits((low >>> numBits) | (high << (32 - numBits)), high >>> numBits, this.unsigned);
        } else if (numBits === 32)
            return fromBits(high, 0, this.unsigned);
        else
            return fromBits(high >>> (numBits - 32), 0, this.unsigned);
    }
};

/**
 * Returns this Long with bits logically shifted to the right by the given amount. This is an alias of {@link Long#shiftRightUnsigned}.
 * @function
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shru = LongPrototype.shiftRightUnsigned;

/**
 * Returns this Long with bits logically shifted to the right by the given amount. This is an alias of {@link Long#shiftRightUnsigned}.
 * @function
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shr_u = LongPrototype.shiftRightUnsigned;

/**
 * Converts this Long to signed.
 * @returns {!Long} Signed long
 */
LongPrototype.toSigned = function toSigned() {
    if (!this.unsigned)
        return this;
    return fromBits(this.low, this.high, false);
};

/**
 * Converts this Long to unsigned.
 * @returns {!Long} Unsigned long
 */
LongPrototype.toUnsigned = function toUnsigned() {
    if (this.unsigned)
        return this;
    return fromBits(this.low, this.high, true);
};

/**
 * Converts this Long to its byte representation.
 * @param {boolean=} le Whether little or big endian, defaults to big endian
 * @returns {!Array.<number>} Byte representation
 */
LongPrototype.toBytes = function toBytes(le) {
    return le ? this.toBytesLE() : this.toBytesBE();
};

/**
 * Converts this Long to its little endian byte representation.
 * @returns {!Array.<number>} Little endian byte representation
 */
LongPrototype.toBytesLE = function toBytesLE() {
    var hi = this.high,
        lo = this.low;
    return [
        lo        & 0xff,
        lo >>>  8 & 0xff,
        lo >>> 16 & 0xff,
        lo >>> 24       ,
        hi        & 0xff,
        hi >>>  8 & 0xff,
        hi >>> 16 & 0xff,
        hi >>> 24
    ];
};

/**
 * Converts this Long to its big endian byte representation.
 * @returns {!Array.<number>} Big endian byte representation
 */
LongPrototype.toBytesBE = function toBytesBE() {
    var hi = this.high,
        lo = this.low;
    return [
        hi >>> 24       ,
        hi >>> 16 & 0xff,
        hi >>>  8 & 0xff,
        hi        & 0xff,
        lo >>> 24       ,
        lo >>> 16 & 0xff,
        lo >>>  8 & 0xff,
        lo        & 0xff
    ];
};

/**
 * Creates a Long from its byte representation.
 * @param {!Array.<number>} bytes Byte representation
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @param {boolean=} le Whether little or big endian, defaults to big endian
 * @returns {Long} The corresponding Long value
 */
Long.fromBytes = function fromBytes(bytes, unsigned, le) {
    return le ? Long.fromBytesLE(bytes, unsigned) : Long.fromBytesBE(bytes, unsigned);
};

/**
 * Creates a Long from its little endian byte representation.
 * @param {!Array.<number>} bytes Little endian byte representation
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {Long} The corresponding Long value
 */
Long.fromBytesLE = function fromBytesLE(bytes, unsigned) {
    return new Long(
        bytes[0]       |
        bytes[1] <<  8 |
        bytes[2] << 16 |
        bytes[3] << 24,
        bytes[4]       |
        bytes[5] <<  8 |
        bytes[6] << 16 |
        bytes[7] << 24,
        unsigned
    );
};

/**
 * Creates a Long from its big endian byte representation.
 * @param {!Array.<number>} bytes Big endian byte representation
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {Long} The corresponding Long value
 */
Long.fromBytesBE = function fromBytesBE(bytes, unsigned) {
    return new Long(
        bytes[4] << 24 |
        bytes[5] << 16 |
        bytes[6] <<  8 |
        bytes[7],
        bytes[0] << 24 |
        bytes[1] << 16 |
        bytes[2] <<  8 |
        bytes[3],
        unsigned
    );
};

},{}],42:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],43:[function(require,module,exports){
// minimal library entry point.

"use strict";
module.exports = require("./src/index-minimal");

},{"./src/index-minimal":44}],44:[function(require,module,exports){
"use strict";
var protobuf = exports;

/**
 * Build type, one of `"full"`, `"light"` or `"minimal"`.
 * @name build
 * @type {string}
 * @const
 */
protobuf.build = "minimal";

// Serialization
protobuf.Writer       = require("./writer");
protobuf.BufferWriter = require("./writer_buffer");
protobuf.Reader       = require("./reader");
protobuf.BufferReader = require("./reader_buffer");

// Utility
protobuf.util         = require("./util/minimal");
protobuf.rpc          = require("./rpc");
protobuf.roots        = require("./roots");
protobuf.configure    = configure;

/* istanbul ignore next */
/**
 * Reconfigures the library according to the environment.
 * @returns {undefined}
 */
function configure() {
    protobuf.Reader._configure(protobuf.BufferReader);
    protobuf.util._configure();
}

// Set up buffer utility according to the environment
protobuf.Writer._configure(protobuf.BufferWriter);
configure();

},{"./reader":45,"./reader_buffer":46,"./roots":47,"./rpc":48,"./util/minimal":51,"./writer":52,"./writer_buffer":53}],45:[function(require,module,exports){
"use strict";
module.exports = Reader;

var util      = require("./util/minimal");

var BufferReader; // cyclic

var LongBits  = util.LongBits,
    utf8      = util.utf8;

/* istanbul ignore next */
function indexOutOfRange(reader, writeLength) {
    return RangeError("index out of range: " + reader.pos + " + " + (writeLength || 1) + " > " + reader.len);
}

/**
 * Constructs a new reader instance using the specified buffer.
 * @classdesc Wire format reader using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 * @param {Uint8Array} buffer Buffer to read from
 */
function Reader(buffer) {

    /**
     * Read buffer.
     * @type {Uint8Array}
     */
    this.buf = buffer;

    /**
     * Read buffer position.
     * @type {number}
     */
    this.pos = 0;

    /**
     * Read buffer length.
     * @type {number}
     */
    this.len = buffer.length;
}

var create_array = typeof Uint8Array !== "undefined"
    ? function create_typed_array(buffer) {
        if (buffer instanceof Uint8Array || Array.isArray(buffer))
            return new Reader(buffer);
        throw Error("illegal buffer");
    }
    /* istanbul ignore next */
    : function create_array(buffer) {
        if (Array.isArray(buffer))
            return new Reader(buffer);
        throw Error("illegal buffer");
    };

/**
 * Creates a new reader using the specified buffer.
 * @function
 * @param {Uint8Array|Buffer} buffer Buffer to read from
 * @returns {Reader|BufferReader} A {@link BufferReader} if `buffer` is a Buffer, otherwise a {@link Reader}
 * @throws {Error} If `buffer` is not a valid buffer
 */
Reader.create = util.Buffer
    ? function create_buffer_setup(buffer) {
        return (Reader.create = function create_buffer(buffer) {
            return util.Buffer.isBuffer(buffer)
                ? new BufferReader(buffer)
                /* istanbul ignore next */
                : create_array(buffer);
        })(buffer);
    }
    /* istanbul ignore next */
    : create_array;

Reader.prototype._slice = util.Array.prototype.subarray || /* istanbul ignore next */ util.Array.prototype.slice;

/**
 * Reads a varint as an unsigned 32 bit value.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.uint32 = (function read_uint32_setup() {
    var value = 4294967295; // optimizer type-hint, tends to deopt otherwise (?!)
    return function read_uint32() {
        value = (         this.buf[this.pos] & 127       ) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) <<  7) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 14) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 21) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] &  15) << 28) >>> 0; if (this.buf[this.pos++] < 128) return value;

        /* istanbul ignore if */
        if ((this.pos += 5) > this.len) {
            this.pos = this.len;
            throw indexOutOfRange(this, 10);
        }
        return value;
    };
})();

/**
 * Reads a varint as a signed 32 bit value.
 * @returns {number} Value read
 */
Reader.prototype.int32 = function read_int32() {
    return this.uint32() | 0;
};

/**
 * Reads a zig-zag encoded varint as a signed 32 bit value.
 * @returns {number} Value read
 */
Reader.prototype.sint32 = function read_sint32() {
    var value = this.uint32();
    return value >>> 1 ^ -(value & 1) | 0;
};

/* eslint-disable no-invalid-this */

function readLongVarint() {
    // tends to deopt with local vars for octet etc.
    var bits = new LongBits(0, 0);
    var i = 0;
    if (this.len - this.pos > 4) { // fast route (lo)
        for (; i < 4; ++i) {
            // 1st..4th
            bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
        // 5th
        bits.lo = (bits.lo | (this.buf[this.pos] & 127) << 28) >>> 0;
        bits.hi = (bits.hi | (this.buf[this.pos] & 127) >>  4) >>> 0;
        if (this.buf[this.pos++] < 128)
            return bits;
        i = 0;
    } else {
        for (; i < 3; ++i) {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
            // 1st..3th
            bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
        // 4th
        bits.lo = (bits.lo | (this.buf[this.pos++] & 127) << i * 7) >>> 0;
        return bits;
    }
    if (this.len - this.pos > 4) { // fast route (hi)
        for (; i < 5; ++i) {
            // 6th..10th
            bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
    } else {
        for (; i < 5; ++i) {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
            // 6th..10th
            bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
    }
    /* istanbul ignore next */
    throw Error("invalid varint encoding");
}

/* eslint-enable no-invalid-this */

/**
 * Reads a varint as a signed 64 bit value.
 * @name Reader#int64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a varint as an unsigned 64 bit value.
 * @name Reader#uint64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a zig-zag encoded varint as a signed 64 bit value.
 * @name Reader#sint64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a varint as a boolean.
 * @returns {boolean} Value read
 */
Reader.prototype.bool = function read_bool() {
    return this.uint32() !== 0;
};

function readFixed32_end(buf, end) { // note that this uses `end`, not `pos`
    return (buf[end - 4]
          | buf[end - 3] << 8
          | buf[end - 2] << 16
          | buf[end - 1] << 24) >>> 0;
}

/**
 * Reads fixed 32 bits as an unsigned 32 bit integer.
 * @returns {number} Value read
 */
Reader.prototype.fixed32 = function read_fixed32() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    return readFixed32_end(this.buf, this.pos += 4);
};

/**
 * Reads fixed 32 bits as a signed 32 bit integer.
 * @returns {number} Value read
 */
Reader.prototype.sfixed32 = function read_sfixed32() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    return readFixed32_end(this.buf, this.pos += 4) | 0;
};

/* eslint-disable no-invalid-this */

function readFixed64(/* this: Reader */) {

    /* istanbul ignore if */
    if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 8);

    return new LongBits(readFixed32_end(this.buf, this.pos += 4), readFixed32_end(this.buf, this.pos += 4));
}

/* eslint-enable no-invalid-this */

/**
 * Reads fixed 64 bits.
 * @name Reader#fixed64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads zig-zag encoded fixed 64 bits.
 * @name Reader#sfixed64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a float (32 bit) as a number.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.float = function read_float() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    var value = util.float.readFloatLE(this.buf, this.pos);
    this.pos += 4;
    return value;
};

/**
 * Reads a double (64 bit float) as a number.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.double = function read_double() {

    /* istanbul ignore if */
    if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 4);

    var value = util.float.readDoubleLE(this.buf, this.pos);
    this.pos += 8;
    return value;
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @returns {Uint8Array} Value read
 */
Reader.prototype.bytes = function read_bytes() {
    var length = this.uint32(),
        start  = this.pos,
        end    = this.pos + length;

    /* istanbul ignore if */
    if (end > this.len)
        throw indexOutOfRange(this, length);

    this.pos += length;
    if (Array.isArray(this.buf)) // plain array
        return this.buf.slice(start, end);
    return start === end // fix for IE 10/Win8 and others' subarray returning array of size 1
        ? new this.buf.constructor(0)
        : this._slice.call(this.buf, start, end);
};

/**
 * Reads a string preceeded by its byte length as a varint.
 * @returns {string} Value read
 */
Reader.prototype.string = function read_string() {
    var bytes = this.bytes();
    return utf8.read(bytes, 0, bytes.length);
};

/**
 * Skips the specified number of bytes if specified, otherwise skips a varint.
 * @param {number} [length] Length if known, otherwise a varint is assumed
 * @returns {Reader} `this`
 */
Reader.prototype.skip = function skip(length) {
    if (typeof length === "number") {
        /* istanbul ignore if */
        if (this.pos + length > this.len)
            throw indexOutOfRange(this, length);
        this.pos += length;
    } else {
        do {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
        } while (this.buf[this.pos++] & 128);
    }
    return this;
};

/**
 * Skips the next element of the specified wire type.
 * @param {number} wireType Wire type received
 * @returns {Reader} `this`
 */
Reader.prototype.skipType = function(wireType) {
    switch (wireType) {
        case 0:
            this.skip();
            break;
        case 1:
            this.skip(8);
            break;
        case 2:
            this.skip(this.uint32());
            break;
        case 3:
            while ((wireType = this.uint32() & 7) !== 4) {
                this.skipType(wireType);
            }
            break;
        case 5:
            this.skip(4);
            break;

        /* istanbul ignore next */
        default:
            throw Error("invalid wire type " + wireType + " at offset " + this.pos);
    }
    return this;
};

Reader._configure = function(BufferReader_) {
    BufferReader = BufferReader_;

    var fn = util.Long ? "toLong" : /* istanbul ignore next */ "toNumber";
    util.merge(Reader.prototype, {

        int64: function read_int64() {
            return readLongVarint.call(this)[fn](false);
        },

        uint64: function read_uint64() {
            return readLongVarint.call(this)[fn](true);
        },

        sint64: function read_sint64() {
            return readLongVarint.call(this).zzDecode()[fn](false);
        },

        fixed64: function read_fixed64() {
            return readFixed64.call(this)[fn](true);
        },

        sfixed64: function read_sfixed64() {
            return readFixed64.call(this)[fn](false);
        }

    });
};

},{"./util/minimal":51}],46:[function(require,module,exports){
"use strict";
module.exports = BufferReader;

// extends Reader
var Reader = require("./reader");
(BufferReader.prototype = Object.create(Reader.prototype)).constructor = BufferReader;

var util = require("./util/minimal");

/**
 * Constructs a new buffer reader instance.
 * @classdesc Wire format reader using node buffers.
 * @extends Reader
 * @constructor
 * @param {Buffer} buffer Buffer to read from
 */
function BufferReader(buffer) {
    Reader.call(this, buffer);

    /**
     * Read buffer.
     * @name BufferReader#buf
     * @type {Buffer}
     */
}

/* istanbul ignore else */
if (util.Buffer)
    BufferReader.prototype._slice = util.Buffer.prototype.slice;

/**
 * @override
 */
BufferReader.prototype.string = function read_string_buffer() {
    var len = this.uint32(); // modifies pos
    return this.buf.utf8Slice(this.pos, this.pos = Math.min(this.pos + len, this.len));
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @name BufferReader#bytes
 * @function
 * @returns {Buffer} Value read
 */

},{"./reader":45,"./util/minimal":51}],47:[function(require,module,exports){
"use strict";
module.exports = {};

/**
 * Named roots.
 * This is where pbjs stores generated structures (the option `-r, --root` specifies a name).
 * Can also be used manually to make roots available accross modules.
 * @name roots
 * @type {Object.<string,Root>}
 * @example
 * // pbjs -r myroot -o compiled.js ...
 *
 * // in another module:
 * require("./compiled.js");
 *
 * // in any subsequent module:
 * var root = protobuf.roots["myroot"];
 */

},{}],48:[function(require,module,exports){
"use strict";

/**
 * Streaming RPC helpers.
 * @namespace
 */
var rpc = exports;

/**
 * RPC implementation passed to {@link Service#create} performing a service request on network level, i.e. by utilizing http requests or websockets.
 * @typedef RPCImpl
 * @type {function}
 * @param {Method|rpc.ServiceMethod<Message<{}>,Message<{}>>} method Reflected or static method being called
 * @param {Uint8Array} requestData Request data
 * @param {RPCImplCallback} callback Callback function
 * @returns {undefined}
 * @example
 * function rpcImpl(method, requestData, callback) {
 *     if (protobuf.util.lcFirst(method.name) !== "myMethod") // compatible with static code
 *         throw Error("no such method");
 *     asynchronouslyObtainAResponse(requestData, function(err, responseData) {
 *         callback(err, responseData);
 *     });
 * }
 */

/**
 * Node-style callback as used by {@link RPCImpl}.
 * @typedef RPCImplCallback
 * @type {function}
 * @param {Error|null} error Error, if any, otherwise `null`
 * @param {Uint8Array|null} [response] Response data or `null` to signal end of stream, if there hasn't been an error
 * @returns {undefined}
 */

rpc.Service = require("./rpc/service");

},{"./rpc/service":49}],49:[function(require,module,exports){
"use strict";
module.exports = Service;

var util = require("../util/minimal");

// Extends EventEmitter
(Service.prototype = Object.create(util.EventEmitter.prototype)).constructor = Service;

/**
 * A service method callback as used by {@link rpc.ServiceMethod|ServiceMethod}.
 *
 * Differs from {@link RPCImplCallback} in that it is an actual callback of a service method which may not return `response = null`.
 * @typedef rpc.ServiceMethodCallback
 * @template TRes extends Message<TRes>
 * @type {function}
 * @param {Error|null} error Error, if any
 * @param {TRes} [response] Response message
 * @returns {undefined}
 */

/**
 * A service method part of a {@link rpc.Service} as created by {@link Service.create}.
 * @typedef rpc.ServiceMethod
 * @template TReq extends Message<TReq>
 * @template TRes extends Message<TRes>
 * @type {function}
 * @param {TReq|Properties<TReq>} request Request message or plain object
 * @param {rpc.ServiceMethodCallback<TRes>} [callback] Node-style callback called with the error, if any, and the response message
 * @returns {Promise<Message<TRes>>} Promise if `callback` has been omitted, otherwise `undefined`
 */

/**
 * Constructs a new RPC service instance.
 * @classdesc An RPC service as returned by {@link Service#create}.
 * @exports rpc.Service
 * @extends util.EventEmitter
 * @constructor
 * @param {RPCImpl} rpcImpl RPC implementation
 * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
 * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
 */
function Service(rpcImpl, requestDelimited, responseDelimited) {

    if (typeof rpcImpl !== "function")
        throw TypeError("rpcImpl must be a function");

    util.EventEmitter.call(this);

    /**
     * RPC implementation. Becomes `null` once the service is ended.
     * @type {RPCImpl|null}
     */
    this.rpcImpl = rpcImpl;

    /**
     * Whether requests are length-delimited.
     * @type {boolean}
     */
    this.requestDelimited = Boolean(requestDelimited);

    /**
     * Whether responses are length-delimited.
     * @type {boolean}
     */
    this.responseDelimited = Boolean(responseDelimited);
}

/**
 * Calls a service method through {@link rpc.Service#rpcImpl|rpcImpl}.
 * @param {Method|rpc.ServiceMethod<TReq,TRes>} method Reflected or static method
 * @param {Constructor<TReq>} requestCtor Request constructor
 * @param {Constructor<TRes>} responseCtor Response constructor
 * @param {TReq|Properties<TReq>} request Request message or plain object
 * @param {rpc.ServiceMethodCallback<TRes>} callback Service callback
 * @returns {undefined}
 * @template TReq extends Message<TReq>
 * @template TRes extends Message<TRes>
 */
Service.prototype.rpcCall = function rpcCall(method, requestCtor, responseCtor, request, callback) {

    if (!request)
        throw TypeError("request must be specified");

    var self = this;
    if (!callback)
        return util.asPromise(rpcCall, self, method, requestCtor, responseCtor, request);

    if (!self.rpcImpl) {
        setTimeout(function() { callback(Error("already ended")); }, 0);
        return undefined;
    }

    try {
        return self.rpcImpl(
            method,
            requestCtor[self.requestDelimited ? "encodeDelimited" : "encode"](request).finish(),
            function rpcCallback(err, response) {

                if (err) {
                    self.emit("error", err, method);
                    return callback(err);
                }

                if (response === null) {
                    self.end(/* endedByRPC */ true);
                    return undefined;
                }

                if (!(response instanceof responseCtor)) {
                    try {
                        response = responseCtor[self.responseDelimited ? "decodeDelimited" : "decode"](response);
                    } catch (err) {
                        self.emit("error", err, method);
                        return callback(err);
                    }
                }

                self.emit("data", response, method);
                return callback(null, response);
            }
        );
    } catch (err) {
        self.emit("error", err, method);
        setTimeout(function() { callback(err); }, 0);
        return undefined;
    }
};

/**
 * Ends this service and emits the `end` event.
 * @param {boolean} [endedByRPC=false] Whether the service has been ended by the RPC implementation.
 * @returns {rpc.Service} `this`
 */
Service.prototype.end = function end(endedByRPC) {
    if (this.rpcImpl) {
        if (!endedByRPC) // signal end to rpcImpl
            this.rpcImpl(null, null, null);
        this.rpcImpl = null;
        this.emit("end").off();
    }
    return this;
};

},{"../util/minimal":51}],50:[function(require,module,exports){
"use strict";
module.exports = LongBits;

var util = require("../util/minimal");

/**
 * Constructs new long bits.
 * @classdesc Helper class for working with the low and high bits of a 64 bit value.
 * @memberof util
 * @constructor
 * @param {number} lo Low 32 bits, unsigned
 * @param {number} hi High 32 bits, unsigned
 */
function LongBits(lo, hi) {

    // note that the casts below are theoretically unnecessary as of today, but older statically
    // generated converter code might still call the ctor with signed 32bits. kept for compat.

    /**
     * Low bits.
     * @type {number}
     */
    this.lo = lo >>> 0;

    /**
     * High bits.
     * @type {number}
     */
    this.hi = hi >>> 0;
}

/**
 * Zero bits.
 * @memberof util.LongBits
 * @type {util.LongBits}
 */
var zero = LongBits.zero = new LongBits(0, 0);

zero.toNumber = function() { return 0; };
zero.zzEncode = zero.zzDecode = function() { return this; };
zero.length = function() { return 1; };

/**
 * Zero hash.
 * @memberof util.LongBits
 * @type {string}
 */
var zeroHash = LongBits.zeroHash = "\0\0\0\0\0\0\0\0";

/**
 * Constructs new long bits from the specified number.
 * @param {number} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.fromNumber = function fromNumber(value) {
    if (value === 0)
        return zero;
    var sign = value < 0;
    if (sign)
        value = -value;
    var lo = value >>> 0,
        hi = (value - lo) / 4294967296 >>> 0;
    if (sign) {
        hi = ~hi >>> 0;
        lo = ~lo >>> 0;
        if (++lo > 4294967295) {
            lo = 0;
            if (++hi > 4294967295)
                hi = 0;
        }
    }
    return new LongBits(lo, hi);
};

/**
 * Constructs new long bits from a number, long or string.
 * @param {Long|number|string} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.from = function from(value) {
    if (typeof value === "number")
        return LongBits.fromNumber(value);
    if (util.isString(value)) {
        /* istanbul ignore else */
        if (util.Long)
            value = util.Long.fromString(value);
        else
            return LongBits.fromNumber(parseInt(value, 10));
    }
    return value.low || value.high ? new LongBits(value.low >>> 0, value.high >>> 0) : zero;
};

/**
 * Converts this long bits to a possibly unsafe JavaScript number.
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {number} Possibly unsafe number
 */
LongBits.prototype.toNumber = function toNumber(unsigned) {
    if (!unsigned && this.hi >>> 31) {
        var lo = ~this.lo + 1 >>> 0,
            hi = ~this.hi     >>> 0;
        if (!lo)
            hi = hi + 1 >>> 0;
        return -(lo + hi * 4294967296);
    }
    return this.lo + this.hi * 4294967296;
};

/**
 * Converts this long bits to a long.
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long} Long
 */
LongBits.prototype.toLong = function toLong(unsigned) {
    return util.Long
        ? new util.Long(this.lo | 0, this.hi | 0, Boolean(unsigned))
        /* istanbul ignore next */
        : { low: this.lo | 0, high: this.hi | 0, unsigned: Boolean(unsigned) };
};

var charCodeAt = String.prototype.charCodeAt;

/**
 * Constructs new long bits from the specified 8 characters long hash.
 * @param {string} hash Hash
 * @returns {util.LongBits} Bits
 */
LongBits.fromHash = function fromHash(hash) {
    if (hash === zeroHash)
        return zero;
    return new LongBits(
        ( charCodeAt.call(hash, 0)
        | charCodeAt.call(hash, 1) << 8
        | charCodeAt.call(hash, 2) << 16
        | charCodeAt.call(hash, 3) << 24) >>> 0
    ,
        ( charCodeAt.call(hash, 4)
        | charCodeAt.call(hash, 5) << 8
        | charCodeAt.call(hash, 6) << 16
        | charCodeAt.call(hash, 7) << 24) >>> 0
    );
};

/**
 * Converts this long bits to a 8 characters long hash.
 * @returns {string} Hash
 */
LongBits.prototype.toHash = function toHash() {
    return String.fromCharCode(
        this.lo        & 255,
        this.lo >>> 8  & 255,
        this.lo >>> 16 & 255,
        this.lo >>> 24      ,
        this.hi        & 255,
        this.hi >>> 8  & 255,
        this.hi >>> 16 & 255,
        this.hi >>> 24
    );
};

/**
 * Zig-zag encodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBits.prototype.zzEncode = function zzEncode() {
    var mask =   this.hi >> 31;
    this.hi  = ((this.hi << 1 | this.lo >>> 31) ^ mask) >>> 0;
    this.lo  = ( this.lo << 1                   ^ mask) >>> 0;
    return this;
};

/**
 * Zig-zag decodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBits.prototype.zzDecode = function zzDecode() {
    var mask = -(this.lo & 1);
    this.lo  = ((this.lo >>> 1 | this.hi << 31) ^ mask) >>> 0;
    this.hi  = ( this.hi >>> 1                  ^ mask) >>> 0;
    return this;
};

/**
 * Calculates the length of this longbits when encoded as a varint.
 * @returns {number} Length
 */
LongBits.prototype.length = function length() {
    var part0 =  this.lo,
        part1 = (this.lo >>> 28 | this.hi << 4) >>> 0,
        part2 =  this.hi >>> 24;
    return part2 === 0
         ? part1 === 0
           ? part0 < 16384
             ? part0 < 128 ? 1 : 2
             : part0 < 2097152 ? 3 : 4
           : part1 < 16384
             ? part1 < 128 ? 5 : 6
             : part1 < 2097152 ? 7 : 8
         : part2 < 128 ? 9 : 10;
};

},{"../util/minimal":51}],51:[function(require,module,exports){
(function (global){
"use strict";
var util = exports;

// used to return a Promise where callback is omitted
util.asPromise = require("@protobufjs/aspromise");

// converts to / from base64 encoded strings
util.base64 = require("@protobufjs/base64");

// base class of rpc.Service
util.EventEmitter = require("@protobufjs/eventemitter");

// float handling accross browsers
util.float = require("@protobufjs/float");

// requires modules optionally and hides the call from bundlers
util.inquire = require("@protobufjs/inquire");

// converts to / from utf8 encoded strings
util.utf8 = require("@protobufjs/utf8");

// provides a node-like buffer pool in the browser
util.pool = require("@protobufjs/pool");

// utility to work with the low and high bits of a 64 bit value
util.LongBits = require("./longbits");

// global object reference
util.global = typeof window !== "undefined" && window
           || typeof global !== "undefined" && global
           || typeof self   !== "undefined" && self
           || this; // eslint-disable-line no-invalid-this

/**
 * An immuable empty array.
 * @memberof util
 * @type {Array.<*>}
 * @const
 */
util.emptyArray = Object.freeze ? Object.freeze([]) : /* istanbul ignore next */ []; // used on prototypes

/**
 * An immutable empty object.
 * @type {Object}
 * @const
 */
util.emptyObject = Object.freeze ? Object.freeze({}) : /* istanbul ignore next */ {}; // used on prototypes

/**
 * Whether running within node or not.
 * @memberof util
 * @type {boolean}
 * @const
 */
util.isNode = Boolean(util.global.process && util.global.process.versions && util.global.process.versions.node);

/**
 * Tests if the specified value is an integer.
 * @function
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is an integer
 */
util.isInteger = Number.isInteger || /* istanbul ignore next */ function isInteger(value) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
};

/**
 * Tests if the specified value is a string.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a string
 */
util.isString = function isString(value) {
    return typeof value === "string" || value instanceof String;
};

/**
 * Tests if the specified value is a non-null object.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a non-null object
 */
util.isObject = function isObject(value) {
    return value && typeof value === "object";
};

/**
 * Checks if a property on a message is considered to be present.
 * This is an alias of {@link util.isSet}.
 * @function
 * @param {Object} obj Plain object or message instance
 * @param {string} prop Property name
 * @returns {boolean} `true` if considered to be present, otherwise `false`
 */
util.isset =

/**
 * Checks if a property on a message is considered to be present.
 * @param {Object} obj Plain object or message instance
 * @param {string} prop Property name
 * @returns {boolean} `true` if considered to be present, otherwise `false`
 */
util.isSet = function isSet(obj, prop) {
    var value = obj[prop];
    if (value != null && obj.hasOwnProperty(prop)) // eslint-disable-line eqeqeq, no-prototype-builtins
        return typeof value !== "object" || (Array.isArray(value) ? value.length : Object.keys(value).length) > 0;
    return false;
};

/**
 * Any compatible Buffer instance.
 * This is a minimal stand-alone definition of a Buffer instance. The actual type is that exported by node's typings.
 * @interface Buffer
 * @extends Uint8Array
 */

/**
 * Node's Buffer class if available.
 * @type {Constructor<Buffer>}
 */
util.Buffer = (function() {
    try {
        var Buffer = util.inquire("buffer").Buffer;
        // refuse to use non-node buffers if not explicitly assigned (perf reasons):
        return Buffer.prototype.utf8Write ? Buffer : /* istanbul ignore next */ null;
    } catch (e) {
        /* istanbul ignore next */
        return null;
    }
})();

// Internal alias of or polyfull for Buffer.from.
util._Buffer_from = null;

// Internal alias of or polyfill for Buffer.allocUnsafe.
util._Buffer_allocUnsafe = null;

/**
 * Creates a new buffer of whatever type supported by the environment.
 * @param {number|number[]} [sizeOrArray=0] Buffer size or number array
 * @returns {Uint8Array|Buffer} Buffer
 */
util.newBuffer = function newBuffer(sizeOrArray) {
    /* istanbul ignore next */
    return typeof sizeOrArray === "number"
        ? util.Buffer
            ? util._Buffer_allocUnsafe(sizeOrArray)
            : new util.Array(sizeOrArray)
        : util.Buffer
            ? util._Buffer_from(sizeOrArray)
            : typeof Uint8Array === "undefined"
                ? sizeOrArray
                : new Uint8Array(sizeOrArray);
};

/**
 * Array implementation used in the browser. `Uint8Array` if supported, otherwise `Array`.
 * @type {Constructor<Uint8Array>}
 */
util.Array = typeof Uint8Array !== "undefined" ? Uint8Array /* istanbul ignore next */ : Array;

/**
 * Any compatible Long instance.
 * This is a minimal stand-alone definition of a Long instance. The actual type is that exported by long.js.
 * @interface Long
 * @property {number} low Low bits
 * @property {number} high High bits
 * @property {boolean} unsigned Whether unsigned or not
 */

/**
 * Long.js's Long class if available.
 * @type {Constructor<Long>}
 */
util.Long = /* istanbul ignore next */ util.global.dcodeIO && /* istanbul ignore next */ util.global.dcodeIO.Long
         || /* istanbul ignore next */ util.global.Long
         || util.inquire("long");

/**
 * Regular expression used to verify 2 bit (`bool`) map keys.
 * @type {RegExp}
 * @const
 */
util.key2Re = /^true|false|0|1$/;

/**
 * Regular expression used to verify 32 bit (`int32` etc.) map keys.
 * @type {RegExp}
 * @const
 */
util.key32Re = /^-?(?:0|[1-9][0-9]*)$/;

/**
 * Regular expression used to verify 64 bit (`int64` etc.) map keys.
 * @type {RegExp}
 * @const
 */
util.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/;

/**
 * Converts a number or long to an 8 characters long hash string.
 * @param {Long|number} value Value to convert
 * @returns {string} Hash
 */
util.longToHash = function longToHash(value) {
    return value
        ? util.LongBits.from(value).toHash()
        : util.LongBits.zeroHash;
};

/**
 * Converts an 8 characters long hash string to a long or number.
 * @param {string} hash Hash
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long|number} Original value
 */
util.longFromHash = function longFromHash(hash, unsigned) {
    var bits = util.LongBits.fromHash(hash);
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, unsigned);
    return bits.toNumber(Boolean(unsigned));
};

/**
 * Merges the properties of the source object into the destination object.
 * @memberof util
 * @param {Object.<string,*>} dst Destination object
 * @param {Object.<string,*>} src Source object
 * @param {boolean} [ifNotSet=false] Merges only if the key is not already set
 * @returns {Object.<string,*>} Destination object
 */
function merge(dst, src, ifNotSet) { // used by converters
    for (var keys = Object.keys(src), i = 0; i < keys.length; ++i)
        if (dst[keys[i]] === undefined || !ifNotSet)
            dst[keys[i]] = src[keys[i]];
    return dst;
}

util.merge = merge;

/**
 * Converts the first character of a string to lower case.
 * @param {string} str String to convert
 * @returns {string} Converted string
 */
util.lcFirst = function lcFirst(str) {
    return str.charAt(0).toLowerCase() + str.substring(1);
};

/**
 * Creates a custom error constructor.
 * @memberof util
 * @param {string} name Error name
 * @returns {Constructor<Error>} Custom error constructor
 */
function newError(name) {

    function CustomError(message, properties) {

        if (!(this instanceof CustomError))
            return new CustomError(message, properties);

        // Error.call(this, message);
        // ^ just returns a new error instance because the ctor can be called as a function

        Object.defineProperty(this, "message", { get: function() { return message; } });

        /* istanbul ignore next */
        if (Error.captureStackTrace) // node
            Error.captureStackTrace(this, CustomError);
        else
            Object.defineProperty(this, "stack", { value: (new Error()).stack || "" });

        if (properties)
            merge(this, properties);
    }

    (CustomError.prototype = Object.create(Error.prototype)).constructor = CustomError;

    Object.defineProperty(CustomError.prototype, "name", { get: function() { return name; } });

    CustomError.prototype.toString = function toString() {
        return this.name + ": " + this.message;
    };

    return CustomError;
}

util.newError = newError;

/**
 * Constructs a new protocol error.
 * @classdesc Error subclass indicating a protocol specifc error.
 * @memberof util
 * @extends Error
 * @template T extends Message<T>
 * @constructor
 * @param {string} message Error message
 * @param {Object.<string,*>} [properties] Additional properties
 * @example
 * try {
 *     MyMessage.decode(someBuffer); // throws if required fields are missing
 * } catch (e) {
 *     if (e instanceof ProtocolError && e.instance)
 *         console.log("decoded so far: " + JSON.stringify(e.instance));
 * }
 */
util.ProtocolError = newError("ProtocolError");

/**
 * So far decoded message instance.
 * @name util.ProtocolError#instance
 * @type {Message<T>}
 */

/**
 * A OneOf getter as returned by {@link util.oneOfGetter}.
 * @typedef OneOfGetter
 * @type {function}
 * @returns {string|undefined} Set field name, if any
 */

/**
 * Builds a getter for a oneof's present field name.
 * @param {string[]} fieldNames Field names
 * @returns {OneOfGetter} Unbound getter
 */
util.oneOfGetter = function getOneOf(fieldNames) {
    var fieldMap = {};
    for (var i = 0; i < fieldNames.length; ++i)
        fieldMap[fieldNames[i]] = 1;

    /**
     * @returns {string|undefined} Set field name, if any
     * @this Object
     * @ignore
     */
    return function() { // eslint-disable-line consistent-return
        for (var keys = Object.keys(this), i = keys.length - 1; i > -1; --i)
            if (fieldMap[keys[i]] === 1 && this[keys[i]] !== undefined && this[keys[i]] !== null)
                return keys[i];
    };
};

/**
 * A OneOf setter as returned by {@link util.oneOfSetter}.
 * @typedef OneOfSetter
 * @type {function}
 * @param {string|undefined} value Field name
 * @returns {undefined}
 */

/**
 * Builds a setter for a oneof's present field name.
 * @param {string[]} fieldNames Field names
 * @returns {OneOfSetter} Unbound setter
 */
util.oneOfSetter = function setOneOf(fieldNames) {

    /**
     * @param {string} name Field name
     * @returns {undefined}
     * @this Object
     * @ignore
     */
    return function(name) {
        for (var i = 0; i < fieldNames.length; ++i)
            if (fieldNames[i] !== name)
                delete this[fieldNames[i]];
    };
};

/**
 * Default conversion options used for {@link Message#toJSON} implementations.
 *
 * These options are close to proto3's JSON mapping with the exception that internal types like Any are handled just like messages. More precisely:
 *
 * - Longs become strings
 * - Enums become string keys
 * - Bytes become base64 encoded strings
 * - (Sub-)Messages become plain objects
 * - Maps become plain objects with all string keys
 * - Repeated fields become arrays
 * - NaN and Infinity for float and double fields become strings
 *
 * @type {IConversionOptions}
 * @see https://developers.google.com/protocol-buffers/docs/proto3?hl=en#json
 */
util.toJSONOptions = {
    longs: String,
    enums: String,
    bytes: String,
    json: true
};

// Sets up buffer utility according to the environment (called in index-minimal)
util._configure = function() {
    var Buffer = util.Buffer;
    /* istanbul ignore if */
    if (!Buffer) {
        util._Buffer_from = util._Buffer_allocUnsafe = null;
        return;
    }
    // because node 4.x buffers are incompatible & immutable
    // see: https://github.com/dcodeIO/protobuf.js/pull/665
    util._Buffer_from = Buffer.from !== Uint8Array.from && Buffer.from ||
        /* istanbul ignore next */
        function Buffer_from(value, encoding) {
            return new Buffer(value, encoding);
        };
    util._Buffer_allocUnsafe = Buffer.allocUnsafe ||
        /* istanbul ignore next */
        function Buffer_allocUnsafe(size) {
            return new Buffer(size);
        };
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./longbits":50,"@protobufjs/aspromise":1,"@protobufjs/base64":2,"@protobufjs/eventemitter":3,"@protobufjs/float":4,"@protobufjs/inquire":5,"@protobufjs/pool":6,"@protobufjs/utf8":7}],52:[function(require,module,exports){
"use strict";
module.exports = Writer;

var util      = require("./util/minimal");

var BufferWriter; // cyclic

var LongBits  = util.LongBits,
    base64    = util.base64,
    utf8      = util.utf8;

/**
 * Constructs a new writer operation instance.
 * @classdesc Scheduled writer operation.
 * @constructor
 * @param {function(*, Uint8Array, number)} fn Function to call
 * @param {number} len Value byte length
 * @param {*} val Value to write
 * @ignore
 */
function Op(fn, len, val) {

    /**
     * Function to call.
     * @type {function(Uint8Array, number, *)}
     */
    this.fn = fn;

    /**
     * Value byte length.
     * @type {number}
     */
    this.len = len;

    /**
     * Next operation.
     * @type {Writer.Op|undefined}
     */
    this.next = undefined;

    /**
     * Value to write.
     * @type {*}
     */
    this.val = val; // type varies
}

/* istanbul ignore next */
function noop() {} // eslint-disable-line no-empty-function

/**
 * Constructs a new writer state instance.
 * @classdesc Copied writer state.
 * @memberof Writer
 * @constructor
 * @param {Writer} writer Writer to copy state from
 * @ignore
 */
function State(writer) {

    /**
     * Current head.
     * @type {Writer.Op}
     */
    this.head = writer.head;

    /**
     * Current tail.
     * @type {Writer.Op}
     */
    this.tail = writer.tail;

    /**
     * Current buffer length.
     * @type {number}
     */
    this.len = writer.len;

    /**
     * Next state.
     * @type {State|null}
     */
    this.next = writer.states;
}

/**
 * Constructs a new writer instance.
 * @classdesc Wire format writer using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 */
function Writer() {

    /**
     * Current length.
     * @type {number}
     */
    this.len = 0;

    /**
     * Operations head.
     * @type {Object}
     */
    this.head = new Op(noop, 0, 0);

    /**
     * Operations tail
     * @type {Object}
     */
    this.tail = this.head;

    /**
     * Linked forked states.
     * @type {Object|null}
     */
    this.states = null;

    // When a value is written, the writer calculates its byte length and puts it into a linked
    // list of operations to perform when finish() is called. This both allows us to allocate
    // buffers of the exact required size and reduces the amount of work we have to do compared
    // to first calculating over objects and then encoding over objects. In our case, the encoding
    // part is just a linked list walk calling operations with already prepared values.
}

/**
 * Creates a new writer.
 * @function
 * @returns {BufferWriter|Writer} A {@link BufferWriter} when Buffers are supported, otherwise a {@link Writer}
 */
Writer.create = util.Buffer
    ? function create_buffer_setup() {
        return (Writer.create = function create_buffer() {
            return new BufferWriter();
        })();
    }
    /* istanbul ignore next */
    : function create_array() {
        return new Writer();
    };

/**
 * Allocates a buffer of the specified size.
 * @param {number} size Buffer size
 * @returns {Uint8Array} Buffer
 */
Writer.alloc = function alloc(size) {
    return new util.Array(size);
};

// Use Uint8Array buffer pool in the browser, just like node does with buffers
/* istanbul ignore else */
if (util.Array !== Array)
    Writer.alloc = util.pool(Writer.alloc, util.Array.prototype.subarray);

/**
 * Pushes a new operation to the queue.
 * @param {function(Uint8Array, number, *)} fn Function to call
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @returns {Writer} `this`
 * @private
 */
Writer.prototype._push = function push(fn, len, val) {
    this.tail = this.tail.next = new Op(fn, len, val);
    this.len += len;
    return this;
};

function writeByte(val, buf, pos) {
    buf[pos] = val & 255;
}

function writeVarint32(val, buf, pos) {
    while (val > 127) {
        buf[pos++] = val & 127 | 128;
        val >>>= 7;
    }
    buf[pos] = val;
}

/**
 * Constructs a new varint writer operation instance.
 * @classdesc Scheduled varint writer operation.
 * @extends Op
 * @constructor
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @ignore
 */
function VarintOp(len, val) {
    this.len = len;
    this.next = undefined;
    this.val = val;
}

VarintOp.prototype = Object.create(Op.prototype);
VarintOp.prototype.fn = writeVarint32;

/**
 * Writes an unsigned 32 bit value as a varint.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.uint32 = function write_uint32(value) {
    // here, the call to this.push has been inlined and a varint specific Op subclass is used.
    // uint32 is by far the most frequently used operation and benefits significantly from this.
    this.len += (this.tail = this.tail.next = new VarintOp(
        (value = value >>> 0)
                < 128       ? 1
        : value < 16384     ? 2
        : value < 2097152   ? 3
        : value < 268435456 ? 4
        :                     5,
    value)).len;
    return this;
};

/**
 * Writes a signed 32 bit value as a varint.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.int32 = function write_int32(value) {
    return value < 0
        ? this._push(writeVarint64, 10, LongBits.fromNumber(value)) // 10 bytes per spec
        : this.uint32(value);
};

/**
 * Writes a 32 bit value as a varint, zig-zag encoded.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.sint32 = function write_sint32(value) {
    return this.uint32((value << 1 ^ value >> 31) >>> 0);
};

function writeVarint64(val, buf, pos) {
    while (val.hi) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = (val.lo >>> 7 | val.hi << 25) >>> 0;
        val.hi >>>= 7;
    }
    while (val.lo > 127) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = val.lo >>> 7;
    }
    buf[pos++] = val.lo;
}

/**
 * Writes an unsigned 64 bit value as a varint.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.uint64 = function write_uint64(value) {
    var bits = LongBits.from(value);
    return this._push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a signed 64 bit value as a varint.
 * @function
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.int64 = Writer.prototype.uint64;

/**
 * Writes a signed 64 bit value as a varint, zig-zag encoded.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.sint64 = function write_sint64(value) {
    var bits = LongBits.from(value).zzEncode();
    return this._push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a boolish value as a varint.
 * @param {boolean} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.bool = function write_bool(value) {
    return this._push(writeByte, 1, value ? 1 : 0);
};

function writeFixed32(val, buf, pos) {
    buf[pos    ] =  val         & 255;
    buf[pos + 1] =  val >>> 8   & 255;
    buf[pos + 2] =  val >>> 16  & 255;
    buf[pos + 3] =  val >>> 24;
}

/**
 * Writes an unsigned 32 bit value as fixed 32 bits.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.fixed32 = function write_fixed32(value) {
    return this._push(writeFixed32, 4, value >>> 0);
};

/**
 * Writes a signed 32 bit value as fixed 32 bits.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.sfixed32 = Writer.prototype.fixed32;

/**
 * Writes an unsigned 64 bit value as fixed 64 bits.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.fixed64 = function write_fixed64(value) {
    var bits = LongBits.from(value);
    return this._push(writeFixed32, 4, bits.lo)._push(writeFixed32, 4, bits.hi);
};

/**
 * Writes a signed 64 bit value as fixed 64 bits.
 * @function
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.sfixed64 = Writer.prototype.fixed64;

/**
 * Writes a float (32 bit).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.float = function write_float(value) {
    return this._push(util.float.writeFloatLE, 4, value);
};

/**
 * Writes a double (64 bit float).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.double = function write_double(value) {
    return this._push(util.float.writeDoubleLE, 8, value);
};

var writeBytes = util.Array.prototype.set
    ? function writeBytes_set(val, buf, pos) {
        buf.set(val, pos); // also works for plain array values
    }
    /* istanbul ignore next */
    : function writeBytes_for(val, buf, pos) {
        for (var i = 0; i < val.length; ++i)
            buf[pos + i] = val[i];
    };

/**
 * Writes a sequence of bytes.
 * @param {Uint8Array|string} value Buffer or base64 encoded string to write
 * @returns {Writer} `this`
 */
Writer.prototype.bytes = function write_bytes(value) {
    var len = value.length >>> 0;
    if (!len)
        return this._push(writeByte, 1, 0);
    if (util.isString(value)) {
        var buf = Writer.alloc(len = base64.length(value));
        base64.decode(value, buf, 0);
        value = buf;
    }
    return this.uint32(len)._push(writeBytes, len, value);
};

/**
 * Writes a string.
 * @param {string} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.string = function write_string(value) {
    var len = utf8.length(value);
    return len
        ? this.uint32(len)._push(utf8.write, len, value)
        : this._push(writeByte, 1, 0);
};

/**
 * Forks this writer's state by pushing it to a stack.
 * Calling {@link Writer#reset|reset} or {@link Writer#ldelim|ldelim} resets the writer to the previous state.
 * @returns {Writer} `this`
 */
Writer.prototype.fork = function fork() {
    this.states = new State(this);
    this.head = this.tail = new Op(noop, 0, 0);
    this.len = 0;
    return this;
};

/**
 * Resets this instance to the last state.
 * @returns {Writer} `this`
 */
Writer.prototype.reset = function reset() {
    if (this.states) {
        this.head   = this.states.head;
        this.tail   = this.states.tail;
        this.len    = this.states.len;
        this.states = this.states.next;
    } else {
        this.head = this.tail = new Op(noop, 0, 0);
        this.len  = 0;
    }
    return this;
};

/**
 * Resets to the last state and appends the fork state's current write length as a varint followed by its operations.
 * @returns {Writer} `this`
 */
Writer.prototype.ldelim = function ldelim() {
    var head = this.head,
        tail = this.tail,
        len  = this.len;
    this.reset().uint32(len);
    if (len) {
        this.tail.next = head.next; // skip noop
        this.tail = tail;
        this.len += len;
    }
    return this;
};

/**
 * Finishes the write operation.
 * @returns {Uint8Array} Finished buffer
 */
Writer.prototype.finish = function finish() {
    var head = this.head.next, // skip noop
        buf  = this.constructor.alloc(this.len),
        pos  = 0;
    while (head) {
        head.fn(head.val, buf, pos);
        pos += head.len;
        head = head.next;
    }
    // this.head = this.tail = null;
    return buf;
};

Writer._configure = function(BufferWriter_) {
    BufferWriter = BufferWriter_;
};

},{"./util/minimal":51}],53:[function(require,module,exports){
"use strict";
module.exports = BufferWriter;

// extends Writer
var Writer = require("./writer");
(BufferWriter.prototype = Object.create(Writer.prototype)).constructor = BufferWriter;

var util = require("./util/minimal");

var Buffer = util.Buffer;

/**
 * Constructs a new buffer writer instance.
 * @classdesc Wire format writer using node buffers.
 * @extends Writer
 * @constructor
 */
function BufferWriter() {
    Writer.call(this);
}

/**
 * Allocates a buffer of the specified size.
 * @param {number} size Buffer size
 * @returns {Buffer} Buffer
 */
BufferWriter.alloc = function alloc_buffer(size) {
    return (BufferWriter.alloc = util._Buffer_allocUnsafe)(size);
};

var writeBytesBuffer = Buffer && Buffer.prototype instanceof Uint8Array && Buffer.prototype.set.name === "set"
    ? function writeBytesBuffer_set(val, buf, pos) {
        buf.set(val, pos); // faster than copy (requires node >= 4 where Buffers extend Uint8Array and set is properly inherited)
                           // also works for plain array values
    }
    /* istanbul ignore next */
    : function writeBytesBuffer_copy(val, buf, pos) {
        if (val.copy) // Buffer values
            val.copy(buf, pos, 0, val.length);
        else for (var i = 0; i < val.length;) // plain array values
            buf[pos++] = val[i++];
    };

/**
 * @override
 */
BufferWriter.prototype.bytes = function write_bytes_buffer(value) {
    if (util.isString(value))
        value = util._Buffer_from(value, "base64");
    var len = value.length >>> 0;
    this.uint32(len);
    if (len)
        this._push(writeBytesBuffer, len, value);
    return this;
};

function writeStringBuffer(val, buf, pos) {
    if (val.length < 40) // plain js is faster for short strings (probably due to redundant assertions)
        util.utf8.write(val, buf, pos);
    else
        buf.utf8Write(val, pos);
}

/**
 * @override
 */
BufferWriter.prototype.string = function write_string_buffer(value) {
    var len = Buffer.byteLength(value);
    this.uint32(len);
    if (len)
        this._push(writeStringBuffer, len, value);
    return this;
};


/**
 * Finishes the write operation.
 * @name BufferWriter#finish
 * @function
 * @returns {Buffer} Finished buffer
 */

},{"./util/minimal":51,"./writer":52}],54:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":37}],55:[function(require,module,exports){
var Buffer = require('safe-buffer').Buffer

// prototype class for hash functions
function Hash (blockSize, finalSize) {
  this._block = Buffer.alloc(blockSize)
  this._finalSize = finalSize
  this._blockSize = blockSize
  this._len = 0
}

Hash.prototype.update = function (data, enc) {
  if (typeof data === 'string') {
    enc = enc || 'utf8'
    data = Buffer.from(data, enc)
  }

  var block = this._block
  var blockSize = this._blockSize
  var length = data.length
  var accum = this._len

  for (var offset = 0; offset < length;) {
    var assigned = accum % blockSize
    var remainder = Math.min(length - offset, blockSize - assigned)

    for (var i = 0; i < remainder; i++) {
      block[assigned + i] = data[offset + i]
    }

    accum += remainder
    offset += remainder

    if ((accum % blockSize) === 0) {
      this._update(block)
    }
  }

  this._len += length
  return this
}

Hash.prototype.digest = function (enc) {
  var rem = this._len % this._blockSize

  this._block[rem] = 0x80

  // zero (rem + 1) trailing bits, where (rem + 1) is the smallest
  // non-negative solution to the equation (length + 1 + (rem + 1)) === finalSize mod blockSize
  this._block.fill(0, rem + 1)

  if (rem >= this._finalSize) {
    this._update(this._block)
    this._block.fill(0)
  }

  var bits = this._len * 8

  // uint32
  if (bits <= 0xffffffff) {
    this._block.writeUInt32BE(bits, this._blockSize - 4)

  // uint64
  } else {
    var lowBits = (bits & 0xffffffff) >>> 0
    var highBits = (bits - lowBits) / 0x100000000

    this._block.writeUInt32BE(highBits, this._blockSize - 8)
    this._block.writeUInt32BE(lowBits, this._blockSize - 4)
  }

  this._update(this._block)
  var hash = this._hash()

  return enc ? hash.toString(enc) : hash
}

Hash.prototype._update = function () {
  throw new Error('_update must be implemented by subclass')
}

module.exports = Hash

},{"safe-buffer":54}],56:[function(require,module,exports){
var exports = module.exports = function SHA (algorithm) {
  algorithm = algorithm.toLowerCase()

  var Algorithm = exports[algorithm]
  if (!Algorithm) throw new Error(algorithm + ' is not supported (we accept pull requests)')

  return new Algorithm()
}

exports.sha = require('./sha')
exports.sha1 = require('./sha1')
exports.sha224 = require('./sha224')
exports.sha256 = require('./sha256')
exports.sha384 = require('./sha384')
exports.sha512 = require('./sha512')

},{"./sha":57,"./sha1":58,"./sha224":59,"./sha256":60,"./sha384":61,"./sha512":62}],57:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-0, as defined
 * in FIPS PUB 180-1
 * This source code is derived from sha1.js of the same repository.
 * The difference between SHA-0 and SHA-1 is just a bitwise rotate left
 * operation was added.
 */

var inherits = require('inherits')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var K = [
  0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0
]

var W = new Array(80)

function Sha () {
  this.init()
  this._w = W

  Hash.call(this, 64, 56)
}

inherits(Sha, Hash)

Sha.prototype.init = function () {
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
  this._e = 0xc3d2e1f0

  return this
}

function rotl5 (num) {
  return (num << 5) | (num >>> 27)
}

function rotl30 (num) {
  return (num << 30) | (num >>> 2)
}

function ft (s, b, c, d) {
  if (s === 0) return (b & c) | ((~b) & d)
  if (s === 2) return (b & c) | (b & d) | (c & d)
  return b ^ c ^ d
}

Sha.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 80; ++i) W[i] = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]

  for (var j = 0; j < 80; ++j) {
    var s = ~~(j / 20)
    var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0

    e = d
    d = c
    c = rotl30(b)
    b = a
    a = t
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
}

Sha.prototype._hash = function () {
  var H = Buffer.allocUnsafe(20)

  H.writeInt32BE(this._a | 0, 0)
  H.writeInt32BE(this._b | 0, 4)
  H.writeInt32BE(this._c | 0, 8)
  H.writeInt32BE(this._d | 0, 12)
  H.writeInt32BE(this._e | 0, 16)

  return H
}

module.exports = Sha

},{"./hash":55,"inherits":39,"safe-buffer":54}],58:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

var inherits = require('inherits')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var K = [
  0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0
]

var W = new Array(80)

function Sha1 () {
  this.init()
  this._w = W

  Hash.call(this, 64, 56)
}

inherits(Sha1, Hash)

Sha1.prototype.init = function () {
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
  this._e = 0xc3d2e1f0

  return this
}

function rotl1 (num) {
  return (num << 1) | (num >>> 31)
}

function rotl5 (num) {
  return (num << 5) | (num >>> 27)
}

function rotl30 (num) {
  return (num << 30) | (num >>> 2)
}

function ft (s, b, c, d) {
  if (s === 0) return (b & c) | ((~b) & d)
  if (s === 2) return (b & c) | (b & d) | (c & d)
  return b ^ c ^ d
}

Sha1.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 80; ++i) W[i] = rotl1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16])

  for (var j = 0; j < 80; ++j) {
    var s = ~~(j / 20)
    var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0

    e = d
    d = c
    c = rotl30(b)
    b = a
    a = t
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
}

Sha1.prototype._hash = function () {
  var H = Buffer.allocUnsafe(20)

  H.writeInt32BE(this._a | 0, 0)
  H.writeInt32BE(this._b | 0, 4)
  H.writeInt32BE(this._c | 0, 8)
  H.writeInt32BE(this._d | 0, 12)
  H.writeInt32BE(this._e | 0, 16)

  return H
}

module.exports = Sha1

},{"./hash":55,"inherits":39,"safe-buffer":54}],59:[function(require,module,exports){
/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = require('inherits')
var Sha256 = require('./sha256')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var W = new Array(64)

function Sha224 () {
  this.init()

  this._w = W // new Array(64)

  Hash.call(this, 64, 56)
}

inherits(Sha224, Sha256)

Sha224.prototype.init = function () {
  this._a = 0xc1059ed8
  this._b = 0x367cd507
  this._c = 0x3070dd17
  this._d = 0xf70e5939
  this._e = 0xffc00b31
  this._f = 0x68581511
  this._g = 0x64f98fa7
  this._h = 0xbefa4fa4

  return this
}

Sha224.prototype._hash = function () {
  var H = Buffer.allocUnsafe(28)

  H.writeInt32BE(this._a, 0)
  H.writeInt32BE(this._b, 4)
  H.writeInt32BE(this._c, 8)
  H.writeInt32BE(this._d, 12)
  H.writeInt32BE(this._e, 16)
  H.writeInt32BE(this._f, 20)
  H.writeInt32BE(this._g, 24)

  return H
}

module.exports = Sha224

},{"./hash":55,"./sha256":60,"inherits":39,"safe-buffer":54}],60:[function(require,module,exports){
/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = require('inherits')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var K = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
  0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
  0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
  0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
  0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
  0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
  0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
  0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
  0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
]

var W = new Array(64)

function Sha256 () {
  this.init()

  this._w = W // new Array(64)

  Hash.call(this, 64, 56)
}

inherits(Sha256, Hash)

Sha256.prototype.init = function () {
  this._a = 0x6a09e667
  this._b = 0xbb67ae85
  this._c = 0x3c6ef372
  this._d = 0xa54ff53a
  this._e = 0x510e527f
  this._f = 0x9b05688c
  this._g = 0x1f83d9ab
  this._h = 0x5be0cd19

  return this
}

function ch (x, y, z) {
  return z ^ (x & (y ^ z))
}

function maj (x, y, z) {
  return (x & y) | (z & (x | y))
}

function sigma0 (x) {
  return (x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10)
}

function sigma1 (x) {
  return (x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7)
}

function gamma0 (x) {
  return (x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)
}

function gamma1 (x) {
  return (x >>> 17 | x << 15) ^ (x >>> 19 | x << 13) ^ (x >>> 10)
}

Sha256.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0
  var f = this._f | 0
  var g = this._g | 0
  var h = this._h | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 64; ++i) W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) | 0

  for (var j = 0; j < 64; ++j) {
    var T1 = (h + sigma1(e) + ch(e, f, g) + K[j] + W[j]) | 0
    var T2 = (sigma0(a) + maj(a, b, c)) | 0

    h = g
    g = f
    f = e
    e = (d + T1) | 0
    d = c
    c = b
    b = a
    a = (T1 + T2) | 0
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
  this._f = (f + this._f) | 0
  this._g = (g + this._g) | 0
  this._h = (h + this._h) | 0
}

Sha256.prototype._hash = function () {
  var H = Buffer.allocUnsafe(32)

  H.writeInt32BE(this._a, 0)
  H.writeInt32BE(this._b, 4)
  H.writeInt32BE(this._c, 8)
  H.writeInt32BE(this._d, 12)
  H.writeInt32BE(this._e, 16)
  H.writeInt32BE(this._f, 20)
  H.writeInt32BE(this._g, 24)
  H.writeInt32BE(this._h, 28)

  return H
}

module.exports = Sha256

},{"./hash":55,"inherits":39,"safe-buffer":54}],61:[function(require,module,exports){
var inherits = require('inherits')
var SHA512 = require('./sha512')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var W = new Array(160)

function Sha384 () {
  this.init()
  this._w = W

  Hash.call(this, 128, 112)
}

inherits(Sha384, SHA512)

Sha384.prototype.init = function () {
  this._ah = 0xcbbb9d5d
  this._bh = 0x629a292a
  this._ch = 0x9159015a
  this._dh = 0x152fecd8
  this._eh = 0x67332667
  this._fh = 0x8eb44a87
  this._gh = 0xdb0c2e0d
  this._hh = 0x47b5481d

  this._al = 0xc1059ed8
  this._bl = 0x367cd507
  this._cl = 0x3070dd17
  this._dl = 0xf70e5939
  this._el = 0xffc00b31
  this._fl = 0x68581511
  this._gl = 0x64f98fa7
  this._hl = 0xbefa4fa4

  return this
}

Sha384.prototype._hash = function () {
  var H = Buffer.allocUnsafe(48)

  function writeInt64BE (h, l, offset) {
    H.writeInt32BE(h, offset)
    H.writeInt32BE(l, offset + 4)
  }

  writeInt64BE(this._ah, this._al, 0)
  writeInt64BE(this._bh, this._bl, 8)
  writeInt64BE(this._ch, this._cl, 16)
  writeInt64BE(this._dh, this._dl, 24)
  writeInt64BE(this._eh, this._el, 32)
  writeInt64BE(this._fh, this._fl, 40)

  return H
}

module.exports = Sha384

},{"./hash":55,"./sha512":62,"inherits":39,"safe-buffer":54}],62:[function(require,module,exports){
var inherits = require('inherits')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
]

var W = new Array(160)

function Sha512 () {
  this.init()
  this._w = W

  Hash.call(this, 128, 112)
}

inherits(Sha512, Hash)

Sha512.prototype.init = function () {
  this._ah = 0x6a09e667
  this._bh = 0xbb67ae85
  this._ch = 0x3c6ef372
  this._dh = 0xa54ff53a
  this._eh = 0x510e527f
  this._fh = 0x9b05688c
  this._gh = 0x1f83d9ab
  this._hh = 0x5be0cd19

  this._al = 0xf3bcc908
  this._bl = 0x84caa73b
  this._cl = 0xfe94f82b
  this._dl = 0x5f1d36f1
  this._el = 0xade682d1
  this._fl = 0x2b3e6c1f
  this._gl = 0xfb41bd6b
  this._hl = 0x137e2179

  return this
}

function Ch (x, y, z) {
  return z ^ (x & (y ^ z))
}

function maj (x, y, z) {
  return (x & y) | (z & (x | y))
}

function sigma0 (x, xl) {
  return (x >>> 28 | xl << 4) ^ (xl >>> 2 | x << 30) ^ (xl >>> 7 | x << 25)
}

function sigma1 (x, xl) {
  return (x >>> 14 | xl << 18) ^ (x >>> 18 | xl << 14) ^ (xl >>> 9 | x << 23)
}

function Gamma0 (x, xl) {
  return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7)
}

function Gamma0l (x, xl) {
  return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7 | xl << 25)
}

function Gamma1 (x, xl) {
  return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6)
}

function Gamma1l (x, xl) {
  return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6 | xl << 26)
}

function getCarry (a, b) {
  return (a >>> 0) < (b >>> 0) ? 1 : 0
}

Sha512.prototype._update = function (M) {
  var W = this._w

  var ah = this._ah | 0
  var bh = this._bh | 0
  var ch = this._ch | 0
  var dh = this._dh | 0
  var eh = this._eh | 0
  var fh = this._fh | 0
  var gh = this._gh | 0
  var hh = this._hh | 0

  var al = this._al | 0
  var bl = this._bl | 0
  var cl = this._cl | 0
  var dl = this._dl | 0
  var el = this._el | 0
  var fl = this._fl | 0
  var gl = this._gl | 0
  var hl = this._hl | 0

  for (var i = 0; i < 32; i += 2) {
    W[i] = M.readInt32BE(i * 4)
    W[i + 1] = M.readInt32BE(i * 4 + 4)
  }
  for (; i < 160; i += 2) {
    var xh = W[i - 15 * 2]
    var xl = W[i - 15 * 2 + 1]
    var gamma0 = Gamma0(xh, xl)
    var gamma0l = Gamma0l(xl, xh)

    xh = W[i - 2 * 2]
    xl = W[i - 2 * 2 + 1]
    var gamma1 = Gamma1(xh, xl)
    var gamma1l = Gamma1l(xl, xh)

    // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
    var Wi7h = W[i - 7 * 2]
    var Wi7l = W[i - 7 * 2 + 1]

    var Wi16h = W[i - 16 * 2]
    var Wi16l = W[i - 16 * 2 + 1]

    var Wil = (gamma0l + Wi7l) | 0
    var Wih = (gamma0 + Wi7h + getCarry(Wil, gamma0l)) | 0
    Wil = (Wil + gamma1l) | 0
    Wih = (Wih + gamma1 + getCarry(Wil, gamma1l)) | 0
    Wil = (Wil + Wi16l) | 0
    Wih = (Wih + Wi16h + getCarry(Wil, Wi16l)) | 0

    W[i] = Wih
    W[i + 1] = Wil
  }

  for (var j = 0; j < 160; j += 2) {
    Wih = W[j]
    Wil = W[j + 1]

    var majh = maj(ah, bh, ch)
    var majl = maj(al, bl, cl)

    var sigma0h = sigma0(ah, al)
    var sigma0l = sigma0(al, ah)
    var sigma1h = sigma1(eh, el)
    var sigma1l = sigma1(el, eh)

    // t1 = h + sigma1 + ch + K[j] + W[j]
    var Kih = K[j]
    var Kil = K[j + 1]

    var chh = Ch(eh, fh, gh)
    var chl = Ch(el, fl, gl)

    var t1l = (hl + sigma1l) | 0
    var t1h = (hh + sigma1h + getCarry(t1l, hl)) | 0
    t1l = (t1l + chl) | 0
    t1h = (t1h + chh + getCarry(t1l, chl)) | 0
    t1l = (t1l + Kil) | 0
    t1h = (t1h + Kih + getCarry(t1l, Kil)) | 0
    t1l = (t1l + Wil) | 0
    t1h = (t1h + Wih + getCarry(t1l, Wil)) | 0

    // t2 = sigma0 + maj
    var t2l = (sigma0l + majl) | 0
    var t2h = (sigma0h + majh + getCarry(t2l, sigma0l)) | 0

    hh = gh
    hl = gl
    gh = fh
    gl = fl
    fh = eh
    fl = el
    el = (dl + t1l) | 0
    eh = (dh + t1h + getCarry(el, dl)) | 0
    dh = ch
    dl = cl
    ch = bh
    cl = bl
    bh = ah
    bl = al
    al = (t1l + t2l) | 0
    ah = (t1h + t2h + getCarry(al, t1l)) | 0
  }

  this._al = (this._al + al) | 0
  this._bl = (this._bl + bl) | 0
  this._cl = (this._cl + cl) | 0
  this._dl = (this._dl + dl) | 0
  this._el = (this._el + el) | 0
  this._fl = (this._fl + fl) | 0
  this._gl = (this._gl + gl) | 0
  this._hl = (this._hl + hl) | 0

  this._ah = (this._ah + ah + getCarry(this._al, al)) | 0
  this._bh = (this._bh + bh + getCarry(this._bl, bl)) | 0
  this._ch = (this._ch + ch + getCarry(this._cl, cl)) | 0
  this._dh = (this._dh + dh + getCarry(this._dl, dl)) | 0
  this._eh = (this._eh + eh + getCarry(this._el, el)) | 0
  this._fh = (this._fh + fh + getCarry(this._fl, fl)) | 0
  this._gh = (this._gh + gh + getCarry(this._gl, gl)) | 0
  this._hh = (this._hh + hh + getCarry(this._hl, hl)) | 0
}

Sha512.prototype._hash = function () {
  var H = Buffer.allocUnsafe(64)

  function writeInt64BE (h, l, offset) {
    H.writeInt32BE(h, offset)
    H.writeInt32BE(l, offset + 4)
  }

  writeInt64BE(this._ah, this._al, 0)
  writeInt64BE(this._bh, this._bl, 8)
  writeInt64BE(this._ch, this._cl, 16)
  writeInt64BE(this._dh, this._dl, 24)
  writeInt64BE(this._eh, this._el, 32)
  writeInt64BE(this._fh, this._fl, 40)
  writeInt64BE(this._gh, this._gl, 48)
  writeInt64BE(this._hh, this._hl, 56)

  return H
}

module.exports = Sha512

},{"./hash":55,"inherits":39,"safe-buffer":54}],63:[function(require,module,exports){
(function(nacl) {
'use strict';

// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/

var gf = function(init) {
  var i, r = new Float64Array(16);
  if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
  return r;
};

//  Pluggable, initialized in high-level API below.
var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

var _0 = new Uint8Array(16);
var _9 = new Uint8Array(32); _9[0] = 9;

var gf0 = gf(),
    gf1 = gf([1]),
    _121665 = gf([0xdb41, 1]),
    D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
    D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
    X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
    Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
    I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

function ts64(x, i, h, l) {
  x[i]   = (h >> 24) & 0xff;
  x[i+1] = (h >> 16) & 0xff;
  x[i+2] = (h >>  8) & 0xff;
  x[i+3] = h & 0xff;
  x[i+4] = (l >> 24)  & 0xff;
  x[i+5] = (l >> 16)  & 0xff;
  x[i+6] = (l >>  8)  & 0xff;
  x[i+7] = l & 0xff;
}

function vn(x, xi, y, yi, n) {
  var i,d = 0;
  for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
  return (1 & ((d - 1) >>> 8)) - 1;
}

function crypto_verify_16(x, xi, y, yi) {
  return vn(x,xi,y,yi,16);
}

function crypto_verify_32(x, xi, y, yi) {
  return vn(x,xi,y,yi,32);
}

function core_salsa20(o, p, k, c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }
   x0 =  x0 +  j0 | 0;
   x1 =  x1 +  j1 | 0;
   x2 =  x2 +  j2 | 0;
   x3 =  x3 +  j3 | 0;
   x4 =  x4 +  j4 | 0;
   x5 =  x5 +  j5 | 0;
   x6 =  x6 +  j6 | 0;
   x7 =  x7 +  j7 | 0;
   x8 =  x8 +  j8 | 0;
   x9 =  x9 +  j9 | 0;
  x10 = x10 + j10 | 0;
  x11 = x11 + j11 | 0;
  x12 = x12 + j12 | 0;
  x13 = x13 + j13 | 0;
  x14 = x14 + j14 | 0;
  x15 = x15 + j15 | 0;

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x1 >>>  0 & 0xff;
  o[ 5] = x1 >>>  8 & 0xff;
  o[ 6] = x1 >>> 16 & 0xff;
  o[ 7] = x1 >>> 24 & 0xff;

  o[ 8] = x2 >>>  0 & 0xff;
  o[ 9] = x2 >>>  8 & 0xff;
  o[10] = x2 >>> 16 & 0xff;
  o[11] = x2 >>> 24 & 0xff;

  o[12] = x3 >>>  0 & 0xff;
  o[13] = x3 >>>  8 & 0xff;
  o[14] = x3 >>> 16 & 0xff;
  o[15] = x3 >>> 24 & 0xff;

  o[16] = x4 >>>  0 & 0xff;
  o[17] = x4 >>>  8 & 0xff;
  o[18] = x4 >>> 16 & 0xff;
  o[19] = x4 >>> 24 & 0xff;

  o[20] = x5 >>>  0 & 0xff;
  o[21] = x5 >>>  8 & 0xff;
  o[22] = x5 >>> 16 & 0xff;
  o[23] = x5 >>> 24 & 0xff;

  o[24] = x6 >>>  0 & 0xff;
  o[25] = x6 >>>  8 & 0xff;
  o[26] = x6 >>> 16 & 0xff;
  o[27] = x6 >>> 24 & 0xff;

  o[28] = x7 >>>  0 & 0xff;
  o[29] = x7 >>>  8 & 0xff;
  o[30] = x7 >>> 16 & 0xff;
  o[31] = x7 >>> 24 & 0xff;

  o[32] = x8 >>>  0 & 0xff;
  o[33] = x8 >>>  8 & 0xff;
  o[34] = x8 >>> 16 & 0xff;
  o[35] = x8 >>> 24 & 0xff;

  o[36] = x9 >>>  0 & 0xff;
  o[37] = x9 >>>  8 & 0xff;
  o[38] = x9 >>> 16 & 0xff;
  o[39] = x9 >>> 24 & 0xff;

  o[40] = x10 >>>  0 & 0xff;
  o[41] = x10 >>>  8 & 0xff;
  o[42] = x10 >>> 16 & 0xff;
  o[43] = x10 >>> 24 & 0xff;

  o[44] = x11 >>>  0 & 0xff;
  o[45] = x11 >>>  8 & 0xff;
  o[46] = x11 >>> 16 & 0xff;
  o[47] = x11 >>> 24 & 0xff;

  o[48] = x12 >>>  0 & 0xff;
  o[49] = x12 >>>  8 & 0xff;
  o[50] = x12 >>> 16 & 0xff;
  o[51] = x12 >>> 24 & 0xff;

  o[52] = x13 >>>  0 & 0xff;
  o[53] = x13 >>>  8 & 0xff;
  o[54] = x13 >>> 16 & 0xff;
  o[55] = x13 >>> 24 & 0xff;

  o[56] = x14 >>>  0 & 0xff;
  o[57] = x14 >>>  8 & 0xff;
  o[58] = x14 >>> 16 & 0xff;
  o[59] = x14 >>> 24 & 0xff;

  o[60] = x15 >>>  0 & 0xff;
  o[61] = x15 >>>  8 & 0xff;
  o[62] = x15 >>> 16 & 0xff;
  o[63] = x15 >>> 24 & 0xff;
}

function core_hsalsa20(o,p,k,c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x5 >>>  0 & 0xff;
  o[ 5] = x5 >>>  8 & 0xff;
  o[ 6] = x5 >>> 16 & 0xff;
  o[ 7] = x5 >>> 24 & 0xff;

  o[ 8] = x10 >>>  0 & 0xff;
  o[ 9] = x10 >>>  8 & 0xff;
  o[10] = x10 >>> 16 & 0xff;
  o[11] = x10 >>> 24 & 0xff;

  o[12] = x15 >>>  0 & 0xff;
  o[13] = x15 >>>  8 & 0xff;
  o[14] = x15 >>> 16 & 0xff;
  o[15] = x15 >>> 24 & 0xff;

  o[16] = x6 >>>  0 & 0xff;
  o[17] = x6 >>>  8 & 0xff;
  o[18] = x6 >>> 16 & 0xff;
  o[19] = x6 >>> 24 & 0xff;

  o[20] = x7 >>>  0 & 0xff;
  o[21] = x7 >>>  8 & 0xff;
  o[22] = x7 >>> 16 & 0xff;
  o[23] = x7 >>> 24 & 0xff;

  o[24] = x8 >>>  0 & 0xff;
  o[25] = x8 >>>  8 & 0xff;
  o[26] = x8 >>> 16 & 0xff;
  o[27] = x8 >>> 24 & 0xff;

  o[28] = x9 >>>  0 & 0xff;
  o[29] = x9 >>>  8 & 0xff;
  o[30] = x9 >>> 16 & 0xff;
  o[31] = x9 >>> 24 & 0xff;
}

function crypto_core_salsa20(out,inp,k,c) {
  core_salsa20(out,inp,k,c);
}

function crypto_core_hsalsa20(out,inp,k,c) {
  core_hsalsa20(out,inp,k,c);
}

var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
            // "expand 32-byte k"

function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = m[mpos+i] ^ x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
    mpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = m[mpos+i] ^ x[i];
  }
  return 0;
}

function crypto_stream_salsa20(c,cpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = x[i];
  }
  return 0;
}

function crypto_stream(c,cpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20(c,cpos,d,sn,s);
}

function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,sn,s);
}

/*
* Port of Andrew Moon's Poly1305-donna-16. Public domain.
* https://github.com/floodyberry/poly1305-donna
*/

var poly1305 = function(key) {
  this.buffer = new Uint8Array(16);
  this.r = new Uint16Array(10);
  this.h = new Uint16Array(10);
  this.pad = new Uint16Array(8);
  this.leftover = 0;
  this.fin = 0;

  var t0, t1, t2, t3, t4, t5, t6, t7;

  t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
  t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
  t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
  t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
  t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
  this.r[5] = ((t4 >>>  1)) & 0x1ffe;
  t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
  t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
  t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
  this.r[9] = ((t7 >>>  5)) & 0x007f;

  this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
  this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
  this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
  this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
  this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
  this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
  this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
  this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
};

poly1305.prototype.blocks = function(m, mpos, bytes) {
  var hibit = this.fin ? 0 : (1 << 11);
  var t0, t1, t2, t3, t4, t5, t6, t7, c;
  var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

  var h0 = this.h[0],
      h1 = this.h[1],
      h2 = this.h[2],
      h3 = this.h[3],
      h4 = this.h[4],
      h5 = this.h[5],
      h6 = this.h[6],
      h7 = this.h[7],
      h8 = this.h[8],
      h9 = this.h[9];

  var r0 = this.r[0],
      r1 = this.r[1],
      r2 = this.r[2],
      r3 = this.r[3],
      r4 = this.r[4],
      r5 = this.r[5],
      r6 = this.r[6],
      r7 = this.r[7],
      r8 = this.r[8],
      r9 = this.r[9];

  while (bytes >= 16) {
    t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
    t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
    t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
    t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
    t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
    h5 += ((t4 >>>  1)) & 0x1fff;
    t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
    t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
    t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
    h9 += ((t7 >>> 5)) | hibit;

    c = 0;

    d0 = c;
    d0 += h0 * r0;
    d0 += h1 * (5 * r9);
    d0 += h2 * (5 * r8);
    d0 += h3 * (5 * r7);
    d0 += h4 * (5 * r6);
    c = (d0 >>> 13); d0 &= 0x1fff;
    d0 += h5 * (5 * r5);
    d0 += h6 * (5 * r4);
    d0 += h7 * (5 * r3);
    d0 += h8 * (5 * r2);
    d0 += h9 * (5 * r1);
    c += (d0 >>> 13); d0 &= 0x1fff;

    d1 = c;
    d1 += h0 * r1;
    d1 += h1 * r0;
    d1 += h2 * (5 * r9);
    d1 += h3 * (5 * r8);
    d1 += h4 * (5 * r7);
    c = (d1 >>> 13); d1 &= 0x1fff;
    d1 += h5 * (5 * r6);
    d1 += h6 * (5 * r5);
    d1 += h7 * (5 * r4);
    d1 += h8 * (5 * r3);
    d1 += h9 * (5 * r2);
    c += (d1 >>> 13); d1 &= 0x1fff;

    d2 = c;
    d2 += h0 * r2;
    d2 += h1 * r1;
    d2 += h2 * r0;
    d2 += h3 * (5 * r9);
    d2 += h4 * (5 * r8);
    c = (d2 >>> 13); d2 &= 0x1fff;
    d2 += h5 * (5 * r7);
    d2 += h6 * (5 * r6);
    d2 += h7 * (5 * r5);
    d2 += h8 * (5 * r4);
    d2 += h9 * (5 * r3);
    c += (d2 >>> 13); d2 &= 0x1fff;

    d3 = c;
    d3 += h0 * r3;
    d3 += h1 * r2;
    d3 += h2 * r1;
    d3 += h3 * r0;
    d3 += h4 * (5 * r9);
    c = (d3 >>> 13); d3 &= 0x1fff;
    d3 += h5 * (5 * r8);
    d3 += h6 * (5 * r7);
    d3 += h7 * (5 * r6);
    d3 += h8 * (5 * r5);
    d3 += h9 * (5 * r4);
    c += (d3 >>> 13); d3 &= 0x1fff;

    d4 = c;
    d4 += h0 * r4;
    d4 += h1 * r3;
    d4 += h2 * r2;
    d4 += h3 * r1;
    d4 += h4 * r0;
    c = (d4 >>> 13); d4 &= 0x1fff;
    d4 += h5 * (5 * r9);
    d4 += h6 * (5 * r8);
    d4 += h7 * (5 * r7);
    d4 += h8 * (5 * r6);
    d4 += h9 * (5 * r5);
    c += (d4 >>> 13); d4 &= 0x1fff;

    d5 = c;
    d5 += h0 * r5;
    d5 += h1 * r4;
    d5 += h2 * r3;
    d5 += h3 * r2;
    d5 += h4 * r1;
    c = (d5 >>> 13); d5 &= 0x1fff;
    d5 += h5 * r0;
    d5 += h6 * (5 * r9);
    d5 += h7 * (5 * r8);
    d5 += h8 * (5 * r7);
    d5 += h9 * (5 * r6);
    c += (d5 >>> 13); d5 &= 0x1fff;

    d6 = c;
    d6 += h0 * r6;
    d6 += h1 * r5;
    d6 += h2 * r4;
    d6 += h3 * r3;
    d6 += h4 * r2;
    c = (d6 >>> 13); d6 &= 0x1fff;
    d6 += h5 * r1;
    d6 += h6 * r0;
    d6 += h7 * (5 * r9);
    d6 += h8 * (5 * r8);
    d6 += h9 * (5 * r7);
    c += (d6 >>> 13); d6 &= 0x1fff;

    d7 = c;
    d7 += h0 * r7;
    d7 += h1 * r6;
    d7 += h2 * r5;
    d7 += h3 * r4;
    d7 += h4 * r3;
    c = (d7 >>> 13); d7 &= 0x1fff;
    d7 += h5 * r2;
    d7 += h6 * r1;
    d7 += h7 * r0;
    d7 += h8 * (5 * r9);
    d7 += h9 * (5 * r8);
    c += (d7 >>> 13); d7 &= 0x1fff;

    d8 = c;
    d8 += h0 * r8;
    d8 += h1 * r7;
    d8 += h2 * r6;
    d8 += h3 * r5;
    d8 += h4 * r4;
    c = (d8 >>> 13); d8 &= 0x1fff;
    d8 += h5 * r3;
    d8 += h6 * r2;
    d8 += h7 * r1;
    d8 += h8 * r0;
    d8 += h9 * (5 * r9);
    c += (d8 >>> 13); d8 &= 0x1fff;

    d9 = c;
    d9 += h0 * r9;
    d9 += h1 * r8;
    d9 += h2 * r7;
    d9 += h3 * r6;
    d9 += h4 * r5;
    c = (d9 >>> 13); d9 &= 0x1fff;
    d9 += h5 * r4;
    d9 += h6 * r3;
    d9 += h7 * r2;
    d9 += h8 * r1;
    d9 += h9 * r0;
    c += (d9 >>> 13); d9 &= 0x1fff;

    c = (((c << 2) + c)) | 0;
    c = (c + d0) | 0;
    d0 = c & 0x1fff;
    c = (c >>> 13);
    d1 += c;

    h0 = d0;
    h1 = d1;
    h2 = d2;
    h3 = d3;
    h4 = d4;
    h5 = d5;
    h6 = d6;
    h7 = d7;
    h8 = d8;
    h9 = d9;

    mpos += 16;
    bytes -= 16;
  }
  this.h[0] = h0;
  this.h[1] = h1;
  this.h[2] = h2;
  this.h[3] = h3;
  this.h[4] = h4;
  this.h[5] = h5;
  this.h[6] = h6;
  this.h[7] = h7;
  this.h[8] = h8;
  this.h[9] = h9;
};

poly1305.prototype.finish = function(mac, macpos) {
  var g = new Uint16Array(10);
  var c, mask, f, i;

  if (this.leftover) {
    i = this.leftover;
    this.buffer[i++] = 1;
    for (; i < 16; i++) this.buffer[i] = 0;
    this.fin = 1;
    this.blocks(this.buffer, 0, 16);
  }

  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  for (i = 2; i < 10; i++) {
    this.h[i] += c;
    c = this.h[i] >>> 13;
    this.h[i] &= 0x1fff;
  }
  this.h[0] += (c * 5);
  c = this.h[0] >>> 13;
  this.h[0] &= 0x1fff;
  this.h[1] += c;
  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  this.h[2] += c;

  g[0] = this.h[0] + 5;
  c = g[0] >>> 13;
  g[0] &= 0x1fff;
  for (i = 1; i < 10; i++) {
    g[i] = this.h[i] + c;
    c = g[i] >>> 13;
    g[i] &= 0x1fff;
  }
  g[9] -= (1 << 13);

  mask = (c ^ 1) - 1;
  for (i = 0; i < 10; i++) g[i] &= mask;
  mask = ~mask;
  for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

  this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
  this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
  this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
  this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
  this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
  this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
  this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
  this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

  f = this.h[0] + this.pad[0];
  this.h[0] = f & 0xffff;
  for (i = 1; i < 8; i++) {
    f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
    this.h[i] = f & 0xffff;
  }

  mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
  mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
  mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
  mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
  mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
  mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
  mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
  mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
  mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
  mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
  mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
  mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
  mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
  mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
  mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
  mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
};

poly1305.prototype.update = function(m, mpos, bytes) {
  var i, want;

  if (this.leftover) {
    want = (16 - this.leftover);
    if (want > bytes)
      want = bytes;
    for (i = 0; i < want; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    bytes -= want;
    mpos += want;
    this.leftover += want;
    if (this.leftover < 16)
      return;
    this.blocks(this.buffer, 0, 16);
    this.leftover = 0;
  }

  if (bytes >= 16) {
    want = bytes - (bytes % 16);
    this.blocks(m, mpos, want);
    mpos += want;
    bytes -= want;
  }

  if (bytes) {
    for (i = 0; i < bytes; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    this.leftover += bytes;
  }
};

function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
  var s = new poly1305(k);
  s.update(m, mpos, n);
  s.finish(out, outpos);
  return 0;
}

function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
  var x = new Uint8Array(16);
  crypto_onetimeauth(x,0,m,mpos,n,k);
  return crypto_verify_16(h,hpos,x,0);
}

function crypto_secretbox(c,m,d,n,k) {
  var i;
  if (d < 32) return -1;
  crypto_stream_xor(c,0,m,0,d,n,k);
  crypto_onetimeauth(c, 16, c, 32, d - 32, c);
  for (i = 0; i < 16; i++) c[i] = 0;
  return 0;
}

function crypto_secretbox_open(m,c,d,n,k) {
  var i;
  var x = new Uint8Array(32);
  if (d < 32) return -1;
  crypto_stream(x,0,32,n,k);
  if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
  crypto_stream_xor(m,0,c,0,d,n,k);
  for (i = 0; i < 32; i++) m[i] = 0;
  return 0;
}

function set25519(r, a) {
  var i;
  for (i = 0; i < 16; i++) r[i] = a[i]|0;
}

function car25519(o) {
  var i, v, c = 1;
  for (i = 0; i < 16; i++) {
    v = o[i] + c + 65535;
    c = Math.floor(v / 65536);
    o[i] = v - c * 65536;
  }
  o[0] += c-1 + 37 * (c-1);
}

function sel25519(p, q, b) {
  var t, c = ~(b-1);
  for (var i = 0; i < 16; i++) {
    t = c & (p[i] ^ q[i]);
    p[i] ^= t;
    q[i] ^= t;
  }
}

function pack25519(o, n) {
  var i, j, b;
  var m = gf(), t = gf();
  for (i = 0; i < 16; i++) t[i] = n[i];
  car25519(t);
  car25519(t);
  car25519(t);
  for (j = 0; j < 2; j++) {
    m[0] = t[0] - 0xffed;
    for (i = 1; i < 15; i++) {
      m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
      m[i-1] &= 0xffff;
    }
    m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
    b = (m[15]>>16) & 1;
    m[14] &= 0xffff;
    sel25519(t, m, 1-b);
  }
  for (i = 0; i < 16; i++) {
    o[2*i] = t[i] & 0xff;
    o[2*i+1] = t[i]>>8;
  }
}

function neq25519(a, b) {
  var c = new Uint8Array(32), d = new Uint8Array(32);
  pack25519(c, a);
  pack25519(d, b);
  return crypto_verify_32(c, 0, d, 0);
}

function par25519(a) {
  var d = new Uint8Array(32);
  pack25519(d, a);
  return d[0] & 1;
}

function unpack25519(o, n) {
  var i;
  for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
  o[15] &= 0x7fff;
}

function A(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
}

function Z(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
}

function M(o, a, b) {
  var v, c,
     t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
     t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
    t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
    t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
    b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3],
    b4 = b[4],
    b5 = b[5],
    b6 = b[6],
    b7 = b[7],
    b8 = b[8],
    b9 = b[9],
    b10 = b[10],
    b11 = b[11],
    b12 = b[12],
    b13 = b[13],
    b14 = b[14],
    b15 = b[15];

  v = a[0];
  t0 += v * b0;
  t1 += v * b1;
  t2 += v * b2;
  t3 += v * b3;
  t4 += v * b4;
  t5 += v * b5;
  t6 += v * b6;
  t7 += v * b7;
  t8 += v * b8;
  t9 += v * b9;
  t10 += v * b10;
  t11 += v * b11;
  t12 += v * b12;
  t13 += v * b13;
  t14 += v * b14;
  t15 += v * b15;
  v = a[1];
  t1 += v * b0;
  t2 += v * b1;
  t3 += v * b2;
  t4 += v * b3;
  t5 += v * b4;
  t6 += v * b5;
  t7 += v * b6;
  t8 += v * b7;
  t9 += v * b8;
  t10 += v * b9;
  t11 += v * b10;
  t12 += v * b11;
  t13 += v * b12;
  t14 += v * b13;
  t15 += v * b14;
  t16 += v * b15;
  v = a[2];
  t2 += v * b0;
  t3 += v * b1;
  t4 += v * b2;
  t5 += v * b3;
  t6 += v * b4;
  t7 += v * b5;
  t8 += v * b6;
  t9 += v * b7;
  t10 += v * b8;
  t11 += v * b9;
  t12 += v * b10;
  t13 += v * b11;
  t14 += v * b12;
  t15 += v * b13;
  t16 += v * b14;
  t17 += v * b15;
  v = a[3];
  t3 += v * b0;
  t4 += v * b1;
  t5 += v * b2;
  t6 += v * b3;
  t7 += v * b4;
  t8 += v * b5;
  t9 += v * b6;
  t10 += v * b7;
  t11 += v * b8;
  t12 += v * b9;
  t13 += v * b10;
  t14 += v * b11;
  t15 += v * b12;
  t16 += v * b13;
  t17 += v * b14;
  t18 += v * b15;
  v = a[4];
  t4 += v * b0;
  t5 += v * b1;
  t6 += v * b2;
  t7 += v * b3;
  t8 += v * b4;
  t9 += v * b5;
  t10 += v * b6;
  t11 += v * b7;
  t12 += v * b8;
  t13 += v * b9;
  t14 += v * b10;
  t15 += v * b11;
  t16 += v * b12;
  t17 += v * b13;
  t18 += v * b14;
  t19 += v * b15;
  v = a[5];
  t5 += v * b0;
  t6 += v * b1;
  t7 += v * b2;
  t8 += v * b3;
  t9 += v * b4;
  t10 += v * b5;
  t11 += v * b6;
  t12 += v * b7;
  t13 += v * b8;
  t14 += v * b9;
  t15 += v * b10;
  t16 += v * b11;
  t17 += v * b12;
  t18 += v * b13;
  t19 += v * b14;
  t20 += v * b15;
  v = a[6];
  t6 += v * b0;
  t7 += v * b1;
  t8 += v * b2;
  t9 += v * b3;
  t10 += v * b4;
  t11 += v * b5;
  t12 += v * b6;
  t13 += v * b7;
  t14 += v * b8;
  t15 += v * b9;
  t16 += v * b10;
  t17 += v * b11;
  t18 += v * b12;
  t19 += v * b13;
  t20 += v * b14;
  t21 += v * b15;
  v = a[7];
  t7 += v * b0;
  t8 += v * b1;
  t9 += v * b2;
  t10 += v * b3;
  t11 += v * b4;
  t12 += v * b5;
  t13 += v * b6;
  t14 += v * b7;
  t15 += v * b8;
  t16 += v * b9;
  t17 += v * b10;
  t18 += v * b11;
  t19 += v * b12;
  t20 += v * b13;
  t21 += v * b14;
  t22 += v * b15;
  v = a[8];
  t8 += v * b0;
  t9 += v * b1;
  t10 += v * b2;
  t11 += v * b3;
  t12 += v * b4;
  t13 += v * b5;
  t14 += v * b6;
  t15 += v * b7;
  t16 += v * b8;
  t17 += v * b9;
  t18 += v * b10;
  t19 += v * b11;
  t20 += v * b12;
  t21 += v * b13;
  t22 += v * b14;
  t23 += v * b15;
  v = a[9];
  t9 += v * b0;
  t10 += v * b1;
  t11 += v * b2;
  t12 += v * b3;
  t13 += v * b4;
  t14 += v * b5;
  t15 += v * b6;
  t16 += v * b7;
  t17 += v * b8;
  t18 += v * b9;
  t19 += v * b10;
  t20 += v * b11;
  t21 += v * b12;
  t22 += v * b13;
  t23 += v * b14;
  t24 += v * b15;
  v = a[10];
  t10 += v * b0;
  t11 += v * b1;
  t12 += v * b2;
  t13 += v * b3;
  t14 += v * b4;
  t15 += v * b5;
  t16 += v * b6;
  t17 += v * b7;
  t18 += v * b8;
  t19 += v * b9;
  t20 += v * b10;
  t21 += v * b11;
  t22 += v * b12;
  t23 += v * b13;
  t24 += v * b14;
  t25 += v * b15;
  v = a[11];
  t11 += v * b0;
  t12 += v * b1;
  t13 += v * b2;
  t14 += v * b3;
  t15 += v * b4;
  t16 += v * b5;
  t17 += v * b6;
  t18 += v * b7;
  t19 += v * b8;
  t20 += v * b9;
  t21 += v * b10;
  t22 += v * b11;
  t23 += v * b12;
  t24 += v * b13;
  t25 += v * b14;
  t26 += v * b15;
  v = a[12];
  t12 += v * b0;
  t13 += v * b1;
  t14 += v * b2;
  t15 += v * b3;
  t16 += v * b4;
  t17 += v * b5;
  t18 += v * b6;
  t19 += v * b7;
  t20 += v * b8;
  t21 += v * b9;
  t22 += v * b10;
  t23 += v * b11;
  t24 += v * b12;
  t25 += v * b13;
  t26 += v * b14;
  t27 += v * b15;
  v = a[13];
  t13 += v * b0;
  t14 += v * b1;
  t15 += v * b2;
  t16 += v * b3;
  t17 += v * b4;
  t18 += v * b5;
  t19 += v * b6;
  t20 += v * b7;
  t21 += v * b8;
  t22 += v * b9;
  t23 += v * b10;
  t24 += v * b11;
  t25 += v * b12;
  t26 += v * b13;
  t27 += v * b14;
  t28 += v * b15;
  v = a[14];
  t14 += v * b0;
  t15 += v * b1;
  t16 += v * b2;
  t17 += v * b3;
  t18 += v * b4;
  t19 += v * b5;
  t20 += v * b6;
  t21 += v * b7;
  t22 += v * b8;
  t23 += v * b9;
  t24 += v * b10;
  t25 += v * b11;
  t26 += v * b12;
  t27 += v * b13;
  t28 += v * b14;
  t29 += v * b15;
  v = a[15];
  t15 += v * b0;
  t16 += v * b1;
  t17 += v * b2;
  t18 += v * b3;
  t19 += v * b4;
  t20 += v * b5;
  t21 += v * b6;
  t22 += v * b7;
  t23 += v * b8;
  t24 += v * b9;
  t25 += v * b10;
  t26 += v * b11;
  t27 += v * b12;
  t28 += v * b13;
  t29 += v * b14;
  t30 += v * b15;

  t0  += 38 * t16;
  t1  += 38 * t17;
  t2  += 38 * t18;
  t3  += 38 * t19;
  t4  += 38 * t20;
  t5  += 38 * t21;
  t6  += 38 * t22;
  t7  += 38 * t23;
  t8  += 38 * t24;
  t9  += 38 * t25;
  t10 += 38 * t26;
  t11 += 38 * t27;
  t12 += 38 * t28;
  t13 += 38 * t29;
  t14 += 38 * t30;
  // t15 left as is

  // first car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  // second car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  o[ 0] = t0;
  o[ 1] = t1;
  o[ 2] = t2;
  o[ 3] = t3;
  o[ 4] = t4;
  o[ 5] = t5;
  o[ 6] = t6;
  o[ 7] = t7;
  o[ 8] = t8;
  o[ 9] = t9;
  o[10] = t10;
  o[11] = t11;
  o[12] = t12;
  o[13] = t13;
  o[14] = t14;
  o[15] = t15;
}

function S(o, a) {
  M(o, a, a);
}

function inv25519(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 253; a >= 0; a--) {
    S(c, c);
    if(a !== 2 && a !== 4) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function pow2523(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 250; a >= 0; a--) {
      S(c, c);
      if(a !== 1) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function crypto_scalarmult(q, n, p) {
  var z = new Uint8Array(32);
  var x = new Float64Array(80), r, i;
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf();
  for (i = 0; i < 31; i++) z[i] = n[i];
  z[31]=(n[31]&127)|64;
  z[0]&=248;
  unpack25519(x,p);
  for (i = 0; i < 16; i++) {
    b[i]=x[i];
    d[i]=a[i]=c[i]=0;
  }
  a[0]=d[0]=1;
  for (i=254; i>=0; --i) {
    r=(z[i>>>3]>>>(i&7))&1;
    sel25519(a,b,r);
    sel25519(c,d,r);
    A(e,a,c);
    Z(a,a,c);
    A(c,b,d);
    Z(b,b,d);
    S(d,e);
    S(f,a);
    M(a,c,a);
    M(c,b,e);
    A(e,a,c);
    Z(a,a,c);
    S(b,a);
    Z(c,d,f);
    M(a,c,_121665);
    A(a,a,d);
    M(c,c,a);
    M(a,d,f);
    M(d,b,x);
    S(b,e);
    sel25519(a,b,r);
    sel25519(c,d,r);
  }
  for (i = 0; i < 16; i++) {
    x[i+16]=a[i];
    x[i+32]=c[i];
    x[i+48]=b[i];
    x[i+64]=d[i];
  }
  var x32 = x.subarray(32);
  var x16 = x.subarray(16);
  inv25519(x32,x32);
  M(x16,x16,x32);
  pack25519(q,x16);
  return 0;
}

function crypto_scalarmult_base(q, n) {
  return crypto_scalarmult(q, n, _9);
}

function crypto_box_keypair(y, x) {
  randombytes(x, 32);
  return crypto_scalarmult_base(y, x);
}

function crypto_box_beforenm(k, y, x) {
  var s = new Uint8Array(32);
  crypto_scalarmult(s, x, y);
  return crypto_core_hsalsa20(k, _0, s, sigma);
}

var crypto_box_afternm = crypto_secretbox;
var crypto_box_open_afternm = crypto_secretbox_open;

function crypto_box(c, m, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_afternm(c, m, d, n, k);
}

function crypto_box_open(m, c, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_open_afternm(m, c, d, n, k);
}

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function crypto_hashblocks_hl(hh, hl, m, n) {
  var wh = new Int32Array(16), wl = new Int32Array(16),
      bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
      bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
      th, tl, i, j, h, l, a, b, c, d;

  var ah0 = hh[0],
      ah1 = hh[1],
      ah2 = hh[2],
      ah3 = hh[3],
      ah4 = hh[4],
      ah5 = hh[5],
      ah6 = hh[6],
      ah7 = hh[7],

      al0 = hl[0],
      al1 = hl[1],
      al2 = hl[2],
      al3 = hl[3],
      al4 = hl[4],
      al5 = hl[5],
      al6 = hl[6],
      al7 = hl[7];

  var pos = 0;
  while (n >= 128) {
    for (i = 0; i < 16; i++) {
      j = 8 * i + pos;
      wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
      wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
    }
    for (i = 0; i < 80; i++) {
      bh0 = ah0;
      bh1 = ah1;
      bh2 = ah2;
      bh3 = ah3;
      bh4 = ah4;
      bh5 = ah5;
      bh6 = ah6;
      bh7 = ah7;

      bl0 = al0;
      bl1 = al1;
      bl2 = al2;
      bl3 = al3;
      bl4 = al4;
      bl5 = al5;
      bl6 = al6;
      bl7 = al7;

      // add
      h = ah7;
      l = al7;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma1
      h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
      l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Ch
      h = (ah4 & ah5) ^ (~ah4 & ah6);
      l = (al4 & al5) ^ (~al4 & al6);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // K
      h = K[i*2];
      l = K[i*2+1];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // w
      h = wh[i%16];
      l = wl[i%16];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      th = c & 0xffff | d << 16;
      tl = a & 0xffff | b << 16;

      // add
      h = th;
      l = tl;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma0
      h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
      l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Maj
      h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
      l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh7 = (c & 0xffff) | (d << 16);
      bl7 = (a & 0xffff) | (b << 16);

      // add
      h = bh3;
      l = bl3;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      h = th;
      l = tl;

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh3 = (c & 0xffff) | (d << 16);
      bl3 = (a & 0xffff) | (b << 16);

      ah1 = bh0;
      ah2 = bh1;
      ah3 = bh2;
      ah4 = bh3;
      ah5 = bh4;
      ah6 = bh5;
      ah7 = bh6;
      ah0 = bh7;

      al1 = bl0;
      al2 = bl1;
      al3 = bl2;
      al4 = bl3;
      al5 = bl4;
      al6 = bl5;
      al7 = bl6;
      al0 = bl7;

      if (i%16 === 15) {
        for (j = 0; j < 16; j++) {
          // add
          h = wh[j];
          l = wl[j];

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          h = wh[(j+9)%16];
          l = wl[(j+9)%16];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma0
          th = wh[(j+1)%16];
          tl = wl[(j+1)%16];
          h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
          l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma1
          th = wh[(j+14)%16];
          tl = wl[(j+14)%16];
          h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
          l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          wh[j] = (c & 0xffff) | (d << 16);
          wl[j] = (a & 0xffff) | (b << 16);
        }
      }
    }

    // add
    h = ah0;
    l = al0;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[0];
    l = hl[0];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[0] = ah0 = (c & 0xffff) | (d << 16);
    hl[0] = al0 = (a & 0xffff) | (b << 16);

    h = ah1;
    l = al1;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[1];
    l = hl[1];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[1] = ah1 = (c & 0xffff) | (d << 16);
    hl[1] = al1 = (a & 0xffff) | (b << 16);

    h = ah2;
    l = al2;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[2];
    l = hl[2];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[2] = ah2 = (c & 0xffff) | (d << 16);
    hl[2] = al2 = (a & 0xffff) | (b << 16);

    h = ah3;
    l = al3;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[3];
    l = hl[3];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[3] = ah3 = (c & 0xffff) | (d << 16);
    hl[3] = al3 = (a & 0xffff) | (b << 16);

    h = ah4;
    l = al4;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[4];
    l = hl[4];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[4] = ah4 = (c & 0xffff) | (d << 16);
    hl[4] = al4 = (a & 0xffff) | (b << 16);

    h = ah5;
    l = al5;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[5];
    l = hl[5];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[5] = ah5 = (c & 0xffff) | (d << 16);
    hl[5] = al5 = (a & 0xffff) | (b << 16);

    h = ah6;
    l = al6;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[6];
    l = hl[6];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[6] = ah6 = (c & 0xffff) | (d << 16);
    hl[6] = al6 = (a & 0xffff) | (b << 16);

    h = ah7;
    l = al7;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[7];
    l = hl[7];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[7] = ah7 = (c & 0xffff) | (d << 16);
    hl[7] = al7 = (a & 0xffff) | (b << 16);

    pos += 128;
    n -= 128;
  }

  return n;
}

function crypto_hash(out, m, n) {
  var hh = new Int32Array(8),
      hl = new Int32Array(8),
      x = new Uint8Array(256),
      i, b = n;

  hh[0] = 0x6a09e667;
  hh[1] = 0xbb67ae85;
  hh[2] = 0x3c6ef372;
  hh[3] = 0xa54ff53a;
  hh[4] = 0x510e527f;
  hh[5] = 0x9b05688c;
  hh[6] = 0x1f83d9ab;
  hh[7] = 0x5be0cd19;

  hl[0] = 0xf3bcc908;
  hl[1] = 0x84caa73b;
  hl[2] = 0xfe94f82b;
  hl[3] = 0x5f1d36f1;
  hl[4] = 0xade682d1;
  hl[5] = 0x2b3e6c1f;
  hl[6] = 0xfb41bd6b;
  hl[7] = 0x137e2179;

  crypto_hashblocks_hl(hh, hl, m, n);
  n %= 128;

  for (i = 0; i < n; i++) x[i] = m[b-n+i];
  x[n] = 128;

  n = 256-128*(n<112?1:0);
  x[n-9] = 0;
  ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
  crypto_hashblocks_hl(hh, hl, x, n);

  for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

  return 0;
}

function add(p, q) {
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf(),
      g = gf(), h = gf(), t = gf();

  Z(a, p[1], p[0]);
  Z(t, q[1], q[0]);
  M(a, a, t);
  A(b, p[0], p[1]);
  A(t, q[0], q[1]);
  M(b, b, t);
  M(c, p[3], q[3]);
  M(c, c, D2);
  M(d, p[2], q[2]);
  A(d, d, d);
  Z(e, b, a);
  Z(f, d, c);
  A(g, d, c);
  A(h, b, a);

  M(p[0], e, f);
  M(p[1], h, g);
  M(p[2], g, f);
  M(p[3], e, h);
}

function cswap(p, q, b) {
  var i;
  for (i = 0; i < 4; i++) {
    sel25519(p[i], q[i], b);
  }
}

function pack(r, p) {
  var tx = gf(), ty = gf(), zi = gf();
  inv25519(zi, p[2]);
  M(tx, p[0], zi);
  M(ty, p[1], zi);
  pack25519(r, ty);
  r[31] ^= par25519(tx) << 7;
}

function scalarmult(p, q, s) {
  var b, i;
  set25519(p[0], gf0);
  set25519(p[1], gf1);
  set25519(p[2], gf1);
  set25519(p[3], gf0);
  for (i = 255; i >= 0; --i) {
    b = (s[(i/8)|0] >> (i&7)) & 1;
    cswap(p, q, b);
    add(q, p);
    add(p, p);
    cswap(p, q, b);
  }
}

function scalarbase(p, s) {
  var q = [gf(), gf(), gf(), gf()];
  set25519(q[0], X);
  set25519(q[1], Y);
  set25519(q[2], gf1);
  M(q[3], X, Y);
  scalarmult(p, q, s);
}

function crypto_sign_keypair(pk, sk, seeded) {
  var d = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()];
  var i;

  if (!seeded) randombytes(sk, 32);
  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  scalarbase(p, d);
  pack(pk, p);

  for (i = 0; i < 32; i++) sk[i+32] = pk[i];
  return 0;
}

var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

function modL(r, x) {
  var carry, i, j, k;
  for (i = 63; i >= 32; --i) {
    carry = 0;
    for (j = i - 32, k = i - 12; j < k; ++j) {
      x[j] += carry - 16 * x[i] * L[j - (i - 32)];
      carry = (x[j] + 128) >> 8;
      x[j] -= carry * 256;
    }
    x[j] += carry;
    x[i] = 0;
  }
  carry = 0;
  for (j = 0; j < 32; j++) {
    x[j] += carry - (x[31] >> 4) * L[j];
    carry = x[j] >> 8;
    x[j] &= 255;
  }
  for (j = 0; j < 32; j++) x[j] -= carry * L[j];
  for (i = 0; i < 32; i++) {
    x[i+1] += x[i] >> 8;
    r[i] = x[i] & 255;
  }
}

function reduce(r) {
  var x = new Float64Array(64), i;
  for (i = 0; i < 64; i++) x[i] = r[i];
  for (i = 0; i < 64; i++) r[i] = 0;
  modL(r, x);
}

// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
  var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
  var i, j, x = new Float64Array(64);
  var p = [gf(), gf(), gf(), gf()];

  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  var smlen = n + 64;
  for (i = 0; i < n; i++) sm[64 + i] = m[i];
  for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

  crypto_hash(r, sm.subarray(32), n+32);
  reduce(r);
  scalarbase(p, r);
  pack(sm, p);

  for (i = 32; i < 64; i++) sm[i] = sk[i];
  crypto_hash(h, sm, n + 64);
  reduce(h);

  for (i = 0; i < 64; i++) x[i] = 0;
  for (i = 0; i < 32; i++) x[i] = r[i];
  for (i = 0; i < 32; i++) {
    for (j = 0; j < 32; j++) {
      x[i+j] += h[i] * d[j];
    }
  }

  modL(sm.subarray(32), x);
  return smlen;
}

function unpackneg(r, p) {
  var t = gf(), chk = gf(), num = gf(),
      den = gf(), den2 = gf(), den4 = gf(),
      den6 = gf();

  set25519(r[2], gf1);
  unpack25519(r[1], p);
  S(num, r[1]);
  M(den, num, D);
  Z(num, num, r[2]);
  A(den, r[2], den);

  S(den2, den);
  S(den4, den2);
  M(den6, den4, den2);
  M(t, den6, num);
  M(t, t, den);

  pow2523(t, t);
  M(t, t, num);
  M(t, t, den);
  M(t, t, den);
  M(r[0], t, den);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) M(r[0], r[0], I);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) return -1;

  if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

  M(r[3], r[0], r[1]);
  return 0;
}

function crypto_sign_open(m, sm, n, pk) {
  var i, mlen;
  var t = new Uint8Array(32), h = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()],
      q = [gf(), gf(), gf(), gf()];

  mlen = -1;
  if (n < 64) return -1;

  if (unpackneg(q, pk)) return -1;

  for (i = 0; i < n; i++) m[i] = sm[i];
  for (i = 0; i < 32; i++) m[i+32] = pk[i];
  crypto_hash(h, m, n);
  reduce(h);
  scalarmult(p, q, h);

  scalarbase(q, sm.subarray(32));
  add(p, q);
  pack(t, p);

  n -= 64;
  if (crypto_verify_32(sm, 0, t, 0)) {
    for (i = 0; i < n; i++) m[i] = 0;
    return -1;
  }

  for (i = 0; i < n; i++) m[i] = sm[i + 64];
  mlen = n;
  return mlen;
}

var crypto_secretbox_KEYBYTES = 32,
    crypto_secretbox_NONCEBYTES = 24,
    crypto_secretbox_ZEROBYTES = 32,
    crypto_secretbox_BOXZEROBYTES = 16,
    crypto_scalarmult_BYTES = 32,
    crypto_scalarmult_SCALARBYTES = 32,
    crypto_box_PUBLICKEYBYTES = 32,
    crypto_box_SECRETKEYBYTES = 32,
    crypto_box_BEFORENMBYTES = 32,
    crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
    crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
    crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
    crypto_sign_BYTES = 64,
    crypto_sign_PUBLICKEYBYTES = 32,
    crypto_sign_SECRETKEYBYTES = 64,
    crypto_sign_SEEDBYTES = 32,
    crypto_hash_BYTES = 64;

nacl.lowlevel = {
  crypto_core_hsalsa20: crypto_core_hsalsa20,
  crypto_stream_xor: crypto_stream_xor,
  crypto_stream: crypto_stream,
  crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
  crypto_stream_salsa20: crypto_stream_salsa20,
  crypto_onetimeauth: crypto_onetimeauth,
  crypto_onetimeauth_verify: crypto_onetimeauth_verify,
  crypto_verify_16: crypto_verify_16,
  crypto_verify_32: crypto_verify_32,
  crypto_secretbox: crypto_secretbox,
  crypto_secretbox_open: crypto_secretbox_open,
  crypto_scalarmult: crypto_scalarmult,
  crypto_scalarmult_base: crypto_scalarmult_base,
  crypto_box_beforenm: crypto_box_beforenm,
  crypto_box_afternm: crypto_box_afternm,
  crypto_box: crypto_box,
  crypto_box_open: crypto_box_open,
  crypto_box_keypair: crypto_box_keypair,
  crypto_hash: crypto_hash,
  crypto_sign: crypto_sign,
  crypto_sign_keypair: crypto_sign_keypair,
  crypto_sign_open: crypto_sign_open,

  crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
  crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
  crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
  crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
  crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
  crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
  crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
  crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
  crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
  crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
  crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
  crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
  crypto_sign_BYTES: crypto_sign_BYTES,
  crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
  crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
  crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
  crypto_hash_BYTES: crypto_hash_BYTES
};

/* High-level API */

function checkLengths(k, n) {
  if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
  if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
}

function checkBoxLengths(pk, sk) {
  if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
  if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
}

function checkArrayTypes() {
  var t, i;
  for (i = 0; i < arguments.length; i++) {
     if ((t = Object.prototype.toString.call(arguments[i])) !== '[object Uint8Array]')
       throw new TypeError('unexpected type ' + t + ', use Uint8Array');
  }
}

function cleanup(arr) {
  for (var i = 0; i < arr.length; i++) arr[i] = 0;
}

// TODO: Completely remove this in v0.15.
if (!nacl.util) {
  nacl.util = {};
  nacl.util.decodeUTF8 = nacl.util.encodeUTF8 = nacl.util.encodeBase64 = nacl.util.decodeBase64 = function() {
    throw new Error('nacl.util moved into separate package: https://github.com/dchest/tweetnacl-util-js');
  };
}

nacl.randomBytes = function(n) {
  var b = new Uint8Array(n);
  randombytes(b, n);
  return b;
};

nacl.secretbox = function(msg, nonce, key) {
  checkArrayTypes(msg, nonce, key);
  checkLengths(key, nonce);
  var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
  var c = new Uint8Array(m.length);
  for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
  crypto_secretbox(c, m, m.length, nonce, key);
  return c.subarray(crypto_secretbox_BOXZEROBYTES);
};

nacl.secretbox.open = function(box, nonce, key) {
  checkArrayTypes(box, nonce, key);
  checkLengths(key, nonce);
  var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
  var m = new Uint8Array(c.length);
  for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
  if (c.length < 32) return false;
  if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return false;
  return m.subarray(crypto_secretbox_ZEROBYTES);
};

nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

nacl.scalarMult = function(n, p) {
  checkArrayTypes(n, p);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult(q, n, p);
  return q;
};

nacl.scalarMult.base = function(n) {
  checkArrayTypes(n);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult_base(q, n);
  return q;
};

nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

nacl.box = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox(msg, nonce, k);
};

nacl.box.before = function(publicKey, secretKey) {
  checkArrayTypes(publicKey, secretKey);
  checkBoxLengths(publicKey, secretKey);
  var k = new Uint8Array(crypto_box_BEFORENMBYTES);
  crypto_box_beforenm(k, publicKey, secretKey);
  return k;
};

nacl.box.after = nacl.secretbox;

nacl.box.open = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox.open(msg, nonce, k);
};

nacl.box.open.after = nacl.secretbox.open;

nacl.box.keyPair = function() {
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
  crypto_box_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.box.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_box_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  crypto_scalarmult_base(pk, secretKey);
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
nacl.box.nonceLength = crypto_box_NONCEBYTES;
nacl.box.overheadLength = nacl.secretbox.overheadLength;

nacl.sign = function(msg, secretKey) {
  checkArrayTypes(msg, secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
  crypto_sign(signedMsg, msg, msg.length, secretKey);
  return signedMsg;
};

nacl.sign.open = function(signedMsg, publicKey) {
  if (arguments.length !== 2)
    throw new Error('nacl.sign.open accepts 2 arguments; did you mean to use nacl.sign.detached.verify?');
  checkArrayTypes(signedMsg, publicKey);
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var tmp = new Uint8Array(signedMsg.length);
  var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
  if (mlen < 0) return null;
  var m = new Uint8Array(mlen);
  for (var i = 0; i < m.length; i++) m[i] = tmp[i];
  return m;
};

nacl.sign.detached = function(msg, secretKey) {
  var signedMsg = nacl.sign(msg, secretKey);
  var sig = new Uint8Array(crypto_sign_BYTES);
  for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
  return sig;
};

nacl.sign.detached.verify = function(msg, sig, publicKey) {
  checkArrayTypes(msg, sig, publicKey);
  if (sig.length !== crypto_sign_BYTES)
    throw new Error('bad signature size');
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
  var m = new Uint8Array(crypto_sign_BYTES + msg.length);
  var i;
  for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
  for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
  return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
};

nacl.sign.keyPair = function() {
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  crypto_sign_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.sign.keyPair.fromSeed = function(seed) {
  checkArrayTypes(seed);
  if (seed.length !== crypto_sign_SEEDBYTES)
    throw new Error('bad seed size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  for (var i = 0; i < 32; i++) sk[i] = seed[i];
  crypto_sign_keypair(pk, sk, true);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
nacl.sign.seedLength = crypto_sign_SEEDBYTES;
nacl.sign.signatureLength = crypto_sign_BYTES;

nacl.hash = function(msg) {
  checkArrayTypes(msg);
  var h = new Uint8Array(crypto_hash_BYTES);
  crypto_hash(h, msg, msg.length);
  return h;
};

nacl.hash.hashLength = crypto_hash_BYTES;

nacl.verify = function(x, y) {
  checkArrayTypes(x, y);
  // Zero length arguments are considered not equal.
  if (x.length === 0 || y.length === 0) return false;
  if (x.length !== y.length) return false;
  return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
};

nacl.setPRNG = function(fn) {
  randombytes = fn;
};

(function() {
  // Initialize PRNG if environment provides CSPRNG.
  // If not, methods calling randombytes will throw.
  var crypto = typeof self !== 'undefined' ? (self.crypto || self.msCrypto) : null;
  if (crypto && crypto.getRandomValues) {
    // Browsers.
    var QUOTA = 65536;
    nacl.setPRNG(function(x, n) {
      var i, v = new Uint8Array(n);
      for (i = 0; i < n; i += QUOTA) {
        crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
      }
      for (i = 0; i < n; i++) x[i] = v[i];
      cleanup(v);
    });
  } else if (typeof require !== 'undefined') {
    // Node.js.
    crypto = require('crypto');
    if (crypto && crypto.randomBytes) {
      nacl.setPRNG(function(x, n) {
        var i, v = crypto.randomBytes(n);
        for (i = 0; i < n; i++) x[i] = v[i];
        cleanup(v);
      });
    }
  }
})();

})(typeof module !== 'undefined' && module.exports ? module.exports : (self.nacl = self.nacl || {}));

},{"crypto":36}],64:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function (global, factory) {
    /* global define, require, module */

    /* AMD */if (typeof define === 'function' && define.amd) define(["protobufjs/minimal"], factory);

    /* CommonJS */else if (typeof require === 'function' && (typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && module && module.exports) module.exports = factory(require("protobufjs/minimal"));
})(undefined, function ($protobuf) {
    "use strict";

    // Common aliases

    var $Reader = $protobuf.Reader,
        $Writer = $protobuf.Writer,
        $util = $protobuf.util;

    // Exported root namespace
    var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

    $root.exonum = function () {

        /**
         * Namespace exonum.
         * @exports exonum
         * @namespace
         */
        var exonum = {};

        exonum.consensus = function () {

            /**
             * Namespace consensus.
             * @memberof exonum
             * @namespace
             */
            var consensus = {};

            consensus.Connect = function () {

                /**
                 * Properties of a Connect.
                 * @memberof exonum.consensus
                 * @interface IConnect
                 * @property {string|null} [pub_addr] Connect pub_addr
                 * @property {google.protobuf.ITimestamp|null} [time] Connect time
                 * @property {string|null} [user_agent] Connect user_agent
                 */

                /**
                 * Constructs a new Connect.
                 * @memberof exonum.consensus
                 * @classdesc Represents a Connect.
                 * @implements IConnect
                 * @constructor
                 * @param {exonum.consensus.IConnect=} [properties] Properties to set
                 */
                function Connect(properties) {
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * Connect pub_addr.
                 * @member {string} pub_addr
                 * @memberof exonum.consensus.Connect
                 * @instance
                 */
                Connect.prototype.pub_addr = "";

                /**
                 * Connect time.
                 * @member {google.protobuf.ITimestamp|null|undefined} time
                 * @memberof exonum.consensus.Connect
                 * @instance
                 */
                Connect.prototype.time = null;

                /**
                 * Connect user_agent.
                 * @member {string} user_agent
                 * @memberof exonum.consensus.Connect
                 * @instance
                 */
                Connect.prototype.user_agent = "";

                /**
                 * Creates a new Connect instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.Connect
                 * @static
                 * @param {exonum.consensus.IConnect=} [properties] Properties to set
                 * @returns {exonum.consensus.Connect} Connect instance
                 */
                Connect.create = function create(properties) {
                    return new Connect(properties);
                };

                /**
                 * Encodes the specified Connect message. Does not implicitly {@link exonum.consensus.Connect.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.Connect
                 * @static
                 * @param {exonum.consensus.IConnect} message Connect message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Connect.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.pub_addr != null && message.hasOwnProperty("pub_addr")) writer.uint32( /* id 1, wireType 2 =*/10).string(message.pub_addr);
                    if (message.time != null && message.hasOwnProperty("time")) $root.google.protobuf.Timestamp.encode(message.time, writer.uint32( /* id 2, wireType 2 =*/18).fork()).ldelim();
                    if (message.user_agent != null && message.hasOwnProperty("user_agent")) writer.uint32( /* id 3, wireType 2 =*/26).string(message.user_agent);
                    return writer;
                };

                /**
                 * Encodes the specified Connect message, length delimited. Does not implicitly {@link exonum.consensus.Connect.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.Connect
                 * @static
                 * @param {exonum.consensus.IConnect} message Connect message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Connect.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Connect message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.Connect
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.Connect} Connect
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Connect.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.Connect();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.pub_addr = reader.string();
                                break;
                            case 2:
                                message.time = $root.google.protobuf.Timestamp.decode(reader, reader.uint32());
                                break;
                            case 3:
                                message.user_agent = reader.string();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Connect message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.Connect
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.Connect} Connect
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Connect.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Connect message.
                 * @function verify
                 * @memberof exonum.consensus.Connect
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Connect.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.pub_addr != null && message.hasOwnProperty("pub_addr")) if (!$util.isString(message.pub_addr)) return "pub_addr: string expected";
                    if (message.time != null && message.hasOwnProperty("time")) {
                        var error = $root.google.protobuf.Timestamp.verify(message.time);
                        if (error) return "time." + error;
                    }
                    if (message.user_agent != null && message.hasOwnProperty("user_agent")) if (!$util.isString(message.user_agent)) return "user_agent: string expected";
                    return null;
                };

                /**
                 * Creates a Connect message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.Connect
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.Connect} Connect
                 */
                Connect.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.Connect) return object;
                    var message = new $root.exonum.consensus.Connect();
                    if (object.pub_addr != null) message.pub_addr = String(object.pub_addr);
                    if (object.time != null) {
                        if (_typeof(object.time) !== "object") throw TypeError(".exonum.consensus.Connect.time: object expected");
                        message.time = $root.google.protobuf.Timestamp.fromObject(object.time);
                    }
                    if (object.user_agent != null) message.user_agent = String(object.user_agent);
                    return message;
                };

                /**
                 * Creates a plain object from a Connect message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.Connect
                 * @static
                 * @param {exonum.consensus.Connect} message Connect
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Connect.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.defaults) {
                        object.pub_addr = "";
                        object.time = null;
                        object.user_agent = "";
                    }
                    if (message.pub_addr != null && message.hasOwnProperty("pub_addr")) object.pub_addr = message.pub_addr;
                    if (message.time != null && message.hasOwnProperty("time")) object.time = $root.google.protobuf.Timestamp.toObject(message.time, options);
                    if (message.user_agent != null && message.hasOwnProperty("user_agent")) object.user_agent = message.user_agent;
                    return object;
                };

                /**
                 * Converts this Connect to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.Connect
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Connect.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return Connect;
            }();

            consensus.Status = function () {

                /**
                 * Properties of a Status.
                 * @memberof exonum.consensus
                 * @interface IStatus
                 * @property {number|Long|null} [height] Status height
                 * @property {exonum.IHash|null} [last_hash] Status last_hash
                 */

                /**
                 * Constructs a new Status.
                 * @memberof exonum.consensus
                 * @classdesc Represents a Status.
                 * @implements IStatus
                 * @constructor
                 * @param {exonum.consensus.IStatus=} [properties] Properties to set
                 */
                function Status(properties) {
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * Status height.
                 * @member {number|Long} height
                 * @memberof exonum.consensus.Status
                 * @instance
                 */
                Status.prototype.height = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

                /**
                 * Status last_hash.
                 * @member {exonum.IHash|null|undefined} last_hash
                 * @memberof exonum.consensus.Status
                 * @instance
                 */
                Status.prototype.last_hash = null;

                /**
                 * Creates a new Status instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.Status
                 * @static
                 * @param {exonum.consensus.IStatus=} [properties] Properties to set
                 * @returns {exonum.consensus.Status} Status instance
                 */
                Status.create = function create(properties) {
                    return new Status(properties);
                };

                /**
                 * Encodes the specified Status message. Does not implicitly {@link exonum.consensus.Status.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.Status
                 * @static
                 * @param {exonum.consensus.IStatus} message Status message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Status.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.height != null && message.hasOwnProperty("height")) writer.uint32( /* id 1, wireType 0 =*/8).uint64(message.height);
                    if (message.last_hash != null && message.hasOwnProperty("last_hash")) $root.exonum.Hash.encode(message.last_hash, writer.uint32( /* id 2, wireType 2 =*/18).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified Status message, length delimited. Does not implicitly {@link exonum.consensus.Status.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.Status
                 * @static
                 * @param {exonum.consensus.IStatus} message Status message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Status.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Status message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.Status
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.Status} Status
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Status.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.Status();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.height = reader.uint64();
                                break;
                            case 2:
                                message.last_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Status message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.Status
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.Status} Status
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Status.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Status message.
                 * @function verify
                 * @memberof exonum.consensus.Status
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Status.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.height != null && message.hasOwnProperty("height")) if (!$util.isInteger(message.height) && !(message.height && $util.isInteger(message.height.low) && $util.isInteger(message.height.high))) return "height: integer|Long expected";
                    if (message.last_hash != null && message.hasOwnProperty("last_hash")) {
                        var error = $root.exonum.Hash.verify(message.last_hash);
                        if (error) return "last_hash." + error;
                    }
                    return null;
                };

                /**
                 * Creates a Status message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.Status
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.Status} Status
                 */
                Status.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.Status) return object;
                    var message = new $root.exonum.consensus.Status();
                    if (object.height != null) if ($util.Long) (message.height = $util.Long.fromValue(object.height)).unsigned = true;else if (typeof object.height === "string") message.height = parseInt(object.height, 10);else if (typeof object.height === "number") message.height = object.height;else if (_typeof(object.height) === "object") message.height = new $util.LongBits(object.height.low >>> 0, object.height.high >>> 0).toNumber(true);
                    if (object.last_hash != null) {
                        if (_typeof(object.last_hash) !== "object") throw TypeError(".exonum.consensus.Status.last_hash: object expected");
                        message.last_hash = $root.exonum.Hash.fromObject(object.last_hash);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a Status message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.Status
                 * @static
                 * @param {exonum.consensus.Status} message Status
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Status.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.defaults) {
                        if ($util.Long) {
                            var long = new $util.Long(0, 0, true);
                            object.height = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                        } else object.height = options.longs === String ? "0" : 0;
                        object.last_hash = null;
                    }
                    if (message.height != null && message.hasOwnProperty("height")) if (typeof message.height === "number") object.height = options.longs === String ? String(message.height) : message.height;else object.height = options.longs === String ? $util.Long.prototype.toString.call(message.height) : options.longs === Number ? new $util.LongBits(message.height.low >>> 0, message.height.high >>> 0).toNumber(true) : message.height;
                    if (message.last_hash != null && message.hasOwnProperty("last_hash")) object.last_hash = $root.exonum.Hash.toObject(message.last_hash, options);
                    return object;
                };

                /**
                 * Converts this Status to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.Status
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Status.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return Status;
            }();

            consensus.Propose = function () {

                /**
                 * Properties of a Propose.
                 * @memberof exonum.consensus
                 * @interface IPropose
                 * @property {number|null} [validator] Propose validator
                 * @property {number|Long|null} [height] Propose height
                 * @property {number|null} [round] Propose round
                 * @property {exonum.IHash|null} [prev_hash] Propose prev_hash
                 * @property {Array.<exonum.IHash>|null} [transactions] Propose transactions
                 */

                /**
                 * Constructs a new Propose.
                 * @memberof exonum.consensus
                 * @classdesc Represents a Propose.
                 * @implements IPropose
                 * @constructor
                 * @param {exonum.consensus.IPropose=} [properties] Properties to set
                 */
                function Propose(properties) {
                    this.transactions = [];
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * Propose validator.
                 * @member {number} validator
                 * @memberof exonum.consensus.Propose
                 * @instance
                 */
                Propose.prototype.validator = 0;

                /**
                 * Propose height.
                 * @member {number|Long} height
                 * @memberof exonum.consensus.Propose
                 * @instance
                 */
                Propose.prototype.height = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

                /**
                 * Propose round.
                 * @member {number} round
                 * @memberof exonum.consensus.Propose
                 * @instance
                 */
                Propose.prototype.round = 0;

                /**
                 * Propose prev_hash.
                 * @member {exonum.IHash|null|undefined} prev_hash
                 * @memberof exonum.consensus.Propose
                 * @instance
                 */
                Propose.prototype.prev_hash = null;

                /**
                 * Propose transactions.
                 * @member {Array.<exonum.IHash>} transactions
                 * @memberof exonum.consensus.Propose
                 * @instance
                 */
                Propose.prototype.transactions = $util.emptyArray;

                /**
                 * Creates a new Propose instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.Propose
                 * @static
                 * @param {exonum.consensus.IPropose=} [properties] Properties to set
                 * @returns {exonum.consensus.Propose} Propose instance
                 */
                Propose.create = function create(properties) {
                    return new Propose(properties);
                };

                /**
                 * Encodes the specified Propose message. Does not implicitly {@link exonum.consensus.Propose.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.Propose
                 * @static
                 * @param {exonum.consensus.IPropose} message Propose message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Propose.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.validator != null && message.hasOwnProperty("validator")) writer.uint32( /* id 1, wireType 0 =*/8).uint32(message.validator);
                    if (message.height != null && message.hasOwnProperty("height")) writer.uint32( /* id 2, wireType 0 =*/16).uint64(message.height);
                    if (message.round != null && message.hasOwnProperty("round")) writer.uint32( /* id 3, wireType 0 =*/24).uint32(message.round);
                    if (message.prev_hash != null && message.hasOwnProperty("prev_hash")) $root.exonum.Hash.encode(message.prev_hash, writer.uint32( /* id 4, wireType 2 =*/34).fork()).ldelim();
                    if (message.transactions != null && message.transactions.length) for (var i = 0; i < message.transactions.length; ++i) {
                        $root.exonum.Hash.encode(message.transactions[i], writer.uint32( /* id 5, wireType 2 =*/42).fork()).ldelim();
                    }return writer;
                };

                /**
                 * Encodes the specified Propose message, length delimited. Does not implicitly {@link exonum.consensus.Propose.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.Propose
                 * @static
                 * @param {exonum.consensus.IPropose} message Propose message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Propose.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Propose message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.Propose
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.Propose} Propose
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Propose.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.Propose();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.validator = reader.uint32();
                                break;
                            case 2:
                                message.height = reader.uint64();
                                break;
                            case 3:
                                message.round = reader.uint32();
                                break;
                            case 4:
                                message.prev_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                                break;
                            case 5:
                                if (!(message.transactions && message.transactions.length)) message.transactions = [];
                                message.transactions.push($root.exonum.Hash.decode(reader, reader.uint32()));
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Propose message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.Propose
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.Propose} Propose
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Propose.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Propose message.
                 * @function verify
                 * @memberof exonum.consensus.Propose
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Propose.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.validator != null && message.hasOwnProperty("validator")) if (!$util.isInteger(message.validator)) return "validator: integer expected";
                    if (message.height != null && message.hasOwnProperty("height")) if (!$util.isInteger(message.height) && !(message.height && $util.isInteger(message.height.low) && $util.isInteger(message.height.high))) return "height: integer|Long expected";
                    if (message.round != null && message.hasOwnProperty("round")) if (!$util.isInteger(message.round)) return "round: integer expected";
                    if (message.prev_hash != null && message.hasOwnProperty("prev_hash")) {
                        var error = $root.exonum.Hash.verify(message.prev_hash);
                        if (error) return "prev_hash." + error;
                    }
                    if (message.transactions != null && message.hasOwnProperty("transactions")) {
                        if (!Array.isArray(message.transactions)) return "transactions: array expected";
                        for (var i = 0; i < message.transactions.length; ++i) {
                            var error = $root.exonum.Hash.verify(message.transactions[i]);
                            if (error) return "transactions." + error;
                        }
                    }
                    return null;
                };

                /**
                 * Creates a Propose message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.Propose
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.Propose} Propose
                 */
                Propose.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.Propose) return object;
                    var message = new $root.exonum.consensus.Propose();
                    if (object.validator != null) message.validator = object.validator >>> 0;
                    if (object.height != null) if ($util.Long) (message.height = $util.Long.fromValue(object.height)).unsigned = true;else if (typeof object.height === "string") message.height = parseInt(object.height, 10);else if (typeof object.height === "number") message.height = object.height;else if (_typeof(object.height) === "object") message.height = new $util.LongBits(object.height.low >>> 0, object.height.high >>> 0).toNumber(true);
                    if (object.round != null) message.round = object.round >>> 0;
                    if (object.prev_hash != null) {
                        if (_typeof(object.prev_hash) !== "object") throw TypeError(".exonum.consensus.Propose.prev_hash: object expected");
                        message.prev_hash = $root.exonum.Hash.fromObject(object.prev_hash);
                    }
                    if (object.transactions) {
                        if (!Array.isArray(object.transactions)) throw TypeError(".exonum.consensus.Propose.transactions: array expected");
                        message.transactions = [];
                        for (var i = 0; i < object.transactions.length; ++i) {
                            if (_typeof(object.transactions[i]) !== "object") throw TypeError(".exonum.consensus.Propose.transactions: object expected");
                            message.transactions[i] = $root.exonum.Hash.fromObject(object.transactions[i]);
                        }
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a Propose message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.Propose
                 * @static
                 * @param {exonum.consensus.Propose} message Propose
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Propose.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.arrays || options.defaults) object.transactions = [];
                    if (options.defaults) {
                        object.validator = 0;
                        if ($util.Long) {
                            var long = new $util.Long(0, 0, true);
                            object.height = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                        } else object.height = options.longs === String ? "0" : 0;
                        object.round = 0;
                        object.prev_hash = null;
                    }
                    if (message.validator != null && message.hasOwnProperty("validator")) object.validator = message.validator;
                    if (message.height != null && message.hasOwnProperty("height")) if (typeof message.height === "number") object.height = options.longs === String ? String(message.height) : message.height;else object.height = options.longs === String ? $util.Long.prototype.toString.call(message.height) : options.longs === Number ? new $util.LongBits(message.height.low >>> 0, message.height.high >>> 0).toNumber(true) : message.height;
                    if (message.round != null && message.hasOwnProperty("round")) object.round = message.round;
                    if (message.prev_hash != null && message.hasOwnProperty("prev_hash")) object.prev_hash = $root.exonum.Hash.toObject(message.prev_hash, options);
                    if (message.transactions && message.transactions.length) {
                        object.transactions = [];
                        for (var j = 0; j < message.transactions.length; ++j) {
                            object.transactions[j] = $root.exonum.Hash.toObject(message.transactions[j], options);
                        }
                    }
                    return object;
                };

                /**
                 * Converts this Propose to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.Propose
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Propose.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return Propose;
            }();

            consensus.Prevote = function () {

                /**
                 * Properties of a Prevote.
                 * @memberof exonum.consensus
                 * @interface IPrevote
                 * @property {number|null} [validator] Prevote validator
                 * @property {number|Long|null} [height] Prevote height
                 * @property {number|null} [round] Prevote round
                 * @property {exonum.IHash|null} [propose_hash] Prevote propose_hash
                 * @property {number|null} [locked_round] Prevote locked_round
                 */

                /**
                 * Constructs a new Prevote.
                 * @memberof exonum.consensus
                 * @classdesc Represents a Prevote.
                 * @implements IPrevote
                 * @constructor
                 * @param {exonum.consensus.IPrevote=} [properties] Properties to set
                 */
                function Prevote(properties) {
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * Prevote validator.
                 * @member {number} validator
                 * @memberof exonum.consensus.Prevote
                 * @instance
                 */
                Prevote.prototype.validator = 0;

                /**
                 * Prevote height.
                 * @member {number|Long} height
                 * @memberof exonum.consensus.Prevote
                 * @instance
                 */
                Prevote.prototype.height = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

                /**
                 * Prevote round.
                 * @member {number} round
                 * @memberof exonum.consensus.Prevote
                 * @instance
                 */
                Prevote.prototype.round = 0;

                /**
                 * Prevote propose_hash.
                 * @member {exonum.IHash|null|undefined} propose_hash
                 * @memberof exonum.consensus.Prevote
                 * @instance
                 */
                Prevote.prototype.propose_hash = null;

                /**
                 * Prevote locked_round.
                 * @member {number} locked_round
                 * @memberof exonum.consensus.Prevote
                 * @instance
                 */
                Prevote.prototype.locked_round = 0;

                /**
                 * Creates a new Prevote instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.Prevote
                 * @static
                 * @param {exonum.consensus.IPrevote=} [properties] Properties to set
                 * @returns {exonum.consensus.Prevote} Prevote instance
                 */
                Prevote.create = function create(properties) {
                    return new Prevote(properties);
                };

                /**
                 * Encodes the specified Prevote message. Does not implicitly {@link exonum.consensus.Prevote.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.Prevote
                 * @static
                 * @param {exonum.consensus.IPrevote} message Prevote message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Prevote.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.validator != null && message.hasOwnProperty("validator")) writer.uint32( /* id 1, wireType 0 =*/8).uint32(message.validator);
                    if (message.height != null && message.hasOwnProperty("height")) writer.uint32( /* id 2, wireType 0 =*/16).uint64(message.height);
                    if (message.round != null && message.hasOwnProperty("round")) writer.uint32( /* id 3, wireType 0 =*/24).uint32(message.round);
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) $root.exonum.Hash.encode(message.propose_hash, writer.uint32( /* id 4, wireType 2 =*/34).fork()).ldelim();
                    if (message.locked_round != null && message.hasOwnProperty("locked_round")) writer.uint32( /* id 5, wireType 0 =*/40).uint32(message.locked_round);
                    return writer;
                };

                /**
                 * Encodes the specified Prevote message, length delimited. Does not implicitly {@link exonum.consensus.Prevote.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.Prevote
                 * @static
                 * @param {exonum.consensus.IPrevote} message Prevote message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Prevote.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Prevote message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.Prevote
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.Prevote} Prevote
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Prevote.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.Prevote();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.validator = reader.uint32();
                                break;
                            case 2:
                                message.height = reader.uint64();
                                break;
                            case 3:
                                message.round = reader.uint32();
                                break;
                            case 4:
                                message.propose_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                                break;
                            case 5:
                                message.locked_round = reader.uint32();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Prevote message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.Prevote
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.Prevote} Prevote
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Prevote.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Prevote message.
                 * @function verify
                 * @memberof exonum.consensus.Prevote
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Prevote.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.validator != null && message.hasOwnProperty("validator")) if (!$util.isInteger(message.validator)) return "validator: integer expected";
                    if (message.height != null && message.hasOwnProperty("height")) if (!$util.isInteger(message.height) && !(message.height && $util.isInteger(message.height.low) && $util.isInteger(message.height.high))) return "height: integer|Long expected";
                    if (message.round != null && message.hasOwnProperty("round")) if (!$util.isInteger(message.round)) return "round: integer expected";
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) {
                        var error = $root.exonum.Hash.verify(message.propose_hash);
                        if (error) return "propose_hash." + error;
                    }
                    if (message.locked_round != null && message.hasOwnProperty("locked_round")) if (!$util.isInteger(message.locked_round)) return "locked_round: integer expected";
                    return null;
                };

                /**
                 * Creates a Prevote message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.Prevote
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.Prevote} Prevote
                 */
                Prevote.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.Prevote) return object;
                    var message = new $root.exonum.consensus.Prevote();
                    if (object.validator != null) message.validator = object.validator >>> 0;
                    if (object.height != null) if ($util.Long) (message.height = $util.Long.fromValue(object.height)).unsigned = true;else if (typeof object.height === "string") message.height = parseInt(object.height, 10);else if (typeof object.height === "number") message.height = object.height;else if (_typeof(object.height) === "object") message.height = new $util.LongBits(object.height.low >>> 0, object.height.high >>> 0).toNumber(true);
                    if (object.round != null) message.round = object.round >>> 0;
                    if (object.propose_hash != null) {
                        if (_typeof(object.propose_hash) !== "object") throw TypeError(".exonum.consensus.Prevote.propose_hash: object expected");
                        message.propose_hash = $root.exonum.Hash.fromObject(object.propose_hash);
                    }
                    if (object.locked_round != null) message.locked_round = object.locked_round >>> 0;
                    return message;
                };

                /**
                 * Creates a plain object from a Prevote message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.Prevote
                 * @static
                 * @param {exonum.consensus.Prevote} message Prevote
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Prevote.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.defaults) {
                        object.validator = 0;
                        if ($util.Long) {
                            var long = new $util.Long(0, 0, true);
                            object.height = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                        } else object.height = options.longs === String ? "0" : 0;
                        object.round = 0;
                        object.propose_hash = null;
                        object.locked_round = 0;
                    }
                    if (message.validator != null && message.hasOwnProperty("validator")) object.validator = message.validator;
                    if (message.height != null && message.hasOwnProperty("height")) if (typeof message.height === "number") object.height = options.longs === String ? String(message.height) : message.height;else object.height = options.longs === String ? $util.Long.prototype.toString.call(message.height) : options.longs === Number ? new $util.LongBits(message.height.low >>> 0, message.height.high >>> 0).toNumber(true) : message.height;
                    if (message.round != null && message.hasOwnProperty("round")) object.round = message.round;
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) object.propose_hash = $root.exonum.Hash.toObject(message.propose_hash, options);
                    if (message.locked_round != null && message.hasOwnProperty("locked_round")) object.locked_round = message.locked_round;
                    return object;
                };

                /**
                 * Converts this Prevote to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.Prevote
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Prevote.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return Prevote;
            }();

            consensus.Precommit = function () {

                /**
                 * Properties of a Precommit.
                 * @memberof exonum.consensus
                 * @interface IPrecommit
                 * @property {number|null} [validator] Precommit validator
                 * @property {number|Long|null} [height] Precommit height
                 * @property {number|null} [round] Precommit round
                 * @property {exonum.IHash|null} [propose_hash] Precommit propose_hash
                 * @property {exonum.IHash|null} [block_hash] Precommit block_hash
                 * @property {google.protobuf.ITimestamp|null} [time] Precommit time
                 */

                /**
                 * Constructs a new Precommit.
                 * @memberof exonum.consensus
                 * @classdesc Represents a Precommit.
                 * @implements IPrecommit
                 * @constructor
                 * @param {exonum.consensus.IPrecommit=} [properties] Properties to set
                 */
                function Precommit(properties) {
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * Precommit validator.
                 * @member {number} validator
                 * @memberof exonum.consensus.Precommit
                 * @instance
                 */
                Precommit.prototype.validator = 0;

                /**
                 * Precommit height.
                 * @member {number|Long} height
                 * @memberof exonum.consensus.Precommit
                 * @instance
                 */
                Precommit.prototype.height = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

                /**
                 * Precommit round.
                 * @member {number} round
                 * @memberof exonum.consensus.Precommit
                 * @instance
                 */
                Precommit.prototype.round = 0;

                /**
                 * Precommit propose_hash.
                 * @member {exonum.IHash|null|undefined} propose_hash
                 * @memberof exonum.consensus.Precommit
                 * @instance
                 */
                Precommit.prototype.propose_hash = null;

                /**
                 * Precommit block_hash.
                 * @member {exonum.IHash|null|undefined} block_hash
                 * @memberof exonum.consensus.Precommit
                 * @instance
                 */
                Precommit.prototype.block_hash = null;

                /**
                 * Precommit time.
                 * @member {google.protobuf.ITimestamp|null|undefined} time
                 * @memberof exonum.consensus.Precommit
                 * @instance
                 */
                Precommit.prototype.time = null;

                /**
                 * Creates a new Precommit instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.Precommit
                 * @static
                 * @param {exonum.consensus.IPrecommit=} [properties] Properties to set
                 * @returns {exonum.consensus.Precommit} Precommit instance
                 */
                Precommit.create = function create(properties) {
                    return new Precommit(properties);
                };

                /**
                 * Encodes the specified Precommit message. Does not implicitly {@link exonum.consensus.Precommit.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.Precommit
                 * @static
                 * @param {exonum.consensus.IPrecommit} message Precommit message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Precommit.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.validator != null && message.hasOwnProperty("validator")) writer.uint32( /* id 1, wireType 0 =*/8).uint32(message.validator);
                    if (message.height != null && message.hasOwnProperty("height")) writer.uint32( /* id 2, wireType 0 =*/16).uint64(message.height);
                    if (message.round != null && message.hasOwnProperty("round")) writer.uint32( /* id 3, wireType 0 =*/24).uint32(message.round);
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) $root.exonum.Hash.encode(message.propose_hash, writer.uint32( /* id 4, wireType 2 =*/34).fork()).ldelim();
                    if (message.block_hash != null && message.hasOwnProperty("block_hash")) $root.exonum.Hash.encode(message.block_hash, writer.uint32( /* id 5, wireType 2 =*/42).fork()).ldelim();
                    if (message.time != null && message.hasOwnProperty("time")) $root.google.protobuf.Timestamp.encode(message.time, writer.uint32( /* id 6, wireType 2 =*/50).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified Precommit message, length delimited. Does not implicitly {@link exonum.consensus.Precommit.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.Precommit
                 * @static
                 * @param {exonum.consensus.IPrecommit} message Precommit message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Precommit.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Precommit message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.Precommit
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.Precommit} Precommit
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Precommit.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.Precommit();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.validator = reader.uint32();
                                break;
                            case 2:
                                message.height = reader.uint64();
                                break;
                            case 3:
                                message.round = reader.uint32();
                                break;
                            case 4:
                                message.propose_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                                break;
                            case 5:
                                message.block_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                                break;
                            case 6:
                                message.time = $root.google.protobuf.Timestamp.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Precommit message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.Precommit
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.Precommit} Precommit
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Precommit.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Precommit message.
                 * @function verify
                 * @memberof exonum.consensus.Precommit
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Precommit.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.validator != null && message.hasOwnProperty("validator")) if (!$util.isInteger(message.validator)) return "validator: integer expected";
                    if (message.height != null && message.hasOwnProperty("height")) if (!$util.isInteger(message.height) && !(message.height && $util.isInteger(message.height.low) && $util.isInteger(message.height.high))) return "height: integer|Long expected";
                    if (message.round != null && message.hasOwnProperty("round")) if (!$util.isInteger(message.round)) return "round: integer expected";
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) {
                        var error = $root.exonum.Hash.verify(message.propose_hash);
                        if (error) return "propose_hash." + error;
                    }
                    if (message.block_hash != null && message.hasOwnProperty("block_hash")) {
                        var error = $root.exonum.Hash.verify(message.block_hash);
                        if (error) return "block_hash." + error;
                    }
                    if (message.time != null && message.hasOwnProperty("time")) {
                        var error = $root.google.protobuf.Timestamp.verify(message.time);
                        if (error) return "time." + error;
                    }
                    return null;
                };

                /**
                 * Creates a Precommit message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.Precommit
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.Precommit} Precommit
                 */
                Precommit.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.Precommit) return object;
                    var message = new $root.exonum.consensus.Precommit();
                    if (object.validator != null) message.validator = object.validator >>> 0;
                    if (object.height != null) if ($util.Long) (message.height = $util.Long.fromValue(object.height)).unsigned = true;else if (typeof object.height === "string") message.height = parseInt(object.height, 10);else if (typeof object.height === "number") message.height = object.height;else if (_typeof(object.height) === "object") message.height = new $util.LongBits(object.height.low >>> 0, object.height.high >>> 0).toNumber(true);
                    if (object.round != null) message.round = object.round >>> 0;
                    if (object.propose_hash != null) {
                        if (_typeof(object.propose_hash) !== "object") throw TypeError(".exonum.consensus.Precommit.propose_hash: object expected");
                        message.propose_hash = $root.exonum.Hash.fromObject(object.propose_hash);
                    }
                    if (object.block_hash != null) {
                        if (_typeof(object.block_hash) !== "object") throw TypeError(".exonum.consensus.Precommit.block_hash: object expected");
                        message.block_hash = $root.exonum.Hash.fromObject(object.block_hash);
                    }
                    if (object.time != null) {
                        if (_typeof(object.time) !== "object") throw TypeError(".exonum.consensus.Precommit.time: object expected");
                        message.time = $root.google.protobuf.Timestamp.fromObject(object.time);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a Precommit message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.Precommit
                 * @static
                 * @param {exonum.consensus.Precommit} message Precommit
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Precommit.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.defaults) {
                        object.validator = 0;
                        if ($util.Long) {
                            var long = new $util.Long(0, 0, true);
                            object.height = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                        } else object.height = options.longs === String ? "0" : 0;
                        object.round = 0;
                        object.propose_hash = null;
                        object.block_hash = null;
                        object.time = null;
                    }
                    if (message.validator != null && message.hasOwnProperty("validator")) object.validator = message.validator;
                    if (message.height != null && message.hasOwnProperty("height")) if (typeof message.height === "number") object.height = options.longs === String ? String(message.height) : message.height;else object.height = options.longs === String ? $util.Long.prototype.toString.call(message.height) : options.longs === Number ? new $util.LongBits(message.height.low >>> 0, message.height.high >>> 0).toNumber(true) : message.height;
                    if (message.round != null && message.hasOwnProperty("round")) object.round = message.round;
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) object.propose_hash = $root.exonum.Hash.toObject(message.propose_hash, options);
                    if (message.block_hash != null && message.hasOwnProperty("block_hash")) object.block_hash = $root.exonum.Hash.toObject(message.block_hash, options);
                    if (message.time != null && message.hasOwnProperty("time")) object.time = $root.google.protobuf.Timestamp.toObject(message.time, options);
                    return object;
                };

                /**
                 * Converts this Precommit to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.Precommit
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Precommit.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return Precommit;
            }();

            consensus.BlockResponse = function () {

                /**
                 * Properties of a BlockResponse.
                 * @memberof exonum.consensus
                 * @interface IBlockResponse
                 * @property {exonum.IPublicKey|null} [to] BlockResponse to
                 * @property {exonum.IBlock|null} [block] BlockResponse block
                 * @property {Array.<Uint8Array>|null} [precommits] BlockResponse precommits
                 * @property {Array.<exonum.IHash>|null} [transactions] BlockResponse transactions
                 */

                /**
                 * Constructs a new BlockResponse.
                 * @memberof exonum.consensus
                 * @classdesc Represents a BlockResponse.
                 * @implements IBlockResponse
                 * @constructor
                 * @param {exonum.consensus.IBlockResponse=} [properties] Properties to set
                 */
                function BlockResponse(properties) {
                    this.precommits = [];
                    this.transactions = [];
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * BlockResponse to.
                 * @member {exonum.IPublicKey|null|undefined} to
                 * @memberof exonum.consensus.BlockResponse
                 * @instance
                 */
                BlockResponse.prototype.to = null;

                /**
                 * BlockResponse block.
                 * @member {exonum.IBlock|null|undefined} block
                 * @memberof exonum.consensus.BlockResponse
                 * @instance
                 */
                BlockResponse.prototype.block = null;

                /**
                 * BlockResponse precommits.
                 * @member {Array.<Uint8Array>} precommits
                 * @memberof exonum.consensus.BlockResponse
                 * @instance
                 */
                BlockResponse.prototype.precommits = $util.emptyArray;

                /**
                 * BlockResponse transactions.
                 * @member {Array.<exonum.IHash>} transactions
                 * @memberof exonum.consensus.BlockResponse
                 * @instance
                 */
                BlockResponse.prototype.transactions = $util.emptyArray;

                /**
                 * Creates a new BlockResponse instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.BlockResponse
                 * @static
                 * @param {exonum.consensus.IBlockResponse=} [properties] Properties to set
                 * @returns {exonum.consensus.BlockResponse} BlockResponse instance
                 */
                BlockResponse.create = function create(properties) {
                    return new BlockResponse(properties);
                };

                /**
                 * Encodes the specified BlockResponse message. Does not implicitly {@link exonum.consensus.BlockResponse.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.BlockResponse
                 * @static
                 * @param {exonum.consensus.IBlockResponse} message BlockResponse message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                BlockResponse.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.to != null && message.hasOwnProperty("to")) $root.exonum.PublicKey.encode(message.to, writer.uint32( /* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.block != null && message.hasOwnProperty("block")) $root.exonum.Block.encode(message.block, writer.uint32( /* id 2, wireType 2 =*/18).fork()).ldelim();
                    if (message.precommits != null && message.precommits.length) for (var i = 0; i < message.precommits.length; ++i) {
                        writer.uint32( /* id 3, wireType 2 =*/26).bytes(message.precommits[i]);
                    }if (message.transactions != null && message.transactions.length) for (var i = 0; i < message.transactions.length; ++i) {
                        $root.exonum.Hash.encode(message.transactions[i], writer.uint32( /* id 4, wireType 2 =*/34).fork()).ldelim();
                    }return writer;
                };

                /**
                 * Encodes the specified BlockResponse message, length delimited. Does not implicitly {@link exonum.consensus.BlockResponse.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.BlockResponse
                 * @static
                 * @param {exonum.consensus.IBlockResponse} message BlockResponse message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                BlockResponse.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a BlockResponse message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.BlockResponse
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.BlockResponse} BlockResponse
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                BlockResponse.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.BlockResponse();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.to = $root.exonum.PublicKey.decode(reader, reader.uint32());
                                break;
                            case 2:
                                message.block = $root.exonum.Block.decode(reader, reader.uint32());
                                break;
                            case 3:
                                if (!(message.precommits && message.precommits.length)) message.precommits = [];
                                message.precommits.push(reader.bytes());
                                break;
                            case 4:
                                if (!(message.transactions && message.transactions.length)) message.transactions = [];
                                message.transactions.push($root.exonum.Hash.decode(reader, reader.uint32()));
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a BlockResponse message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.BlockResponse
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.BlockResponse} BlockResponse
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                BlockResponse.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a BlockResponse message.
                 * @function verify
                 * @memberof exonum.consensus.BlockResponse
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                BlockResponse.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.to != null && message.hasOwnProperty("to")) {
                        var error = $root.exonum.PublicKey.verify(message.to);
                        if (error) return "to." + error;
                    }
                    if (message.block != null && message.hasOwnProperty("block")) {
                        var error = $root.exonum.Block.verify(message.block);
                        if (error) return "block." + error;
                    }
                    if (message.precommits != null && message.hasOwnProperty("precommits")) {
                        if (!Array.isArray(message.precommits)) return "precommits: array expected";
                        for (var i = 0; i < message.precommits.length; ++i) {
                            if (!(message.precommits[i] && typeof message.precommits[i].length === "number" || $util.isString(message.precommits[i]))) return "precommits: buffer[] expected";
                        }
                    }
                    if (message.transactions != null && message.hasOwnProperty("transactions")) {
                        if (!Array.isArray(message.transactions)) return "transactions: array expected";
                        for (var i = 0; i < message.transactions.length; ++i) {
                            var error = $root.exonum.Hash.verify(message.transactions[i]);
                            if (error) return "transactions." + error;
                        }
                    }
                    return null;
                };

                /**
                 * Creates a BlockResponse message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.BlockResponse
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.BlockResponse} BlockResponse
                 */
                BlockResponse.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.BlockResponse) return object;
                    var message = new $root.exonum.consensus.BlockResponse();
                    if (object.to != null) {
                        if (_typeof(object.to) !== "object") throw TypeError(".exonum.consensus.BlockResponse.to: object expected");
                        message.to = $root.exonum.PublicKey.fromObject(object.to);
                    }
                    if (object.block != null) {
                        if (_typeof(object.block) !== "object") throw TypeError(".exonum.consensus.BlockResponse.block: object expected");
                        message.block = $root.exonum.Block.fromObject(object.block);
                    }
                    if (object.precommits) {
                        if (!Array.isArray(object.precommits)) throw TypeError(".exonum.consensus.BlockResponse.precommits: array expected");
                        message.precommits = [];
                        for (var i = 0; i < object.precommits.length; ++i) {
                            if (typeof object.precommits[i] === "string") $util.base64.decode(object.precommits[i], message.precommits[i] = $util.newBuffer($util.base64.length(object.precommits[i])), 0);else if (object.precommits[i].length) message.precommits[i] = object.precommits[i];
                        }
                    }
                    if (object.transactions) {
                        if (!Array.isArray(object.transactions)) throw TypeError(".exonum.consensus.BlockResponse.transactions: array expected");
                        message.transactions = [];
                        for (var i = 0; i < object.transactions.length; ++i) {
                            if (_typeof(object.transactions[i]) !== "object") throw TypeError(".exonum.consensus.BlockResponse.transactions: object expected");
                            message.transactions[i] = $root.exonum.Hash.fromObject(object.transactions[i]);
                        }
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a BlockResponse message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.BlockResponse
                 * @static
                 * @param {exonum.consensus.BlockResponse} message BlockResponse
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                BlockResponse.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.arrays || options.defaults) {
                        object.precommits = [];
                        object.transactions = [];
                    }
                    if (options.defaults) {
                        object.to = null;
                        object.block = null;
                    }
                    if (message.to != null && message.hasOwnProperty("to")) object.to = $root.exonum.PublicKey.toObject(message.to, options);
                    if (message.block != null && message.hasOwnProperty("block")) object.block = $root.exonum.Block.toObject(message.block, options);
                    if (message.precommits && message.precommits.length) {
                        object.precommits = [];
                        for (var j = 0; j < message.precommits.length; ++j) {
                            object.precommits[j] = options.bytes === String ? $util.base64.encode(message.precommits[j], 0, message.precommits[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.precommits[j]) : message.precommits[j];
                        }
                    }
                    if (message.transactions && message.transactions.length) {
                        object.transactions = [];
                        for (var j = 0; j < message.transactions.length; ++j) {
                            object.transactions[j] = $root.exonum.Hash.toObject(message.transactions[j], options);
                        }
                    }
                    return object;
                };

                /**
                 * Converts this BlockResponse to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.BlockResponse
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                BlockResponse.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return BlockResponse;
            }();

            consensus.TransactionsResponse = function () {

                /**
                 * Properties of a TransactionsResponse.
                 * @memberof exonum.consensus
                 * @interface ITransactionsResponse
                 * @property {exonum.IPublicKey|null} [to] TransactionsResponse to
                 * @property {Array.<Uint8Array>|null} [transactions] TransactionsResponse transactions
                 */

                /**
                 * Constructs a new TransactionsResponse.
                 * @memberof exonum.consensus
                 * @classdesc Represents a TransactionsResponse.
                 * @implements ITransactionsResponse
                 * @constructor
                 * @param {exonum.consensus.ITransactionsResponse=} [properties] Properties to set
                 */
                function TransactionsResponse(properties) {
                    this.transactions = [];
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * TransactionsResponse to.
                 * @member {exonum.IPublicKey|null|undefined} to
                 * @memberof exonum.consensus.TransactionsResponse
                 * @instance
                 */
                TransactionsResponse.prototype.to = null;

                /**
                 * TransactionsResponse transactions.
                 * @member {Array.<Uint8Array>} transactions
                 * @memberof exonum.consensus.TransactionsResponse
                 * @instance
                 */
                TransactionsResponse.prototype.transactions = $util.emptyArray;

                /**
                 * Creates a new TransactionsResponse instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.TransactionsResponse
                 * @static
                 * @param {exonum.consensus.ITransactionsResponse=} [properties] Properties to set
                 * @returns {exonum.consensus.TransactionsResponse} TransactionsResponse instance
                 */
                TransactionsResponse.create = function create(properties) {
                    return new TransactionsResponse(properties);
                };

                /**
                 * Encodes the specified TransactionsResponse message. Does not implicitly {@link exonum.consensus.TransactionsResponse.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.TransactionsResponse
                 * @static
                 * @param {exonum.consensus.ITransactionsResponse} message TransactionsResponse message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TransactionsResponse.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.to != null && message.hasOwnProperty("to")) $root.exonum.PublicKey.encode(message.to, writer.uint32( /* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.transactions != null && message.transactions.length) for (var i = 0; i < message.transactions.length; ++i) {
                        writer.uint32( /* id 2, wireType 2 =*/18).bytes(message.transactions[i]);
                    }return writer;
                };

                /**
                 * Encodes the specified TransactionsResponse message, length delimited. Does not implicitly {@link exonum.consensus.TransactionsResponse.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.TransactionsResponse
                 * @static
                 * @param {exonum.consensus.ITransactionsResponse} message TransactionsResponse message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TransactionsResponse.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a TransactionsResponse message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.TransactionsResponse
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.TransactionsResponse} TransactionsResponse
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TransactionsResponse.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.TransactionsResponse();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.to = $root.exonum.PublicKey.decode(reader, reader.uint32());
                                break;
                            case 2:
                                if (!(message.transactions && message.transactions.length)) message.transactions = [];
                                message.transactions.push(reader.bytes());
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a TransactionsResponse message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.TransactionsResponse
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.TransactionsResponse} TransactionsResponse
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TransactionsResponse.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a TransactionsResponse message.
                 * @function verify
                 * @memberof exonum.consensus.TransactionsResponse
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                TransactionsResponse.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.to != null && message.hasOwnProperty("to")) {
                        var error = $root.exonum.PublicKey.verify(message.to);
                        if (error) return "to." + error;
                    }
                    if (message.transactions != null && message.hasOwnProperty("transactions")) {
                        if (!Array.isArray(message.transactions)) return "transactions: array expected";
                        for (var i = 0; i < message.transactions.length; ++i) {
                            if (!(message.transactions[i] && typeof message.transactions[i].length === "number" || $util.isString(message.transactions[i]))) return "transactions: buffer[] expected";
                        }
                    }
                    return null;
                };

                /**
                 * Creates a TransactionsResponse message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.TransactionsResponse
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.TransactionsResponse} TransactionsResponse
                 */
                TransactionsResponse.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.TransactionsResponse) return object;
                    var message = new $root.exonum.consensus.TransactionsResponse();
                    if (object.to != null) {
                        if (_typeof(object.to) !== "object") throw TypeError(".exonum.consensus.TransactionsResponse.to: object expected");
                        message.to = $root.exonum.PublicKey.fromObject(object.to);
                    }
                    if (object.transactions) {
                        if (!Array.isArray(object.transactions)) throw TypeError(".exonum.consensus.TransactionsResponse.transactions: array expected");
                        message.transactions = [];
                        for (var i = 0; i < object.transactions.length; ++i) {
                            if (typeof object.transactions[i] === "string") $util.base64.decode(object.transactions[i], message.transactions[i] = $util.newBuffer($util.base64.length(object.transactions[i])), 0);else if (object.transactions[i].length) message.transactions[i] = object.transactions[i];
                        }
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a TransactionsResponse message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.TransactionsResponse
                 * @static
                 * @param {exonum.consensus.TransactionsResponse} message TransactionsResponse
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                TransactionsResponse.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.arrays || options.defaults) object.transactions = [];
                    if (options.defaults) object.to = null;
                    if (message.to != null && message.hasOwnProperty("to")) object.to = $root.exonum.PublicKey.toObject(message.to, options);
                    if (message.transactions && message.transactions.length) {
                        object.transactions = [];
                        for (var j = 0; j < message.transactions.length; ++j) {
                            object.transactions[j] = options.bytes === String ? $util.base64.encode(message.transactions[j], 0, message.transactions[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.transactions[j]) : message.transactions[j];
                        }
                    }
                    return object;
                };

                /**
                 * Converts this TransactionsResponse to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.TransactionsResponse
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                TransactionsResponse.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return TransactionsResponse;
            }();

            consensus.ProposeRequest = function () {

                /**
                 * Properties of a ProposeRequest.
                 * @memberof exonum.consensus
                 * @interface IProposeRequest
                 * @property {exonum.IPublicKey|null} [to] ProposeRequest to
                 * @property {number|Long|null} [height] ProposeRequest height
                 * @property {exonum.IHash|null} [propose_hash] ProposeRequest propose_hash
                 */

                /**
                 * Constructs a new ProposeRequest.
                 * @memberof exonum.consensus
                 * @classdesc Represents a ProposeRequest.
                 * @implements IProposeRequest
                 * @constructor
                 * @param {exonum.consensus.IProposeRequest=} [properties] Properties to set
                 */
                function ProposeRequest(properties) {
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * ProposeRequest to.
                 * @member {exonum.IPublicKey|null|undefined} to
                 * @memberof exonum.consensus.ProposeRequest
                 * @instance
                 */
                ProposeRequest.prototype.to = null;

                /**
                 * ProposeRequest height.
                 * @member {number|Long} height
                 * @memberof exonum.consensus.ProposeRequest
                 * @instance
                 */
                ProposeRequest.prototype.height = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

                /**
                 * ProposeRequest propose_hash.
                 * @member {exonum.IHash|null|undefined} propose_hash
                 * @memberof exonum.consensus.ProposeRequest
                 * @instance
                 */
                ProposeRequest.prototype.propose_hash = null;

                /**
                 * Creates a new ProposeRequest instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.ProposeRequest
                 * @static
                 * @param {exonum.consensus.IProposeRequest=} [properties] Properties to set
                 * @returns {exonum.consensus.ProposeRequest} ProposeRequest instance
                 */
                ProposeRequest.create = function create(properties) {
                    return new ProposeRequest(properties);
                };

                /**
                 * Encodes the specified ProposeRequest message. Does not implicitly {@link exonum.consensus.ProposeRequest.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.ProposeRequest
                 * @static
                 * @param {exonum.consensus.IProposeRequest} message ProposeRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ProposeRequest.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.to != null && message.hasOwnProperty("to")) $root.exonum.PublicKey.encode(message.to, writer.uint32( /* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.height != null && message.hasOwnProperty("height")) writer.uint32( /* id 2, wireType 0 =*/16).uint64(message.height);
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) $root.exonum.Hash.encode(message.propose_hash, writer.uint32( /* id 3, wireType 2 =*/26).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified ProposeRequest message, length delimited. Does not implicitly {@link exonum.consensus.ProposeRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.ProposeRequest
                 * @static
                 * @param {exonum.consensus.IProposeRequest} message ProposeRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ProposeRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a ProposeRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.ProposeRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.ProposeRequest} ProposeRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ProposeRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.ProposeRequest();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.to = $root.exonum.PublicKey.decode(reader, reader.uint32());
                                break;
                            case 2:
                                message.height = reader.uint64();
                                break;
                            case 3:
                                message.propose_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a ProposeRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.ProposeRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.ProposeRequest} ProposeRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ProposeRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a ProposeRequest message.
                 * @function verify
                 * @memberof exonum.consensus.ProposeRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ProposeRequest.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.to != null && message.hasOwnProperty("to")) {
                        var error = $root.exonum.PublicKey.verify(message.to);
                        if (error) return "to." + error;
                    }
                    if (message.height != null && message.hasOwnProperty("height")) if (!$util.isInteger(message.height) && !(message.height && $util.isInteger(message.height.low) && $util.isInteger(message.height.high))) return "height: integer|Long expected";
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) {
                        var error = $root.exonum.Hash.verify(message.propose_hash);
                        if (error) return "propose_hash." + error;
                    }
                    return null;
                };

                /**
                 * Creates a ProposeRequest message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.ProposeRequest
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.ProposeRequest} ProposeRequest
                 */
                ProposeRequest.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.ProposeRequest) return object;
                    var message = new $root.exonum.consensus.ProposeRequest();
                    if (object.to != null) {
                        if (_typeof(object.to) !== "object") throw TypeError(".exonum.consensus.ProposeRequest.to: object expected");
                        message.to = $root.exonum.PublicKey.fromObject(object.to);
                    }
                    if (object.height != null) if ($util.Long) (message.height = $util.Long.fromValue(object.height)).unsigned = true;else if (typeof object.height === "string") message.height = parseInt(object.height, 10);else if (typeof object.height === "number") message.height = object.height;else if (_typeof(object.height) === "object") message.height = new $util.LongBits(object.height.low >>> 0, object.height.high >>> 0).toNumber(true);
                    if (object.propose_hash != null) {
                        if (_typeof(object.propose_hash) !== "object") throw TypeError(".exonum.consensus.ProposeRequest.propose_hash: object expected");
                        message.propose_hash = $root.exonum.Hash.fromObject(object.propose_hash);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a ProposeRequest message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.ProposeRequest
                 * @static
                 * @param {exonum.consensus.ProposeRequest} message ProposeRequest
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ProposeRequest.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.defaults) {
                        object.to = null;
                        if ($util.Long) {
                            var long = new $util.Long(0, 0, true);
                            object.height = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                        } else object.height = options.longs === String ? "0" : 0;
                        object.propose_hash = null;
                    }
                    if (message.to != null && message.hasOwnProperty("to")) object.to = $root.exonum.PublicKey.toObject(message.to, options);
                    if (message.height != null && message.hasOwnProperty("height")) if (typeof message.height === "number") object.height = options.longs === String ? String(message.height) : message.height;else object.height = options.longs === String ? $util.Long.prototype.toString.call(message.height) : options.longs === Number ? new $util.LongBits(message.height.low >>> 0, message.height.high >>> 0).toNumber(true) : message.height;
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) object.propose_hash = $root.exonum.Hash.toObject(message.propose_hash, options);
                    return object;
                };

                /**
                 * Converts this ProposeRequest to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.ProposeRequest
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ProposeRequest.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ProposeRequest;
            }();

            consensus.TransactionsRequest = function () {

                /**
                 * Properties of a TransactionsRequest.
                 * @memberof exonum.consensus
                 * @interface ITransactionsRequest
                 * @property {exonum.IPublicKey|null} [to] TransactionsRequest to
                 * @property {Array.<exonum.IHash>|null} [txs] TransactionsRequest txs
                 */

                /**
                 * Constructs a new TransactionsRequest.
                 * @memberof exonum.consensus
                 * @classdesc Represents a TransactionsRequest.
                 * @implements ITransactionsRequest
                 * @constructor
                 * @param {exonum.consensus.ITransactionsRequest=} [properties] Properties to set
                 */
                function TransactionsRequest(properties) {
                    this.txs = [];
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * TransactionsRequest to.
                 * @member {exonum.IPublicKey|null|undefined} to
                 * @memberof exonum.consensus.TransactionsRequest
                 * @instance
                 */
                TransactionsRequest.prototype.to = null;

                /**
                 * TransactionsRequest txs.
                 * @member {Array.<exonum.IHash>} txs
                 * @memberof exonum.consensus.TransactionsRequest
                 * @instance
                 */
                TransactionsRequest.prototype.txs = $util.emptyArray;

                /**
                 * Creates a new TransactionsRequest instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.TransactionsRequest
                 * @static
                 * @param {exonum.consensus.ITransactionsRequest=} [properties] Properties to set
                 * @returns {exonum.consensus.TransactionsRequest} TransactionsRequest instance
                 */
                TransactionsRequest.create = function create(properties) {
                    return new TransactionsRequest(properties);
                };

                /**
                 * Encodes the specified TransactionsRequest message. Does not implicitly {@link exonum.consensus.TransactionsRequest.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.TransactionsRequest
                 * @static
                 * @param {exonum.consensus.ITransactionsRequest} message TransactionsRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TransactionsRequest.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.to != null && message.hasOwnProperty("to")) $root.exonum.PublicKey.encode(message.to, writer.uint32( /* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.txs != null && message.txs.length) for (var i = 0; i < message.txs.length; ++i) {
                        $root.exonum.Hash.encode(message.txs[i], writer.uint32( /* id 2, wireType 2 =*/18).fork()).ldelim();
                    }return writer;
                };

                /**
                 * Encodes the specified TransactionsRequest message, length delimited. Does not implicitly {@link exonum.consensus.TransactionsRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.TransactionsRequest
                 * @static
                 * @param {exonum.consensus.ITransactionsRequest} message TransactionsRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TransactionsRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a TransactionsRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.TransactionsRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.TransactionsRequest} TransactionsRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TransactionsRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.TransactionsRequest();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.to = $root.exonum.PublicKey.decode(reader, reader.uint32());
                                break;
                            case 2:
                                if (!(message.txs && message.txs.length)) message.txs = [];
                                message.txs.push($root.exonum.Hash.decode(reader, reader.uint32()));
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a TransactionsRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.TransactionsRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.TransactionsRequest} TransactionsRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TransactionsRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a TransactionsRequest message.
                 * @function verify
                 * @memberof exonum.consensus.TransactionsRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                TransactionsRequest.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.to != null && message.hasOwnProperty("to")) {
                        var error = $root.exonum.PublicKey.verify(message.to);
                        if (error) return "to." + error;
                    }
                    if (message.txs != null && message.hasOwnProperty("txs")) {
                        if (!Array.isArray(message.txs)) return "txs: array expected";
                        for (var i = 0; i < message.txs.length; ++i) {
                            var error = $root.exonum.Hash.verify(message.txs[i]);
                            if (error) return "txs." + error;
                        }
                    }
                    return null;
                };

                /**
                 * Creates a TransactionsRequest message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.TransactionsRequest
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.TransactionsRequest} TransactionsRequest
                 */
                TransactionsRequest.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.TransactionsRequest) return object;
                    var message = new $root.exonum.consensus.TransactionsRequest();
                    if (object.to != null) {
                        if (_typeof(object.to) !== "object") throw TypeError(".exonum.consensus.TransactionsRequest.to: object expected");
                        message.to = $root.exonum.PublicKey.fromObject(object.to);
                    }
                    if (object.txs) {
                        if (!Array.isArray(object.txs)) throw TypeError(".exonum.consensus.TransactionsRequest.txs: array expected");
                        message.txs = [];
                        for (var i = 0; i < object.txs.length; ++i) {
                            if (_typeof(object.txs[i]) !== "object") throw TypeError(".exonum.consensus.TransactionsRequest.txs: object expected");
                            message.txs[i] = $root.exonum.Hash.fromObject(object.txs[i]);
                        }
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a TransactionsRequest message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.TransactionsRequest
                 * @static
                 * @param {exonum.consensus.TransactionsRequest} message TransactionsRequest
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                TransactionsRequest.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.arrays || options.defaults) object.txs = [];
                    if (options.defaults) object.to = null;
                    if (message.to != null && message.hasOwnProperty("to")) object.to = $root.exonum.PublicKey.toObject(message.to, options);
                    if (message.txs && message.txs.length) {
                        object.txs = [];
                        for (var j = 0; j < message.txs.length; ++j) {
                            object.txs[j] = $root.exonum.Hash.toObject(message.txs[j], options);
                        }
                    }
                    return object;
                };

                /**
                 * Converts this TransactionsRequest to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.TransactionsRequest
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                TransactionsRequest.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return TransactionsRequest;
            }();

            consensus.PrevotesRequest = function () {

                /**
                 * Properties of a PrevotesRequest.
                 * @memberof exonum.consensus
                 * @interface IPrevotesRequest
                 * @property {exonum.IPublicKey|null} [to] PrevotesRequest to
                 * @property {number|Long|null} [height] PrevotesRequest height
                 * @property {number|null} [round] PrevotesRequest round
                 * @property {exonum.IHash|null} [propose_hash] PrevotesRequest propose_hash
                 * @property {exonum.IBitVec|null} [validators] PrevotesRequest validators
                 */

                /**
                 * Constructs a new PrevotesRequest.
                 * @memberof exonum.consensus
                 * @classdesc Represents a PrevotesRequest.
                 * @implements IPrevotesRequest
                 * @constructor
                 * @param {exonum.consensus.IPrevotesRequest=} [properties] Properties to set
                 */
                function PrevotesRequest(properties) {
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * PrevotesRequest to.
                 * @member {exonum.IPublicKey|null|undefined} to
                 * @memberof exonum.consensus.PrevotesRequest
                 * @instance
                 */
                PrevotesRequest.prototype.to = null;

                /**
                 * PrevotesRequest height.
                 * @member {number|Long} height
                 * @memberof exonum.consensus.PrevotesRequest
                 * @instance
                 */
                PrevotesRequest.prototype.height = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

                /**
                 * PrevotesRequest round.
                 * @member {number} round
                 * @memberof exonum.consensus.PrevotesRequest
                 * @instance
                 */
                PrevotesRequest.prototype.round = 0;

                /**
                 * PrevotesRequest propose_hash.
                 * @member {exonum.IHash|null|undefined} propose_hash
                 * @memberof exonum.consensus.PrevotesRequest
                 * @instance
                 */
                PrevotesRequest.prototype.propose_hash = null;

                /**
                 * PrevotesRequest validators.
                 * @member {exonum.IBitVec|null|undefined} validators
                 * @memberof exonum.consensus.PrevotesRequest
                 * @instance
                 */
                PrevotesRequest.prototype.validators = null;

                /**
                 * Creates a new PrevotesRequest instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.PrevotesRequest
                 * @static
                 * @param {exonum.consensus.IPrevotesRequest=} [properties] Properties to set
                 * @returns {exonum.consensus.PrevotesRequest} PrevotesRequest instance
                 */
                PrevotesRequest.create = function create(properties) {
                    return new PrevotesRequest(properties);
                };

                /**
                 * Encodes the specified PrevotesRequest message. Does not implicitly {@link exonum.consensus.PrevotesRequest.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.PrevotesRequest
                 * @static
                 * @param {exonum.consensus.IPrevotesRequest} message PrevotesRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PrevotesRequest.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.to != null && message.hasOwnProperty("to")) $root.exonum.PublicKey.encode(message.to, writer.uint32( /* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.height != null && message.hasOwnProperty("height")) writer.uint32( /* id 2, wireType 0 =*/16).uint64(message.height);
                    if (message.round != null && message.hasOwnProperty("round")) writer.uint32( /* id 3, wireType 0 =*/24).uint32(message.round);
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) $root.exonum.Hash.encode(message.propose_hash, writer.uint32( /* id 4, wireType 2 =*/34).fork()).ldelim();
                    if (message.validators != null && message.hasOwnProperty("validators")) $root.exonum.BitVec.encode(message.validators, writer.uint32( /* id 5, wireType 2 =*/42).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified PrevotesRequest message, length delimited. Does not implicitly {@link exonum.consensus.PrevotesRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.PrevotesRequest
                 * @static
                 * @param {exonum.consensus.IPrevotesRequest} message PrevotesRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PrevotesRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a PrevotesRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.PrevotesRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.PrevotesRequest} PrevotesRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PrevotesRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.PrevotesRequest();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.to = $root.exonum.PublicKey.decode(reader, reader.uint32());
                                break;
                            case 2:
                                message.height = reader.uint64();
                                break;
                            case 3:
                                message.round = reader.uint32();
                                break;
                            case 4:
                                message.propose_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                                break;
                            case 5:
                                message.validators = $root.exonum.BitVec.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a PrevotesRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.PrevotesRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.PrevotesRequest} PrevotesRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PrevotesRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a PrevotesRequest message.
                 * @function verify
                 * @memberof exonum.consensus.PrevotesRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PrevotesRequest.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.to != null && message.hasOwnProperty("to")) {
                        var error = $root.exonum.PublicKey.verify(message.to);
                        if (error) return "to." + error;
                    }
                    if (message.height != null && message.hasOwnProperty("height")) if (!$util.isInteger(message.height) && !(message.height && $util.isInteger(message.height.low) && $util.isInteger(message.height.high))) return "height: integer|Long expected";
                    if (message.round != null && message.hasOwnProperty("round")) if (!$util.isInteger(message.round)) return "round: integer expected";
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) {
                        var error = $root.exonum.Hash.verify(message.propose_hash);
                        if (error) return "propose_hash." + error;
                    }
                    if (message.validators != null && message.hasOwnProperty("validators")) {
                        var error = $root.exonum.BitVec.verify(message.validators);
                        if (error) return "validators." + error;
                    }
                    return null;
                };

                /**
                 * Creates a PrevotesRequest message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.PrevotesRequest
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.PrevotesRequest} PrevotesRequest
                 */
                PrevotesRequest.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.PrevotesRequest) return object;
                    var message = new $root.exonum.consensus.PrevotesRequest();
                    if (object.to != null) {
                        if (_typeof(object.to) !== "object") throw TypeError(".exonum.consensus.PrevotesRequest.to: object expected");
                        message.to = $root.exonum.PublicKey.fromObject(object.to);
                    }
                    if (object.height != null) if ($util.Long) (message.height = $util.Long.fromValue(object.height)).unsigned = true;else if (typeof object.height === "string") message.height = parseInt(object.height, 10);else if (typeof object.height === "number") message.height = object.height;else if (_typeof(object.height) === "object") message.height = new $util.LongBits(object.height.low >>> 0, object.height.high >>> 0).toNumber(true);
                    if (object.round != null) message.round = object.round >>> 0;
                    if (object.propose_hash != null) {
                        if (_typeof(object.propose_hash) !== "object") throw TypeError(".exonum.consensus.PrevotesRequest.propose_hash: object expected");
                        message.propose_hash = $root.exonum.Hash.fromObject(object.propose_hash);
                    }
                    if (object.validators != null) {
                        if (_typeof(object.validators) !== "object") throw TypeError(".exonum.consensus.PrevotesRequest.validators: object expected");
                        message.validators = $root.exonum.BitVec.fromObject(object.validators);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a PrevotesRequest message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.PrevotesRequest
                 * @static
                 * @param {exonum.consensus.PrevotesRequest} message PrevotesRequest
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                PrevotesRequest.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.defaults) {
                        object.to = null;
                        if ($util.Long) {
                            var long = new $util.Long(0, 0, true);
                            object.height = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                        } else object.height = options.longs === String ? "0" : 0;
                        object.round = 0;
                        object.propose_hash = null;
                        object.validators = null;
                    }
                    if (message.to != null && message.hasOwnProperty("to")) object.to = $root.exonum.PublicKey.toObject(message.to, options);
                    if (message.height != null && message.hasOwnProperty("height")) if (typeof message.height === "number") object.height = options.longs === String ? String(message.height) : message.height;else object.height = options.longs === String ? $util.Long.prototype.toString.call(message.height) : options.longs === Number ? new $util.LongBits(message.height.low >>> 0, message.height.high >>> 0).toNumber(true) : message.height;
                    if (message.round != null && message.hasOwnProperty("round")) object.round = message.round;
                    if (message.propose_hash != null && message.hasOwnProperty("propose_hash")) object.propose_hash = $root.exonum.Hash.toObject(message.propose_hash, options);
                    if (message.validators != null && message.hasOwnProperty("validators")) object.validators = $root.exonum.BitVec.toObject(message.validators, options);
                    return object;
                };

                /**
                 * Converts this PrevotesRequest to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.PrevotesRequest
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                PrevotesRequest.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return PrevotesRequest;
            }();

            consensus.PeersRequest = function () {

                /**
                 * Properties of a PeersRequest.
                 * @memberof exonum.consensus
                 * @interface IPeersRequest
                 * @property {exonum.IPublicKey|null} [to] PeersRequest to
                 */

                /**
                 * Constructs a new PeersRequest.
                 * @memberof exonum.consensus
                 * @classdesc Represents a PeersRequest.
                 * @implements IPeersRequest
                 * @constructor
                 * @param {exonum.consensus.IPeersRequest=} [properties] Properties to set
                 */
                function PeersRequest(properties) {
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * PeersRequest to.
                 * @member {exonum.IPublicKey|null|undefined} to
                 * @memberof exonum.consensus.PeersRequest
                 * @instance
                 */
                PeersRequest.prototype.to = null;

                /**
                 * Creates a new PeersRequest instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.PeersRequest
                 * @static
                 * @param {exonum.consensus.IPeersRequest=} [properties] Properties to set
                 * @returns {exonum.consensus.PeersRequest} PeersRequest instance
                 */
                PeersRequest.create = function create(properties) {
                    return new PeersRequest(properties);
                };

                /**
                 * Encodes the specified PeersRequest message. Does not implicitly {@link exonum.consensus.PeersRequest.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.PeersRequest
                 * @static
                 * @param {exonum.consensus.IPeersRequest} message PeersRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PeersRequest.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.to != null && message.hasOwnProperty("to")) $root.exonum.PublicKey.encode(message.to, writer.uint32( /* id 1, wireType 2 =*/10).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified PeersRequest message, length delimited. Does not implicitly {@link exonum.consensus.PeersRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.PeersRequest
                 * @static
                 * @param {exonum.consensus.IPeersRequest} message PeersRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PeersRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a PeersRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.PeersRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.PeersRequest} PeersRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PeersRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.PeersRequest();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.to = $root.exonum.PublicKey.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a PeersRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.PeersRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.PeersRequest} PeersRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PeersRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a PeersRequest message.
                 * @function verify
                 * @memberof exonum.consensus.PeersRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PeersRequest.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.to != null && message.hasOwnProperty("to")) {
                        var error = $root.exonum.PublicKey.verify(message.to);
                        if (error) return "to." + error;
                    }
                    return null;
                };

                /**
                 * Creates a PeersRequest message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.PeersRequest
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.PeersRequest} PeersRequest
                 */
                PeersRequest.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.PeersRequest) return object;
                    var message = new $root.exonum.consensus.PeersRequest();
                    if (object.to != null) {
                        if (_typeof(object.to) !== "object") throw TypeError(".exonum.consensus.PeersRequest.to: object expected");
                        message.to = $root.exonum.PublicKey.fromObject(object.to);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a PeersRequest message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.PeersRequest
                 * @static
                 * @param {exonum.consensus.PeersRequest} message PeersRequest
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                PeersRequest.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.defaults) object.to = null;
                    if (message.to != null && message.hasOwnProperty("to")) object.to = $root.exonum.PublicKey.toObject(message.to, options);
                    return object;
                };

                /**
                 * Converts this PeersRequest to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.PeersRequest
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                PeersRequest.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return PeersRequest;
            }();

            consensus.BlockRequest = function () {

                /**
                 * Properties of a BlockRequest.
                 * @memberof exonum.consensus
                 * @interface IBlockRequest
                 * @property {exonum.IPublicKey|null} [to] BlockRequest to
                 * @property {number|Long|null} [height] BlockRequest height
                 */

                /**
                 * Constructs a new BlockRequest.
                 * @memberof exonum.consensus
                 * @classdesc Represents a BlockRequest.
                 * @implements IBlockRequest
                 * @constructor
                 * @param {exonum.consensus.IBlockRequest=} [properties] Properties to set
                 */
                function BlockRequest(properties) {
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * BlockRequest to.
                 * @member {exonum.IPublicKey|null|undefined} to
                 * @memberof exonum.consensus.BlockRequest
                 * @instance
                 */
                BlockRequest.prototype.to = null;

                /**
                 * BlockRequest height.
                 * @member {number|Long} height
                 * @memberof exonum.consensus.BlockRequest
                 * @instance
                 */
                BlockRequest.prototype.height = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

                /**
                 * Creates a new BlockRequest instance using the specified properties.
                 * @function create
                 * @memberof exonum.consensus.BlockRequest
                 * @static
                 * @param {exonum.consensus.IBlockRequest=} [properties] Properties to set
                 * @returns {exonum.consensus.BlockRequest} BlockRequest instance
                 */
                BlockRequest.create = function create(properties) {
                    return new BlockRequest(properties);
                };

                /**
                 * Encodes the specified BlockRequest message. Does not implicitly {@link exonum.consensus.BlockRequest.verify|verify} messages.
                 * @function encode
                 * @memberof exonum.consensus.BlockRequest
                 * @static
                 * @param {exonum.consensus.IBlockRequest} message BlockRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                BlockRequest.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.to != null && message.hasOwnProperty("to")) $root.exonum.PublicKey.encode(message.to, writer.uint32( /* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.height != null && message.hasOwnProperty("height")) writer.uint32( /* id 2, wireType 0 =*/16).uint64(message.height);
                    return writer;
                };

                /**
                 * Encodes the specified BlockRequest message, length delimited. Does not implicitly {@link exonum.consensus.BlockRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof exonum.consensus.BlockRequest
                 * @static
                 * @param {exonum.consensus.IBlockRequest} message BlockRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                BlockRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a BlockRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof exonum.consensus.BlockRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {exonum.consensus.BlockRequest} BlockRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                BlockRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.exonum.consensus.BlockRequest();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.to = $root.exonum.PublicKey.decode(reader, reader.uint32());
                                break;
                            case 2:
                                message.height = reader.uint64();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a BlockRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof exonum.consensus.BlockRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {exonum.consensus.BlockRequest} BlockRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                BlockRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a BlockRequest message.
                 * @function verify
                 * @memberof exonum.consensus.BlockRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                BlockRequest.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.to != null && message.hasOwnProperty("to")) {
                        var error = $root.exonum.PublicKey.verify(message.to);
                        if (error) return "to." + error;
                    }
                    if (message.height != null && message.hasOwnProperty("height")) if (!$util.isInteger(message.height) && !(message.height && $util.isInteger(message.height.low) && $util.isInteger(message.height.high))) return "height: integer|Long expected";
                    return null;
                };

                /**
                 * Creates a BlockRequest message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof exonum.consensus.BlockRequest
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {exonum.consensus.BlockRequest} BlockRequest
                 */
                BlockRequest.fromObject = function fromObject(object) {
                    if (object instanceof $root.exonum.consensus.BlockRequest) return object;
                    var message = new $root.exonum.consensus.BlockRequest();
                    if (object.to != null) {
                        if (_typeof(object.to) !== "object") throw TypeError(".exonum.consensus.BlockRequest.to: object expected");
                        message.to = $root.exonum.PublicKey.fromObject(object.to);
                    }
                    if (object.height != null) if ($util.Long) (message.height = $util.Long.fromValue(object.height)).unsigned = true;else if (typeof object.height === "string") message.height = parseInt(object.height, 10);else if (typeof object.height === "number") message.height = object.height;else if (_typeof(object.height) === "object") message.height = new $util.LongBits(object.height.low >>> 0, object.height.high >>> 0).toNumber(true);
                    return message;
                };

                /**
                 * Creates a plain object from a BlockRequest message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof exonum.consensus.BlockRequest
                 * @static
                 * @param {exonum.consensus.BlockRequest} message BlockRequest
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                BlockRequest.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.defaults) {
                        object.to = null;
                        if ($util.Long) {
                            var long = new $util.Long(0, 0, true);
                            object.height = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                        } else object.height = options.longs === String ? "0" : 0;
                    }
                    if (message.to != null && message.hasOwnProperty("to")) object.to = $root.exonum.PublicKey.toObject(message.to, options);
                    if (message.height != null && message.hasOwnProperty("height")) if (typeof message.height === "number") object.height = options.longs === String ? String(message.height) : message.height;else object.height = options.longs === String ? $util.Long.prototype.toString.call(message.height) : options.longs === Number ? new $util.LongBits(message.height.low >>> 0, message.height.high >>> 0).toNumber(true) : message.height;
                    return object;
                };

                /**
                 * Converts this BlockRequest to JSON.
                 * @function toJSON
                 * @memberof exonum.consensus.BlockRequest
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                BlockRequest.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return BlockRequest;
            }();

            return consensus;
        }();

        exonum.Hash = function () {

            /**
             * Properties of a Hash.
             * @memberof exonum
             * @interface IHash
             * @property {Uint8Array|null} [data] Hash data
             */

            /**
             * Constructs a new Hash.
             * @memberof exonum
             * @classdesc Represents a Hash.
             * @implements IHash
             * @constructor
             * @param {exonum.IHash=} [properties] Properties to set
             */
            function Hash(properties) {
                if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                    if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                }
            }

            /**
             * Hash data.
             * @member {Uint8Array} data
             * @memberof exonum.Hash
             * @instance
             */
            Hash.prototype.data = $util.newBuffer([]);

            /**
             * Creates a new Hash instance using the specified properties.
             * @function create
             * @memberof exonum.Hash
             * @static
             * @param {exonum.IHash=} [properties] Properties to set
             * @returns {exonum.Hash} Hash instance
             */
            Hash.create = function create(properties) {
                return new Hash(properties);
            };

            /**
             * Encodes the specified Hash message. Does not implicitly {@link exonum.Hash.verify|verify} messages.
             * @function encode
             * @memberof exonum.Hash
             * @static
             * @param {exonum.IHash} message Hash message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Hash.encode = function encode(message, writer) {
                if (!writer) writer = $Writer.create();
                if (message.data != null && message.hasOwnProperty("data")) writer.uint32( /* id 1, wireType 2 =*/10).bytes(message.data);
                return writer;
            };

            /**
             * Encodes the specified Hash message, length delimited. Does not implicitly {@link exonum.Hash.verify|verify} messages.
             * @function encodeDelimited
             * @memberof exonum.Hash
             * @static
             * @param {exonum.IHash} message Hash message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Hash.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Hash message from the specified reader or buffer.
             * @function decode
             * @memberof exonum.Hash
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {exonum.Hash} Hash
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Hash.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length,
                    message = new $root.exonum.Hash();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            message.data = reader.bytes();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Hash message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof exonum.Hash
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {exonum.Hash} Hash
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Hash.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Hash message.
             * @function verify
             * @memberof exonum.Hash
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Hash.verify = function verify(message) {
                if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                if (message.data != null && message.hasOwnProperty("data")) if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data))) return "data: buffer expected";
                return null;
            };

            /**
             * Creates a Hash message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof exonum.Hash
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {exonum.Hash} Hash
             */
            Hash.fromObject = function fromObject(object) {
                if (object instanceof $root.exonum.Hash) return object;
                var message = new $root.exonum.Hash();
                if (object.data != null) if (typeof object.data === "string") $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);else if (object.data.length) message.data = object.data;
                return message;
            };

            /**
             * Creates a plain object from a Hash message. Also converts values to other types if specified.
             * @function toObject
             * @memberof exonum.Hash
             * @static
             * @param {exonum.Hash} message Hash
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Hash.toObject = function toObject(message, options) {
                if (!options) options = {};
                var object = {};
                if (options.defaults) if (options.bytes === String) object.data = "";else {
                    object.data = [];
                    if (options.bytes !== Array) object.data = $util.newBuffer(object.data);
                }
                if (message.data != null && message.hasOwnProperty("data")) object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
                return object;
            };

            /**
             * Converts this Hash to JSON.
             * @function toJSON
             * @memberof exonum.Hash
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Hash.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return Hash;
        }();

        exonum.PublicKey = function () {

            /**
             * Properties of a PublicKey.
             * @memberof exonum
             * @interface IPublicKey
             * @property {Uint8Array|null} [data] PublicKey data
             */

            /**
             * Constructs a new PublicKey.
             * @memberof exonum
             * @classdesc Represents a PublicKey.
             * @implements IPublicKey
             * @constructor
             * @param {exonum.IPublicKey=} [properties] Properties to set
             */
            function PublicKey(properties) {
                if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                    if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                }
            }

            /**
             * PublicKey data.
             * @member {Uint8Array} data
             * @memberof exonum.PublicKey
             * @instance
             */
            PublicKey.prototype.data = $util.newBuffer([]);

            /**
             * Creates a new PublicKey instance using the specified properties.
             * @function create
             * @memberof exonum.PublicKey
             * @static
             * @param {exonum.IPublicKey=} [properties] Properties to set
             * @returns {exonum.PublicKey} PublicKey instance
             */
            PublicKey.create = function create(properties) {
                return new PublicKey(properties);
            };

            /**
             * Encodes the specified PublicKey message. Does not implicitly {@link exonum.PublicKey.verify|verify} messages.
             * @function encode
             * @memberof exonum.PublicKey
             * @static
             * @param {exonum.IPublicKey} message PublicKey message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PublicKey.encode = function encode(message, writer) {
                if (!writer) writer = $Writer.create();
                if (message.data != null && message.hasOwnProperty("data")) writer.uint32( /* id 1, wireType 2 =*/10).bytes(message.data);
                return writer;
            };

            /**
             * Encodes the specified PublicKey message, length delimited. Does not implicitly {@link exonum.PublicKey.verify|verify} messages.
             * @function encodeDelimited
             * @memberof exonum.PublicKey
             * @static
             * @param {exonum.IPublicKey} message PublicKey message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PublicKey.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a PublicKey message from the specified reader or buffer.
             * @function decode
             * @memberof exonum.PublicKey
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {exonum.PublicKey} PublicKey
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PublicKey.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length,
                    message = new $root.exonum.PublicKey();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            message.data = reader.bytes();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return message;
            };

            /**
             * Decodes a PublicKey message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof exonum.PublicKey
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {exonum.PublicKey} PublicKey
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PublicKey.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a PublicKey message.
             * @function verify
             * @memberof exonum.PublicKey
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            PublicKey.verify = function verify(message) {
                if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                if (message.data != null && message.hasOwnProperty("data")) if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data))) return "data: buffer expected";
                return null;
            };

            /**
             * Creates a PublicKey message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof exonum.PublicKey
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {exonum.PublicKey} PublicKey
             */
            PublicKey.fromObject = function fromObject(object) {
                if (object instanceof $root.exonum.PublicKey) return object;
                var message = new $root.exonum.PublicKey();
                if (object.data != null) if (typeof object.data === "string") $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);else if (object.data.length) message.data = object.data;
                return message;
            };

            /**
             * Creates a plain object from a PublicKey message. Also converts values to other types if specified.
             * @function toObject
             * @memberof exonum.PublicKey
             * @static
             * @param {exonum.PublicKey} message PublicKey
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PublicKey.toObject = function toObject(message, options) {
                if (!options) options = {};
                var object = {};
                if (options.defaults) if (options.bytes === String) object.data = "";else {
                    object.data = [];
                    if (options.bytes !== Array) object.data = $util.newBuffer(object.data);
                }
                if (message.data != null && message.hasOwnProperty("data")) object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
                return object;
            };

            /**
             * Converts this PublicKey to JSON.
             * @function toJSON
             * @memberof exonum.PublicKey
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            PublicKey.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return PublicKey;
        }();

        exonum.BitVec = function () {

            /**
             * Properties of a BitVec.
             * @memberof exonum
             * @interface IBitVec
             * @property {Uint8Array|null} [data] BitVec data
             * @property {number|Long|null} [len] BitVec len
             */

            /**
             * Constructs a new BitVec.
             * @memberof exonum
             * @classdesc Represents a BitVec.
             * @implements IBitVec
             * @constructor
             * @param {exonum.IBitVec=} [properties] Properties to set
             */
            function BitVec(properties) {
                if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                    if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                }
            }

            /**
             * BitVec data.
             * @member {Uint8Array} data
             * @memberof exonum.BitVec
             * @instance
             */
            BitVec.prototype.data = $util.newBuffer([]);

            /**
             * BitVec len.
             * @member {number|Long} len
             * @memberof exonum.BitVec
             * @instance
             */
            BitVec.prototype.len = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

            /**
             * Creates a new BitVec instance using the specified properties.
             * @function create
             * @memberof exonum.BitVec
             * @static
             * @param {exonum.IBitVec=} [properties] Properties to set
             * @returns {exonum.BitVec} BitVec instance
             */
            BitVec.create = function create(properties) {
                return new BitVec(properties);
            };

            /**
             * Encodes the specified BitVec message. Does not implicitly {@link exonum.BitVec.verify|verify} messages.
             * @function encode
             * @memberof exonum.BitVec
             * @static
             * @param {exonum.IBitVec} message BitVec message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BitVec.encode = function encode(message, writer) {
                if (!writer) writer = $Writer.create();
                if (message.data != null && message.hasOwnProperty("data")) writer.uint32( /* id 1, wireType 2 =*/10).bytes(message.data);
                if (message.len != null && message.hasOwnProperty("len")) writer.uint32( /* id 2, wireType 0 =*/16).uint64(message.len);
                return writer;
            };

            /**
             * Encodes the specified BitVec message, length delimited. Does not implicitly {@link exonum.BitVec.verify|verify} messages.
             * @function encodeDelimited
             * @memberof exonum.BitVec
             * @static
             * @param {exonum.IBitVec} message BitVec message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BitVec.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a BitVec message from the specified reader or buffer.
             * @function decode
             * @memberof exonum.BitVec
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {exonum.BitVec} BitVec
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BitVec.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length,
                    message = new $root.exonum.BitVec();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            message.data = reader.bytes();
                            break;
                        case 2:
                            message.len = reader.uint64();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return message;
            };

            /**
             * Decodes a BitVec message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof exonum.BitVec
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {exonum.BitVec} BitVec
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BitVec.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a BitVec message.
             * @function verify
             * @memberof exonum.BitVec
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            BitVec.verify = function verify(message) {
                if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                if (message.data != null && message.hasOwnProperty("data")) if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data))) return "data: buffer expected";
                if (message.len != null && message.hasOwnProperty("len")) if (!$util.isInteger(message.len) && !(message.len && $util.isInteger(message.len.low) && $util.isInteger(message.len.high))) return "len: integer|Long expected";
                return null;
            };

            /**
             * Creates a BitVec message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof exonum.BitVec
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {exonum.BitVec} BitVec
             */
            BitVec.fromObject = function fromObject(object) {
                if (object instanceof $root.exonum.BitVec) return object;
                var message = new $root.exonum.BitVec();
                if (object.data != null) if (typeof object.data === "string") $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);else if (object.data.length) message.data = object.data;
                if (object.len != null) if ($util.Long) (message.len = $util.Long.fromValue(object.len)).unsigned = true;else if (typeof object.len === "string") message.len = parseInt(object.len, 10);else if (typeof object.len === "number") message.len = object.len;else if (_typeof(object.len) === "object") message.len = new $util.LongBits(object.len.low >>> 0, object.len.high >>> 0).toNumber(true);
                return message;
            };

            /**
             * Creates a plain object from a BitVec message. Also converts values to other types if specified.
             * @function toObject
             * @memberof exonum.BitVec
             * @static
             * @param {exonum.BitVec} message BitVec
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            BitVec.toObject = function toObject(message, options) {
                if (!options) options = {};
                var object = {};
                if (options.defaults) {
                    if (options.bytes === String) object.data = "";else {
                        object.data = [];
                        if (options.bytes !== Array) object.data = $util.newBuffer(object.data);
                    }
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, true);
                        object.len = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                    } else object.len = options.longs === String ? "0" : 0;
                }
                if (message.data != null && message.hasOwnProperty("data")) object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
                if (message.len != null && message.hasOwnProperty("len")) if (typeof message.len === "number") object.len = options.longs === String ? String(message.len) : message.len;else object.len = options.longs === String ? $util.Long.prototype.toString.call(message.len) : options.longs === Number ? new $util.LongBits(message.len.low >>> 0, message.len.high >>> 0).toNumber(true) : message.len;
                return object;
            };

            /**
             * Converts this BitVec to JSON.
             * @function toJSON
             * @memberof exonum.BitVec
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            BitVec.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return BitVec;
        }();

        exonum.Block = function () {

            /**
             * Properties of a Block.
             * @memberof exonum
             * @interface IBlock
             * @property {number|null} [proposer_id] Block proposer_id
             * @property {number|Long|null} [height] Block height
             * @property {number|null} [tx_count] Block tx_count
             * @property {exonum.IHash|null} [prev_hash] Block prev_hash
             * @property {exonum.IHash|null} [tx_hash] Block tx_hash
             * @property {exonum.IHash|null} [state_hash] Block state_hash
             */

            /**
             * Constructs a new Block.
             * @memberof exonum
             * @classdesc Represents a Block.
             * @implements IBlock
             * @constructor
             * @param {exonum.IBlock=} [properties] Properties to set
             */
            function Block(properties) {
                if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                    if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                }
            }

            /**
             * Block proposer_id.
             * @member {number} proposer_id
             * @memberof exonum.Block
             * @instance
             */
            Block.prototype.proposer_id = 0;

            /**
             * Block height.
             * @member {number|Long} height
             * @memberof exonum.Block
             * @instance
             */
            Block.prototype.height = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

            /**
             * Block tx_count.
             * @member {number} tx_count
             * @memberof exonum.Block
             * @instance
             */
            Block.prototype.tx_count = 0;

            /**
             * Block prev_hash.
             * @member {exonum.IHash|null|undefined} prev_hash
             * @memberof exonum.Block
             * @instance
             */
            Block.prototype.prev_hash = null;

            /**
             * Block tx_hash.
             * @member {exonum.IHash|null|undefined} tx_hash
             * @memberof exonum.Block
             * @instance
             */
            Block.prototype.tx_hash = null;

            /**
             * Block state_hash.
             * @member {exonum.IHash|null|undefined} state_hash
             * @memberof exonum.Block
             * @instance
             */
            Block.prototype.state_hash = null;

            /**
             * Creates a new Block instance using the specified properties.
             * @function create
             * @memberof exonum.Block
             * @static
             * @param {exonum.IBlock=} [properties] Properties to set
             * @returns {exonum.Block} Block instance
             */
            Block.create = function create(properties) {
                return new Block(properties);
            };

            /**
             * Encodes the specified Block message. Does not implicitly {@link exonum.Block.verify|verify} messages.
             * @function encode
             * @memberof exonum.Block
             * @static
             * @param {exonum.IBlock} message Block message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Block.encode = function encode(message, writer) {
                if (!writer) writer = $Writer.create();
                if (message.proposer_id != null && message.hasOwnProperty("proposer_id")) writer.uint32( /* id 1, wireType 0 =*/8).uint32(message.proposer_id);
                if (message.height != null && message.hasOwnProperty("height")) writer.uint32( /* id 2, wireType 0 =*/16).uint64(message.height);
                if (message.tx_count != null && message.hasOwnProperty("tx_count")) writer.uint32( /* id 3, wireType 0 =*/24).uint32(message.tx_count);
                if (message.prev_hash != null && message.hasOwnProperty("prev_hash")) $root.exonum.Hash.encode(message.prev_hash, writer.uint32( /* id 4, wireType 2 =*/34).fork()).ldelim();
                if (message.tx_hash != null && message.hasOwnProperty("tx_hash")) $root.exonum.Hash.encode(message.tx_hash, writer.uint32( /* id 5, wireType 2 =*/42).fork()).ldelim();
                if (message.state_hash != null && message.hasOwnProperty("state_hash")) $root.exonum.Hash.encode(message.state_hash, writer.uint32( /* id 6, wireType 2 =*/50).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified Block message, length delimited. Does not implicitly {@link exonum.Block.verify|verify} messages.
             * @function encodeDelimited
             * @memberof exonum.Block
             * @static
             * @param {exonum.IBlock} message Block message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Block.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Block message from the specified reader or buffer.
             * @function decode
             * @memberof exonum.Block
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {exonum.Block} Block
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Block.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length,
                    message = new $root.exonum.Block();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            message.proposer_id = reader.uint32();
                            break;
                        case 2:
                            message.height = reader.uint64();
                            break;
                        case 3:
                            message.tx_count = reader.uint32();
                            break;
                        case 4:
                            message.prev_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                            break;
                        case 5:
                            message.tx_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                            break;
                        case 6:
                            message.state_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Block message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof exonum.Block
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {exonum.Block} Block
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Block.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Block message.
             * @function verify
             * @memberof exonum.Block
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Block.verify = function verify(message) {
                if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                if (message.proposer_id != null && message.hasOwnProperty("proposer_id")) if (!$util.isInteger(message.proposer_id)) return "proposer_id: integer expected";
                if (message.height != null && message.hasOwnProperty("height")) if (!$util.isInteger(message.height) && !(message.height && $util.isInteger(message.height.low) && $util.isInteger(message.height.high))) return "height: integer|Long expected";
                if (message.tx_count != null && message.hasOwnProperty("tx_count")) if (!$util.isInteger(message.tx_count)) return "tx_count: integer expected";
                if (message.prev_hash != null && message.hasOwnProperty("prev_hash")) {
                    var error = $root.exonum.Hash.verify(message.prev_hash);
                    if (error) return "prev_hash." + error;
                }
                if (message.tx_hash != null && message.hasOwnProperty("tx_hash")) {
                    var error = $root.exonum.Hash.verify(message.tx_hash);
                    if (error) return "tx_hash." + error;
                }
                if (message.state_hash != null && message.hasOwnProperty("state_hash")) {
                    var error = $root.exonum.Hash.verify(message.state_hash);
                    if (error) return "state_hash." + error;
                }
                return null;
            };

            /**
             * Creates a Block message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof exonum.Block
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {exonum.Block} Block
             */
            Block.fromObject = function fromObject(object) {
                if (object instanceof $root.exonum.Block) return object;
                var message = new $root.exonum.Block();
                if (object.proposer_id != null) message.proposer_id = object.proposer_id >>> 0;
                if (object.height != null) if ($util.Long) (message.height = $util.Long.fromValue(object.height)).unsigned = true;else if (typeof object.height === "string") message.height = parseInt(object.height, 10);else if (typeof object.height === "number") message.height = object.height;else if (_typeof(object.height) === "object") message.height = new $util.LongBits(object.height.low >>> 0, object.height.high >>> 0).toNumber(true);
                if (object.tx_count != null) message.tx_count = object.tx_count >>> 0;
                if (object.prev_hash != null) {
                    if (_typeof(object.prev_hash) !== "object") throw TypeError(".exonum.Block.prev_hash: object expected");
                    message.prev_hash = $root.exonum.Hash.fromObject(object.prev_hash);
                }
                if (object.tx_hash != null) {
                    if (_typeof(object.tx_hash) !== "object") throw TypeError(".exonum.Block.tx_hash: object expected");
                    message.tx_hash = $root.exonum.Hash.fromObject(object.tx_hash);
                }
                if (object.state_hash != null) {
                    if (_typeof(object.state_hash) !== "object") throw TypeError(".exonum.Block.state_hash: object expected");
                    message.state_hash = $root.exonum.Hash.fromObject(object.state_hash);
                }
                return message;
            };

            /**
             * Creates a plain object from a Block message. Also converts values to other types if specified.
             * @function toObject
             * @memberof exonum.Block
             * @static
             * @param {exonum.Block} message Block
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Block.toObject = function toObject(message, options) {
                if (!options) options = {};
                var object = {};
                if (options.defaults) {
                    object.proposer_id = 0;
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, true);
                        object.height = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                    } else object.height = options.longs === String ? "0" : 0;
                    object.tx_count = 0;
                    object.prev_hash = null;
                    object.tx_hash = null;
                    object.state_hash = null;
                }
                if (message.proposer_id != null && message.hasOwnProperty("proposer_id")) object.proposer_id = message.proposer_id;
                if (message.height != null && message.hasOwnProperty("height")) if (typeof message.height === "number") object.height = options.longs === String ? String(message.height) : message.height;else object.height = options.longs === String ? $util.Long.prototype.toString.call(message.height) : options.longs === Number ? new $util.LongBits(message.height.low >>> 0, message.height.high >>> 0).toNumber(true) : message.height;
                if (message.tx_count != null && message.hasOwnProperty("tx_count")) object.tx_count = message.tx_count;
                if (message.prev_hash != null && message.hasOwnProperty("prev_hash")) object.prev_hash = $root.exonum.Hash.toObject(message.prev_hash, options);
                if (message.tx_hash != null && message.hasOwnProperty("tx_hash")) object.tx_hash = $root.exonum.Hash.toObject(message.tx_hash, options);
                if (message.state_hash != null && message.hasOwnProperty("state_hash")) object.state_hash = $root.exonum.Hash.toObject(message.state_hash, options);
                return object;
            };

            /**
             * Converts this Block to JSON.
             * @function toJSON
             * @memberof exonum.Block
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Block.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return Block;
        }();

        exonum.ConfigReference = function () {

            /**
             * Properties of a ConfigReference.
             * @memberof exonum
             * @interface IConfigReference
             * @property {number|Long|null} [actual_from] ConfigReference actual_from
             * @property {exonum.IHash|null} [cfg_hash] ConfigReference cfg_hash
             */

            /**
             * Constructs a new ConfigReference.
             * @memberof exonum
             * @classdesc Represents a ConfigReference.
             * @implements IConfigReference
             * @constructor
             * @param {exonum.IConfigReference=} [properties] Properties to set
             */
            function ConfigReference(properties) {
                if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                    if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                }
            }

            /**
             * ConfigReference actual_from.
             * @member {number|Long} actual_from
             * @memberof exonum.ConfigReference
             * @instance
             */
            ConfigReference.prototype.actual_from = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

            /**
             * ConfigReference cfg_hash.
             * @member {exonum.IHash|null|undefined} cfg_hash
             * @memberof exonum.ConfigReference
             * @instance
             */
            ConfigReference.prototype.cfg_hash = null;

            /**
             * Creates a new ConfigReference instance using the specified properties.
             * @function create
             * @memberof exonum.ConfigReference
             * @static
             * @param {exonum.IConfigReference=} [properties] Properties to set
             * @returns {exonum.ConfigReference} ConfigReference instance
             */
            ConfigReference.create = function create(properties) {
                return new ConfigReference(properties);
            };

            /**
             * Encodes the specified ConfigReference message. Does not implicitly {@link exonum.ConfigReference.verify|verify} messages.
             * @function encode
             * @memberof exonum.ConfigReference
             * @static
             * @param {exonum.IConfigReference} message ConfigReference message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ConfigReference.encode = function encode(message, writer) {
                if (!writer) writer = $Writer.create();
                if (message.actual_from != null && message.hasOwnProperty("actual_from")) writer.uint32( /* id 1, wireType 0 =*/8).uint64(message.actual_from);
                if (message.cfg_hash != null && message.hasOwnProperty("cfg_hash")) $root.exonum.Hash.encode(message.cfg_hash, writer.uint32( /* id 2, wireType 2 =*/18).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ConfigReference message, length delimited. Does not implicitly {@link exonum.ConfigReference.verify|verify} messages.
             * @function encodeDelimited
             * @memberof exonum.ConfigReference
             * @static
             * @param {exonum.IConfigReference} message ConfigReference message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ConfigReference.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ConfigReference message from the specified reader or buffer.
             * @function decode
             * @memberof exonum.ConfigReference
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {exonum.ConfigReference} ConfigReference
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ConfigReference.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length,
                    message = new $root.exonum.ConfigReference();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            message.actual_from = reader.uint64();
                            break;
                        case 2:
                            message.cfg_hash = $root.exonum.Hash.decode(reader, reader.uint32());
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ConfigReference message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof exonum.ConfigReference
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {exonum.ConfigReference} ConfigReference
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ConfigReference.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ConfigReference message.
             * @function verify
             * @memberof exonum.ConfigReference
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ConfigReference.verify = function verify(message) {
                if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                if (message.actual_from != null && message.hasOwnProperty("actual_from")) if (!$util.isInteger(message.actual_from) && !(message.actual_from && $util.isInteger(message.actual_from.low) && $util.isInteger(message.actual_from.high))) return "actual_from: integer|Long expected";
                if (message.cfg_hash != null && message.hasOwnProperty("cfg_hash")) {
                    var error = $root.exonum.Hash.verify(message.cfg_hash);
                    if (error) return "cfg_hash." + error;
                }
                return null;
            };

            /**
             * Creates a ConfigReference message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof exonum.ConfigReference
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {exonum.ConfigReference} ConfigReference
             */
            ConfigReference.fromObject = function fromObject(object) {
                if (object instanceof $root.exonum.ConfigReference) return object;
                var message = new $root.exonum.ConfigReference();
                if (object.actual_from != null) if ($util.Long) (message.actual_from = $util.Long.fromValue(object.actual_from)).unsigned = true;else if (typeof object.actual_from === "string") message.actual_from = parseInt(object.actual_from, 10);else if (typeof object.actual_from === "number") message.actual_from = object.actual_from;else if (_typeof(object.actual_from) === "object") message.actual_from = new $util.LongBits(object.actual_from.low >>> 0, object.actual_from.high >>> 0).toNumber(true);
                if (object.cfg_hash != null) {
                    if (_typeof(object.cfg_hash) !== "object") throw TypeError(".exonum.ConfigReference.cfg_hash: object expected");
                    message.cfg_hash = $root.exonum.Hash.fromObject(object.cfg_hash);
                }
                return message;
            };

            /**
             * Creates a plain object from a ConfigReference message. Also converts values to other types if specified.
             * @function toObject
             * @memberof exonum.ConfigReference
             * @static
             * @param {exonum.ConfigReference} message ConfigReference
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ConfigReference.toObject = function toObject(message, options) {
                if (!options) options = {};
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, true);
                        object.actual_from = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                    } else object.actual_from = options.longs === String ? "0" : 0;
                    object.cfg_hash = null;
                }
                if (message.actual_from != null && message.hasOwnProperty("actual_from")) if (typeof message.actual_from === "number") object.actual_from = options.longs === String ? String(message.actual_from) : message.actual_from;else object.actual_from = options.longs === String ? $util.Long.prototype.toString.call(message.actual_from) : options.longs === Number ? new $util.LongBits(message.actual_from.low >>> 0, message.actual_from.high >>> 0).toNumber(true) : message.actual_from;
                if (message.cfg_hash != null && message.hasOwnProperty("cfg_hash")) object.cfg_hash = $root.exonum.Hash.toObject(message.cfg_hash, options);
                return object;
            };

            /**
             * Converts this ConfigReference to JSON.
             * @function toJSON
             * @memberof exonum.ConfigReference
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ConfigReference.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return ConfigReference;
        }();

        exonum.TxLocation = function () {

            /**
             * Properties of a TxLocation.
             * @memberof exonum
             * @interface ITxLocation
             * @property {number|Long|null} [block_height] TxLocation block_height
             * @property {number|Long|null} [position_in_block] TxLocation position_in_block
             */

            /**
             * Constructs a new TxLocation.
             * @memberof exonum
             * @classdesc Represents a TxLocation.
             * @implements ITxLocation
             * @constructor
             * @param {exonum.ITxLocation=} [properties] Properties to set
             */
            function TxLocation(properties) {
                if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                    if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                }
            }

            /**
             * TxLocation block_height.
             * @member {number|Long} block_height
             * @memberof exonum.TxLocation
             * @instance
             */
            TxLocation.prototype.block_height = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

            /**
             * TxLocation position_in_block.
             * @member {number|Long} position_in_block
             * @memberof exonum.TxLocation
             * @instance
             */
            TxLocation.prototype.position_in_block = $util.Long ? $util.Long.fromBits(0, 0, true) : 0;

            /**
             * Creates a new TxLocation instance using the specified properties.
             * @function create
             * @memberof exonum.TxLocation
             * @static
             * @param {exonum.ITxLocation=} [properties] Properties to set
             * @returns {exonum.TxLocation} TxLocation instance
             */
            TxLocation.create = function create(properties) {
                return new TxLocation(properties);
            };

            /**
             * Encodes the specified TxLocation message. Does not implicitly {@link exonum.TxLocation.verify|verify} messages.
             * @function encode
             * @memberof exonum.TxLocation
             * @static
             * @param {exonum.ITxLocation} message TxLocation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TxLocation.encode = function encode(message, writer) {
                if (!writer) writer = $Writer.create();
                if (message.block_height != null && message.hasOwnProperty("block_height")) writer.uint32( /* id 1, wireType 0 =*/8).uint64(message.block_height);
                if (message.position_in_block != null && message.hasOwnProperty("position_in_block")) writer.uint32( /* id 2, wireType 0 =*/16).uint64(message.position_in_block);
                return writer;
            };

            /**
             * Encodes the specified TxLocation message, length delimited. Does not implicitly {@link exonum.TxLocation.verify|verify} messages.
             * @function encodeDelimited
             * @memberof exonum.TxLocation
             * @static
             * @param {exonum.ITxLocation} message TxLocation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TxLocation.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a TxLocation message from the specified reader or buffer.
             * @function decode
             * @memberof exonum.TxLocation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {exonum.TxLocation} TxLocation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TxLocation.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length,
                    message = new $root.exonum.TxLocation();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            message.block_height = reader.uint64();
                            break;
                        case 2:
                            message.position_in_block = reader.uint64();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return message;
            };

            /**
             * Decodes a TxLocation message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof exonum.TxLocation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {exonum.TxLocation} TxLocation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TxLocation.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a TxLocation message.
             * @function verify
             * @memberof exonum.TxLocation
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            TxLocation.verify = function verify(message) {
                if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                if (message.block_height != null && message.hasOwnProperty("block_height")) if (!$util.isInteger(message.block_height) && !(message.block_height && $util.isInteger(message.block_height.low) && $util.isInteger(message.block_height.high))) return "block_height: integer|Long expected";
                if (message.position_in_block != null && message.hasOwnProperty("position_in_block")) if (!$util.isInteger(message.position_in_block) && !(message.position_in_block && $util.isInteger(message.position_in_block.low) && $util.isInteger(message.position_in_block.high))) return "position_in_block: integer|Long expected";
                return null;
            };

            /**
             * Creates a TxLocation message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof exonum.TxLocation
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {exonum.TxLocation} TxLocation
             */
            TxLocation.fromObject = function fromObject(object) {
                if (object instanceof $root.exonum.TxLocation) return object;
                var message = new $root.exonum.TxLocation();
                if (object.block_height != null) if ($util.Long) (message.block_height = $util.Long.fromValue(object.block_height)).unsigned = true;else if (typeof object.block_height === "string") message.block_height = parseInt(object.block_height, 10);else if (typeof object.block_height === "number") message.block_height = object.block_height;else if (_typeof(object.block_height) === "object") message.block_height = new $util.LongBits(object.block_height.low >>> 0, object.block_height.high >>> 0).toNumber(true);
                if (object.position_in_block != null) if ($util.Long) (message.position_in_block = $util.Long.fromValue(object.position_in_block)).unsigned = true;else if (typeof object.position_in_block === "string") message.position_in_block = parseInt(object.position_in_block, 10);else if (typeof object.position_in_block === "number") message.position_in_block = object.position_in_block;else if (_typeof(object.position_in_block) === "object") message.position_in_block = new $util.LongBits(object.position_in_block.low >>> 0, object.position_in_block.high >>> 0).toNumber(true);
                return message;
            };

            /**
             * Creates a plain object from a TxLocation message. Also converts values to other types if specified.
             * @function toObject
             * @memberof exonum.TxLocation
             * @static
             * @param {exonum.TxLocation} message TxLocation
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            TxLocation.toObject = function toObject(message, options) {
                if (!options) options = {};
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, true);
                        object.block_height = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                    } else object.block_height = options.longs === String ? "0" : 0;
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, true);
                        object.position_in_block = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                    } else object.position_in_block = options.longs === String ? "0" : 0;
                }
                if (message.block_height != null && message.hasOwnProperty("block_height")) if (typeof message.block_height === "number") object.block_height = options.longs === String ? String(message.block_height) : message.block_height;else object.block_height = options.longs === String ? $util.Long.prototype.toString.call(message.block_height) : options.longs === Number ? new $util.LongBits(message.block_height.low >>> 0, message.block_height.high >>> 0).toNumber(true) : message.block_height;
                if (message.position_in_block != null && message.hasOwnProperty("position_in_block")) if (typeof message.position_in_block === "number") object.position_in_block = options.longs === String ? String(message.position_in_block) : message.position_in_block;else object.position_in_block = options.longs === String ? $util.Long.prototype.toString.call(message.position_in_block) : options.longs === Number ? new $util.LongBits(message.position_in_block.low >>> 0, message.position_in_block.high >>> 0).toNumber(true) : message.position_in_block;
                return object;
            };

            /**
             * Converts this TxLocation to JSON.
             * @function toJSON
             * @memberof exonum.TxLocation
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            TxLocation.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return TxLocation;
        }();

        exonum.TransactionResult = function () {

            /**
             * Properties of a TransactionResult.
             * @memberof exonum
             * @interface ITransactionResult
             * @property {number|null} [status] TransactionResult status
             * @property {string|null} [description] TransactionResult description
             */

            /**
             * Constructs a new TransactionResult.
             * @memberof exonum
             * @classdesc Represents a TransactionResult.
             * @implements ITransactionResult
             * @constructor
             * @param {exonum.ITransactionResult=} [properties] Properties to set
             */
            function TransactionResult(properties) {
                if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                    if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                }
            }

            /**
             * TransactionResult status.
             * @member {number} status
             * @memberof exonum.TransactionResult
             * @instance
             */
            TransactionResult.prototype.status = 0;

            /**
             * TransactionResult description.
             * @member {string} description
             * @memberof exonum.TransactionResult
             * @instance
             */
            TransactionResult.prototype.description = "";

            /**
             * Creates a new TransactionResult instance using the specified properties.
             * @function create
             * @memberof exonum.TransactionResult
             * @static
             * @param {exonum.ITransactionResult=} [properties] Properties to set
             * @returns {exonum.TransactionResult} TransactionResult instance
             */
            TransactionResult.create = function create(properties) {
                return new TransactionResult(properties);
            };

            /**
             * Encodes the specified TransactionResult message. Does not implicitly {@link exonum.TransactionResult.verify|verify} messages.
             * @function encode
             * @memberof exonum.TransactionResult
             * @static
             * @param {exonum.ITransactionResult} message TransactionResult message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TransactionResult.encode = function encode(message, writer) {
                if (!writer) writer = $Writer.create();
                if (message.status != null && message.hasOwnProperty("status")) writer.uint32( /* id 1, wireType 0 =*/8).uint32(message.status);
                if (message.description != null && message.hasOwnProperty("description")) writer.uint32( /* id 2, wireType 2 =*/18).string(message.description);
                return writer;
            };

            /**
             * Encodes the specified TransactionResult message, length delimited. Does not implicitly {@link exonum.TransactionResult.verify|verify} messages.
             * @function encodeDelimited
             * @memberof exonum.TransactionResult
             * @static
             * @param {exonum.ITransactionResult} message TransactionResult message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TransactionResult.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a TransactionResult message from the specified reader or buffer.
             * @function decode
             * @memberof exonum.TransactionResult
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {exonum.TransactionResult} TransactionResult
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TransactionResult.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length,
                    message = new $root.exonum.TransactionResult();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            message.status = reader.uint32();
                            break;
                        case 2:
                            message.description = reader.string();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return message;
            };

            /**
             * Decodes a TransactionResult message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof exonum.TransactionResult
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {exonum.TransactionResult} TransactionResult
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TransactionResult.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a TransactionResult message.
             * @function verify
             * @memberof exonum.TransactionResult
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            TransactionResult.verify = function verify(message) {
                if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                if (message.status != null && message.hasOwnProperty("status")) if (!$util.isInteger(message.status)) return "status: integer expected";
                if (message.description != null && message.hasOwnProperty("description")) if (!$util.isString(message.description)) return "description: string expected";
                return null;
            };

            /**
             * Creates a TransactionResult message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof exonum.TransactionResult
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {exonum.TransactionResult} TransactionResult
             */
            TransactionResult.fromObject = function fromObject(object) {
                if (object instanceof $root.exonum.TransactionResult) return object;
                var message = new $root.exonum.TransactionResult();
                if (object.status != null) message.status = object.status >>> 0;
                if (object.description != null) message.description = String(object.description);
                return message;
            };

            /**
             * Creates a plain object from a TransactionResult message. Also converts values to other types if specified.
             * @function toObject
             * @memberof exonum.TransactionResult
             * @static
             * @param {exonum.TransactionResult} message TransactionResult
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            TransactionResult.toObject = function toObject(message, options) {
                if (!options) options = {};
                var object = {};
                if (options.defaults) {
                    object.status = 0;
                    object.description = "";
                }
                if (message.status != null && message.hasOwnProperty("status")) object.status = message.status;
                if (message.description != null && message.hasOwnProperty("description")) object.description = message.description;
                return object;
            };

            /**
             * Converts this TransactionResult to JSON.
             * @function toJSON
             * @memberof exonum.TransactionResult
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            TransactionResult.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return TransactionResult;
        }();

        return exonum;
    }();

    $root.google = function () {

        /**
         * Namespace google.
         * @exports google
         * @namespace
         */
        var google = {};

        google.protobuf = function () {

            /**
             * Namespace protobuf.
             * @memberof google
             * @namespace
             */
            var protobuf = {};

            protobuf.Timestamp = function () {

                /**
                 * Properties of a Timestamp.
                 * @memberof google.protobuf
                 * @interface ITimestamp
                 * @property {number|Long|null} [seconds] Timestamp seconds
                 * @property {number|null} [nanos] Timestamp nanos
                 */

                /**
                 * Constructs a new Timestamp.
                 * @memberof google.protobuf
                 * @classdesc Represents a Timestamp.
                 * @implements ITimestamp
                 * @constructor
                 * @param {google.protobuf.ITimestamp=} [properties] Properties to set
                 */
                function Timestamp(properties) {
                    if (properties) for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
                    }
                }

                /**
                 * Timestamp seconds.
                 * @member {number|Long} seconds
                 * @memberof google.protobuf.Timestamp
                 * @instance
                 */
                Timestamp.prototype.seconds = $util.Long ? $util.Long.fromBits(0, 0, false) : 0;

                /**
                 * Timestamp nanos.
                 * @member {number} nanos
                 * @memberof google.protobuf.Timestamp
                 * @instance
                 */
                Timestamp.prototype.nanos = 0;

                /**
                 * Creates a new Timestamp instance using the specified properties.
                 * @function create
                 * @memberof google.protobuf.Timestamp
                 * @static
                 * @param {google.protobuf.ITimestamp=} [properties] Properties to set
                 * @returns {google.protobuf.Timestamp} Timestamp instance
                 */
                Timestamp.create = function create(properties) {
                    return new Timestamp(properties);
                };

                /**
                 * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
                 * @function encode
                 * @memberof google.protobuf.Timestamp
                 * @static
                 * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Timestamp.encode = function encode(message, writer) {
                    if (!writer) writer = $Writer.create();
                    if (message.seconds != null && message.hasOwnProperty("seconds")) writer.uint32( /* id 1, wireType 0 =*/8).int64(message.seconds);
                    if (message.nanos != null && message.hasOwnProperty("nanos")) writer.uint32( /* id 2, wireType 0 =*/16).int32(message.nanos);
                    return writer;
                };

                /**
                 * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof google.protobuf.Timestamp
                 * @static
                 * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Timestamp.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Timestamp message from the specified reader or buffer.
                 * @function decode
                 * @memberof google.protobuf.Timestamp
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {google.protobuf.Timestamp} Timestamp
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Timestamp.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.google.protobuf.Timestamp();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.seconds = reader.int64();
                                break;
                            case 2:
                                message.nanos = reader.int32();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Timestamp message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof google.protobuf.Timestamp
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {google.protobuf.Timestamp} Timestamp
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Timestamp.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader)) reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Timestamp message.
                 * @function verify
                 * @memberof google.protobuf.Timestamp
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Timestamp.verify = function verify(message) {
                    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) !== "object" || message === null) return "object expected";
                    if (message.seconds != null && message.hasOwnProperty("seconds")) if (!$util.isInteger(message.seconds) && !(message.seconds && $util.isInteger(message.seconds.low) && $util.isInteger(message.seconds.high))) return "seconds: integer|Long expected";
                    if (message.nanos != null && message.hasOwnProperty("nanos")) if (!$util.isInteger(message.nanos)) return "nanos: integer expected";
                    return null;
                };

                /**
                 * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof google.protobuf.Timestamp
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {google.protobuf.Timestamp} Timestamp
                 */
                Timestamp.fromObject = function fromObject(object) {
                    if (object instanceof $root.google.protobuf.Timestamp) return object;
                    var message = new $root.google.protobuf.Timestamp();
                    if (object.seconds != null) if ($util.Long) (message.seconds = $util.Long.fromValue(object.seconds)).unsigned = false;else if (typeof object.seconds === "string") message.seconds = parseInt(object.seconds, 10);else if (typeof object.seconds === "number") message.seconds = object.seconds;else if (_typeof(object.seconds) === "object") message.seconds = new $util.LongBits(object.seconds.low >>> 0, object.seconds.high >>> 0).toNumber();
                    if (object.nanos != null) message.nanos = object.nanos | 0;
                    return message;
                };

                /**
                 * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof google.protobuf.Timestamp
                 * @static
                 * @param {google.protobuf.Timestamp} message Timestamp
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Timestamp.toObject = function toObject(message, options) {
                    if (!options) options = {};
                    var object = {};
                    if (options.defaults) {
                        if ($util.Long) {
                            var long = new $util.Long(0, 0, false);
                            object.seconds = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                        } else object.seconds = options.longs === String ? "0" : 0;
                        object.nanos = 0;
                    }
                    if (message.seconds != null && message.hasOwnProperty("seconds")) if (typeof message.seconds === "number") object.seconds = options.longs === String ? String(message.seconds) : message.seconds;else object.seconds = options.longs === String ? $util.Long.prototype.toString.call(message.seconds) : options.longs === Number ? new $util.LongBits(message.seconds.low >>> 0, message.seconds.high >>> 0).toNumber() : message.seconds;
                    if (message.nanos != null && message.hasOwnProperty("nanos")) object.nanos = message.nanos;
                    return object;
                };

                /**
                 * Converts this Timestamp to JSON.
                 * @function toJSON
                 * @memberof google.protobuf.Timestamp
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Timestamp.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return Timestamp;
            }();

            return protobuf;
        }();

        return google;
    }();

    return $root;
});

},{"protobufjs/minimal":43}],65:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _convert = require('../types/convert');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BIT_LENGTH = 256;

var ProofPath = function () {
  /**
   * Constructs a proof path from a binary string or a byte buffer.
   *
   * @param {string | Uint8Array} bits
   */
  function ProofPath(bits) {
    var bitLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : BIT_LENGTH;

    _classCallCheck(this, ProofPath);

    if (typeof bits === 'string') {
      this.key = (0, _convert.binaryStringToUint8Array)(padWithZeros(bits, BIT_LENGTH));
      bitLength = bits.length;
    } else if (bits instanceof Uint8Array && bits.length === BIT_LENGTH / 8) {
      this.key = bits.slice(0);
    } else {
      throw new TypeError('Invalid `bits` parameter');
    }

    this.isTerminal = bitLength === BIT_LENGTH;
    this.lengthByte = bitLength % BIT_LENGTH;
    this.hexKey = (0, _convert.uint8ArrayToHexadecimal)(this.key);
  }

  _createClass(ProofPath, [{
    key: 'bitLength',
    value: function bitLength() {
      return this.isTerminal ? BIT_LENGTH : this.lengthByte;
    }

    /**
     * Retrieves a bit at a specific position of this key.
     *
     * @param {number} pos
     * @returns {0 | 1 | void}
     */

  }, {
    key: 'bit',
    value: function bit(pos) {
      pos = +pos;
      if (pos >= this.bitLength() || pos < 0) {
        return undefined;
      }

      return getBit(this.key, pos);
    }
  }, {
    key: 'commonPrefixLength',
    value: function commonPrefixLength(other) {
      var intersectingBits = Math.min(this.bitLength(), other.bitLength());

      // First, advance by a full byte while it is possible
      var pos = void 0;
      for (pos = 0; pos < intersectingBits >> 3 && this.key[pos >> 3] === other.key[pos >> 3]; pos += 8) {}

      // Then, check inidividual bits
      for (; pos < intersectingBits && this.bit(pos) === other.bit(pos); pos++) {}

      return pos;
    }

    /**
     * Computes a common prefix of this and another byte sequence.
     *
     * @param {ProofPath} other
     * @returns {ProofPath}
     */

  }, {
    key: 'commonPrefix',
    value: function commonPrefix(other) {
      var pos = this.commonPrefixLength(other);
      return this.truncate(pos);
    }

    /**
     * Checks if the path starts with the other specified path.
     *
     * @param {ProofPath} other
     * @returns {boolean}
     */

  }, {
    key: 'startsWith',
    value: function startsWith(other) {
      return this.commonPrefixLength(other) === other.bitLength();
    }

    /**
     * Compares this proof path to another.
     *
     * @param {ProofPath} other
     * @returns {-1 | 0 | 1}
     */

  }, {
    key: 'compare',
    value: function compare(other) {
      var _ref = [this.bitLength(), other.bitLength()],
          thisLen = _ref[0],
          otherLen = _ref[1];

      var intersectingBits = Math.min(thisLen, otherLen);
      var pos = this.commonPrefixLength(other);

      if (pos === intersectingBits) {
        return Math.sign(thisLen - otherLen);
      }
      return this.bit(pos) - other.bit(pos);
    }

    /**
     * Truncates this bit sequence to a shorter one by removing some bits from the end.
     *
     * @param {number} bits
     *   new length of the sequence
     * @returns {ProofPath}
     *   truncated bit sequence
     */

  }, {
    key: 'truncate',
    value: function truncate(bits) {
      bits = +bits;
      if (bits > this.bitLength()) {
        throw new TypeError('Cannot truncate bit slice to length more than current ' + ('(current: ' + this.bitLength() + ', requested: ' + bits + ')'));
      }

      var bytes = new Uint8Array(BIT_LENGTH / 8);
      for (var i = 0; i < bits >> 3; i++) {
        bytes[i] = this.key[i];
      }
      for (var bit = 8 * (bits >> 3); bit < bits; bit++) {
        setBit(bytes, bit, this.bit(bit));
      }

      return new ProofPath(bytes, bits);
    }

    /**
     * Converts this path to its JSON presentation.
     *
     * @returns {string}
     *   binary string representing the path
     */

  }, {
    key: 'toJSON',
    value: function toJSON() {
      var bits = (0, _convert.hexadecimalToBinaryString)(this.hexKey);
      return trimZeros(bits, this.bitLength());
    }
  }, {
    key: 'toString',
    value: function toString() {
      var bits = (0, _convert.hexadecimalToBinaryString)(this.hexKey);
      bits = this.bitLength() > 8 ? trimZeros(bits, 8) + '...' : trimZeros(bits, this.bitLength());
      return 'path(' + bits + ')';
    }
  }]);

  return ProofPath;
}();

/**
 * Expected length of byte buffers used to create `ProofPath`s.
 */


exports.default = ProofPath;
ProofPath.BYTE_LENGTH = BIT_LENGTH / 8;

function getBit(buffer, pos) {
  var byte = Math.floor(pos / 8);
  var bitPos = pos % 8;

  return (buffer[byte] & 1 << bitPos) >> bitPos;
}

/**
 * Sets a specified bit in the byte buffer.
 *
 * @param {Uint8Array} buffer
 * @param {number} pos 0-based position in the buffer to set
 * @param {0 | 1} bit
 */
function setBit(buffer, pos, bit) {
  var byte = Math.floor(pos / 8);
  var bitPos = pos % 8;

  if (bit === 0) {
    var mask = 255 - (1 << bitPos);
    buffer[byte] &= mask;
  } else {
    var _mask = 1 << bitPos;
    buffer[byte] |= _mask;
  }
}

var ZEROS = function () {
  var str = '0';
  for (var i = 0; i < 8; i++) {
    str = str + str;
  }return str;
}();

function padWithZeros(str, desiredLength) {
  return str + ZEROS.substring(0, desiredLength - str.length);
}

function trimZeros(str, desiredLength) {
  /* istanbul ignore next: should never be triggered */
  if (str.length < desiredLength) {
    throw new Error('Invariant broken: negative zero trimming requested');
  }
  return str.substring(0, desiredLength);
}

},{"../types/convert":75}],66:[function(require,module,exports){
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

},{"../../proto/protocol.js":64,"../crypto":72,"../types/convert":75,"../types/hexadecimal":77,"../types/message":79,"long":41}],67:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _merkle = require('./merkle');

Object.keys(_merkle).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _merkle[key];
    }
  });
});

var _merklePatricia = require('./merkle-patricia');

Object.keys(_merklePatricia).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _merklePatricia[key];
    }
  });
});

var _block = require('./block');

Object.keys(_block).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _block[key];
    }
  });
});

var _transport = require('./transport');

Object.keys(_transport).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _transport[key];
    }
  });
});

var _table = require('./table');

Object.keys(_table).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _table[key];
    }
  });
});

},{"./block":66,"./merkle":69,"./merkle-patricia":68,"./table":70,"./transport":71}],68:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MapProofError = exports.MapProof = undefined;

var _binarySearch = require('binary-search');

var _binarySearch2 = _interopRequireDefault(_binarySearch);

var _crypto = require('../crypto');

var _hexadecimal = require('../types/hexadecimal');

var _ProofPath = require('./ProofPath');

var _ProofPath2 = _interopRequireDefault(_ProofPath);

var _primitive = require('../types/primitive');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Proof of existence and/or absence of certain elements from a Merkelized
 * map index.
 */
var MapProof =
/**
 * Creates a new instance of a proof.
 *
 * @param {Object} json
 *   JSON object containing (untrusted) proof
 * @param {{serialize: (any) => Array<number>}} keyType
 *   Type of keys used in the underlying Merkelized map. Usually, `PublicKey`
 *   or `Hash`. The keys must serialize to exactly 32 bytes.
 * @param {{hash?: (any) => string, serialize: (any) => Array<number>}} valueType
 *   Type of values used in the underlying Merkelized map. Usually, it should
 *   be a type created with the `newType` function. The type should possess
 *   one of `hash` or `serialize` methods.
 * @throws {MapProofError}
 *   if the proof is malformed
 */
exports.MapProof = function MapProof(json, keyType, valueType) {
  _classCallCheck(this, MapProof);

  this.proof = parseProof(json.proof);
  this.entries = parseEntries(json.entries, keyType, valueType);

  if (!keyType || typeof keyType.serialize !== 'function') {
    throw new TypeError('No `serialize` method in the key type');
  }
  this.keyType = keyType;

  if (!valueType || typeof valueType.serialize !== 'function' && typeof valueType.hash !== 'function') {
    throw new TypeError('No `hash` or `serialize` method in the value type');
  }
  this.valueType = valueType;

  precheckProof.call(this);

  var completeProof = this.proof.concat(this.entries).sort(function (_ref, _ref2) {
    var pathA = _ref.path;
    var pathB = _ref2.path;
    return pathA.compare(pathB);
  });

  // This check is required as duplicate paths can be introduced by entries
  // (further, it's generally possible that two different entry keys lead
  //  to the same `ProofPath`).
  for (var i = 1; i < completeProof.length; i++) {
    var _ref3 = [completeProof[i - 1], completeProof[i]],
        pathA = _ref3[0].path,
        pathB = _ref3[1].path;


    if (pathA.compare(pathB) === 0) {
      throw new MapProofError('duplicatePath', pathA);
    }
  }

  this.merkleRoot = collect(completeProof.filter(function (_ref4) {
    var hash = _ref4.hash;
    return !!hash;
  }));
  this.missingKeys = new Set(this.entries.filter(function (e) {
    return e.missing !== undefined;
  }).map(function (_ref5) {
    var missing = _ref5.missing;
    return missing;
  }));
  this.entries = new Map(this.entries.filter(function (e) {
    return e.key !== undefined;
  }).map(function (_ref6) {
    var key = _ref6.key,
        value = _ref6.value;
    return [key, value];
  }));
};

function parseProof(proof) {
  if (!Array.isArray(proof)) {
    throw new MapProofError('malformedProof');
  }

  var validEntries = proof.every(function (_ref7) {
    var path = _ref7.path,
        hash = _ref7.hash;

    return (/^[01]{1,256}$/.test(path) && /^[0-9a-f]{64}$/i.test(hash)
    );
  });
  if (!validEntries) {
    throw new MapProofError('malformedProof');
  }

  return proof.map(function (_ref8) {
    var path = _ref8.path,
        hash = _ref8.hash;
    return {
      path: new _ProofPath2.default(path),
      hash: hash
    };
  });
}

function parseEntries(entries, keyType, valueType) {
  function createPath(data) {
    var bytes = keyType.serialize(data, [], 0);
    if (bytes.length !== _ProofPath2.default.BYTE_LENGTH) {
      throw new TypeError('invalid key type; keys should serialize to ' + (_ProofPath2.default.BYTE_LENGTH + '-byte buffers'));
    }

    return new _ProofPath2.default(new Uint8Array(bytes));
  }

  if (!Array.isArray(entries)) {
    throw new MapProofError('malformedEntries');
  }

  return entries.map(function (_ref9) {
    var missing = _ref9.missing,
        key = _ref9.key,
        value = _ref9.value;

    if (missing === undefined && (key === undefined || value === undefined)) {
      throw new MapProofError('unknownEntryType');
    }
    if (missing !== undefined && (key !== undefined || value !== undefined)) {
      throw new MapProofError('ambiguousEntryType');
    }

    if (missing !== undefined) {
      return {
        missing: missing,
        path: createPath(missing)
      };
    }

    return {
      key: key,
      value: value,
      path: createPath(key),
      hash: typeof valueType.hash === 'function' ? valueType.hash(value) // `newType`s
      : (0, _crypto.hash)(valueType.serialize(value, [], 0)) // "primitive" types
    };
  });
}

/**
 * @param this MapProof
 */
function precheckProof() {
  var _this = this;

  // Check that entries in proof are in increasing order
  for (var i = 1; i < this.proof.length; i++) {
    var _ref10 = [this.proof[i - 1], this.proof[i]],
        prevPath = _ref10[0].path,
        path = _ref10[1].path;


    switch (prevPath.compare(path)) {
      case -1:
        if (path.startsWith(prevPath)) {
          throw new MapProofError('embeddedPaths', prevPath, path);
        }
        break;
      case 0:
        throw new MapProofError('duplicatePath', path);
      case 1:
        throw new MapProofError('invalidOrdering', prevPath, path);
    }
  }

  // Check that no entry has a prefix among the paths in the proof entries.
  // In order to do this, it suffices to locate the closest smaller path
  // in the proof entries and check only it.
  this.entries.forEach(function (_ref11) {
    var keyPath = _ref11.path;

    var index = (0, _binarySearch2.default)(_this.proof, keyPath, function (_ref12, needle) {
      var path = _ref12.path;

      return path.compare(needle);
    });

    if (index >= 0) {
      throw new MapProofError('duplicatePath', keyPath);
    }

    var insertionIndex = -index - 1;
    if (insertionIndex > 0) {
      var prevPath = _this.proof[insertionIndex - 1].path;
      if (keyPath.startsWith(prevPath)) {
        throw new MapProofError('embeddedPaths', prevPath, keyPath);
      }
    }
  });
}

function serializeProofPathType(type, buffer) {
  _primitive.Bool.serialize(type.isTerminal, buffer, buffer.length);
  _hexadecimal.Hash.serialize(type.hexKey, buffer, buffer.length);
  _primitive.Uint8.serialize(type.lengthByte, buffer, buffer.length);
  return buffer;
}

function serializeBranchNode(leftHash, rightHash, leftPath, rightPath) {
  var buffer = [];
  _hexadecimal.Hash.serialize(leftHash, buffer, buffer.length);
  _hexadecimal.Hash.serialize(rightHash, buffer, buffer.length);
  serializeProofPathType(leftPath, buffer);
  serializeProofPathType(rightPath, buffer);
  return buffer;
}

function serializeIsolatedNode(path, hash) {
  var buffer = [];
  serializeProofPathType(path, buffer);
  _hexadecimal.Hash.serialize(hash, buffer, buffer.length);
  return buffer;
}

function collect(entries) {
  function hashIsolatedNode(_ref13) {
    var path = _ref13.path,
        valueHash = _ref13.hash;

    var buffer = serializeIsolatedNode(path, valueHash);
    return (0, _crypto.hash)(buffer);
  }

  function hashBranch(left, right) {
    var buffer = serializeBranchNode(left.hash, right.hash, left.path, right.path);
    return (0, _crypto.hash)(buffer);
  }

  function fold(contour, lastPrefix) {
    var lastEntry = contour.pop();
    var penultimateEntry = contour.pop();

    contour.push({
      path: lastPrefix,
      hash: hashBranch(penultimateEntry, lastEntry)
    });

    return contour.length > 1 ? lastPrefix.commonPrefix(contour[contour.length - 2].path) : null;
  }

  switch (entries.length) {
    case 0:
      return '0000000000000000000000000000000000000000000000000000000000000000';

    case 1:
      if (!entries[0].path.isTerminal) {
        throw new MapProofError('nonTerminalNode', entries[0].path);
      }
      return hashIsolatedNode(entries[0]);

    default:
      var contour = [];

      // invariant: equal to the common prefix of the 2 last nodes in the contour
      var lastPrefix = entries[0].path.commonPrefix(entries[1].path);
      contour.push(entries[0], entries[1]);

      for (var i = 2; i < entries.length; i++) {
        var entry = entries[i];
        var newPrefix = entry.path.commonPrefix(contour[contour.length - 1].path);

        while (contour.length > 1 && newPrefix.bitLength() < lastPrefix.bitLength()) {
          var foldedPrefix = fold(contour, lastPrefix);
          if (foldedPrefix) {
            lastPrefix = foldedPrefix;
          }
        }

        contour.push(entry);
        lastPrefix = newPrefix;
      }

      while (contour.length > 1) {
        lastPrefix = fold(contour, lastPrefix);
      }
      return contour[0].hash;
  }
}

/**
 * Error indicating a malformed `MapProof`.
 */

var MapProofError = exports.MapProofError = function (_Error) {
  _inherits(MapProofError, _Error);

  function MapProofError(type) {
    _classCallCheck(this, MapProofError);

    switch (type) {
      case 'malformedProof':
        var _this2 = _possibleConstructorReturn(this, (MapProofError.__proto__ || Object.getPrototypeOf(MapProofError)).call(this, 'malformed `proof` part of the proof'));

        break;
      case 'malformedEntries':
      case 'unknownEntryType':
      case 'ambiguousEntryType':
        var _this2 = _possibleConstructorReturn(this, (MapProofError.__proto__ || Object.getPrototypeOf(MapProofError)).call(this, 'malformed `entries` part of the proof'));

        break;
      case 'embeddedPaths':
        var _this2 = _possibleConstructorReturn(this, (MapProofError.__proto__ || Object.getPrototypeOf(MapProofError)).call(this, 'embedded paths in proof: ' + (arguments.length <= 1 ? undefined : arguments[1]) + ' is a prefix of ' + (arguments.length <= 2 ? undefined : arguments[2])));

        break;
      case 'duplicatePath':
        var _this2 = _possibleConstructorReturn(this, (MapProofError.__proto__ || Object.getPrototypeOf(MapProofError)).call(this, 'duplicate ' + (arguments.length <= 1 ? undefined : arguments[1]) + ' in proof'));

        break;
      case 'invalidOrdering':
        var _this2 = _possibleConstructorReturn(this, (MapProofError.__proto__ || Object.getPrototypeOf(MapProofError)).call(this, 'invalid path ordering'));

        break;
      case 'nonTerminalNode':
        var _this2 = _possibleConstructorReturn(this, (MapProofError.__proto__ || Object.getPrototypeOf(MapProofError)).call(this, 'non-terminal isolated node in proof'));

        break;
      default:
        var _this2 = _possibleConstructorReturn(this, (MapProofError.__proto__ || Object.getPrototypeOf(MapProofError)).call(this, type));

    }
    return _this2;
  }

  return MapProofError;
}(Error);

},{"../crypto":72,"../types/hexadecimal":77,"../types/primitive":80,"./ProofPath":65,"binary-search":35}],69:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.merkleProof = merkleProof;

var _bigInteger = require('big-integer');

var _bigInteger2 = _interopRequireDefault(_bigInteger);

var _helpers = require('../helpers');

var _generic = require('../types/generic');

var _validate = require('../types/validate');

var _convert = require('../types/convert');

var _crypto = require('../crypto');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Calculate height of merkle tree
 * @param {bigInt} count
 * @return {number}
 */
function calcHeight(count) {
  var i = 0;
  while ((0, _bigInteger2.default)(2).pow(i).lt(count)) {
    i++;
  }
  return i;
}

/**
 * Check proof of Merkle tree and return array of elements
 * @param {string} rootHash
 * @param {number} count
 * @param {Object} proofNode
 * @param {Array} range
 * @param {NewType} [type] - optional
 * @return {Array}
 */
function merkleProof(rootHash, count, proofNode, range, type) {
  var elements = [];
  var rootBranch = 'left';

  /**
   * Get value from node, insert into elements array and return its hash
   * @param data
   * @param {number} depth
   * @param {number} index
   * @returns {string}
   */
  function getHash(data, depth, index) {
    var element = void 0;
    var elementsHash = void 0;

    if (depth !== 0 && depth + 1 !== height) {
      throw new Error('Value node is on wrong height in tree.');
    }

    if (start.gt(index) || end.lt(index)) {
      throw new Error('Wrong index of value node.');
    }

    if (start.plus(elements.length).neq(index)) {
      throw new Error('Value node is on wrong position in tree.');
    }

    if (typeof data === 'string') {
      if (!(0, _validate.validateHexadecimal)(data)) {
        throw new TypeError('Tree element of wrong type is passed. Hexadecimal expected.');
      }
      element = data;
      elementsHash = element;
    } else {
      if (Array.isArray(data)) {
        if (!(0, _validate.validateBytesArray)(data)) {
          throw new TypeError('Tree element of wrong type is passed. Bytes array expected.');
        }
        element = data.slice(0); // clone array of 8-bit integers
        elementsHash = (0, _crypto.hash)(element);
      } else {
        if (!(0, _helpers.isObject)(data)) {
          throw new TypeError('Invalid value of data parameter.');
        }
        if (!(0, _generic.isType)(type)) {
          throw new TypeError('Invalid type of type parameter.');
        }
        element = data;
        elementsHash = (0, _crypto.hash)(element, type);
      }
    }

    elements.push(element);
    return elementsHash;
  }

  /**
   * Recursive tree traversal function
   * @param {Object} node
   * @param {number} depth
   * @param {number} index
   * @returns {string}
   */
  function recursive(node, depth, index) {
    var hashLeft = void 0;
    var hashRight = void 0;
    var summingBuffer = void 0;

    // case with single node in tree
    if (depth === 0 && node.val !== undefined) {
      return getHash(node.val, depth, index * 2);
    }

    if (node.left === undefined) {
      throw new Error('Left node is missed.');
    }
    if (typeof node.left === 'string') {
      if (!(0, _validate.validateHexadecimal)(node.left)) {
        throw new TypeError('Tree element of wrong type is passed. Hexadecimal expected.');
      }
      hashLeft = node.left;
    } else {
      if (!(0, _helpers.isObject)(node.left)) {
        throw new TypeError('Invalid type of left node.');
      }
      if (node.left.val !== undefined) {
        hashLeft = getHash(node.left.val, depth, index * 2);
      } else {
        hashLeft = recursive(node.left, depth + 1, index * 2);
      }
    }

    if (depth === 0) {
      rootBranch = 'right';
    }

    if (node.right !== undefined) {
      if (typeof node.right === 'string') {
        if (!(0, _validate.validateHexadecimal)(node.right)) {
          throw new TypeError('Tree element of wrong type is passed. Hexadecimal expected.');
        }
        hashRight = node.right;
      } else {
        if (!(0, _helpers.isObject)(node.right)) {
          throw new TypeError('Invalid type of right node.');
        }

        if (node.right.val !== undefined) {
          hashRight = getHash(node.right.val, depth, index * 2 + 1);
        } else {
          hashRight = recursive(node.right, depth + 1, index * 2 + 1);
        }
      }

      summingBuffer = new Uint8Array(64);
      summingBuffer.set((0, _convert.hexadecimalToUint8Array)(hashLeft));
      summingBuffer.set((0, _convert.hexadecimalToUint8Array)(hashRight), 32);
      return (0, _crypto.hash)(summingBuffer);
    }

    if (depth === 0 || rootBranch === 'left') {
      throw new Error('Right leaf is missed in left branch of tree.');
    }
    summingBuffer = (0, _convert.hexadecimalToUint8Array)(hashLeft);
    return (0, _crypto.hash)(summingBuffer);
  }

  // validate rootHash
  if (!(0, _validate.validateHexadecimal)(rootHash)) {
    throw new TypeError('Root hash of wrong type is passed. Hexadecimal expected.');
  }

  // validate count
  if (!(typeof count === 'number' || typeof count === 'string')) {
    throw new TypeError('Invalid value is passed as count parameter. Number or string is expected.');
  }

  count = (0, _bigInteger2.default)(count);

  if (count.lt(0)) {
    throw new RangeError('Invalid count parameter. Count can\'t be below zero.');
  }

  // validate range
  if (!Array.isArray(range) || range.length !== 2) {
    throw new TypeError('Invalid type of range parameter. Array of two elements expected.');
  }
  if (!(typeof range[0] === 'number' || typeof range[0] === 'string')) {
    throw new TypeError('Invalid value is passed as start of range parameter.');
  }
  if (!(typeof range[1] === 'number' || typeof range[1] === 'string')) {
    throw new TypeError('Invalid value is passed as end of range parameter.');
  }

  var rangeStart = (0, _bigInteger2.default)(range[0]);
  var rangeEnd = (0, _bigInteger2.default)(range[1]);

  if (rangeStart.gt(rangeEnd)) {
    throw new RangeError('Invalid range parameter. Start index can\'t be out of range.');
  }
  if (rangeStart.lt(0)) {
    throw new RangeError('Invalid range parameter. Start index can\'t be below zero.');
  }
  if (rangeEnd.lt(0)) {
    throw new RangeError('Invalid range parameter. End index can\'t be below zero.');
  }
  if (rangeStart.gt(count.minus(1))) {
    return [];
  }

  // validate proofNode
  if (!(0, _helpers.isObject)(proofNode)) {
    throw new TypeError('Invalid type of proofNode parameter. Object expected.');
  }

  var height = calcHeight(count);
  var start = rangeStart;
  var end = rangeEnd.lt(count) ? rangeEnd : count.minus(1);

  var actualHash = recursive(proofNode, 0, 0);

  if (rootHash.toLowerCase() !== actualHash) {
    throw new Error('rootHash parameter is not equal to actual hash.');
  }
  if ((0, _bigInteger2.default)(elements.length).neq(end.eq(start) ? 1 : end.minus(start).plus(1))) {
    throw new Error('Actual elements in tree amount is not equal to requested.');
  }

  return elements;
}

},{"../crypto":72,"../helpers":73,"../types/convert":75,"../types/generic":76,"../types/validate":81,"big-integer":34}],70:[function(require,module,exports){
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

},{"../crypto":72,"../types/hexadecimal":77,"../types/primitive":80,"./merkle-patricia":68}],71:[function(require,module,exports){
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

},{"../crypto":72,"../helpers":73,"../types/convert":75,"../types/message":79,"../types/validate":81,"axios":8}],72:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hash = hash;
exports.sign = sign;
exports.verifySignature = verifySignature;
exports.keyPair = keyPair;
exports.fromSeed = fromSeed;
exports.randomUint64 = randomUint64;

var _bigInteger = require('big-integer');

var _bigInteger2 = _interopRequireDefault(_bigInteger);

var _sha = require('sha.js');

var _sha2 = _interopRequireDefault(_sha);

var _tweetnacl = require('tweetnacl');

var _tweetnacl2 = _interopRequireDefault(_tweetnacl);

var _generic = require('../types/generic');

var _message = require('../types/message');

var _validate = require('../types/validate');

var validate = _interopRequireWildcard(_validate);

var _convert = require('../types/convert');

var convert = _interopRequireWildcard(_convert);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Get SHA256 hash
 * @param {Object|Array|Uint8Array} data - object of NewType type or array of 8-bit integers
 * @param {Type|Transaction} [type] - optional, used only if data of {Object} type is passed
 * @return {string}
 */
function hash(data, type) {
  var buffer = void 0;

  if ((0, _generic.isType)(type) || (0, _message.isTransaction)(type)) {
    buffer = type.serialize(data);
  } else {
    if (type !== undefined) {
      throw new TypeError('Wrong type of data.');
    }

    if (data instanceof Uint8Array) {
      buffer = data;
    } else {
      if (!Array.isArray(data)) {
        throw new TypeError('Invalid data parameter.');
      }
      buffer = new Uint8Array(data);
    }
  }

  return (0, _sha2.default)('sha256').update(buffer, 'utf8').digest('hex');
}

/**
 * Get ED25519 signature
 * @param {string} secretKey
 * @param {Object|Array} data - object of NewType type or array of 8-bit integers
 * @param {Type|Transaction} [type] - optional, used only if data of {Object} type is passed
 * @return {string}
 */
function sign(secretKey, data, type) {
  var secretKeyUint8Array = void 0;
  var buffer = void 0;
  var signature = void 0;

  if (!validate.validateHexadecimal(secretKey, 64)) {
    throw new TypeError('secretKey of wrong type is passed. Hexadecimal expected.');
  }

  secretKeyUint8Array = convert.hexadecimalToUint8Array(secretKey);

  if ((0, _generic.isType)(type) || (0, _message.isTransaction)(type)) {
    buffer = new Uint8Array(type.serialize(data));
  } else {
    if (type !== undefined) {
      throw new TypeError('Wrong type of data.');
    }

    if (data instanceof Uint8Array) {
      buffer = data;
    } else {
      if (!Array.isArray(data)) {
        throw new TypeError('Invalid data parameter.');
      }
      buffer = new Uint8Array(data);
    }
  }
  signature = _tweetnacl2.default.sign.detached(buffer, secretKeyUint8Array);

  return convert.uint8ArrayToHexadecimal(signature);
}

/**
 * Verifies ED25519 signature
 * @param {string} signature
 * @param {string} publicKey
 * @param {Object|Array} data - object of NewType type or array of 8-bit integers
 * @param {Type|Transaction} [type] - optional, used only if data of {Object} type is passed
 * @return {boolean}
 */
function verifySignature(signature, publicKey, data, type) {
  var signatureUint8Array = void 0;
  var publicKeyUint8Array = void 0;
  var buffer = void 0;

  if (!validate.validateHexadecimal(signature, 64)) {
    throw new TypeError('Signature of wrong type is passed. Hexadecimal expected.');
  }

  signatureUint8Array = convert.hexadecimalToUint8Array(signature);

  if (!validate.validateHexadecimal(publicKey)) {
    throw new TypeError('publicKey of wrong type is passed. Hexadecimal expected.');
  }

  publicKeyUint8Array = convert.hexadecimalToUint8Array(publicKey);

  if ((0, _generic.isType)(type) || (0, _message.isTransaction)(type)) {
    buffer = new Uint8Array(type.serialize(data));
  } else if (type === undefined) {
    if (data instanceof Uint8Array) {
      buffer = data;
    } else if (Array.isArray(data)) {
      buffer = new Uint8Array(data);
    }
  } else {
    throw new TypeError('Wrong type of data.');
  }

  return _tweetnacl2.default.sign.detached.verify(buffer, signatureUint8Array, publicKeyUint8Array);
}

/**
 * Generate random pair of publicKey and secretKey
 * @return {Object}
 *  publicKey {string}
 *  secretKey {string}
 */
function keyPair() {
  var pair = _tweetnacl2.default.sign.keyPair();
  var publicKey = convert.uint8ArrayToHexadecimal(pair.publicKey);
  var secretKey = convert.uint8ArrayToHexadecimal(pair.secretKey);

  return {
    publicKey: publicKey,
    secretKey: secretKey
  };
}

/**
 * Returns a new signing key pair generated deterministically from a 32-byte seed
 * @return {Object}
 *  publicKey {string}
 *  secretKey {string}
 */
function fromSeed(seed) {
  var pair = _tweetnacl2.default.sign.keyPair.fromSeed(seed);
  var publicKey = convert.uint8ArrayToHexadecimal(pair.publicKey);
  var secretKey = convert.uint8ArrayToHexadecimal(pair.secretKey);

  return {
    publicKey: publicKey,
    secretKey: secretKey
  };
}

/**
 * Get random number of cryptographic quality
 * @returns {string}
 */
function randomUint64() {
  var buffer = _tweetnacl2.default.randomBytes(8);
  return _bigInteger2.default.fromArray(Array.from(buffer), 256).toString();
}

},{"../types/convert":75,"../types/generic":76,"../types/message":79,"../types/validate":81,"big-integer":34,"sha.js":56,"tweetnacl":63}],73:[function(require,module,exports){
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

},{}],74:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _types = require('./types');

Object.keys(_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _types[key];
    }
  });
});

var _crypto = require('./crypto');

Object.keys(_crypto).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _crypto[key];
    }
  });
});

var _blockchain = require('./blockchain');

Object.keys(_blockchain).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _blockchain[key];
    }
  });
});
var version = exports.version = '@@version';

},{"./blockchain":67,"./crypto":72,"./types":78}],75:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hexadecimalToUint8Array = hexadecimalToUint8Array;
exports.hexadecimalToBinaryString = hexadecimalToBinaryString;
exports.uint8ArrayToHexadecimal = uint8ArrayToHexadecimal;
exports.uint8ArrayToBinaryString = uint8ArrayToBinaryString;
exports.binaryStringToUint8Array = binaryStringToUint8Array;
exports.binaryStringToHexadecimal = binaryStringToHexadecimal;
exports.stringToUint8Array = stringToUint8Array;

var _validate = require('../types/validate');

var validate = _interopRequireWildcard(_validate);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

/**
 * Convert hexadecimal string into uint8Array
 * @param {string} str
 * @returns {Uint8Array}
 */
function hexadecimalToUint8Array(str) {
  if (typeof str !== 'string') {
    throw new TypeError('Wrong data type passed to convertor. Hexadecimal string is expected');
  }

  if (!validate.validateHexadecimal(str, str.length / 2)) {
    throw new TypeError('String of wrong type is passed. Hexadecimal expected.');
  }

  var uint8arr = new Uint8Array(str.length / 2);

  for (var i = 0, j = 0; i < str.length; i += 2, j++) {
    uint8arr[j] = parseInt(str.substr(i, 2), 16);
  }

  return uint8arr;
}

/**
 * Convert hexadecimal string into binary string
 * @param {string} str
 * @returns {string}
 */
function hexadecimalToBinaryString(str) {
  var binaryStr = '';

  if (typeof str !== 'string') {
    throw new TypeError('Wrong data type passed to convertor. Hexadecimal string is expected');
  }

  if (!validate.validateHexadecimal(str, Math.ceil(str.length / 2))) {
    throw new TypeError('String of wrong type is passed. Hexadecimal expected.');
  }
  var prevBin = null;
  for (var i = 0; i < str.length; i++) {
    var bin = strReverse(parseInt(str[i], 16).toString(2));
    while (bin.length < 4) {
      bin = bin + '0';
    }
    if (!prevBin) {
      prevBin = bin;
    } else {
      binaryStr += bin + prevBin;
      prevBin = null;
    }
  }

  return binaryStr;
}

/**
 * Convert uint8Array into string
 * @param {Uint8Array} uint8arr
 * @returns {string}
 */
function uint8ArrayToHexadecimal(uint8arr) {
  var str = '';

  if (!(uint8arr instanceof Uint8Array)) {
    throw new TypeError('Wrong data type of array of 8-bit integers. Uint8Array is expected');
  }

  for (var i = 0; i < uint8arr.length; i++) {
    var hex = uint8arr[i].toString(16);
    hex = hex.length === 1 ? '0' + hex : hex;
    str += hex;
  }

  return str.toLowerCase();
}

/**
 * Convert uint8Array into binary string
 * @param {Uint8Array} uint8arr
 * @returns {string}
 */
function uint8ArrayToBinaryString(uint8arr) {
  var binaryStr = '';

  if (!(uint8arr instanceof Uint8Array)) {
    throw new TypeError('Wrong data type of array of 8-bit integers. Uint8Array is expected');
  }

  for (var i = 0; i < uint8arr.length; i++) {
    var bin = strReverse(uint8arr[i].toString(2));
    while (bin.length < 8) {
      bin = bin + '0';
    }
    binaryStr += bin;
  }

  return binaryStr;
}

/**
 * Convert binary string into uint8Array
 * @param {string} binaryStr
 * @returns {Uint8Array}
 */
function binaryStringToUint8Array(binaryStr) {
  var array = [];

  if (typeof binaryStr !== 'string') {
    throw new TypeError('Wrong data type passed to convertor. Binary string is expected');
  }

  if (!validate.validateBinaryString(binaryStr)) {
    throw new TypeError('String of wrong type is passed. Binary string expected.');
  }

  for (var i = 0; i < binaryStr.length; i += 8) {
    array.push(parseInt(strReverse(binaryStr.substr(i, 8)), 2));
  }

  return new Uint8Array(array);
}

/**
 * Convert string into reverse string
 * @param str
 * @returns {string}
 */
function strReverse(str) {
  return str.split('').reverse().join('');
}

/**
 * Convert binary string into hexadecimal string
 * @param {string} binaryStr
 * @returns {string}
 */
function binaryStringToHexadecimal(binaryStr) {
  var str = '';

  if (typeof binaryStr !== 'string') {
    throw new TypeError('Wrong data type passed to convertor. Binary string is expected');
  }

  if (!validate.validateBinaryString(binaryStr)) {
    throw new TypeError('String of wrong type is passed. Binary string expected.');
  }

  for (var i = 0; i < binaryStr.length; i += 8) {
    var hex = parseInt(strReverse(binaryStr.substr(i, 8)), 2).toString(16);
    hex = hex.length === 1 ? '0' + hex : hex;
    str += hex;
  }

  return str.toLowerCase();
}

/**
 * Convert sting into uint8Array
 * @param {string} str
 * @param {number} [len] - optional
 * @returns {Uint8Array}
 */
function stringToUint8Array(str, len) {
  var array = void 0;
  var from = 0;

  if (typeof str !== 'string') {
    throw new TypeError('Wrong data type passed to convertor. String is expected');
  }

  if (len > 0) {
    array = new Array(len);
    array.fill(0);
  } else {
    array = [];
  }

  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);

    if (c < 128) {
      array[from++] = c;
    } else if (c < 2048) {
      array[from++] = c >> 6 | 192;
      array[from++] = c & 63 | 128;
    } else if ((c & 0xFC00) === 0xD800 && i + 1 < str.length && (str.charCodeAt(i + 1) & 0xFC00) === 0xDC00) {
      // surrogate pair
      c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
      array[from++] = c >> 18 | 240;
      array[from++] = c >> 12 & 63 | 128;
      array[from++] = c >> 6 & 63 | 128;
      array[from++] = c & 63 | 128;
    } else {
      array[from++] = c >> 12 | 224;
      array[from++] = c >> 6 & 63 | 128;
      array[from++] = c & 63 | 128;
    }
  }

  return new Uint8Array(array);
}

},{"../types/validate":81}],76:[function(require,module,exports){
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

},{"../crypto":72,"../helpers":73}],77:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PublicKey = exports.Digest = exports.Hash = exports.Uuid = exports.PUBLIC_KEY_LENGTH = undefined;

var _validate = require('./validate');

var validate = _interopRequireWildcard(_validate);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var PUBLIC_KEY_LENGTH = exports.PUBLIC_KEY_LENGTH = 32;
var HASH_LENGTH = 32;

/**
 * Encoder
 *
 * @param {string} str string to encode
 * @param {Array} buffer buffer to place result to
 * @param {number} from position to write from
 * @returns {Array} modified buffer
 * @private
 */
function insertHexadecimalToByteArray(str, buffer, from) {
  for (var i = 0; i < str.length; i += 2) {
    buffer[from] = parseInt(str.substr(i, 2), 16);
    from++;
  }
  return buffer;
}

/**
 * Validator wrapper
 *
 * @param {string} name structure name
 * @param {number} size value size in bytes
 * @param {string} value value representation
 * @returns {string} value if validation passes
 * @throws {TypeError} in case of validation break
 * @private
 */
function validateHexadecimal(name, size, value) {
  if (!validate.validateHexadecimal(value, size)) {
    throw new TypeError(name + ' of wrong type is passed: ' + value);
  }

  return value;
}

/**
 * Factory for building Hex Types
 *
 * @param {function(value, buffer, from)} serizalizer function accepting value, buffer, position and returns modified buffer
 * @param {number} size type size in bytes
 * @param {string} name type name to distinguish between types
 * @returns {Object} hex type
 */
function hexTypeFactory(serizalizer, size, name) {
  return Object.defineProperties({}, {
    size: {
      get: function get() {
        return function () {
          return size;
        };
      },
      enumerable: true
    },
    name: {
      get: function get() {
        return name;
      },
      enumerable: true
    },
    serialize: {
      get: function get() {
        return serizalizer;
      }
    }
  });
}

/**
 * Common serializer
 *
 * @param {function(name, size, value)} validator hexadecimal validator
 * @param {function(value, buffer, from)} encoder function accepting value, buffer, position and returns modified buffer
 * @returns {function(value, buffer, from)} encoder wrapper
 * @throws {TypeError} in case of validation break
 * @private
 */
function serializer(encoder, validator) {
  return function (value, buffer, from) {
    return encoder(validator(value), buffer, from);
  };
}

/**
 * Uuid type factory
 *
 * @param {function(name, size, value)} validator hexadecimal validator
 * @param {function(validator, value, buffer, from)} encoder function accepting validator, value, buffer, position and returns modified buffer
 * @param {function(serizalizer, size, name)} factory type builder factory
 * @returns {Object} hex type
 * @private
 */
function Uuid(validator, serializer, factory) {
  var size = 16;
  var name = 'Uuid';

  function cleaner(value) {
    return String(value).replace(/-/g, '');
  }

  validator = validator.bind(null, name, size);
  serializer = serializer(function (value) {
    return validator(cleaner(value));
  });

  return factory(serializer, size, name);
}

/**
 * Hash type factory
 *
 * @param {function(name, size, value)} validator hexadecimal validator
 * @param {function(validator, value, buffer, from)} encoder function accepting validator, value, buffer, position and returns modified buffer
 * @param {function(serizalizer, size, name)} factory type builder factory
 * @returns {Object} hex type
 * @private
 */
function Hash(validator, serializer, factory) {
  var size = HASH_LENGTH;
  var name = 'Hash';

  validator = validator.bind(null, name, size);
  serializer = serializer(validator);

  var hasher = function hasher(value) {
    return validator(value) && value;
  };

  return Object.defineProperty(factory(serializer, size, name), 'hash', {
    value: hasher
  });
}

/**
 * Digest type factory
 *
 * @param {function(name, size, value)} validator hexadecimal validator
 * @param {function(validator, value, buffer, from)} encoder function accepting validator, value, buffer, position and returns modified buffer
 * @param {function(serizalizer, size, name)} factory type builder factory
 * @returns {Object} hex type
 * @private
 */
function Digest(validator, serializer, factory) {
  var size = 64;
  var name = 'Digest';

  validator = validator.bind(null, name, size);
  serializer = serializer(validator);

  return factory(serializer, size, name);
}

/**
 * PublicKey type factory
 *
 * @param {function(name, size, value)} validator hexadecimal validator
 * @param {function(validator, value, buffer, from)} encoder function accepting validator, value, buffer, position and returns modified buffer
 * @param {function(serizalizer, size, name)} factory type builder factory
 * @returns {Object} hex type
 * @private
 */
function PublicKey(validator, serializer, factory) {
  var size = PUBLIC_KEY_LENGTH;
  var name = 'PublicKey';

  validator = validator.bind(null, name, size);
  serializer = serializer(validator);

  return factory(serializer, size, name);
}

var baseSerializer = serializer.bind(null, insertHexadecimalToByteArray);

var uuid = Uuid(validateHexadecimal, baseSerializer, hexTypeFactory);
var hash = Hash(validateHexadecimal, baseSerializer, hexTypeFactory);
var digest = Digest(validateHexadecimal, baseSerializer, hexTypeFactory);
var publicKey = PublicKey(validateHexadecimal, baseSerializer, hexTypeFactory);

exports.Uuid = uuid;
exports.Hash = hash;
exports.Digest = digest;
exports.PublicKey = publicKey;

},{"./validate":81}],78:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _primitive = require('./primitive');

Object.keys(_primitive).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _primitive[key];
    }
  });
});

var _generic = require('./generic');

Object.keys(_generic).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _generic[key];
    }
  });
});

var _message = require('./message');

Object.keys(_message).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _message[key];
    }
  });
});

var _convert = require('./convert');

Object.keys(_convert).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _convert[key];
    }
  });
});

var _hexadecimal = require('./hexadecimal');

Object.keys(_hexadecimal).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _hexadecimal[key];
    }
  });
});

},{"./convert":75,"./generic":76,"./hexadecimal":77,"./message":79,"./primitive":80}],79:[function(require,module,exports){
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

},{"../blockchain/transport":71,"../crypto":72,"../helpers":73,"./hexadecimal":77,"./primitive":80}],80:[function(require,module,exports){
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

},{"./validate":81,"big-integer":34}],81:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateInteger = validateInteger;
exports.validateHexadecimal = validateHexadecimal;
exports.validateBytesArray = validateBytesArray;
exports.validateBinaryString = validateBinaryString;
/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @param {number} from
 * @param {number} length
 * @returns {boolean}
 */
function validateInteger(value, min, max, from, length) {
  if (typeof value !== 'number' || value < min || value > max) {
    return false;
  }

  return true;
}

/**
 * @param {string} hash
 * @param {number} [bytes=32] - optional
 * @returns {boolean}
 */
function validateHexadecimal(hash, bytes) {
  bytes = bytes || 32;

  if (typeof hash !== 'string') {
    return false;
  }
  if (hash.length !== bytes * 2) {
    // 'hexadecimal string is of wrong length
    return false;
  }

  for (var i = 0; i < hash.length; i++) {
    if (isNaN(parseInt(hash[i], 16))) {
      // invalid symbol in hexadecimal string
      return false;
    }
  }

  return true;
}

/**
 * @param {Array} arr
 * @param {number} [bytes] - optional
 * @returns {boolean}
 */
function validateBytesArray(arr, bytes) {
  if (!Array.isArray(arr) && !(arr instanceof Uint8Array)) {
    return false;
  }
  if (bytes && arr.length !== bytes) {
    // array is of wrong length
    return false;
  }

  for (var i = 0; i < arr.length; i++) {
    if (typeof arr[i] !== 'number' || arr[i] < 0 || arr[i] > 255) {
      return false;
    }
  }

  return true;
}

/**
 * @param {string} str
 * @param {number} [bits] - optional
 * @returns {*}
 */
function validateBinaryString(str, bits) {
  if (bits !== undefined && str.length !== bits) {
    return false;
  }

  for (var i = 0; i < str.length; i++) {
    if (str[i] !== '0' && str[i] !== '1') {
      // wrong bit
      return false;
    }
  }

  return true;
}

},{}]},{},[74])(74)
});
