(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __reExport = (target, module, desc) => {
    if (module && typeof module === "object" || typeof module === "function") {
      for (let key of __getOwnPropNames(module))
        if (!__hasOwnProp.call(target, key) && key !== "default")
          __defProp(target, key, { get: () => module[key], enumerable: !(desc = __getOwnPropDesc(module, key)) || desc.enumerable });
    }
    return target;
  };
  var __toModule = (module) => {
    return __reExport(__markAsModule(__defProp(module != null ? __create(__getProtoOf(module)) : {}, "default", module && module.__esModule && "default" in module ? { get: () => module.default, enumerable: true } : { value: module, enumerable: true })), module);
  };

  // node_modules/lodash/lodash.js
  var require_lodash = __commonJS({
    "node_modules/lodash/lodash.js"(exports, module) {
      (function() {
        var undefined2;
        var VERSION = "4.17.21";
        var LARGE_ARRAY_SIZE = 200;
        var CORE_ERROR_TEXT = "Unsupported core-js use. Try https://npms.io/search?q=ponyfill.", FUNC_ERROR_TEXT = "Expected a function", INVALID_TEMPL_VAR_ERROR_TEXT = "Invalid `variable` option passed into `_.template`";
        var HASH_UNDEFINED = "__lodash_hash_undefined__";
        var MAX_MEMOIZE_SIZE = 500;
        var PLACEHOLDER = "__lodash_placeholder__";
        var CLONE_DEEP_FLAG = 1, CLONE_FLAT_FLAG = 2, CLONE_SYMBOLS_FLAG = 4;
        var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
        var WRAP_BIND_FLAG = 1, WRAP_BIND_KEY_FLAG = 2, WRAP_CURRY_BOUND_FLAG = 4, WRAP_CURRY_FLAG = 8, WRAP_CURRY_RIGHT_FLAG = 16, WRAP_PARTIAL_FLAG = 32, WRAP_PARTIAL_RIGHT_FLAG = 64, WRAP_ARY_FLAG = 128, WRAP_REARG_FLAG = 256, WRAP_FLIP_FLAG = 512;
        var DEFAULT_TRUNC_LENGTH = 30, DEFAULT_TRUNC_OMISSION = "...";
        var HOT_COUNT = 800, HOT_SPAN = 16;
        var LAZY_FILTER_FLAG = 1, LAZY_MAP_FLAG = 2, LAZY_WHILE_FLAG = 3;
        var INFINITY = 1 / 0, MAX_SAFE_INTEGER = 9007199254740991, MAX_INTEGER = 17976931348623157e292, NAN = 0 / 0;
        var MAX_ARRAY_LENGTH = 4294967295, MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1, HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
        var wrapFlags = [
          ["ary", WRAP_ARY_FLAG],
          ["bind", WRAP_BIND_FLAG],
          ["bindKey", WRAP_BIND_KEY_FLAG],
          ["curry", WRAP_CURRY_FLAG],
          ["curryRight", WRAP_CURRY_RIGHT_FLAG],
          ["flip", WRAP_FLIP_FLAG],
          ["partial", WRAP_PARTIAL_FLAG],
          ["partialRight", WRAP_PARTIAL_RIGHT_FLAG],
          ["rearg", WRAP_REARG_FLAG]
        ];
        var argsTag = "[object Arguments]", arrayTag = "[object Array]", asyncTag = "[object AsyncFunction]", boolTag = "[object Boolean]", dateTag = "[object Date]", domExcTag = "[object DOMException]", errorTag = "[object Error]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", mapTag = "[object Map]", numberTag = "[object Number]", nullTag = "[object Null]", objectTag = "[object Object]", promiseTag = "[object Promise]", proxyTag = "[object Proxy]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", symbolTag = "[object Symbol]", undefinedTag = "[object Undefined]", weakMapTag = "[object WeakMap]", weakSetTag = "[object WeakSet]";
        var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
        var reEmptyStringLeading = /\b__p \+= '';/g, reEmptyStringMiddle = /\b(__p \+=) '' \+/g, reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
        var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g, reUnescapedHtml = /[&<>"']/g, reHasEscapedHtml = RegExp(reEscapedHtml.source), reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
        var reEscape = /<%-([\s\S]+?)%>/g, reEvaluate = /<%([\s\S]+?)%>/g, reInterpolate = /<%=([\s\S]+?)%>/g;
        var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/, rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
        var reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reHasRegExpChar = RegExp(reRegExpChar.source);
        var reTrimStart = /^\s+/;
        var reWhitespace = /\s/;
        var reWrapComment = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/, reWrapDetails = /\{\n\/\* \[wrapped with (.+)\] \*/, reSplitDetails = /,? & /;
        var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
        var reForbiddenIdentifierChars = /[()=,{}\[\]\/\s]/;
        var reEscapeChar = /\\(\\)?/g;
        var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
        var reFlags = /\w*$/;
        var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
        var reIsBinary = /^0b[01]+$/i;
        var reIsHostCtor = /^\[object .+?Constructor\]$/;
        var reIsOctal = /^0o[0-7]+$/i;
        var reIsUint = /^(?:0|[1-9]\d*)$/;
        var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
        var reNoMatch = /($^)/;
        var reUnescapedString = /['\n\r\u2028\u2029\\]/g;
        var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange, rsDingbatRange = "\\u2700-\\u27bf", rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff", rsMathOpRange = "\\xac\\xb1\\xd7\\xf7", rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", rsPunctuationRange = "\\u2000-\\u206f", rsSpaceRange = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde", rsVarRange = "\\ufe0e\\ufe0f", rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;
        var rsApos = "['\u2019]", rsAstral = "[" + rsAstralRange + "]", rsBreak = "[" + rsBreakRange + "]", rsCombo = "[" + rsComboRange + "]", rsDigits = "\\d+", rsDingbat = "[" + rsDingbatRange + "]", rsLower = "[" + rsLowerRange + "]", rsMisc = "[^" + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]", rsFitz = "\\ud83c[\\udffb-\\udfff]", rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")", rsNonAstral = "[^" + rsAstralRange + "]", rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsUpper = "[" + rsUpperRange + "]", rsZWJ = "\\u200d";
        var rsMiscLower = "(?:" + rsLower + "|" + rsMisc + ")", rsMiscUpper = "(?:" + rsUpper + "|" + rsMisc + ")", rsOptContrLower = "(?:" + rsApos + "(?:d|ll|m|re|s|t|ve))?", rsOptContrUpper = "(?:" + rsApos + "(?:D|LL|M|RE|S|T|VE))?", reOptMod = rsModifier + "?", rsOptVar = "[" + rsVarRange + "]?", rsOptJoin = "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*", rsOrdLower = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", rsOrdUpper = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", rsSeq = rsOptVar + reOptMod + rsOptJoin, rsEmoji = "(?:" + [rsDingbat, rsRegional, rsSurrPair].join("|") + ")" + rsSeq, rsSymbol = "(?:" + [rsNonAstral + rsCombo + "?", rsCombo, rsRegional, rsSurrPair, rsAstral].join("|") + ")";
        var reApos = RegExp(rsApos, "g");
        var reComboMark = RegExp(rsCombo, "g");
        var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
        var reUnicodeWord = RegExp([
          rsUpper + "?" + rsLower + "+" + rsOptContrLower + "(?=" + [rsBreak, rsUpper, "$"].join("|") + ")",
          rsMiscUpper + "+" + rsOptContrUpper + "(?=" + [rsBreak, rsUpper + rsMiscLower, "$"].join("|") + ")",
          rsUpper + "?" + rsMiscLower + "+" + rsOptContrLower,
          rsUpper + "+" + rsOptContrUpper,
          rsOrdUpper,
          rsOrdLower,
          rsDigits,
          rsEmoji
        ].join("|"), "g");
        var reHasUnicode = RegExp("[" + rsZWJ + rsAstralRange + rsComboRange + rsVarRange + "]");
        var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
        var contextProps = [
          "Array",
          "Buffer",
          "DataView",
          "Date",
          "Error",
          "Float32Array",
          "Float64Array",
          "Function",
          "Int8Array",
          "Int16Array",
          "Int32Array",
          "Map",
          "Math",
          "Object",
          "Promise",
          "RegExp",
          "Set",
          "String",
          "Symbol",
          "TypeError",
          "Uint8Array",
          "Uint8ClampedArray",
          "Uint16Array",
          "Uint32Array",
          "WeakMap",
          "_",
          "clearTimeout",
          "isFinite",
          "parseInt",
          "setTimeout"
        ];
        var templateCounter = -1;
        var typedArrayTags = {};
        typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
        typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
        var cloneableTags = {};
        cloneableTags[argsTag] = cloneableTags[arrayTag] = cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] = cloneableTags[boolTag] = cloneableTags[dateTag] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[mapTag] = cloneableTags[numberTag] = cloneableTags[objectTag] = cloneableTags[regexpTag] = cloneableTags[setTag] = cloneableTags[stringTag] = cloneableTags[symbolTag] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
        cloneableTags[errorTag] = cloneableTags[funcTag] = cloneableTags[weakMapTag] = false;
        var deburredLetters = {
          "\xC0": "A",
          "\xC1": "A",
          "\xC2": "A",
          "\xC3": "A",
          "\xC4": "A",
          "\xC5": "A",
          "\xE0": "a",
          "\xE1": "a",
          "\xE2": "a",
          "\xE3": "a",
          "\xE4": "a",
          "\xE5": "a",
          "\xC7": "C",
          "\xE7": "c",
          "\xD0": "D",
          "\xF0": "d",
          "\xC8": "E",
          "\xC9": "E",
          "\xCA": "E",
          "\xCB": "E",
          "\xE8": "e",
          "\xE9": "e",
          "\xEA": "e",
          "\xEB": "e",
          "\xCC": "I",
          "\xCD": "I",
          "\xCE": "I",
          "\xCF": "I",
          "\xEC": "i",
          "\xED": "i",
          "\xEE": "i",
          "\xEF": "i",
          "\xD1": "N",
          "\xF1": "n",
          "\xD2": "O",
          "\xD3": "O",
          "\xD4": "O",
          "\xD5": "O",
          "\xD6": "O",
          "\xD8": "O",
          "\xF2": "o",
          "\xF3": "o",
          "\xF4": "o",
          "\xF5": "o",
          "\xF6": "o",
          "\xF8": "o",
          "\xD9": "U",
          "\xDA": "U",
          "\xDB": "U",
          "\xDC": "U",
          "\xF9": "u",
          "\xFA": "u",
          "\xFB": "u",
          "\xFC": "u",
          "\xDD": "Y",
          "\xFD": "y",
          "\xFF": "y",
          "\xC6": "Ae",
          "\xE6": "ae",
          "\xDE": "Th",
          "\xFE": "th",
          "\xDF": "ss",
          "\u0100": "A",
          "\u0102": "A",
          "\u0104": "A",
          "\u0101": "a",
          "\u0103": "a",
          "\u0105": "a",
          "\u0106": "C",
          "\u0108": "C",
          "\u010A": "C",
          "\u010C": "C",
          "\u0107": "c",
          "\u0109": "c",
          "\u010B": "c",
          "\u010D": "c",
          "\u010E": "D",
          "\u0110": "D",
          "\u010F": "d",
          "\u0111": "d",
          "\u0112": "E",
          "\u0114": "E",
          "\u0116": "E",
          "\u0118": "E",
          "\u011A": "E",
          "\u0113": "e",
          "\u0115": "e",
          "\u0117": "e",
          "\u0119": "e",
          "\u011B": "e",
          "\u011C": "G",
          "\u011E": "G",
          "\u0120": "G",
          "\u0122": "G",
          "\u011D": "g",
          "\u011F": "g",
          "\u0121": "g",
          "\u0123": "g",
          "\u0124": "H",
          "\u0126": "H",
          "\u0125": "h",
          "\u0127": "h",
          "\u0128": "I",
          "\u012A": "I",
          "\u012C": "I",
          "\u012E": "I",
          "\u0130": "I",
          "\u0129": "i",
          "\u012B": "i",
          "\u012D": "i",
          "\u012F": "i",
          "\u0131": "i",
          "\u0134": "J",
          "\u0135": "j",
          "\u0136": "K",
          "\u0137": "k",
          "\u0138": "k",
          "\u0139": "L",
          "\u013B": "L",
          "\u013D": "L",
          "\u013F": "L",
          "\u0141": "L",
          "\u013A": "l",
          "\u013C": "l",
          "\u013E": "l",
          "\u0140": "l",
          "\u0142": "l",
          "\u0143": "N",
          "\u0145": "N",
          "\u0147": "N",
          "\u014A": "N",
          "\u0144": "n",
          "\u0146": "n",
          "\u0148": "n",
          "\u014B": "n",
          "\u014C": "O",
          "\u014E": "O",
          "\u0150": "O",
          "\u014D": "o",
          "\u014F": "o",
          "\u0151": "o",
          "\u0154": "R",
          "\u0156": "R",
          "\u0158": "R",
          "\u0155": "r",
          "\u0157": "r",
          "\u0159": "r",
          "\u015A": "S",
          "\u015C": "S",
          "\u015E": "S",
          "\u0160": "S",
          "\u015B": "s",
          "\u015D": "s",
          "\u015F": "s",
          "\u0161": "s",
          "\u0162": "T",
          "\u0164": "T",
          "\u0166": "T",
          "\u0163": "t",
          "\u0165": "t",
          "\u0167": "t",
          "\u0168": "U",
          "\u016A": "U",
          "\u016C": "U",
          "\u016E": "U",
          "\u0170": "U",
          "\u0172": "U",
          "\u0169": "u",
          "\u016B": "u",
          "\u016D": "u",
          "\u016F": "u",
          "\u0171": "u",
          "\u0173": "u",
          "\u0174": "W",
          "\u0175": "w",
          "\u0176": "Y",
          "\u0177": "y",
          "\u0178": "Y",
          "\u0179": "Z",
          "\u017B": "Z",
          "\u017D": "Z",
          "\u017A": "z",
          "\u017C": "z",
          "\u017E": "z",
          "\u0132": "IJ",
          "\u0133": "ij",
          "\u0152": "Oe",
          "\u0153": "oe",
          "\u0149": "'n",
          "\u017F": "s"
        };
        var htmlEscapes = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        };
        var htmlUnescapes = {
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&#39;": "'"
        };
        var stringEscapes = {
          "\\": "\\",
          "'": "'",
          "\n": "n",
          "\r": "r",
          "\u2028": "u2028",
          "\u2029": "u2029"
        };
        var freeParseFloat = parseFloat, freeParseInt = parseInt;
        var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
        var freeSelf = typeof self == "object" && self && self.Object === Object && self;
        var root = freeGlobal || freeSelf || Function("return this")();
        var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
        var freeModule = freeExports && typeof module == "object" && module && !module.nodeType && module;
        var moduleExports = freeModule && freeModule.exports === freeExports;
        var freeProcess = moduleExports && freeGlobal.process;
        var nodeUtil = function() {
          try {
            var types = freeModule && freeModule.require && freeModule.require("util").types;
            if (types) {
              return types;
            }
            return freeProcess && freeProcess.binding && freeProcess.binding("util");
          } catch (e) {
          }
        }();
        var nodeIsArrayBuffer = nodeUtil && nodeUtil.isArrayBuffer, nodeIsDate = nodeUtil && nodeUtil.isDate, nodeIsMap = nodeUtil && nodeUtil.isMap, nodeIsRegExp = nodeUtil && nodeUtil.isRegExp, nodeIsSet = nodeUtil && nodeUtil.isSet, nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
        function apply(func, thisArg, args) {
          switch (args.length) {
            case 0:
              return func.call(thisArg);
            case 1:
              return func.call(thisArg, args[0]);
            case 2:
              return func.call(thisArg, args[0], args[1]);
            case 3:
              return func.call(thisArg, args[0], args[1], args[2]);
          }
          return func.apply(thisArg, args);
        }
        function arrayAggregator(array, setter, iteratee, accumulator) {
          var index = -1, length = array == null ? 0 : array.length;
          while (++index < length) {
            var value = array[index];
            setter(accumulator, value, iteratee(value), array);
          }
          return accumulator;
        }
        function arrayEach(array, iteratee) {
          var index = -1, length = array == null ? 0 : array.length;
          while (++index < length) {
            if (iteratee(array[index], index, array) === false) {
              break;
            }
          }
          return array;
        }
        function arrayEachRight(array, iteratee) {
          var length = array == null ? 0 : array.length;
          while (length--) {
            if (iteratee(array[length], length, array) === false) {
              break;
            }
          }
          return array;
        }
        function arrayEvery(array, predicate) {
          var index = -1, length = array == null ? 0 : array.length;
          while (++index < length) {
            if (!predicate(array[index], index, array)) {
              return false;
            }
          }
          return true;
        }
        function arrayFilter(array, predicate) {
          var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
          while (++index < length) {
            var value = array[index];
            if (predicate(value, index, array)) {
              result[resIndex++] = value;
            }
          }
          return result;
        }
        function arrayIncludes(array, value) {
          var length = array == null ? 0 : array.length;
          return !!length && baseIndexOf(array, value, 0) > -1;
        }
        function arrayIncludesWith(array, value, comparator) {
          var index = -1, length = array == null ? 0 : array.length;
          while (++index < length) {
            if (comparator(value, array[index])) {
              return true;
            }
          }
          return false;
        }
        function arrayMap(array, iteratee) {
          var index = -1, length = array == null ? 0 : array.length, result = Array(length);
          while (++index < length) {
            result[index] = iteratee(array[index], index, array);
          }
          return result;
        }
        function arrayPush(array, values) {
          var index = -1, length = values.length, offset = array.length;
          while (++index < length) {
            array[offset + index] = values[index];
          }
          return array;
        }
        function arrayReduce(array, iteratee, accumulator, initAccum) {
          var index = -1, length = array == null ? 0 : array.length;
          if (initAccum && length) {
            accumulator = array[++index];
          }
          while (++index < length) {
            accumulator = iteratee(accumulator, array[index], index, array);
          }
          return accumulator;
        }
        function arrayReduceRight(array, iteratee, accumulator, initAccum) {
          var length = array == null ? 0 : array.length;
          if (initAccum && length) {
            accumulator = array[--length];
          }
          while (length--) {
            accumulator = iteratee(accumulator, array[length], length, array);
          }
          return accumulator;
        }
        function arraySome(array, predicate) {
          var index = -1, length = array == null ? 0 : array.length;
          while (++index < length) {
            if (predicate(array[index], index, array)) {
              return true;
            }
          }
          return false;
        }
        var asciiSize = baseProperty("length");
        function asciiToArray(string) {
          return string.split("");
        }
        function asciiWords(string) {
          return string.match(reAsciiWord) || [];
        }
        function baseFindKey(collection2, predicate, eachFunc) {
          var result;
          eachFunc(collection2, function(value, key, collection3) {
            if (predicate(value, key, collection3)) {
              result = key;
              return false;
            }
          });
          return result;
        }
        function baseFindIndex(array, predicate, fromIndex, fromRight) {
          var length = array.length, index = fromIndex + (fromRight ? 1 : -1);
          while (fromRight ? index-- : ++index < length) {
            if (predicate(array[index], index, array)) {
              return index;
            }
          }
          return -1;
        }
        function baseIndexOf(array, value, fromIndex) {
          return value === value ? strictIndexOf(array, value, fromIndex) : baseFindIndex(array, baseIsNaN, fromIndex);
        }
        function baseIndexOfWith(array, value, fromIndex, comparator) {
          var index = fromIndex - 1, length = array.length;
          while (++index < length) {
            if (comparator(array[index], value)) {
              return index;
            }
          }
          return -1;
        }
        function baseIsNaN(value) {
          return value !== value;
        }
        function baseMean(array, iteratee) {
          var length = array == null ? 0 : array.length;
          return length ? baseSum(array, iteratee) / length : NAN;
        }
        function baseProperty(key) {
          return function(object) {
            return object == null ? undefined2 : object[key];
          };
        }
        function basePropertyOf(object) {
          return function(key) {
            return object == null ? undefined2 : object[key];
          };
        }
        function baseReduce(collection2, iteratee, accumulator, initAccum, eachFunc) {
          eachFunc(collection2, function(value, index, collection3) {
            accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index, collection3);
          });
          return accumulator;
        }
        function baseSortBy(array, comparer) {
          var length = array.length;
          array.sort(comparer);
          while (length--) {
            array[length] = array[length].value;
          }
          return array;
        }
        function baseSum(array, iteratee) {
          var result, index = -1, length = array.length;
          while (++index < length) {
            var current = iteratee(array[index]);
            if (current !== undefined2) {
              result = result === undefined2 ? current : result + current;
            }
          }
          return result;
        }
        function baseTimes(n, iteratee) {
          var index = -1, result = Array(n);
          while (++index < n) {
            result[index] = iteratee(index);
          }
          return result;
        }
        function baseToPairs(object, props) {
          return arrayMap(props, function(key) {
            return [key, object[key]];
          });
        }
        function baseTrim(string) {
          return string ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, "") : string;
        }
        function baseUnary(func) {
          return function(value) {
            return func(value);
          };
        }
        function baseValues(object, props) {
          return arrayMap(props, function(key) {
            return object[key];
          });
        }
        function cacheHas(cache, key) {
          return cache.has(key);
        }
        function charsStartIndex(strSymbols, chrSymbols) {
          var index = -1, length = strSymbols.length;
          while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {
          }
          return index;
        }
        function charsEndIndex(strSymbols, chrSymbols) {
          var index = strSymbols.length;
          while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {
          }
          return index;
        }
        function countHolders(array, placeholder) {
          var length = array.length, result = 0;
          while (length--) {
            if (array[length] === placeholder) {
              ++result;
            }
          }
          return result;
        }
        var deburrLetter = basePropertyOf(deburredLetters);
        var escapeHtmlChar = basePropertyOf(htmlEscapes);
        function escapeStringChar(chr) {
          return "\\" + stringEscapes[chr];
        }
        function getValue(object, key) {
          return object == null ? undefined2 : object[key];
        }
        function hasUnicode(string) {
          return reHasUnicode.test(string);
        }
        function hasUnicodeWord(string) {
          return reHasUnicodeWord.test(string);
        }
        function iteratorToArray(iterator) {
          var data, result = [];
          while (!(data = iterator.next()).done) {
            result.push(data.value);
          }
          return result;
        }
        function mapToArray(map) {
          var index = -1, result = Array(map.size);
          map.forEach(function(value, key) {
            result[++index] = [key, value];
          });
          return result;
        }
        function overArg(func, transform) {
          return function(arg) {
            return func(transform(arg));
          };
        }
        function replaceHolders(array, placeholder) {
          var index = -1, length = array.length, resIndex = 0, result = [];
          while (++index < length) {
            var value = array[index];
            if (value === placeholder || value === PLACEHOLDER) {
              array[index] = PLACEHOLDER;
              result[resIndex++] = index;
            }
          }
          return result;
        }
        function setToArray(set) {
          var index = -1, result = Array(set.size);
          set.forEach(function(value) {
            result[++index] = value;
          });
          return result;
        }
        function setToPairs(set) {
          var index = -1, result = Array(set.size);
          set.forEach(function(value) {
            result[++index] = [value, value];
          });
          return result;
        }
        function strictIndexOf(array, value, fromIndex) {
          var index = fromIndex - 1, length = array.length;
          while (++index < length) {
            if (array[index] === value) {
              return index;
            }
          }
          return -1;
        }
        function strictLastIndexOf(array, value, fromIndex) {
          var index = fromIndex + 1;
          while (index--) {
            if (array[index] === value) {
              return index;
            }
          }
          return index;
        }
        function stringSize(string) {
          return hasUnicode(string) ? unicodeSize(string) : asciiSize(string);
        }
        function stringToArray(string) {
          return hasUnicode(string) ? unicodeToArray(string) : asciiToArray(string);
        }
        function trimmedEndIndex(string) {
          var index = string.length;
          while (index-- && reWhitespace.test(string.charAt(index))) {
          }
          return index;
        }
        var unescapeHtmlChar = basePropertyOf(htmlUnescapes);
        function unicodeSize(string) {
          var result = reUnicode.lastIndex = 0;
          while (reUnicode.test(string)) {
            ++result;
          }
          return result;
        }
        function unicodeToArray(string) {
          return string.match(reUnicode) || [];
        }
        function unicodeWords(string) {
          return string.match(reUnicodeWord) || [];
        }
        var runInContext = function runInContext2(context) {
          context = context == null ? root : _.defaults(root.Object(), context, _.pick(root, contextProps));
          var Array2 = context.Array, Date = context.Date, Error2 = context.Error, Function2 = context.Function, Math2 = context.Math, Object2 = context.Object, RegExp2 = context.RegExp, String2 = context.String, TypeError2 = context.TypeError;
          var arrayProto = Array2.prototype, funcProto = Function2.prototype, objectProto = Object2.prototype;
          var coreJsData = context["__core-js_shared__"];
          var funcToString = funcProto.toString;
          var hasOwnProperty = objectProto.hasOwnProperty;
          var idCounter = 0;
          var maskSrcKey = function() {
            var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
            return uid ? "Symbol(src)_1." + uid : "";
          }();
          var nativeObjectToString = objectProto.toString;
          var objectCtorString = funcToString.call(Object2);
          var oldDash = root._;
          var reIsNative = RegExp2("^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
          var Buffer2 = moduleExports ? context.Buffer : undefined2, Symbol2 = context.Symbol, Uint8Array2 = context.Uint8Array, allocUnsafe = Buffer2 ? Buffer2.allocUnsafe : undefined2, getPrototype = overArg(Object2.getPrototypeOf, Object2), objectCreate = Object2.create, propertyIsEnumerable = objectProto.propertyIsEnumerable, splice = arrayProto.splice, spreadableSymbol = Symbol2 ? Symbol2.isConcatSpreadable : undefined2, symIterator = Symbol2 ? Symbol2.iterator : undefined2, symToStringTag = Symbol2 ? Symbol2.toStringTag : undefined2;
          var defineProperty = function() {
            try {
              var func = getNative(Object2, "defineProperty");
              func({}, "", {});
              return func;
            } catch (e) {
            }
          }();
          var ctxClearTimeout = context.clearTimeout !== root.clearTimeout && context.clearTimeout, ctxNow = Date && Date.now !== root.Date.now && Date.now, ctxSetTimeout = context.setTimeout !== root.setTimeout && context.setTimeout;
          var nativeCeil = Math2.ceil, nativeFloor = Math2.floor, nativeGetSymbols = Object2.getOwnPropertySymbols, nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : undefined2, nativeIsFinite = context.isFinite, nativeJoin = arrayProto.join, nativeKeys = overArg(Object2.keys, Object2), nativeMax = Math2.max, nativeMin = Math2.min, nativeNow = Date.now, nativeParseInt = context.parseInt, nativeRandom = Math2.random, nativeReverse = arrayProto.reverse;
          var DataView = getNative(context, "DataView"), Map2 = getNative(context, "Map"), Promise2 = getNative(context, "Promise"), Set2 = getNative(context, "Set"), WeakMap2 = getNative(context, "WeakMap"), nativeCreate = getNative(Object2, "create");
          var metaMap = WeakMap2 && new WeakMap2();
          var realNames = {};
          var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map2), promiseCtorString = toSource(Promise2), setCtorString = toSource(Set2), weakMapCtorString = toSource(WeakMap2);
          var symbolProto = Symbol2 ? Symbol2.prototype : undefined2, symbolValueOf = symbolProto ? symbolProto.valueOf : undefined2, symbolToString = symbolProto ? symbolProto.toString : undefined2;
          function lodash(value) {
            if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
              if (value instanceof LodashWrapper) {
                return value;
              }
              if (hasOwnProperty.call(value, "__wrapped__")) {
                return wrapperClone(value);
              }
            }
            return new LodashWrapper(value);
          }
          var baseCreate = function() {
            function object() {
            }
            return function(proto) {
              if (!isObject(proto)) {
                return {};
              }
              if (objectCreate) {
                return objectCreate(proto);
              }
              object.prototype = proto;
              var result2 = new object();
              object.prototype = undefined2;
              return result2;
            };
          }();
          function baseLodash() {
          }
          function LodashWrapper(value, chainAll) {
            this.__wrapped__ = value;
            this.__actions__ = [];
            this.__chain__ = !!chainAll;
            this.__index__ = 0;
            this.__values__ = undefined2;
          }
          lodash.templateSettings = {
            "escape": reEscape,
            "evaluate": reEvaluate,
            "interpolate": reInterpolate,
            "variable": "",
            "imports": {
              "_": lodash
            }
          };
          lodash.prototype = baseLodash.prototype;
          lodash.prototype.constructor = lodash;
          LodashWrapper.prototype = baseCreate(baseLodash.prototype);
          LodashWrapper.prototype.constructor = LodashWrapper;
          function LazyWrapper(value) {
            this.__wrapped__ = value;
            this.__actions__ = [];
            this.__dir__ = 1;
            this.__filtered__ = false;
            this.__iteratees__ = [];
            this.__takeCount__ = MAX_ARRAY_LENGTH;
            this.__views__ = [];
          }
          function lazyClone() {
            var result2 = new LazyWrapper(this.__wrapped__);
            result2.__actions__ = copyArray(this.__actions__);
            result2.__dir__ = this.__dir__;
            result2.__filtered__ = this.__filtered__;
            result2.__iteratees__ = copyArray(this.__iteratees__);
            result2.__takeCount__ = this.__takeCount__;
            result2.__views__ = copyArray(this.__views__);
            return result2;
          }
          function lazyReverse() {
            if (this.__filtered__) {
              var result2 = new LazyWrapper(this);
              result2.__dir__ = -1;
              result2.__filtered__ = true;
            } else {
              result2 = this.clone();
              result2.__dir__ *= -1;
            }
            return result2;
          }
          function lazyValue() {
            var array = this.__wrapped__.value(), dir = this.__dir__, isArr = isArray(array), isRight = dir < 0, arrLength = isArr ? array.length : 0, view = getView(0, arrLength, this.__views__), start = view.start, end = view.end, length = end - start, index = isRight ? end : start - 1, iteratees = this.__iteratees__, iterLength = iteratees.length, resIndex = 0, takeCount = nativeMin(length, this.__takeCount__);
            if (!isArr || !isRight && arrLength == length && takeCount == length) {
              return baseWrapperValue(array, this.__actions__);
            }
            var result2 = [];
            outer:
              while (length-- && resIndex < takeCount) {
                index += dir;
                var iterIndex = -1, value = array[index];
                while (++iterIndex < iterLength) {
                  var data = iteratees[iterIndex], iteratee2 = data.iteratee, type = data.type, computed = iteratee2(value);
                  if (type == LAZY_MAP_FLAG) {
                    value = computed;
                  } else if (!computed) {
                    if (type == LAZY_FILTER_FLAG) {
                      continue outer;
                    } else {
                      break outer;
                    }
                  }
                }
                result2[resIndex++] = value;
              }
            return result2;
          }
          LazyWrapper.prototype = baseCreate(baseLodash.prototype);
          LazyWrapper.prototype.constructor = LazyWrapper;
          function Hash(entries) {
            var index = -1, length = entries == null ? 0 : entries.length;
            this.clear();
            while (++index < length) {
              var entry = entries[index];
              this.set(entry[0], entry[1]);
            }
          }
          function hashClear() {
            this.__data__ = nativeCreate ? nativeCreate(null) : {};
            this.size = 0;
          }
          function hashDelete(key) {
            var result2 = this.has(key) && delete this.__data__[key];
            this.size -= result2 ? 1 : 0;
            return result2;
          }
          function hashGet(key) {
            var data = this.__data__;
            if (nativeCreate) {
              var result2 = data[key];
              return result2 === HASH_UNDEFINED ? undefined2 : result2;
            }
            return hasOwnProperty.call(data, key) ? data[key] : undefined2;
          }
          function hashHas(key) {
            var data = this.__data__;
            return nativeCreate ? data[key] !== undefined2 : hasOwnProperty.call(data, key);
          }
          function hashSet(key, value) {
            var data = this.__data__;
            this.size += this.has(key) ? 0 : 1;
            data[key] = nativeCreate && value === undefined2 ? HASH_UNDEFINED : value;
            return this;
          }
          Hash.prototype.clear = hashClear;
          Hash.prototype["delete"] = hashDelete;
          Hash.prototype.get = hashGet;
          Hash.prototype.has = hashHas;
          Hash.prototype.set = hashSet;
          function ListCache(entries) {
            var index = -1, length = entries == null ? 0 : entries.length;
            this.clear();
            while (++index < length) {
              var entry = entries[index];
              this.set(entry[0], entry[1]);
            }
          }
          function listCacheClear() {
            this.__data__ = [];
            this.size = 0;
          }
          function listCacheDelete(key) {
            var data = this.__data__, index = assocIndexOf(data, key);
            if (index < 0) {
              return false;
            }
            var lastIndex = data.length - 1;
            if (index == lastIndex) {
              data.pop();
            } else {
              splice.call(data, index, 1);
            }
            --this.size;
            return true;
          }
          function listCacheGet(key) {
            var data = this.__data__, index = assocIndexOf(data, key);
            return index < 0 ? undefined2 : data[index][1];
          }
          function listCacheHas(key) {
            return assocIndexOf(this.__data__, key) > -1;
          }
          function listCacheSet(key, value) {
            var data = this.__data__, index = assocIndexOf(data, key);
            if (index < 0) {
              ++this.size;
              data.push([key, value]);
            } else {
              data[index][1] = value;
            }
            return this;
          }
          ListCache.prototype.clear = listCacheClear;
          ListCache.prototype["delete"] = listCacheDelete;
          ListCache.prototype.get = listCacheGet;
          ListCache.prototype.has = listCacheHas;
          ListCache.prototype.set = listCacheSet;
          function MapCache(entries) {
            var index = -1, length = entries == null ? 0 : entries.length;
            this.clear();
            while (++index < length) {
              var entry = entries[index];
              this.set(entry[0], entry[1]);
            }
          }
          function mapCacheClear() {
            this.size = 0;
            this.__data__ = {
              "hash": new Hash(),
              "map": new (Map2 || ListCache)(),
              "string": new Hash()
            };
          }
          function mapCacheDelete(key) {
            var result2 = getMapData(this, key)["delete"](key);
            this.size -= result2 ? 1 : 0;
            return result2;
          }
          function mapCacheGet(key) {
            return getMapData(this, key).get(key);
          }
          function mapCacheHas(key) {
            return getMapData(this, key).has(key);
          }
          function mapCacheSet(key, value) {
            var data = getMapData(this, key), size2 = data.size;
            data.set(key, value);
            this.size += data.size == size2 ? 0 : 1;
            return this;
          }
          MapCache.prototype.clear = mapCacheClear;
          MapCache.prototype["delete"] = mapCacheDelete;
          MapCache.prototype.get = mapCacheGet;
          MapCache.prototype.has = mapCacheHas;
          MapCache.prototype.set = mapCacheSet;
          function SetCache(values2) {
            var index = -1, length = values2 == null ? 0 : values2.length;
            this.__data__ = new MapCache();
            while (++index < length) {
              this.add(values2[index]);
            }
          }
          function setCacheAdd(value) {
            this.__data__.set(value, HASH_UNDEFINED);
            return this;
          }
          function setCacheHas(value) {
            return this.__data__.has(value);
          }
          SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
          SetCache.prototype.has = setCacheHas;
          function Stack(entries) {
            var data = this.__data__ = new ListCache(entries);
            this.size = data.size;
          }
          function stackClear() {
            this.__data__ = new ListCache();
            this.size = 0;
          }
          function stackDelete(key) {
            var data = this.__data__, result2 = data["delete"](key);
            this.size = data.size;
            return result2;
          }
          function stackGet(key) {
            return this.__data__.get(key);
          }
          function stackHas(key) {
            return this.__data__.has(key);
          }
          function stackSet(key, value) {
            var data = this.__data__;
            if (data instanceof ListCache) {
              var pairs = data.__data__;
              if (!Map2 || pairs.length < LARGE_ARRAY_SIZE - 1) {
                pairs.push([key, value]);
                this.size = ++data.size;
                return this;
              }
              data = this.__data__ = new MapCache(pairs);
            }
            data.set(key, value);
            this.size = data.size;
            return this;
          }
          Stack.prototype.clear = stackClear;
          Stack.prototype["delete"] = stackDelete;
          Stack.prototype.get = stackGet;
          Stack.prototype.has = stackHas;
          Stack.prototype.set = stackSet;
          function arrayLikeKeys(value, inherited) {
            var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result2 = skipIndexes ? baseTimes(value.length, String2) : [], length = result2.length;
            for (var key in value) {
              if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && (key == "length" || isBuff && (key == "offset" || key == "parent") || isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || isIndex(key, length)))) {
                result2.push(key);
              }
            }
            return result2;
          }
          function arraySample(array) {
            var length = array.length;
            return length ? array[baseRandom(0, length - 1)] : undefined2;
          }
          function arraySampleSize(array, n) {
            return shuffleSelf(copyArray(array), baseClamp(n, 0, array.length));
          }
          function arrayShuffle(array) {
            return shuffleSelf(copyArray(array));
          }
          function assignMergeValue(object, key, value) {
            if (value !== undefined2 && !eq(object[key], value) || value === undefined2 && !(key in object)) {
              baseAssignValue(object, key, value);
            }
          }
          function assignValue(object, key, value) {
            var objValue = object[key];
            if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || value === undefined2 && !(key in object)) {
              baseAssignValue(object, key, value);
            }
          }
          function assocIndexOf(array, key) {
            var length = array.length;
            while (length--) {
              if (eq(array[length][0], key)) {
                return length;
              }
            }
            return -1;
          }
          function baseAggregator(collection2, setter, iteratee2, accumulator) {
            baseEach(collection2, function(value, key, collection3) {
              setter(accumulator, value, iteratee2(value), collection3);
            });
            return accumulator;
          }
          function baseAssign(object, source) {
            return object && copyObject(source, keys2(source), object);
          }
          function baseAssignIn(object, source) {
            return object && copyObject(source, keysIn(source), object);
          }
          function baseAssignValue(object, key, value) {
            if (key == "__proto__" && defineProperty) {
              defineProperty(object, key, {
                "configurable": true,
                "enumerable": true,
                "value": value,
                "writable": true
              });
            } else {
              object[key] = value;
            }
          }
          function baseAt(object, paths) {
            var index = -1, length = paths.length, result2 = Array2(length), skip = object == null;
            while (++index < length) {
              result2[index] = skip ? undefined2 : get(object, paths[index]);
            }
            return result2;
          }
          function baseClamp(number, lower, upper) {
            if (number === number) {
              if (upper !== undefined2) {
                number = number <= upper ? number : upper;
              }
              if (lower !== undefined2) {
                number = number >= lower ? number : lower;
              }
            }
            return number;
          }
          function baseClone(value, bitmask, customizer, key, object, stack) {
            var result2, isDeep = bitmask & CLONE_DEEP_FLAG, isFlat = bitmask & CLONE_FLAT_FLAG, isFull = bitmask & CLONE_SYMBOLS_FLAG;
            if (customizer) {
              result2 = object ? customizer(value, key, object, stack) : customizer(value);
            }
            if (result2 !== undefined2) {
              return result2;
            }
            if (!isObject(value)) {
              return value;
            }
            var isArr = isArray(value);
            if (isArr) {
              result2 = initCloneArray(value);
              if (!isDeep) {
                return copyArray(value, result2);
              }
            } else {
              var tag = getTag(value), isFunc = tag == funcTag || tag == genTag;
              if (isBuffer(value)) {
                return cloneBuffer(value, isDeep);
              }
              if (tag == objectTag || tag == argsTag || isFunc && !object) {
                result2 = isFlat || isFunc ? {} : initCloneObject(value);
                if (!isDeep) {
                  return isFlat ? copySymbolsIn(value, baseAssignIn(result2, value)) : copySymbols(value, baseAssign(result2, value));
                }
              } else {
                if (!cloneableTags[tag]) {
                  return object ? value : {};
                }
                result2 = initCloneByTag(value, tag, isDeep);
              }
            }
            stack || (stack = new Stack());
            var stacked = stack.get(value);
            if (stacked) {
              return stacked;
            }
            stack.set(value, result2);
            if (isSet(value)) {
              value.forEach(function(subValue) {
                result2.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
              });
            } else if (isMap(value)) {
              value.forEach(function(subValue, key2) {
                result2.set(key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
              });
            }
            var keysFunc = isFull ? isFlat ? getAllKeysIn : getAllKeys : isFlat ? keysIn : keys2;
            var props = isArr ? undefined2 : keysFunc(value);
            arrayEach(props || value, function(subValue, key2) {
              if (props) {
                key2 = subValue;
                subValue = value[key2];
              }
              assignValue(result2, key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
            });
            return result2;
          }
          function baseConforms(source) {
            var props = keys2(source);
            return function(object) {
              return baseConformsTo(object, source, props);
            };
          }
          function baseConformsTo(object, source, props) {
            var length = props.length;
            if (object == null) {
              return !length;
            }
            object = Object2(object);
            while (length--) {
              var key = props[length], predicate = source[key], value = object[key];
              if (value === undefined2 && !(key in object) || !predicate(value)) {
                return false;
              }
            }
            return true;
          }
          function baseDelay(func, wait, args) {
            if (typeof func != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            return setTimeout2(function() {
              func.apply(undefined2, args);
            }, wait);
          }
          function baseDifference(array, values2, iteratee2, comparator) {
            var index = -1, includes2 = arrayIncludes, isCommon = true, length = array.length, result2 = [], valuesLength = values2.length;
            if (!length) {
              return result2;
            }
            if (iteratee2) {
              values2 = arrayMap(values2, baseUnary(iteratee2));
            }
            if (comparator) {
              includes2 = arrayIncludesWith;
              isCommon = false;
            } else if (values2.length >= LARGE_ARRAY_SIZE) {
              includes2 = cacheHas;
              isCommon = false;
              values2 = new SetCache(values2);
            }
            outer:
              while (++index < length) {
                var value = array[index], computed = iteratee2 == null ? value : iteratee2(value);
                value = comparator || value !== 0 ? value : 0;
                if (isCommon && computed === computed) {
                  var valuesIndex = valuesLength;
                  while (valuesIndex--) {
                    if (values2[valuesIndex] === computed) {
                      continue outer;
                    }
                  }
                  result2.push(value);
                } else if (!includes2(values2, computed, comparator)) {
                  result2.push(value);
                }
              }
            return result2;
          }
          var baseEach = createBaseEach(baseForOwn);
          var baseEachRight = createBaseEach(baseForOwnRight, true);
          function baseEvery(collection2, predicate) {
            var result2 = true;
            baseEach(collection2, function(value, index, collection3) {
              result2 = !!predicate(value, index, collection3);
              return result2;
            });
            return result2;
          }
          function baseExtremum(array, iteratee2, comparator) {
            var index = -1, length = array.length;
            while (++index < length) {
              var value = array[index], current = iteratee2(value);
              if (current != null && (computed === undefined2 ? current === current && !isSymbol(current) : comparator(current, computed))) {
                var computed = current, result2 = value;
              }
            }
            return result2;
          }
          function baseFill(array, value, start, end) {
            var length = array.length;
            start = toInteger(start);
            if (start < 0) {
              start = -start > length ? 0 : length + start;
            }
            end = end === undefined2 || end > length ? length : toInteger(end);
            if (end < 0) {
              end += length;
            }
            end = start > end ? 0 : toLength(end);
            while (start < end) {
              array[start++] = value;
            }
            return array;
          }
          function baseFilter(collection2, predicate) {
            var result2 = [];
            baseEach(collection2, function(value, index, collection3) {
              if (predicate(value, index, collection3)) {
                result2.push(value);
              }
            });
            return result2;
          }
          function baseFlatten(array, depth, predicate, isStrict, result2) {
            var index = -1, length = array.length;
            predicate || (predicate = isFlattenable);
            result2 || (result2 = []);
            while (++index < length) {
              var value = array[index];
              if (depth > 0 && predicate(value)) {
                if (depth > 1) {
                  baseFlatten(value, depth - 1, predicate, isStrict, result2);
                } else {
                  arrayPush(result2, value);
                }
              } else if (!isStrict) {
                result2[result2.length] = value;
              }
            }
            return result2;
          }
          var baseFor = createBaseFor();
          var baseForRight = createBaseFor(true);
          function baseForOwn(object, iteratee2) {
            return object && baseFor(object, iteratee2, keys2);
          }
          function baseForOwnRight(object, iteratee2) {
            return object && baseForRight(object, iteratee2, keys2);
          }
          function baseFunctions(object, props) {
            return arrayFilter(props, function(key) {
              return isFunction(object[key]);
            });
          }
          function baseGet(object, path) {
            path = castPath(path, object);
            var index = 0, length = path.length;
            while (object != null && index < length) {
              object = object[toKey(path[index++])];
            }
            return index && index == length ? object : undefined2;
          }
          function baseGetAllKeys(object, keysFunc, symbolsFunc) {
            var result2 = keysFunc(object);
            return isArray(object) ? result2 : arrayPush(result2, symbolsFunc(object));
          }
          function baseGetTag(value) {
            if (value == null) {
              return value === undefined2 ? undefinedTag : nullTag;
            }
            return symToStringTag && symToStringTag in Object2(value) ? getRawTag(value) : objectToString(value);
          }
          function baseGt(value, other) {
            return value > other;
          }
          function baseHas(object, key) {
            return object != null && hasOwnProperty.call(object, key);
          }
          function baseHasIn(object, key) {
            return object != null && key in Object2(object);
          }
          function baseInRange(number, start, end) {
            return number >= nativeMin(start, end) && number < nativeMax(start, end);
          }
          function baseIntersection(arrays, iteratee2, comparator) {
            var includes2 = comparator ? arrayIncludesWith : arrayIncludes, length = arrays[0].length, othLength = arrays.length, othIndex = othLength, caches = Array2(othLength), maxLength = Infinity, result2 = [];
            while (othIndex--) {
              var array = arrays[othIndex];
              if (othIndex && iteratee2) {
                array = arrayMap(array, baseUnary(iteratee2));
              }
              maxLength = nativeMin(array.length, maxLength);
              caches[othIndex] = !comparator && (iteratee2 || length >= 120 && array.length >= 120) ? new SetCache(othIndex && array) : undefined2;
            }
            array = arrays[0];
            var index = -1, seen = caches[0];
            outer:
              while (++index < length && result2.length < maxLength) {
                var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
                value = comparator || value !== 0 ? value : 0;
                if (!(seen ? cacheHas(seen, computed) : includes2(result2, computed, comparator))) {
                  othIndex = othLength;
                  while (--othIndex) {
                    var cache = caches[othIndex];
                    if (!(cache ? cacheHas(cache, computed) : includes2(arrays[othIndex], computed, comparator))) {
                      continue outer;
                    }
                  }
                  if (seen) {
                    seen.push(computed);
                  }
                  result2.push(value);
                }
              }
            return result2;
          }
          function baseInverter(object, setter, iteratee2, accumulator) {
            baseForOwn(object, function(value, key, object2) {
              setter(accumulator, iteratee2(value), key, object2);
            });
            return accumulator;
          }
          function baseInvoke(object, path, args) {
            path = castPath(path, object);
            object = parent(object, path);
            var func = object == null ? object : object[toKey(last(path))];
            return func == null ? undefined2 : apply(func, object, args);
          }
          function baseIsArguments(value) {
            return isObjectLike(value) && baseGetTag(value) == argsTag;
          }
          function baseIsArrayBuffer(value) {
            return isObjectLike(value) && baseGetTag(value) == arrayBufferTag;
          }
          function baseIsDate(value) {
            return isObjectLike(value) && baseGetTag(value) == dateTag;
          }
          function baseIsEqual(value, other, bitmask, customizer, stack) {
            if (value === other) {
              return true;
            }
            if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
              return value !== value && other !== other;
            }
            return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
          }
          function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
            var objIsArr = isArray(object), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object), othTag = othIsArr ? arrayTag : getTag(other);
            objTag = objTag == argsTag ? objectTag : objTag;
            othTag = othTag == argsTag ? objectTag : othTag;
            var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
            if (isSameTag && isBuffer(object)) {
              if (!isBuffer(other)) {
                return false;
              }
              objIsArr = true;
              objIsObj = false;
            }
            if (isSameTag && !objIsObj) {
              stack || (stack = new Stack());
              return objIsArr || isTypedArray(object) ? equalArrays(object, other, bitmask, customizer, equalFunc, stack) : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
            }
            if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
              var objIsWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
              if (objIsWrapped || othIsWrapped) {
                var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
                stack || (stack = new Stack());
                return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
              }
            }
            if (!isSameTag) {
              return false;
            }
            stack || (stack = new Stack());
            return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
          }
          function baseIsMap(value) {
            return isObjectLike(value) && getTag(value) == mapTag;
          }
          function baseIsMatch(object, source, matchData, customizer) {
            var index = matchData.length, length = index, noCustomizer = !customizer;
            if (object == null) {
              return !length;
            }
            object = Object2(object);
            while (index--) {
              var data = matchData[index];
              if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
                return false;
              }
            }
            while (++index < length) {
              data = matchData[index];
              var key = data[0], objValue = object[key], srcValue = data[1];
              if (noCustomizer && data[2]) {
                if (objValue === undefined2 && !(key in object)) {
                  return false;
                }
              } else {
                var stack = new Stack();
                if (customizer) {
                  var result2 = customizer(objValue, srcValue, key, object, source, stack);
                }
                if (!(result2 === undefined2 ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG, customizer, stack) : result2)) {
                  return false;
                }
              }
            }
            return true;
          }
          function baseIsNative(value) {
            if (!isObject(value) || isMasked(value)) {
              return false;
            }
            var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
            return pattern.test(toSource(value));
          }
          function baseIsRegExp(value) {
            return isObjectLike(value) && baseGetTag(value) == regexpTag;
          }
          function baseIsSet(value) {
            return isObjectLike(value) && getTag(value) == setTag;
          }
          function baseIsTypedArray(value) {
            return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
          }
          function baseIteratee(value) {
            if (typeof value == "function") {
              return value;
            }
            if (value == null) {
              return identity;
            }
            if (typeof value == "object") {
              return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
            }
            return property(value);
          }
          function baseKeys(object) {
            if (!isPrototype(object)) {
              return nativeKeys(object);
            }
            var result2 = [];
            for (var key in Object2(object)) {
              if (hasOwnProperty.call(object, key) && key != "constructor") {
                result2.push(key);
              }
            }
            return result2;
          }
          function baseKeysIn(object) {
            if (!isObject(object)) {
              return nativeKeysIn(object);
            }
            var isProto = isPrototype(object), result2 = [];
            for (var key in object) {
              if (!(key == "constructor" && (isProto || !hasOwnProperty.call(object, key)))) {
                result2.push(key);
              }
            }
            return result2;
          }
          function baseLt(value, other) {
            return value < other;
          }
          function baseMap(collection2, iteratee2) {
            var index = -1, result2 = isArrayLike(collection2) ? Array2(collection2.length) : [];
            baseEach(collection2, function(value, key, collection3) {
              result2[++index] = iteratee2(value, key, collection3);
            });
            return result2;
          }
          function baseMatches(source) {
            var matchData = getMatchData(source);
            if (matchData.length == 1 && matchData[0][2]) {
              return matchesStrictComparable(matchData[0][0], matchData[0][1]);
            }
            return function(object) {
              return object === source || baseIsMatch(object, source, matchData);
            };
          }
          function baseMatchesProperty(path, srcValue) {
            if (isKey(path) && isStrictComparable(srcValue)) {
              return matchesStrictComparable(toKey(path), srcValue);
            }
            return function(object) {
              var objValue = get(object, path);
              return objValue === undefined2 && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
            };
          }
          function baseMerge(object, source, srcIndex, customizer, stack) {
            if (object === source) {
              return;
            }
            baseFor(source, function(srcValue, key) {
              stack || (stack = new Stack());
              if (isObject(srcValue)) {
                baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
              } else {
                var newValue = customizer ? customizer(safeGet(object, key), srcValue, key + "", object, source, stack) : undefined2;
                if (newValue === undefined2) {
                  newValue = srcValue;
                }
                assignMergeValue(object, key, newValue);
              }
            }, keysIn);
          }
          function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
            var objValue = safeGet(object, key), srcValue = safeGet(source, key), stacked = stack.get(srcValue);
            if (stacked) {
              assignMergeValue(object, key, stacked);
              return;
            }
            var newValue = customizer ? customizer(objValue, srcValue, key + "", object, source, stack) : undefined2;
            var isCommon = newValue === undefined2;
            if (isCommon) {
              var isArr = isArray(srcValue), isBuff = !isArr && isBuffer(srcValue), isTyped = !isArr && !isBuff && isTypedArray(srcValue);
              newValue = srcValue;
              if (isArr || isBuff || isTyped) {
                if (isArray(objValue)) {
                  newValue = objValue;
                } else if (isArrayLikeObject(objValue)) {
                  newValue = copyArray(objValue);
                } else if (isBuff) {
                  isCommon = false;
                  newValue = cloneBuffer(srcValue, true);
                } else if (isTyped) {
                  isCommon = false;
                  newValue = cloneTypedArray(srcValue, true);
                } else {
                  newValue = [];
                }
              } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
                newValue = objValue;
                if (isArguments(objValue)) {
                  newValue = toPlainObject(objValue);
                } else if (!isObject(objValue) || isFunction(objValue)) {
                  newValue = initCloneObject(srcValue);
                }
              } else {
                isCommon = false;
              }
            }
            if (isCommon) {
              stack.set(srcValue, newValue);
              mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
              stack["delete"](srcValue);
            }
            assignMergeValue(object, key, newValue);
          }
          function baseNth(array, n) {
            var length = array.length;
            if (!length) {
              return;
            }
            n += n < 0 ? length : 0;
            return isIndex(n, length) ? array[n] : undefined2;
          }
          function baseOrderBy(collection2, iteratees, orders) {
            if (iteratees.length) {
              iteratees = arrayMap(iteratees, function(iteratee2) {
                if (isArray(iteratee2)) {
                  return function(value) {
                    return baseGet(value, iteratee2.length === 1 ? iteratee2[0] : iteratee2);
                  };
                }
                return iteratee2;
              });
            } else {
              iteratees = [identity];
            }
            var index = -1;
            iteratees = arrayMap(iteratees, baseUnary(getIteratee()));
            var result2 = baseMap(collection2, function(value, key, collection3) {
              var criteria = arrayMap(iteratees, function(iteratee2) {
                return iteratee2(value);
              });
              return { "criteria": criteria, "index": ++index, "value": value };
            });
            return baseSortBy(result2, function(object, other) {
              return compareMultiple(object, other, orders);
            });
          }
          function basePick(object, paths) {
            return basePickBy(object, paths, function(value, path) {
              return hasIn(object, path);
            });
          }
          function basePickBy(object, paths, predicate) {
            var index = -1, length = paths.length, result2 = {};
            while (++index < length) {
              var path = paths[index], value = baseGet(object, path);
              if (predicate(value, path)) {
                baseSet(result2, castPath(path, object), value);
              }
            }
            return result2;
          }
          function basePropertyDeep(path) {
            return function(object) {
              return baseGet(object, path);
            };
          }
          function basePullAll(array, values2, iteratee2, comparator) {
            var indexOf2 = comparator ? baseIndexOfWith : baseIndexOf, index = -1, length = values2.length, seen = array;
            if (array === values2) {
              values2 = copyArray(values2);
            }
            if (iteratee2) {
              seen = arrayMap(array, baseUnary(iteratee2));
            }
            while (++index < length) {
              var fromIndex = 0, value = values2[index], computed = iteratee2 ? iteratee2(value) : value;
              while ((fromIndex = indexOf2(seen, computed, fromIndex, comparator)) > -1) {
                if (seen !== array) {
                  splice.call(seen, fromIndex, 1);
                }
                splice.call(array, fromIndex, 1);
              }
            }
            return array;
          }
          function basePullAt(array, indexes) {
            var length = array ? indexes.length : 0, lastIndex = length - 1;
            while (length--) {
              var index = indexes[length];
              if (length == lastIndex || index !== previous) {
                var previous = index;
                if (isIndex(index)) {
                  splice.call(array, index, 1);
                } else {
                  baseUnset(array, index);
                }
              }
            }
            return array;
          }
          function baseRandom(lower, upper) {
            return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
          }
          function baseRange(start, end, step, fromRight) {
            var index = -1, length = nativeMax(nativeCeil((end - start) / (step || 1)), 0), result2 = Array2(length);
            while (length--) {
              result2[fromRight ? length : ++index] = start;
              start += step;
            }
            return result2;
          }
          function baseRepeat(string, n) {
            var result2 = "";
            if (!string || n < 1 || n > MAX_SAFE_INTEGER) {
              return result2;
            }
            do {
              if (n % 2) {
                result2 += string;
              }
              n = nativeFloor(n / 2);
              if (n) {
                string += string;
              }
            } while (n);
            return result2;
          }
          function baseRest(func, start) {
            return setToString(overRest(func, start, identity), func + "");
          }
          function baseSample(collection2) {
            return arraySample(values(collection2));
          }
          function baseSampleSize(collection2, n) {
            var array = values(collection2);
            return shuffleSelf(array, baseClamp(n, 0, array.length));
          }
          function baseSet(object, path, value, customizer) {
            if (!isObject(object)) {
              return object;
            }
            path = castPath(path, object);
            var index = -1, length = path.length, lastIndex = length - 1, nested = object;
            while (nested != null && ++index < length) {
              var key = toKey(path[index]), newValue = value;
              if (key === "__proto__" || key === "constructor" || key === "prototype") {
                return object;
              }
              if (index != lastIndex) {
                var objValue = nested[key];
                newValue = customizer ? customizer(objValue, key, nested) : undefined2;
                if (newValue === undefined2) {
                  newValue = isObject(objValue) ? objValue : isIndex(path[index + 1]) ? [] : {};
                }
              }
              assignValue(nested, key, newValue);
              nested = nested[key];
            }
            return object;
          }
          var baseSetData = !metaMap ? identity : function(func, data) {
            metaMap.set(func, data);
            return func;
          };
          var baseSetToString = !defineProperty ? identity : function(func, string) {
            return defineProperty(func, "toString", {
              "configurable": true,
              "enumerable": false,
              "value": constant(string),
              "writable": true
            });
          };
          function baseShuffle(collection2) {
            return shuffleSelf(values(collection2));
          }
          function baseSlice(array, start, end) {
            var index = -1, length = array.length;
            if (start < 0) {
              start = -start > length ? 0 : length + start;
            }
            end = end > length ? length : end;
            if (end < 0) {
              end += length;
            }
            length = start > end ? 0 : end - start >>> 0;
            start >>>= 0;
            var result2 = Array2(length);
            while (++index < length) {
              result2[index] = array[index + start];
            }
            return result2;
          }
          function baseSome(collection2, predicate) {
            var result2;
            baseEach(collection2, function(value, index, collection3) {
              result2 = predicate(value, index, collection3);
              return !result2;
            });
            return !!result2;
          }
          function baseSortedIndex(array, value, retHighest) {
            var low = 0, high = array == null ? low : array.length;
            if (typeof value == "number" && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
              while (low < high) {
                var mid = low + high >>> 1, computed = array[mid];
                if (computed !== null && !isSymbol(computed) && (retHighest ? computed <= value : computed < value)) {
                  low = mid + 1;
                } else {
                  high = mid;
                }
              }
              return high;
            }
            return baseSortedIndexBy(array, value, identity, retHighest);
          }
          function baseSortedIndexBy(array, value, iteratee2, retHighest) {
            var low = 0, high = array == null ? 0 : array.length;
            if (high === 0) {
              return 0;
            }
            value = iteratee2(value);
            var valIsNaN = value !== value, valIsNull = value === null, valIsSymbol = isSymbol(value), valIsUndefined = value === undefined2;
            while (low < high) {
              var mid = nativeFloor((low + high) / 2), computed = iteratee2(array[mid]), othIsDefined = computed !== undefined2, othIsNull = computed === null, othIsReflexive = computed === computed, othIsSymbol = isSymbol(computed);
              if (valIsNaN) {
                var setLow = retHighest || othIsReflexive;
              } else if (valIsUndefined) {
                setLow = othIsReflexive && (retHighest || othIsDefined);
              } else if (valIsNull) {
                setLow = othIsReflexive && othIsDefined && (retHighest || !othIsNull);
              } else if (valIsSymbol) {
                setLow = othIsReflexive && othIsDefined && !othIsNull && (retHighest || !othIsSymbol);
              } else if (othIsNull || othIsSymbol) {
                setLow = false;
              } else {
                setLow = retHighest ? computed <= value : computed < value;
              }
              if (setLow) {
                low = mid + 1;
              } else {
                high = mid;
              }
            }
            return nativeMin(high, MAX_ARRAY_INDEX);
          }
          function baseSortedUniq(array, iteratee2) {
            var index = -1, length = array.length, resIndex = 0, result2 = [];
            while (++index < length) {
              var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
              if (!index || !eq(computed, seen)) {
                var seen = computed;
                result2[resIndex++] = value === 0 ? 0 : value;
              }
            }
            return result2;
          }
          function baseToNumber(value) {
            if (typeof value == "number") {
              return value;
            }
            if (isSymbol(value)) {
              return NAN;
            }
            return +value;
          }
          function baseToString(value) {
            if (typeof value == "string") {
              return value;
            }
            if (isArray(value)) {
              return arrayMap(value, baseToString) + "";
            }
            if (isSymbol(value)) {
              return symbolToString ? symbolToString.call(value) : "";
            }
            var result2 = value + "";
            return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
          }
          function baseUniq(array, iteratee2, comparator) {
            var index = -1, includes2 = arrayIncludes, length = array.length, isCommon = true, result2 = [], seen = result2;
            if (comparator) {
              isCommon = false;
              includes2 = arrayIncludesWith;
            } else if (length >= LARGE_ARRAY_SIZE) {
              var set2 = iteratee2 ? null : createSet(array);
              if (set2) {
                return setToArray(set2);
              }
              isCommon = false;
              includes2 = cacheHas;
              seen = new SetCache();
            } else {
              seen = iteratee2 ? [] : result2;
            }
            outer:
              while (++index < length) {
                var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
                value = comparator || value !== 0 ? value : 0;
                if (isCommon && computed === computed) {
                  var seenIndex = seen.length;
                  while (seenIndex--) {
                    if (seen[seenIndex] === computed) {
                      continue outer;
                    }
                  }
                  if (iteratee2) {
                    seen.push(computed);
                  }
                  result2.push(value);
                } else if (!includes2(seen, computed, comparator)) {
                  if (seen !== result2) {
                    seen.push(computed);
                  }
                  result2.push(value);
                }
              }
            return result2;
          }
          function baseUnset(object, path) {
            path = castPath(path, object);
            object = parent(object, path);
            return object == null || delete object[toKey(last(path))];
          }
          function baseUpdate(object, path, updater, customizer) {
            return baseSet(object, path, updater(baseGet(object, path)), customizer);
          }
          function baseWhile(array, predicate, isDrop, fromRight) {
            var length = array.length, index = fromRight ? length : -1;
            while ((fromRight ? index-- : ++index < length) && predicate(array[index], index, array)) {
            }
            return isDrop ? baseSlice(array, fromRight ? 0 : index, fromRight ? index + 1 : length) : baseSlice(array, fromRight ? index + 1 : 0, fromRight ? length : index);
          }
          function baseWrapperValue(value, actions) {
            var result2 = value;
            if (result2 instanceof LazyWrapper) {
              result2 = result2.value();
            }
            return arrayReduce(actions, function(result3, action) {
              return action.func.apply(action.thisArg, arrayPush([result3], action.args));
            }, result2);
          }
          function baseXor(arrays, iteratee2, comparator) {
            var length = arrays.length;
            if (length < 2) {
              return length ? baseUniq(arrays[0]) : [];
            }
            var index = -1, result2 = Array2(length);
            while (++index < length) {
              var array = arrays[index], othIndex = -1;
              while (++othIndex < length) {
                if (othIndex != index) {
                  result2[index] = baseDifference(result2[index] || array, arrays[othIndex], iteratee2, comparator);
                }
              }
            }
            return baseUniq(baseFlatten(result2, 1), iteratee2, comparator);
          }
          function baseZipObject(props, values2, assignFunc) {
            var index = -1, length = props.length, valsLength = values2.length, result2 = {};
            while (++index < length) {
              var value = index < valsLength ? values2[index] : undefined2;
              assignFunc(result2, props[index], value);
            }
            return result2;
          }
          function castArrayLikeObject(value) {
            return isArrayLikeObject(value) ? value : [];
          }
          function castFunction(value) {
            return typeof value == "function" ? value : identity;
          }
          function castPath(value, object) {
            if (isArray(value)) {
              return value;
            }
            return isKey(value, object) ? [value] : stringToPath(toString(value));
          }
          var castRest = baseRest;
          function castSlice(array, start, end) {
            var length = array.length;
            end = end === undefined2 ? length : end;
            return !start && end >= length ? array : baseSlice(array, start, end);
          }
          var clearTimeout = ctxClearTimeout || function(id2) {
            return root.clearTimeout(id2);
          };
          function cloneBuffer(buffer, isDeep) {
            if (isDeep) {
              return buffer.slice();
            }
            var length = buffer.length, result2 = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
            buffer.copy(result2);
            return result2;
          }
          function cloneArrayBuffer(arrayBuffer) {
            var result2 = new arrayBuffer.constructor(arrayBuffer.byteLength);
            new Uint8Array2(result2).set(new Uint8Array2(arrayBuffer));
            return result2;
          }
          function cloneDataView(dataView, isDeep) {
            var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
            return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
          }
          function cloneRegExp(regexp) {
            var result2 = new regexp.constructor(regexp.source, reFlags.exec(regexp));
            result2.lastIndex = regexp.lastIndex;
            return result2;
          }
          function cloneSymbol(symbol) {
            return symbolValueOf ? Object2(symbolValueOf.call(symbol)) : {};
          }
          function cloneTypedArray(typedArray, isDeep) {
            var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
            return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
          }
          function compareAscending(value, other) {
            if (value !== other) {
              var valIsDefined = value !== undefined2, valIsNull = value === null, valIsReflexive = value === value, valIsSymbol = isSymbol(value);
              var othIsDefined = other !== undefined2, othIsNull = other === null, othIsReflexive = other === other, othIsSymbol = isSymbol(other);
              if (!othIsNull && !othIsSymbol && !valIsSymbol && value > other || valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol || valIsNull && othIsDefined && othIsReflexive || !valIsDefined && othIsReflexive || !valIsReflexive) {
                return 1;
              }
              if (!valIsNull && !valIsSymbol && !othIsSymbol && value < other || othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol || othIsNull && valIsDefined && valIsReflexive || !othIsDefined && valIsReflexive || !othIsReflexive) {
                return -1;
              }
            }
            return 0;
          }
          function compareMultiple(object, other, orders) {
            var index = -1, objCriteria = object.criteria, othCriteria = other.criteria, length = objCriteria.length, ordersLength = orders.length;
            while (++index < length) {
              var result2 = compareAscending(objCriteria[index], othCriteria[index]);
              if (result2) {
                if (index >= ordersLength) {
                  return result2;
                }
                var order = orders[index];
                return result2 * (order == "desc" ? -1 : 1);
              }
            }
            return object.index - other.index;
          }
          function composeArgs(args, partials, holders, isCurried) {
            var argsIndex = -1, argsLength = args.length, holdersLength = holders.length, leftIndex = -1, leftLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(leftLength + rangeLength), isUncurried = !isCurried;
            while (++leftIndex < leftLength) {
              result2[leftIndex] = partials[leftIndex];
            }
            while (++argsIndex < holdersLength) {
              if (isUncurried || argsIndex < argsLength) {
                result2[holders[argsIndex]] = args[argsIndex];
              }
            }
            while (rangeLength--) {
              result2[leftIndex++] = args[argsIndex++];
            }
            return result2;
          }
          function composeArgsRight(args, partials, holders, isCurried) {
            var argsIndex = -1, argsLength = args.length, holdersIndex = -1, holdersLength = holders.length, rightIndex = -1, rightLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(rangeLength + rightLength), isUncurried = !isCurried;
            while (++argsIndex < rangeLength) {
              result2[argsIndex] = args[argsIndex];
            }
            var offset = argsIndex;
            while (++rightIndex < rightLength) {
              result2[offset + rightIndex] = partials[rightIndex];
            }
            while (++holdersIndex < holdersLength) {
              if (isUncurried || argsIndex < argsLength) {
                result2[offset + holders[holdersIndex]] = args[argsIndex++];
              }
            }
            return result2;
          }
          function copyArray(source, array) {
            var index = -1, length = source.length;
            array || (array = Array2(length));
            while (++index < length) {
              array[index] = source[index];
            }
            return array;
          }
          function copyObject(source, props, object, customizer) {
            var isNew = !object;
            object || (object = {});
            var index = -1, length = props.length;
            while (++index < length) {
              var key = props[index];
              var newValue = customizer ? customizer(object[key], source[key], key, object, source) : undefined2;
              if (newValue === undefined2) {
                newValue = source[key];
              }
              if (isNew) {
                baseAssignValue(object, key, newValue);
              } else {
                assignValue(object, key, newValue);
              }
            }
            return object;
          }
          function copySymbols(source, object) {
            return copyObject(source, getSymbols(source), object);
          }
          function copySymbolsIn(source, object) {
            return copyObject(source, getSymbolsIn(source), object);
          }
          function createAggregator(setter, initializer) {
            return function(collection2, iteratee2) {
              var func = isArray(collection2) ? arrayAggregator : baseAggregator, accumulator = initializer ? initializer() : {};
              return func(collection2, setter, getIteratee(iteratee2, 2), accumulator);
            };
          }
          function createAssigner(assigner) {
            return baseRest(function(object, sources) {
              var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : undefined2, guard = length > 2 ? sources[2] : undefined2;
              customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : undefined2;
              if (guard && isIterateeCall(sources[0], sources[1], guard)) {
                customizer = length < 3 ? undefined2 : customizer;
                length = 1;
              }
              object = Object2(object);
              while (++index < length) {
                var source = sources[index];
                if (source) {
                  assigner(object, source, index, customizer);
                }
              }
              return object;
            });
          }
          function createBaseEach(eachFunc, fromRight) {
            return function(collection2, iteratee2) {
              if (collection2 == null) {
                return collection2;
              }
              if (!isArrayLike(collection2)) {
                return eachFunc(collection2, iteratee2);
              }
              var length = collection2.length, index = fromRight ? length : -1, iterable = Object2(collection2);
              while (fromRight ? index-- : ++index < length) {
                if (iteratee2(iterable[index], index, iterable) === false) {
                  break;
                }
              }
              return collection2;
            };
          }
          function createBaseFor(fromRight) {
            return function(object, iteratee2, keysFunc) {
              var index = -1, iterable = Object2(object), props = keysFunc(object), length = props.length;
              while (length--) {
                var key = props[fromRight ? length : ++index];
                if (iteratee2(iterable[key], key, iterable) === false) {
                  break;
                }
              }
              return object;
            };
          }
          function createBind(func, bitmask, thisArg) {
            var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
            function wrapper() {
              var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
              return fn.apply(isBind ? thisArg : this, arguments);
            }
            return wrapper;
          }
          function createCaseFirst(methodName) {
            return function(string) {
              string = toString(string);
              var strSymbols = hasUnicode(string) ? stringToArray(string) : undefined2;
              var chr = strSymbols ? strSymbols[0] : string.charAt(0);
              var trailing = strSymbols ? castSlice(strSymbols, 1).join("") : string.slice(1);
              return chr[methodName]() + trailing;
            };
          }
          function createCompounder(callback) {
            return function(string) {
              return arrayReduce(words(deburr(string).replace(reApos, "")), callback, "");
            };
          }
          function createCtor(Ctor) {
            return function() {
              var args = arguments;
              switch (args.length) {
                case 0:
                  return new Ctor();
                case 1:
                  return new Ctor(args[0]);
                case 2:
                  return new Ctor(args[0], args[1]);
                case 3:
                  return new Ctor(args[0], args[1], args[2]);
                case 4:
                  return new Ctor(args[0], args[1], args[2], args[3]);
                case 5:
                  return new Ctor(args[0], args[1], args[2], args[3], args[4]);
                case 6:
                  return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
                case 7:
                  return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
              }
              var thisBinding = baseCreate(Ctor.prototype), result2 = Ctor.apply(thisBinding, args);
              return isObject(result2) ? result2 : thisBinding;
            };
          }
          function createCurry(func, bitmask, arity) {
            var Ctor = createCtor(func);
            function wrapper() {
              var length = arguments.length, args = Array2(length), index = length, placeholder = getHolder(wrapper);
              while (index--) {
                args[index] = arguments[index];
              }
              var holders = length < 3 && args[0] !== placeholder && args[length - 1] !== placeholder ? [] : replaceHolders(args, placeholder);
              length -= holders.length;
              if (length < arity) {
                return createRecurry(func, bitmask, createHybrid, wrapper.placeholder, undefined2, args, holders, undefined2, undefined2, arity - length);
              }
              var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
              return apply(fn, this, args);
            }
            return wrapper;
          }
          function createFind(findIndexFunc) {
            return function(collection2, predicate, fromIndex) {
              var iterable = Object2(collection2);
              if (!isArrayLike(collection2)) {
                var iteratee2 = getIteratee(predicate, 3);
                collection2 = keys2(collection2);
                predicate = function(key) {
                  return iteratee2(iterable[key], key, iterable);
                };
              }
              var index = findIndexFunc(collection2, predicate, fromIndex);
              return index > -1 ? iterable[iteratee2 ? collection2[index] : index] : undefined2;
            };
          }
          function createFlow(fromRight) {
            return flatRest(function(funcs) {
              var length = funcs.length, index = length, prereq = LodashWrapper.prototype.thru;
              if (fromRight) {
                funcs.reverse();
              }
              while (index--) {
                var func = funcs[index];
                if (typeof func != "function") {
                  throw new TypeError2(FUNC_ERROR_TEXT);
                }
                if (prereq && !wrapper && getFuncName(func) == "wrapper") {
                  var wrapper = new LodashWrapper([], true);
                }
              }
              index = wrapper ? index : length;
              while (++index < length) {
                func = funcs[index];
                var funcName = getFuncName(func), data = funcName == "wrapper" ? getData(func) : undefined2;
                if (data && isLaziable(data[0]) && data[1] == (WRAP_ARY_FLAG | WRAP_CURRY_FLAG | WRAP_PARTIAL_FLAG | WRAP_REARG_FLAG) && !data[4].length && data[9] == 1) {
                  wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
                } else {
                  wrapper = func.length == 1 && isLaziable(func) ? wrapper[funcName]() : wrapper.thru(func);
                }
              }
              return function() {
                var args = arguments, value = args[0];
                if (wrapper && args.length == 1 && isArray(value)) {
                  return wrapper.plant(value).value();
                }
                var index2 = 0, result2 = length ? funcs[index2].apply(this, args) : value;
                while (++index2 < length) {
                  result2 = funcs[index2].call(this, result2);
                }
                return result2;
              };
            });
          }
          function createHybrid(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary2, arity) {
            var isAry = bitmask & WRAP_ARY_FLAG, isBind = bitmask & WRAP_BIND_FLAG, isBindKey = bitmask & WRAP_BIND_KEY_FLAG, isCurried = bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG), isFlip = bitmask & WRAP_FLIP_FLAG, Ctor = isBindKey ? undefined2 : createCtor(func);
            function wrapper() {
              var length = arguments.length, args = Array2(length), index = length;
              while (index--) {
                args[index] = arguments[index];
              }
              if (isCurried) {
                var placeholder = getHolder(wrapper), holdersCount = countHolders(args, placeholder);
              }
              if (partials) {
                args = composeArgs(args, partials, holders, isCurried);
              }
              if (partialsRight) {
                args = composeArgsRight(args, partialsRight, holdersRight, isCurried);
              }
              length -= holdersCount;
              if (isCurried && length < arity) {
                var newHolders = replaceHolders(args, placeholder);
                return createRecurry(func, bitmask, createHybrid, wrapper.placeholder, thisArg, args, newHolders, argPos, ary2, arity - length);
              }
              var thisBinding = isBind ? thisArg : this, fn = isBindKey ? thisBinding[func] : func;
              length = args.length;
              if (argPos) {
                args = reorder(args, argPos);
              } else if (isFlip && length > 1) {
                args.reverse();
              }
              if (isAry && ary2 < length) {
                args.length = ary2;
              }
              if (this && this !== root && this instanceof wrapper) {
                fn = Ctor || createCtor(fn);
              }
              return fn.apply(thisBinding, args);
            }
            return wrapper;
          }
          function createInverter(setter, toIteratee) {
            return function(object, iteratee2) {
              return baseInverter(object, setter, toIteratee(iteratee2), {});
            };
          }
          function createMathOperation(operator, defaultValue) {
            return function(value, other) {
              var result2;
              if (value === undefined2 && other === undefined2) {
                return defaultValue;
              }
              if (value !== undefined2) {
                result2 = value;
              }
              if (other !== undefined2) {
                if (result2 === undefined2) {
                  return other;
                }
                if (typeof value == "string" || typeof other == "string") {
                  value = baseToString(value);
                  other = baseToString(other);
                } else {
                  value = baseToNumber(value);
                  other = baseToNumber(other);
                }
                result2 = operator(value, other);
              }
              return result2;
            };
          }
          function createOver(arrayFunc) {
            return flatRest(function(iteratees) {
              iteratees = arrayMap(iteratees, baseUnary(getIteratee()));
              return baseRest(function(args) {
                var thisArg = this;
                return arrayFunc(iteratees, function(iteratee2) {
                  return apply(iteratee2, thisArg, args);
                });
              });
            });
          }
          function createPadding(length, chars) {
            chars = chars === undefined2 ? " " : baseToString(chars);
            var charsLength = chars.length;
            if (charsLength < 2) {
              return charsLength ? baseRepeat(chars, length) : chars;
            }
            var result2 = baseRepeat(chars, nativeCeil(length / stringSize(chars)));
            return hasUnicode(chars) ? castSlice(stringToArray(result2), 0, length).join("") : result2.slice(0, length);
          }
          function createPartial(func, bitmask, thisArg, partials) {
            var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
            function wrapper() {
              var argsIndex = -1, argsLength = arguments.length, leftIndex = -1, leftLength = partials.length, args = Array2(leftLength + argsLength), fn = this && this !== root && this instanceof wrapper ? Ctor : func;
              while (++leftIndex < leftLength) {
                args[leftIndex] = partials[leftIndex];
              }
              while (argsLength--) {
                args[leftIndex++] = arguments[++argsIndex];
              }
              return apply(fn, isBind ? thisArg : this, args);
            }
            return wrapper;
          }
          function createRange(fromRight) {
            return function(start, end, step) {
              if (step && typeof step != "number" && isIterateeCall(start, end, step)) {
                end = step = undefined2;
              }
              start = toFinite(start);
              if (end === undefined2) {
                end = start;
                start = 0;
              } else {
                end = toFinite(end);
              }
              step = step === undefined2 ? start < end ? 1 : -1 : toFinite(step);
              return baseRange(start, end, step, fromRight);
            };
          }
          function createRelationalOperation(operator) {
            return function(value, other) {
              if (!(typeof value == "string" && typeof other == "string")) {
                value = toNumber(value);
                other = toNumber(other);
              }
              return operator(value, other);
            };
          }
          function createRecurry(func, bitmask, wrapFunc, placeholder, thisArg, partials, holders, argPos, ary2, arity) {
            var isCurry = bitmask & WRAP_CURRY_FLAG, newHolders = isCurry ? holders : undefined2, newHoldersRight = isCurry ? undefined2 : holders, newPartials = isCurry ? partials : undefined2, newPartialsRight = isCurry ? undefined2 : partials;
            bitmask |= isCurry ? WRAP_PARTIAL_FLAG : WRAP_PARTIAL_RIGHT_FLAG;
            bitmask &= ~(isCurry ? WRAP_PARTIAL_RIGHT_FLAG : WRAP_PARTIAL_FLAG);
            if (!(bitmask & WRAP_CURRY_BOUND_FLAG)) {
              bitmask &= ~(WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG);
            }
            var newData = [
              func,
              bitmask,
              thisArg,
              newPartials,
              newHolders,
              newPartialsRight,
              newHoldersRight,
              argPos,
              ary2,
              arity
            ];
            var result2 = wrapFunc.apply(undefined2, newData);
            if (isLaziable(func)) {
              setData(result2, newData);
            }
            result2.placeholder = placeholder;
            return setWrapToString(result2, func, bitmask);
          }
          function createRound(methodName) {
            var func = Math2[methodName];
            return function(number, precision) {
              number = toNumber(number);
              precision = precision == null ? 0 : nativeMin(toInteger(precision), 292);
              if (precision && nativeIsFinite(number)) {
                var pair = (toString(number) + "e").split("e"), value = func(pair[0] + "e" + (+pair[1] + precision));
                pair = (toString(value) + "e").split("e");
                return +(pair[0] + "e" + (+pair[1] - precision));
              }
              return func(number);
            };
          }
          var createSet = !(Set2 && 1 / setToArray(new Set2([, -0]))[1] == INFINITY) ? noop : function(values2) {
            return new Set2(values2);
          };
          function createToPairs(keysFunc) {
            return function(object) {
              var tag = getTag(object);
              if (tag == mapTag) {
                return mapToArray(object);
              }
              if (tag == setTag) {
                return setToPairs(object);
              }
              return baseToPairs(object, keysFunc(object));
            };
          }
          function createWrap(func, bitmask, thisArg, partials, holders, argPos, ary2, arity) {
            var isBindKey = bitmask & WRAP_BIND_KEY_FLAG;
            if (!isBindKey && typeof func != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            var length = partials ? partials.length : 0;
            if (!length) {
              bitmask &= ~(WRAP_PARTIAL_FLAG | WRAP_PARTIAL_RIGHT_FLAG);
              partials = holders = undefined2;
            }
            ary2 = ary2 === undefined2 ? ary2 : nativeMax(toInteger(ary2), 0);
            arity = arity === undefined2 ? arity : toInteger(arity);
            length -= holders ? holders.length : 0;
            if (bitmask & WRAP_PARTIAL_RIGHT_FLAG) {
              var partialsRight = partials, holdersRight = holders;
              partials = holders = undefined2;
            }
            var data = isBindKey ? undefined2 : getData(func);
            var newData = [
              func,
              bitmask,
              thisArg,
              partials,
              holders,
              partialsRight,
              holdersRight,
              argPos,
              ary2,
              arity
            ];
            if (data) {
              mergeData(newData, data);
            }
            func = newData[0];
            bitmask = newData[1];
            thisArg = newData[2];
            partials = newData[3];
            holders = newData[4];
            arity = newData[9] = newData[9] === undefined2 ? isBindKey ? 0 : func.length : nativeMax(newData[9] - length, 0);
            if (!arity && bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG)) {
              bitmask &= ~(WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG);
            }
            if (!bitmask || bitmask == WRAP_BIND_FLAG) {
              var result2 = createBind(func, bitmask, thisArg);
            } else if (bitmask == WRAP_CURRY_FLAG || bitmask == WRAP_CURRY_RIGHT_FLAG) {
              result2 = createCurry(func, bitmask, arity);
            } else if ((bitmask == WRAP_PARTIAL_FLAG || bitmask == (WRAP_BIND_FLAG | WRAP_PARTIAL_FLAG)) && !holders.length) {
              result2 = createPartial(func, bitmask, thisArg, partials);
            } else {
              result2 = createHybrid.apply(undefined2, newData);
            }
            var setter = data ? baseSetData : setData;
            return setWrapToString(setter(result2, newData), func, bitmask);
          }
          function customDefaultsAssignIn(objValue, srcValue, key, object) {
            if (objValue === undefined2 || eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key)) {
              return srcValue;
            }
            return objValue;
          }
          function customDefaultsMerge(objValue, srcValue, key, object, source, stack) {
            if (isObject(objValue) && isObject(srcValue)) {
              stack.set(srcValue, objValue);
              baseMerge(objValue, srcValue, undefined2, customDefaultsMerge, stack);
              stack["delete"](srcValue);
            }
            return objValue;
          }
          function customOmitClone(value) {
            return isPlainObject(value) ? undefined2 : value;
          }
          function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
            var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array.length, othLength = other.length;
            if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
              return false;
            }
            var arrStacked = stack.get(array);
            var othStacked = stack.get(other);
            if (arrStacked && othStacked) {
              return arrStacked == other && othStacked == array;
            }
            var index = -1, result2 = true, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache() : undefined2;
            stack.set(array, other);
            stack.set(other, array);
            while (++index < arrLength) {
              var arrValue = array[index], othValue = other[index];
              if (customizer) {
                var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
              }
              if (compared !== undefined2) {
                if (compared) {
                  continue;
                }
                result2 = false;
                break;
              }
              if (seen) {
                if (!arraySome(other, function(othValue2, othIndex) {
                  if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
                    return seen.push(othIndex);
                  }
                })) {
                  result2 = false;
                  break;
                }
              } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
                result2 = false;
                break;
              }
            }
            stack["delete"](array);
            stack["delete"](other);
            return result2;
          }
          function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
            switch (tag) {
              case dataViewTag:
                if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
                  return false;
                }
                object = object.buffer;
                other = other.buffer;
              case arrayBufferTag:
                if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
                  return false;
                }
                return true;
              case boolTag:
              case dateTag:
              case numberTag:
                return eq(+object, +other);
              case errorTag:
                return object.name == other.name && object.message == other.message;
              case regexpTag:
              case stringTag:
                return object == other + "";
              case mapTag:
                var convert = mapToArray;
              case setTag:
                var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
                convert || (convert = setToArray);
                if (object.size != other.size && !isPartial) {
                  return false;
                }
                var stacked = stack.get(object);
                if (stacked) {
                  return stacked == other;
                }
                bitmask |= COMPARE_UNORDERED_FLAG;
                stack.set(object, other);
                var result2 = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
                stack["delete"](object);
                return result2;
              case symbolTag:
                if (symbolValueOf) {
                  return symbolValueOf.call(object) == symbolValueOf.call(other);
                }
            }
            return false;
          }
          function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
            var isPartial = bitmask & COMPARE_PARTIAL_FLAG, objProps = getAllKeys(object), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
            if (objLength != othLength && !isPartial) {
              return false;
            }
            var index = objLength;
            while (index--) {
              var key = objProps[index];
              if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
                return false;
              }
            }
            var objStacked = stack.get(object);
            var othStacked = stack.get(other);
            if (objStacked && othStacked) {
              return objStacked == other && othStacked == object;
            }
            var result2 = true;
            stack.set(object, other);
            stack.set(other, object);
            var skipCtor = isPartial;
            while (++index < objLength) {
              key = objProps[index];
              var objValue = object[key], othValue = other[key];
              if (customizer) {
                var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
              }
              if (!(compared === undefined2 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
                result2 = false;
                break;
              }
              skipCtor || (skipCtor = key == "constructor");
            }
            if (result2 && !skipCtor) {
              var objCtor = object.constructor, othCtor = other.constructor;
              if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
                result2 = false;
              }
            }
            stack["delete"](object);
            stack["delete"](other);
            return result2;
          }
          function flatRest(func) {
            return setToString(overRest(func, undefined2, flatten), func + "");
          }
          function getAllKeys(object) {
            return baseGetAllKeys(object, keys2, getSymbols);
          }
          function getAllKeysIn(object) {
            return baseGetAllKeys(object, keysIn, getSymbolsIn);
          }
          var getData = !metaMap ? noop : function(func) {
            return metaMap.get(func);
          };
          function getFuncName(func) {
            var result2 = func.name + "", array = realNames[result2], length = hasOwnProperty.call(realNames, result2) ? array.length : 0;
            while (length--) {
              var data = array[length], otherFunc = data.func;
              if (otherFunc == null || otherFunc == func) {
                return data.name;
              }
            }
            return result2;
          }
          function getHolder(func) {
            var object = hasOwnProperty.call(lodash, "placeholder") ? lodash : func;
            return object.placeholder;
          }
          function getIteratee() {
            var result2 = lodash.iteratee || iteratee;
            result2 = result2 === iteratee ? baseIteratee : result2;
            return arguments.length ? result2(arguments[0], arguments[1]) : result2;
          }
          function getMapData(map2, key) {
            var data = map2.__data__;
            return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
          }
          function getMatchData(object) {
            var result2 = keys2(object), length = result2.length;
            while (length--) {
              var key = result2[length], value = object[key];
              result2[length] = [key, value, isStrictComparable(value)];
            }
            return result2;
          }
          function getNative(object, key) {
            var value = getValue(object, key);
            return baseIsNative(value) ? value : undefined2;
          }
          function getRawTag(value) {
            var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
            try {
              value[symToStringTag] = undefined2;
              var unmasked = true;
            } catch (e) {
            }
            var result2 = nativeObjectToString.call(value);
            if (unmasked) {
              if (isOwn) {
                value[symToStringTag] = tag;
              } else {
                delete value[symToStringTag];
              }
            }
            return result2;
          }
          var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
            if (object == null) {
              return [];
            }
            object = Object2(object);
            return arrayFilter(nativeGetSymbols(object), function(symbol) {
              return propertyIsEnumerable.call(object, symbol);
            });
          };
          var getSymbolsIn = !nativeGetSymbols ? stubArray : function(object) {
            var result2 = [];
            while (object) {
              arrayPush(result2, getSymbols(object));
              object = getPrototype(object);
            }
            return result2;
          };
          var getTag = baseGetTag;
          if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map2 && getTag(new Map2()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set2 && getTag(new Set2()) != setTag || WeakMap2 && getTag(new WeakMap2()) != weakMapTag) {
            getTag = function(value) {
              var result2 = baseGetTag(value), Ctor = result2 == objectTag ? value.constructor : undefined2, ctorString = Ctor ? toSource(Ctor) : "";
              if (ctorString) {
                switch (ctorString) {
                  case dataViewCtorString:
                    return dataViewTag;
                  case mapCtorString:
                    return mapTag;
                  case promiseCtorString:
                    return promiseTag;
                  case setCtorString:
                    return setTag;
                  case weakMapCtorString:
                    return weakMapTag;
                }
              }
              return result2;
            };
          }
          function getView(start, end, transforms) {
            var index = -1, length = transforms.length;
            while (++index < length) {
              var data = transforms[index], size2 = data.size;
              switch (data.type) {
                case "drop":
                  start += size2;
                  break;
                case "dropRight":
                  end -= size2;
                  break;
                case "take":
                  end = nativeMin(end, start + size2);
                  break;
                case "takeRight":
                  start = nativeMax(start, end - size2);
                  break;
              }
            }
            return { "start": start, "end": end };
          }
          function getWrapDetails(source) {
            var match = source.match(reWrapDetails);
            return match ? match[1].split(reSplitDetails) : [];
          }
          function hasPath(object, path, hasFunc) {
            path = castPath(path, object);
            var index = -1, length = path.length, result2 = false;
            while (++index < length) {
              var key = toKey(path[index]);
              if (!(result2 = object != null && hasFunc(object, key))) {
                break;
              }
              object = object[key];
            }
            if (result2 || ++index != length) {
              return result2;
            }
            length = object == null ? 0 : object.length;
            return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
          }
          function initCloneArray(array) {
            var length = array.length, result2 = new array.constructor(length);
            if (length && typeof array[0] == "string" && hasOwnProperty.call(array, "index")) {
              result2.index = array.index;
              result2.input = array.input;
            }
            return result2;
          }
          function initCloneObject(object) {
            return typeof object.constructor == "function" && !isPrototype(object) ? baseCreate(getPrototype(object)) : {};
          }
          function initCloneByTag(object, tag, isDeep) {
            var Ctor = object.constructor;
            switch (tag) {
              case arrayBufferTag:
                return cloneArrayBuffer(object);
              case boolTag:
              case dateTag:
                return new Ctor(+object);
              case dataViewTag:
                return cloneDataView(object, isDeep);
              case float32Tag:
              case float64Tag:
              case int8Tag:
              case int16Tag:
              case int32Tag:
              case uint8Tag:
              case uint8ClampedTag:
              case uint16Tag:
              case uint32Tag:
                return cloneTypedArray(object, isDeep);
              case mapTag:
                return new Ctor();
              case numberTag:
              case stringTag:
                return new Ctor(object);
              case regexpTag:
                return cloneRegExp(object);
              case setTag:
                return new Ctor();
              case symbolTag:
                return cloneSymbol(object);
            }
          }
          function insertWrapDetails(source, details) {
            var length = details.length;
            if (!length) {
              return source;
            }
            var lastIndex = length - 1;
            details[lastIndex] = (length > 1 ? "& " : "") + details[lastIndex];
            details = details.join(length > 2 ? ", " : " ");
            return source.replace(reWrapComment, "{\n/* [wrapped with " + details + "] */\n");
          }
          function isFlattenable(value) {
            return isArray(value) || isArguments(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
          }
          function isIndex(value, length) {
            var type = typeof value;
            length = length == null ? MAX_SAFE_INTEGER : length;
            return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
          }
          function isIterateeCall(value, index, object) {
            if (!isObject(object)) {
              return false;
            }
            var type = typeof index;
            if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
              return eq(object[index], value);
            }
            return false;
          }
          function isKey(value, object) {
            if (isArray(value)) {
              return false;
            }
            var type = typeof value;
            if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
              return true;
            }
            return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object2(object);
          }
          function isKeyable(value) {
            var type = typeof value;
            return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
          }
          function isLaziable(func) {
            var funcName = getFuncName(func), other = lodash[funcName];
            if (typeof other != "function" || !(funcName in LazyWrapper.prototype)) {
              return false;
            }
            if (func === other) {
              return true;
            }
            var data = getData(other);
            return !!data && func === data[0];
          }
          function isMasked(func) {
            return !!maskSrcKey && maskSrcKey in func;
          }
          var isMaskable = coreJsData ? isFunction : stubFalse;
          function isPrototype(value) {
            var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
            return value === proto;
          }
          function isStrictComparable(value) {
            return value === value && !isObject(value);
          }
          function matchesStrictComparable(key, srcValue) {
            return function(object) {
              if (object == null) {
                return false;
              }
              return object[key] === srcValue && (srcValue !== undefined2 || key in Object2(object));
            };
          }
          function memoizeCapped(func) {
            var result2 = memoize(func, function(key) {
              if (cache.size === MAX_MEMOIZE_SIZE) {
                cache.clear();
              }
              return key;
            });
            var cache = result2.cache;
            return result2;
          }
          function mergeData(data, source) {
            var bitmask = data[1], srcBitmask = source[1], newBitmask = bitmask | srcBitmask, isCommon = newBitmask < (WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG | WRAP_ARY_FLAG);
            var isCombo = srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_CURRY_FLAG || srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_REARG_FLAG && data[7].length <= source[8] || srcBitmask == (WRAP_ARY_FLAG | WRAP_REARG_FLAG) && source[7].length <= source[8] && bitmask == WRAP_CURRY_FLAG;
            if (!(isCommon || isCombo)) {
              return data;
            }
            if (srcBitmask & WRAP_BIND_FLAG) {
              data[2] = source[2];
              newBitmask |= bitmask & WRAP_BIND_FLAG ? 0 : WRAP_CURRY_BOUND_FLAG;
            }
            var value = source[3];
            if (value) {
              var partials = data[3];
              data[3] = partials ? composeArgs(partials, value, source[4]) : value;
              data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : source[4];
            }
            value = source[5];
            if (value) {
              partials = data[5];
              data[5] = partials ? composeArgsRight(partials, value, source[6]) : value;
              data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : source[6];
            }
            value = source[7];
            if (value) {
              data[7] = value;
            }
            if (srcBitmask & WRAP_ARY_FLAG) {
              data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
            }
            if (data[9] == null) {
              data[9] = source[9];
            }
            data[0] = source[0];
            data[1] = newBitmask;
            return data;
          }
          function nativeKeysIn(object) {
            var result2 = [];
            if (object != null) {
              for (var key in Object2(object)) {
                result2.push(key);
              }
            }
            return result2;
          }
          function objectToString(value) {
            return nativeObjectToString.call(value);
          }
          function overRest(func, start, transform2) {
            start = nativeMax(start === undefined2 ? func.length - 1 : start, 0);
            return function() {
              var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array2(length);
              while (++index < length) {
                array[index] = args[start + index];
              }
              index = -1;
              var otherArgs = Array2(start + 1);
              while (++index < start) {
                otherArgs[index] = args[index];
              }
              otherArgs[start] = transform2(array);
              return apply(func, this, otherArgs);
            };
          }
          function parent(object, path) {
            return path.length < 2 ? object : baseGet(object, baseSlice(path, 0, -1));
          }
          function reorder(array, indexes) {
            var arrLength = array.length, length = nativeMin(indexes.length, arrLength), oldArray = copyArray(array);
            while (length--) {
              var index = indexes[length];
              array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined2;
            }
            return array;
          }
          function safeGet(object, key) {
            if (key === "constructor" && typeof object[key] === "function") {
              return;
            }
            if (key == "__proto__") {
              return;
            }
            return object[key];
          }
          var setData = shortOut(baseSetData);
          var setTimeout2 = ctxSetTimeout || function(func, wait) {
            return root.setTimeout(func, wait);
          };
          var setToString = shortOut(baseSetToString);
          function setWrapToString(wrapper, reference, bitmask) {
            var source = reference + "";
            return setToString(wrapper, insertWrapDetails(source, updateWrapDetails(getWrapDetails(source), bitmask)));
          }
          function shortOut(func) {
            var count = 0, lastCalled = 0;
            return function() {
              var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
              lastCalled = stamp;
              if (remaining > 0) {
                if (++count >= HOT_COUNT) {
                  return arguments[0];
                }
              } else {
                count = 0;
              }
              return func.apply(undefined2, arguments);
            };
          }
          function shuffleSelf(array, size2) {
            var index = -1, length = array.length, lastIndex = length - 1;
            size2 = size2 === undefined2 ? length : size2;
            while (++index < size2) {
              var rand = baseRandom(index, lastIndex), value = array[rand];
              array[rand] = array[index];
              array[index] = value;
            }
            array.length = size2;
            return array;
          }
          var stringToPath = memoizeCapped(function(string) {
            var result2 = [];
            if (string.charCodeAt(0) === 46) {
              result2.push("");
            }
            string.replace(rePropName, function(match, number, quote, subString) {
              result2.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
            });
            return result2;
          });
          function toKey(value) {
            if (typeof value == "string" || isSymbol(value)) {
              return value;
            }
            var result2 = value + "";
            return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
          }
          function toSource(func) {
            if (func != null) {
              try {
                return funcToString.call(func);
              } catch (e) {
              }
              try {
                return func + "";
              } catch (e) {
              }
            }
            return "";
          }
          function updateWrapDetails(details, bitmask) {
            arrayEach(wrapFlags, function(pair) {
              var value = "_." + pair[0];
              if (bitmask & pair[1] && !arrayIncludes(details, value)) {
                details.push(value);
              }
            });
            return details.sort();
          }
          function wrapperClone(wrapper) {
            if (wrapper instanceof LazyWrapper) {
              return wrapper.clone();
            }
            var result2 = new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__);
            result2.__actions__ = copyArray(wrapper.__actions__);
            result2.__index__ = wrapper.__index__;
            result2.__values__ = wrapper.__values__;
            return result2;
          }
          function chunk(array, size2, guard) {
            if (guard ? isIterateeCall(array, size2, guard) : size2 === undefined2) {
              size2 = 1;
            } else {
              size2 = nativeMax(toInteger(size2), 0);
            }
            var length = array == null ? 0 : array.length;
            if (!length || size2 < 1) {
              return [];
            }
            var index = 0, resIndex = 0, result2 = Array2(nativeCeil(length / size2));
            while (index < length) {
              result2[resIndex++] = baseSlice(array, index, index += size2);
            }
            return result2;
          }
          function compact(array) {
            var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result2 = [];
            while (++index < length) {
              var value = array[index];
              if (value) {
                result2[resIndex++] = value;
              }
            }
            return result2;
          }
          function concat() {
            var length = arguments.length;
            if (!length) {
              return [];
            }
            var args = Array2(length - 1), array = arguments[0], index = length;
            while (index--) {
              args[index - 1] = arguments[index];
            }
            return arrayPush(isArray(array) ? copyArray(array) : [array], baseFlatten(args, 1));
          }
          var difference = baseRest(function(array, values2) {
            return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true)) : [];
          });
          var differenceBy = baseRest(function(array, values2) {
            var iteratee2 = last(values2);
            if (isArrayLikeObject(iteratee2)) {
              iteratee2 = undefined2;
            }
            return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2)) : [];
          });
          var differenceWith = baseRest(function(array, values2) {
            var comparator = last(values2);
            if (isArrayLikeObject(comparator)) {
              comparator = undefined2;
            }
            return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true), undefined2, comparator) : [];
          });
          function drop(array, n, guard) {
            var length = array == null ? 0 : array.length;
            if (!length) {
              return [];
            }
            n = guard || n === undefined2 ? 1 : toInteger(n);
            return baseSlice(array, n < 0 ? 0 : n, length);
          }
          function dropRight(array, n, guard) {
            var length = array == null ? 0 : array.length;
            if (!length) {
              return [];
            }
            n = guard || n === undefined2 ? 1 : toInteger(n);
            n = length - n;
            return baseSlice(array, 0, n < 0 ? 0 : n);
          }
          function dropRightWhile(array, predicate) {
            return array && array.length ? baseWhile(array, getIteratee(predicate, 3), true, true) : [];
          }
          function dropWhile(array, predicate) {
            return array && array.length ? baseWhile(array, getIteratee(predicate, 3), true) : [];
          }
          function fill(array, value, start, end) {
            var length = array == null ? 0 : array.length;
            if (!length) {
              return [];
            }
            if (start && typeof start != "number" && isIterateeCall(array, value, start)) {
              start = 0;
              end = length;
            }
            return baseFill(array, value, start, end);
          }
          function findIndex(array, predicate, fromIndex) {
            var length = array == null ? 0 : array.length;
            if (!length) {
              return -1;
            }
            var index = fromIndex == null ? 0 : toInteger(fromIndex);
            if (index < 0) {
              index = nativeMax(length + index, 0);
            }
            return baseFindIndex(array, getIteratee(predicate, 3), index);
          }
          function findLastIndex(array, predicate, fromIndex) {
            var length = array == null ? 0 : array.length;
            if (!length) {
              return -1;
            }
            var index = length - 1;
            if (fromIndex !== undefined2) {
              index = toInteger(fromIndex);
              index = fromIndex < 0 ? nativeMax(length + index, 0) : nativeMin(index, length - 1);
            }
            return baseFindIndex(array, getIteratee(predicate, 3), index, true);
          }
          function flatten(array) {
            var length = array == null ? 0 : array.length;
            return length ? baseFlatten(array, 1) : [];
          }
          function flattenDeep(array) {
            var length = array == null ? 0 : array.length;
            return length ? baseFlatten(array, INFINITY) : [];
          }
          function flattenDepth(array, depth) {
            var length = array == null ? 0 : array.length;
            if (!length) {
              return [];
            }
            depth = depth === undefined2 ? 1 : toInteger(depth);
            return baseFlatten(array, depth);
          }
          function fromPairs(pairs) {
            var index = -1, length = pairs == null ? 0 : pairs.length, result2 = {};
            while (++index < length) {
              var pair = pairs[index];
              result2[pair[0]] = pair[1];
            }
            return result2;
          }
          function head(array) {
            return array && array.length ? array[0] : undefined2;
          }
          function indexOf(array, value, fromIndex) {
            var length = array == null ? 0 : array.length;
            if (!length) {
              return -1;
            }
            var index = fromIndex == null ? 0 : toInteger(fromIndex);
            if (index < 0) {
              index = nativeMax(length + index, 0);
            }
            return baseIndexOf(array, value, index);
          }
          function initial(array) {
            var length = array == null ? 0 : array.length;
            return length ? baseSlice(array, 0, -1) : [];
          }
          var intersection = baseRest(function(arrays) {
            var mapped = arrayMap(arrays, castArrayLikeObject);
            return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped) : [];
          });
          var intersectionBy = baseRest(function(arrays) {
            var iteratee2 = last(arrays), mapped = arrayMap(arrays, castArrayLikeObject);
            if (iteratee2 === last(mapped)) {
              iteratee2 = undefined2;
            } else {
              mapped.pop();
            }
            return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped, getIteratee(iteratee2, 2)) : [];
          });
          var intersectionWith = baseRest(function(arrays) {
            var comparator = last(arrays), mapped = arrayMap(arrays, castArrayLikeObject);
            comparator = typeof comparator == "function" ? comparator : undefined2;
            if (comparator) {
              mapped.pop();
            }
            return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped, undefined2, comparator) : [];
          });
          function join(array, separator) {
            return array == null ? "" : nativeJoin.call(array, separator);
          }
          function last(array) {
            var length = array == null ? 0 : array.length;
            return length ? array[length - 1] : undefined2;
          }
          function lastIndexOf(array, value, fromIndex) {
            var length = array == null ? 0 : array.length;
            if (!length) {
              return -1;
            }
            var index = length;
            if (fromIndex !== undefined2) {
              index = toInteger(fromIndex);
              index = index < 0 ? nativeMax(length + index, 0) : nativeMin(index, length - 1);
            }
            return value === value ? strictLastIndexOf(array, value, index) : baseFindIndex(array, baseIsNaN, index, true);
          }
          function nth(array, n) {
            return array && array.length ? baseNth(array, toInteger(n)) : undefined2;
          }
          var pull = baseRest(pullAll);
          function pullAll(array, values2) {
            return array && array.length && values2 && values2.length ? basePullAll(array, values2) : array;
          }
          function pullAllBy(array, values2, iteratee2) {
            return array && array.length && values2 && values2.length ? basePullAll(array, values2, getIteratee(iteratee2, 2)) : array;
          }
          function pullAllWith(array, values2, comparator) {
            return array && array.length && values2 && values2.length ? basePullAll(array, values2, undefined2, comparator) : array;
          }
          var pullAt = flatRest(function(array, indexes) {
            var length = array == null ? 0 : array.length, result2 = baseAt(array, indexes);
            basePullAt(array, arrayMap(indexes, function(index) {
              return isIndex(index, length) ? +index : index;
            }).sort(compareAscending));
            return result2;
          });
          function remove(array, predicate) {
            var result2 = [];
            if (!(array && array.length)) {
              return result2;
            }
            var index = -1, indexes = [], length = array.length;
            predicate = getIteratee(predicate, 3);
            while (++index < length) {
              var value = array[index];
              if (predicate(value, index, array)) {
                result2.push(value);
                indexes.push(index);
              }
            }
            basePullAt(array, indexes);
            return result2;
          }
          function reverse(array) {
            return array == null ? array : nativeReverse.call(array);
          }
          function slice(array, start, end) {
            var length = array == null ? 0 : array.length;
            if (!length) {
              return [];
            }
            if (end && typeof end != "number" && isIterateeCall(array, start, end)) {
              start = 0;
              end = length;
            } else {
              start = start == null ? 0 : toInteger(start);
              end = end === undefined2 ? length : toInteger(end);
            }
            return baseSlice(array, start, end);
          }
          function sortedIndex(array, value) {
            return baseSortedIndex(array, value);
          }
          function sortedIndexBy(array, value, iteratee2) {
            return baseSortedIndexBy(array, value, getIteratee(iteratee2, 2));
          }
          function sortedIndexOf(array, value) {
            var length = array == null ? 0 : array.length;
            if (length) {
              var index = baseSortedIndex(array, value);
              if (index < length && eq(array[index], value)) {
                return index;
              }
            }
            return -1;
          }
          function sortedLastIndex(array, value) {
            return baseSortedIndex(array, value, true);
          }
          function sortedLastIndexBy(array, value, iteratee2) {
            return baseSortedIndexBy(array, value, getIteratee(iteratee2, 2), true);
          }
          function sortedLastIndexOf(array, value) {
            var length = array == null ? 0 : array.length;
            if (length) {
              var index = baseSortedIndex(array, value, true) - 1;
              if (eq(array[index], value)) {
                return index;
              }
            }
            return -1;
          }
          function sortedUniq(array) {
            return array && array.length ? baseSortedUniq(array) : [];
          }
          function sortedUniqBy(array, iteratee2) {
            return array && array.length ? baseSortedUniq(array, getIteratee(iteratee2, 2)) : [];
          }
          function tail(array) {
            var length = array == null ? 0 : array.length;
            return length ? baseSlice(array, 1, length) : [];
          }
          function take(array, n, guard) {
            if (!(array && array.length)) {
              return [];
            }
            n = guard || n === undefined2 ? 1 : toInteger(n);
            return baseSlice(array, 0, n < 0 ? 0 : n);
          }
          function takeRight(array, n, guard) {
            var length = array == null ? 0 : array.length;
            if (!length) {
              return [];
            }
            n = guard || n === undefined2 ? 1 : toInteger(n);
            n = length - n;
            return baseSlice(array, n < 0 ? 0 : n, length);
          }
          function takeRightWhile(array, predicate) {
            return array && array.length ? baseWhile(array, getIteratee(predicate, 3), false, true) : [];
          }
          function takeWhile(array, predicate) {
            return array && array.length ? baseWhile(array, getIteratee(predicate, 3)) : [];
          }
          var union = baseRest(function(arrays) {
            return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true));
          });
          var unionBy = baseRest(function(arrays) {
            var iteratee2 = last(arrays);
            if (isArrayLikeObject(iteratee2)) {
              iteratee2 = undefined2;
            }
            return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2));
          });
          var unionWith = baseRest(function(arrays) {
            var comparator = last(arrays);
            comparator = typeof comparator == "function" ? comparator : undefined2;
            return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), undefined2, comparator);
          });
          function uniq(array) {
            return array && array.length ? baseUniq(array) : [];
          }
          function uniqBy(array, iteratee2) {
            return array && array.length ? baseUniq(array, getIteratee(iteratee2, 2)) : [];
          }
          function uniqWith(array, comparator) {
            comparator = typeof comparator == "function" ? comparator : undefined2;
            return array && array.length ? baseUniq(array, undefined2, comparator) : [];
          }
          function unzip(array) {
            if (!(array && array.length)) {
              return [];
            }
            var length = 0;
            array = arrayFilter(array, function(group) {
              if (isArrayLikeObject(group)) {
                length = nativeMax(group.length, length);
                return true;
              }
            });
            return baseTimes(length, function(index) {
              return arrayMap(array, baseProperty(index));
            });
          }
          function unzipWith(array, iteratee2) {
            if (!(array && array.length)) {
              return [];
            }
            var result2 = unzip(array);
            if (iteratee2 == null) {
              return result2;
            }
            return arrayMap(result2, function(group) {
              return apply(iteratee2, undefined2, group);
            });
          }
          var without = baseRest(function(array, values2) {
            return isArrayLikeObject(array) ? baseDifference(array, values2) : [];
          });
          var xor = baseRest(function(arrays) {
            return baseXor(arrayFilter(arrays, isArrayLikeObject));
          });
          var xorBy = baseRest(function(arrays) {
            var iteratee2 = last(arrays);
            if (isArrayLikeObject(iteratee2)) {
              iteratee2 = undefined2;
            }
            return baseXor(arrayFilter(arrays, isArrayLikeObject), getIteratee(iteratee2, 2));
          });
          var xorWith = baseRest(function(arrays) {
            var comparator = last(arrays);
            comparator = typeof comparator == "function" ? comparator : undefined2;
            return baseXor(arrayFilter(arrays, isArrayLikeObject), undefined2, comparator);
          });
          var zip = baseRest(unzip);
          function zipObject(props, values2) {
            return baseZipObject(props || [], values2 || [], assignValue);
          }
          function zipObjectDeep(props, values2) {
            return baseZipObject(props || [], values2 || [], baseSet);
          }
          var zipWith = baseRest(function(arrays) {
            var length = arrays.length, iteratee2 = length > 1 ? arrays[length - 1] : undefined2;
            iteratee2 = typeof iteratee2 == "function" ? (arrays.pop(), iteratee2) : undefined2;
            return unzipWith(arrays, iteratee2);
          });
          function chain(value) {
            var result2 = lodash(value);
            result2.__chain__ = true;
            return result2;
          }
          function tap(value, interceptor) {
            interceptor(value);
            return value;
          }
          function thru(value, interceptor) {
            return interceptor(value);
          }
          var wrapperAt = flatRest(function(paths) {
            var length = paths.length, start = length ? paths[0] : 0, value = this.__wrapped__, interceptor = function(object) {
              return baseAt(object, paths);
            };
            if (length > 1 || this.__actions__.length || !(value instanceof LazyWrapper) || !isIndex(start)) {
              return this.thru(interceptor);
            }
            value = value.slice(start, +start + (length ? 1 : 0));
            value.__actions__.push({
              "func": thru,
              "args": [interceptor],
              "thisArg": undefined2
            });
            return new LodashWrapper(value, this.__chain__).thru(function(array) {
              if (length && !array.length) {
                array.push(undefined2);
              }
              return array;
            });
          });
          function wrapperChain() {
            return chain(this);
          }
          function wrapperCommit() {
            return new LodashWrapper(this.value(), this.__chain__);
          }
          function wrapperNext() {
            if (this.__values__ === undefined2) {
              this.__values__ = toArray(this.value());
            }
            var done = this.__index__ >= this.__values__.length, value = done ? undefined2 : this.__values__[this.__index__++];
            return { "done": done, "value": value };
          }
          function wrapperToIterator() {
            return this;
          }
          function wrapperPlant(value) {
            var result2, parent2 = this;
            while (parent2 instanceof baseLodash) {
              var clone2 = wrapperClone(parent2);
              clone2.__index__ = 0;
              clone2.__values__ = undefined2;
              if (result2) {
                previous.__wrapped__ = clone2;
              } else {
                result2 = clone2;
              }
              var previous = clone2;
              parent2 = parent2.__wrapped__;
            }
            previous.__wrapped__ = value;
            return result2;
          }
          function wrapperReverse() {
            var value = this.__wrapped__;
            if (value instanceof LazyWrapper) {
              var wrapped = value;
              if (this.__actions__.length) {
                wrapped = new LazyWrapper(this);
              }
              wrapped = wrapped.reverse();
              wrapped.__actions__.push({
                "func": thru,
                "args": [reverse],
                "thisArg": undefined2
              });
              return new LodashWrapper(wrapped, this.__chain__);
            }
            return this.thru(reverse);
          }
          function wrapperValue() {
            return baseWrapperValue(this.__wrapped__, this.__actions__);
          }
          var countBy = createAggregator(function(result2, value, key) {
            if (hasOwnProperty.call(result2, key)) {
              ++result2[key];
            } else {
              baseAssignValue(result2, key, 1);
            }
          });
          function every(collection2, predicate, guard) {
            var func = isArray(collection2) ? arrayEvery : baseEvery;
            if (guard && isIterateeCall(collection2, predicate, guard)) {
              predicate = undefined2;
            }
            return func(collection2, getIteratee(predicate, 3));
          }
          function filter(collection2, predicate) {
            var func = isArray(collection2) ? arrayFilter : baseFilter;
            return func(collection2, getIteratee(predicate, 3));
          }
          var find = createFind(findIndex);
          var findLast = createFind(findLastIndex);
          function flatMap(collection2, iteratee2) {
            return baseFlatten(map(collection2, iteratee2), 1);
          }
          function flatMapDeep(collection2, iteratee2) {
            return baseFlatten(map(collection2, iteratee2), INFINITY);
          }
          function flatMapDepth(collection2, iteratee2, depth) {
            depth = depth === undefined2 ? 1 : toInteger(depth);
            return baseFlatten(map(collection2, iteratee2), depth);
          }
          function forEach(collection2, iteratee2) {
            var func = isArray(collection2) ? arrayEach : baseEach;
            return func(collection2, getIteratee(iteratee2, 3));
          }
          function forEachRight(collection2, iteratee2) {
            var func = isArray(collection2) ? arrayEachRight : baseEachRight;
            return func(collection2, getIteratee(iteratee2, 3));
          }
          var groupBy = createAggregator(function(result2, value, key) {
            if (hasOwnProperty.call(result2, key)) {
              result2[key].push(value);
            } else {
              baseAssignValue(result2, key, [value]);
            }
          });
          function includes(collection2, value, fromIndex, guard) {
            collection2 = isArrayLike(collection2) ? collection2 : values(collection2);
            fromIndex = fromIndex && !guard ? toInteger(fromIndex) : 0;
            var length = collection2.length;
            if (fromIndex < 0) {
              fromIndex = nativeMax(length + fromIndex, 0);
            }
            return isString(collection2) ? fromIndex <= length && collection2.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection2, value, fromIndex) > -1;
          }
          var invokeMap = baseRest(function(collection2, path, args) {
            var index = -1, isFunc = typeof path == "function", result2 = isArrayLike(collection2) ? Array2(collection2.length) : [];
            baseEach(collection2, function(value) {
              result2[++index] = isFunc ? apply(path, value, args) : baseInvoke(value, path, args);
            });
            return result2;
          });
          var keyBy = createAggregator(function(result2, value, key) {
            baseAssignValue(result2, key, value);
          });
          function map(collection2, iteratee2) {
            var func = isArray(collection2) ? arrayMap : baseMap;
            return func(collection2, getIteratee(iteratee2, 3));
          }
          function orderBy(collection2, iteratees, orders, guard) {
            if (collection2 == null) {
              return [];
            }
            if (!isArray(iteratees)) {
              iteratees = iteratees == null ? [] : [iteratees];
            }
            orders = guard ? undefined2 : orders;
            if (!isArray(orders)) {
              orders = orders == null ? [] : [orders];
            }
            return baseOrderBy(collection2, iteratees, orders);
          }
          var partition = createAggregator(function(result2, value, key) {
            result2[key ? 0 : 1].push(value);
          }, function() {
            return [[], []];
          });
          function reduce(collection2, iteratee2, accumulator) {
            var func = isArray(collection2) ? arrayReduce : baseReduce, initAccum = arguments.length < 3;
            return func(collection2, getIteratee(iteratee2, 4), accumulator, initAccum, baseEach);
          }
          function reduceRight(collection2, iteratee2, accumulator) {
            var func = isArray(collection2) ? arrayReduceRight : baseReduce, initAccum = arguments.length < 3;
            return func(collection2, getIteratee(iteratee2, 4), accumulator, initAccum, baseEachRight);
          }
          function reject(collection2, predicate) {
            var func = isArray(collection2) ? arrayFilter : baseFilter;
            return func(collection2, negate(getIteratee(predicate, 3)));
          }
          function sample(collection2) {
            var func = isArray(collection2) ? arraySample : baseSample;
            return func(collection2);
          }
          function sampleSize(collection2, n, guard) {
            if (guard ? isIterateeCall(collection2, n, guard) : n === undefined2) {
              n = 1;
            } else {
              n = toInteger(n);
            }
            var func = isArray(collection2) ? arraySampleSize : baseSampleSize;
            return func(collection2, n);
          }
          function shuffle(collection2) {
            var func = isArray(collection2) ? arrayShuffle : baseShuffle;
            return func(collection2);
          }
          function size(collection2) {
            if (collection2 == null) {
              return 0;
            }
            if (isArrayLike(collection2)) {
              return isString(collection2) ? stringSize(collection2) : collection2.length;
            }
            var tag = getTag(collection2);
            if (tag == mapTag || tag == setTag) {
              return collection2.size;
            }
            return baseKeys(collection2).length;
          }
          function some(collection2, predicate, guard) {
            var func = isArray(collection2) ? arraySome : baseSome;
            if (guard && isIterateeCall(collection2, predicate, guard)) {
              predicate = undefined2;
            }
            return func(collection2, getIteratee(predicate, 3));
          }
          var sortBy = baseRest(function(collection2, iteratees) {
            if (collection2 == null) {
              return [];
            }
            var length = iteratees.length;
            if (length > 1 && isIterateeCall(collection2, iteratees[0], iteratees[1])) {
              iteratees = [];
            } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
              iteratees = [iteratees[0]];
            }
            return baseOrderBy(collection2, baseFlatten(iteratees, 1), []);
          });
          var now = ctxNow || function() {
            return root.Date.now();
          };
          function after(n, func) {
            if (typeof func != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            n = toInteger(n);
            return function() {
              if (--n < 1) {
                return func.apply(this, arguments);
              }
            };
          }
          function ary(func, n, guard) {
            n = guard ? undefined2 : n;
            n = func && n == null ? func.length : n;
            return createWrap(func, WRAP_ARY_FLAG, undefined2, undefined2, undefined2, undefined2, n);
          }
          function before(n, func) {
            var result2;
            if (typeof func != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            n = toInteger(n);
            return function() {
              if (--n > 0) {
                result2 = func.apply(this, arguments);
              }
              if (n <= 1) {
                func = undefined2;
              }
              return result2;
            };
          }
          var bind = baseRest(function(func, thisArg, partials) {
            var bitmask = WRAP_BIND_FLAG;
            if (partials.length) {
              var holders = replaceHolders(partials, getHolder(bind));
              bitmask |= WRAP_PARTIAL_FLAG;
            }
            return createWrap(func, bitmask, thisArg, partials, holders);
          });
          var bindKey = baseRest(function(object, key, partials) {
            var bitmask = WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG;
            if (partials.length) {
              var holders = replaceHolders(partials, getHolder(bindKey));
              bitmask |= WRAP_PARTIAL_FLAG;
            }
            return createWrap(key, bitmask, object, partials, holders);
          });
          function curry(func, arity, guard) {
            arity = guard ? undefined2 : arity;
            var result2 = createWrap(func, WRAP_CURRY_FLAG, undefined2, undefined2, undefined2, undefined2, undefined2, arity);
            result2.placeholder = curry.placeholder;
            return result2;
          }
          function curryRight(func, arity, guard) {
            arity = guard ? undefined2 : arity;
            var result2 = createWrap(func, WRAP_CURRY_RIGHT_FLAG, undefined2, undefined2, undefined2, undefined2, undefined2, arity);
            result2.placeholder = curryRight.placeholder;
            return result2;
          }
          function debounce(func, wait, options) {
            var lastArgs, lastThis, maxWait, result2, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
            if (typeof func != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            wait = toNumber(wait) || 0;
            if (isObject(options)) {
              leading = !!options.leading;
              maxing = "maxWait" in options;
              maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
              trailing = "trailing" in options ? !!options.trailing : trailing;
            }
            function invokeFunc(time) {
              var args = lastArgs, thisArg = lastThis;
              lastArgs = lastThis = undefined2;
              lastInvokeTime = time;
              result2 = func.apply(thisArg, args);
              return result2;
            }
            function leadingEdge(time) {
              lastInvokeTime = time;
              timerId = setTimeout2(timerExpired, wait);
              return leading ? invokeFunc(time) : result2;
            }
            function remainingWait(time) {
              var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
              return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
            }
            function shouldInvoke(time) {
              var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
              return lastCallTime === undefined2 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
            }
            function timerExpired() {
              var time = now();
              if (shouldInvoke(time)) {
                return trailingEdge(time);
              }
              timerId = setTimeout2(timerExpired, remainingWait(time));
            }
            function trailingEdge(time) {
              timerId = undefined2;
              if (trailing && lastArgs) {
                return invokeFunc(time);
              }
              lastArgs = lastThis = undefined2;
              return result2;
            }
            function cancel() {
              if (timerId !== undefined2) {
                clearTimeout(timerId);
              }
              lastInvokeTime = 0;
              lastArgs = lastCallTime = lastThis = timerId = undefined2;
            }
            function flush2() {
              return timerId === undefined2 ? result2 : trailingEdge(now());
            }
            function debounced() {
              var time = now(), isInvoking = shouldInvoke(time);
              lastArgs = arguments;
              lastThis = this;
              lastCallTime = time;
              if (isInvoking) {
                if (timerId === undefined2) {
                  return leadingEdge(lastCallTime);
                }
                if (maxing) {
                  clearTimeout(timerId);
                  timerId = setTimeout2(timerExpired, wait);
                  return invokeFunc(lastCallTime);
                }
              }
              if (timerId === undefined2) {
                timerId = setTimeout2(timerExpired, wait);
              }
              return result2;
            }
            debounced.cancel = cancel;
            debounced.flush = flush2;
            return debounced;
          }
          var defer = baseRest(function(func, args) {
            return baseDelay(func, 1, args);
          });
          var delay = baseRest(function(func, wait, args) {
            return baseDelay(func, toNumber(wait) || 0, args);
          });
          function flip(func) {
            return createWrap(func, WRAP_FLIP_FLAG);
          }
          function memoize(func, resolver) {
            if (typeof func != "function" || resolver != null && typeof resolver != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            var memoized = function() {
              var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
              if (cache.has(key)) {
                return cache.get(key);
              }
              var result2 = func.apply(this, args);
              memoized.cache = cache.set(key, result2) || cache;
              return result2;
            };
            memoized.cache = new (memoize.Cache || MapCache)();
            return memoized;
          }
          memoize.Cache = MapCache;
          function negate(predicate) {
            if (typeof predicate != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            return function() {
              var args = arguments;
              switch (args.length) {
                case 0:
                  return !predicate.call(this);
                case 1:
                  return !predicate.call(this, args[0]);
                case 2:
                  return !predicate.call(this, args[0], args[1]);
                case 3:
                  return !predicate.call(this, args[0], args[1], args[2]);
              }
              return !predicate.apply(this, args);
            };
          }
          function once(func) {
            return before(2, func);
          }
          var overArgs = castRest(function(func, transforms) {
            transforms = transforms.length == 1 && isArray(transforms[0]) ? arrayMap(transforms[0], baseUnary(getIteratee())) : arrayMap(baseFlatten(transforms, 1), baseUnary(getIteratee()));
            var funcsLength = transforms.length;
            return baseRest(function(args) {
              var index = -1, length = nativeMin(args.length, funcsLength);
              while (++index < length) {
                args[index] = transforms[index].call(this, args[index]);
              }
              return apply(func, this, args);
            });
          });
          var partial = baseRest(function(func, partials) {
            var holders = replaceHolders(partials, getHolder(partial));
            return createWrap(func, WRAP_PARTIAL_FLAG, undefined2, partials, holders);
          });
          var partialRight = baseRest(function(func, partials) {
            var holders = replaceHolders(partials, getHolder(partialRight));
            return createWrap(func, WRAP_PARTIAL_RIGHT_FLAG, undefined2, partials, holders);
          });
          var rearg = flatRest(function(func, indexes) {
            return createWrap(func, WRAP_REARG_FLAG, undefined2, undefined2, undefined2, indexes);
          });
          function rest(func, start) {
            if (typeof func != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            start = start === undefined2 ? start : toInteger(start);
            return baseRest(func, start);
          }
          function spread(func, start) {
            if (typeof func != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            start = start == null ? 0 : nativeMax(toInteger(start), 0);
            return baseRest(function(args) {
              var array = args[start], otherArgs = castSlice(args, 0, start);
              if (array) {
                arrayPush(otherArgs, array);
              }
              return apply(func, this, otherArgs);
            });
          }
          function throttle(func, wait, options) {
            var leading = true, trailing = true;
            if (typeof func != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            if (isObject(options)) {
              leading = "leading" in options ? !!options.leading : leading;
              trailing = "trailing" in options ? !!options.trailing : trailing;
            }
            return debounce(func, wait, {
              "leading": leading,
              "maxWait": wait,
              "trailing": trailing
            });
          }
          function unary(func) {
            return ary(func, 1);
          }
          function wrap(value, wrapper) {
            return partial(castFunction(wrapper), value);
          }
          function castArray() {
            if (!arguments.length) {
              return [];
            }
            var value = arguments[0];
            return isArray(value) ? value : [value];
          }
          function clone(value) {
            return baseClone(value, CLONE_SYMBOLS_FLAG);
          }
          function cloneWith(value, customizer) {
            customizer = typeof customizer == "function" ? customizer : undefined2;
            return baseClone(value, CLONE_SYMBOLS_FLAG, customizer);
          }
          function cloneDeep(value) {
            return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
          }
          function cloneDeepWith(value, customizer) {
            customizer = typeof customizer == "function" ? customizer : undefined2;
            return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG, customizer);
          }
          function conformsTo(object, source) {
            return source == null || baseConformsTo(object, source, keys2(source));
          }
          function eq(value, other) {
            return value === other || value !== value && other !== other;
          }
          var gt = createRelationalOperation(baseGt);
          var gte = createRelationalOperation(function(value, other) {
            return value >= other;
          });
          var isArguments = baseIsArguments(function() {
            return arguments;
          }()) ? baseIsArguments : function(value) {
            return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
          };
          var isArray = Array2.isArray;
          var isArrayBuffer = nodeIsArrayBuffer ? baseUnary(nodeIsArrayBuffer) : baseIsArrayBuffer;
          function isArrayLike(value) {
            return value != null && isLength(value.length) && !isFunction(value);
          }
          function isArrayLikeObject(value) {
            return isObjectLike(value) && isArrayLike(value);
          }
          function isBoolean(value) {
            return value === true || value === false || isObjectLike(value) && baseGetTag(value) == boolTag;
          }
          var isBuffer = nativeIsBuffer || stubFalse;
          var isDate = nodeIsDate ? baseUnary(nodeIsDate) : baseIsDate;
          function isElement(value) {
            return isObjectLike(value) && value.nodeType === 1 && !isPlainObject(value);
          }
          function isEmpty(value) {
            if (value == null) {
              return true;
            }
            if (isArrayLike(value) && (isArray(value) || typeof value == "string" || typeof value.splice == "function" || isBuffer(value) || isTypedArray(value) || isArguments(value))) {
              return !value.length;
            }
            var tag = getTag(value);
            if (tag == mapTag || tag == setTag) {
              return !value.size;
            }
            if (isPrototype(value)) {
              return !baseKeys(value).length;
            }
            for (var key in value) {
              if (hasOwnProperty.call(value, key)) {
                return false;
              }
            }
            return true;
          }
          function isEqual2(value, other) {
            return baseIsEqual(value, other);
          }
          function isEqualWith(value, other, customizer) {
            customizer = typeof customizer == "function" ? customizer : undefined2;
            var result2 = customizer ? customizer(value, other) : undefined2;
            return result2 === undefined2 ? baseIsEqual(value, other, undefined2, customizer) : !!result2;
          }
          function isError(value) {
            if (!isObjectLike(value)) {
              return false;
            }
            var tag = baseGetTag(value);
            return tag == errorTag || tag == domExcTag || typeof value.message == "string" && typeof value.name == "string" && !isPlainObject(value);
          }
          function isFinite(value) {
            return typeof value == "number" && nativeIsFinite(value);
          }
          function isFunction(value) {
            if (!isObject(value)) {
              return false;
            }
            var tag = baseGetTag(value);
            return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
          }
          function isInteger(value) {
            return typeof value == "number" && value == toInteger(value);
          }
          function isLength(value) {
            return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
          }
          function isObject(value) {
            var type = typeof value;
            return value != null && (type == "object" || type == "function");
          }
          function isObjectLike(value) {
            return value != null && typeof value == "object";
          }
          var isMap = nodeIsMap ? baseUnary(nodeIsMap) : baseIsMap;
          function isMatch(object, source) {
            return object === source || baseIsMatch(object, source, getMatchData(source));
          }
          function isMatchWith(object, source, customizer) {
            customizer = typeof customizer == "function" ? customizer : undefined2;
            return baseIsMatch(object, source, getMatchData(source), customizer);
          }
          function isNaN2(value) {
            return isNumber(value) && value != +value;
          }
          function isNative(value) {
            if (isMaskable(value)) {
              throw new Error2(CORE_ERROR_TEXT);
            }
            return baseIsNative(value);
          }
          function isNull(value) {
            return value === null;
          }
          function isNil(value) {
            return value == null;
          }
          function isNumber(value) {
            return typeof value == "number" || isObjectLike(value) && baseGetTag(value) == numberTag;
          }
          function isPlainObject(value) {
            if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
              return false;
            }
            var proto = getPrototype(value);
            if (proto === null) {
              return true;
            }
            var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
            return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
          }
          var isRegExp = nodeIsRegExp ? baseUnary(nodeIsRegExp) : baseIsRegExp;
          function isSafeInteger(value) {
            return isInteger(value) && value >= -MAX_SAFE_INTEGER && value <= MAX_SAFE_INTEGER;
          }
          var isSet = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;
          function isString(value) {
            return typeof value == "string" || !isArray(value) && isObjectLike(value) && baseGetTag(value) == stringTag;
          }
          function isSymbol(value) {
            return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
          }
          var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
          function isUndefined(value) {
            return value === undefined2;
          }
          function isWeakMap(value) {
            return isObjectLike(value) && getTag(value) == weakMapTag;
          }
          function isWeakSet(value) {
            return isObjectLike(value) && baseGetTag(value) == weakSetTag;
          }
          var lt = createRelationalOperation(baseLt);
          var lte = createRelationalOperation(function(value, other) {
            return value <= other;
          });
          function toArray(value) {
            if (!value) {
              return [];
            }
            if (isArrayLike(value)) {
              return isString(value) ? stringToArray(value) : copyArray(value);
            }
            if (symIterator && value[symIterator]) {
              return iteratorToArray(value[symIterator]());
            }
            var tag = getTag(value), func = tag == mapTag ? mapToArray : tag == setTag ? setToArray : values;
            return func(value);
          }
          function toFinite(value) {
            if (!value) {
              return value === 0 ? value : 0;
            }
            value = toNumber(value);
            if (value === INFINITY || value === -INFINITY) {
              var sign = value < 0 ? -1 : 1;
              return sign * MAX_INTEGER;
            }
            return value === value ? value : 0;
          }
          function toInteger(value) {
            var result2 = toFinite(value), remainder = result2 % 1;
            return result2 === result2 ? remainder ? result2 - remainder : result2 : 0;
          }
          function toLength(value) {
            return value ? baseClamp(toInteger(value), 0, MAX_ARRAY_LENGTH) : 0;
          }
          function toNumber(value) {
            if (typeof value == "number") {
              return value;
            }
            if (isSymbol(value)) {
              return NAN;
            }
            if (isObject(value)) {
              var other = typeof value.valueOf == "function" ? value.valueOf() : value;
              value = isObject(other) ? other + "" : other;
            }
            if (typeof value != "string") {
              return value === 0 ? value : +value;
            }
            value = baseTrim(value);
            var isBinary = reIsBinary.test(value);
            return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
          }
          function toPlainObject(value) {
            return copyObject(value, keysIn(value));
          }
          function toSafeInteger(value) {
            return value ? baseClamp(toInteger(value), -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER) : value === 0 ? value : 0;
          }
          function toString(value) {
            return value == null ? "" : baseToString(value);
          }
          var assign = createAssigner(function(object, source) {
            if (isPrototype(source) || isArrayLike(source)) {
              copyObject(source, keys2(source), object);
              return;
            }
            for (var key in source) {
              if (hasOwnProperty.call(source, key)) {
                assignValue(object, key, source[key]);
              }
            }
          });
          var assignIn = createAssigner(function(object, source) {
            copyObject(source, keysIn(source), object);
          });
          var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
            copyObject(source, keysIn(source), object, customizer);
          });
          var assignWith = createAssigner(function(object, source, srcIndex, customizer) {
            copyObject(source, keys2(source), object, customizer);
          });
          var at = flatRest(baseAt);
          function create(prototype, properties) {
            var result2 = baseCreate(prototype);
            return properties == null ? result2 : baseAssign(result2, properties);
          }
          var defaults = baseRest(function(object, sources) {
            object = Object2(object);
            var index = -1;
            var length = sources.length;
            var guard = length > 2 ? sources[2] : undefined2;
            if (guard && isIterateeCall(sources[0], sources[1], guard)) {
              length = 1;
            }
            while (++index < length) {
              var source = sources[index];
              var props = keysIn(source);
              var propsIndex = -1;
              var propsLength = props.length;
              while (++propsIndex < propsLength) {
                var key = props[propsIndex];
                var value = object[key];
                if (value === undefined2 || eq(value, objectProto[key]) && !hasOwnProperty.call(object, key)) {
                  object[key] = source[key];
                }
              }
            }
            return object;
          });
          var defaultsDeep = baseRest(function(args) {
            args.push(undefined2, customDefaultsMerge);
            return apply(mergeWith, undefined2, args);
          });
          function findKey(object, predicate) {
            return baseFindKey(object, getIteratee(predicate, 3), baseForOwn);
          }
          function findLastKey(object, predicate) {
            return baseFindKey(object, getIteratee(predicate, 3), baseForOwnRight);
          }
          function forIn(object, iteratee2) {
            return object == null ? object : baseFor(object, getIteratee(iteratee2, 3), keysIn);
          }
          function forInRight(object, iteratee2) {
            return object == null ? object : baseForRight(object, getIteratee(iteratee2, 3), keysIn);
          }
          function forOwn(object, iteratee2) {
            return object && baseForOwn(object, getIteratee(iteratee2, 3));
          }
          function forOwnRight(object, iteratee2) {
            return object && baseForOwnRight(object, getIteratee(iteratee2, 3));
          }
          function functions(object) {
            return object == null ? [] : baseFunctions(object, keys2(object));
          }
          function functionsIn(object) {
            return object == null ? [] : baseFunctions(object, keysIn(object));
          }
          function get(object, path, defaultValue) {
            var result2 = object == null ? undefined2 : baseGet(object, path);
            return result2 === undefined2 ? defaultValue : result2;
          }
          function has(object, path) {
            return object != null && hasPath(object, path, baseHas);
          }
          function hasIn(object, path) {
            return object != null && hasPath(object, path, baseHasIn);
          }
          var invert = createInverter(function(result2, value, key) {
            if (value != null && typeof value.toString != "function") {
              value = nativeObjectToString.call(value);
            }
            result2[value] = key;
          }, constant(identity));
          var invertBy = createInverter(function(result2, value, key) {
            if (value != null && typeof value.toString != "function") {
              value = nativeObjectToString.call(value);
            }
            if (hasOwnProperty.call(result2, value)) {
              result2[value].push(key);
            } else {
              result2[value] = [key];
            }
          }, getIteratee);
          var invoke = baseRest(baseInvoke);
          function keys2(object) {
            return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
          }
          function keysIn(object) {
            return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
          }
          function mapKeys(object, iteratee2) {
            var result2 = {};
            iteratee2 = getIteratee(iteratee2, 3);
            baseForOwn(object, function(value, key, object2) {
              baseAssignValue(result2, iteratee2(value, key, object2), value);
            });
            return result2;
          }
          function mapValues(object, iteratee2) {
            var result2 = {};
            iteratee2 = getIteratee(iteratee2, 3);
            baseForOwn(object, function(value, key, object2) {
              baseAssignValue(result2, key, iteratee2(value, key, object2));
            });
            return result2;
          }
          var merge = createAssigner(function(object, source, srcIndex) {
            baseMerge(object, source, srcIndex);
          });
          var mergeWith = createAssigner(function(object, source, srcIndex, customizer) {
            baseMerge(object, source, srcIndex, customizer);
          });
          var omit = flatRest(function(object, paths) {
            var result2 = {};
            if (object == null) {
              return result2;
            }
            var isDeep = false;
            paths = arrayMap(paths, function(path) {
              path = castPath(path, object);
              isDeep || (isDeep = path.length > 1);
              return path;
            });
            copyObject(object, getAllKeysIn(object), result2);
            if (isDeep) {
              result2 = baseClone(result2, CLONE_DEEP_FLAG | CLONE_FLAT_FLAG | CLONE_SYMBOLS_FLAG, customOmitClone);
            }
            var length = paths.length;
            while (length--) {
              baseUnset(result2, paths[length]);
            }
            return result2;
          });
          function omitBy(object, predicate) {
            return pickBy(object, negate(getIteratee(predicate)));
          }
          var pick = flatRest(function(object, paths) {
            return object == null ? {} : basePick(object, paths);
          });
          function pickBy(object, predicate) {
            if (object == null) {
              return {};
            }
            var props = arrayMap(getAllKeysIn(object), function(prop) {
              return [prop];
            });
            predicate = getIteratee(predicate);
            return basePickBy(object, props, function(value, path) {
              return predicate(value, path[0]);
            });
          }
          function result(object, path, defaultValue) {
            path = castPath(path, object);
            var index = -1, length = path.length;
            if (!length) {
              length = 1;
              object = undefined2;
            }
            while (++index < length) {
              var value = object == null ? undefined2 : object[toKey(path[index])];
              if (value === undefined2) {
                index = length;
                value = defaultValue;
              }
              object = isFunction(value) ? value.call(object) : value;
            }
            return object;
          }
          function set(object, path, value) {
            return object == null ? object : baseSet(object, path, value);
          }
          function setWith(object, path, value, customizer) {
            customizer = typeof customizer == "function" ? customizer : undefined2;
            return object == null ? object : baseSet(object, path, value, customizer);
          }
          var toPairs = createToPairs(keys2);
          var toPairsIn = createToPairs(keysIn);
          function transform(object, iteratee2, accumulator) {
            var isArr = isArray(object), isArrLike = isArr || isBuffer(object) || isTypedArray(object);
            iteratee2 = getIteratee(iteratee2, 4);
            if (accumulator == null) {
              var Ctor = object && object.constructor;
              if (isArrLike) {
                accumulator = isArr ? new Ctor() : [];
              } else if (isObject(object)) {
                accumulator = isFunction(Ctor) ? baseCreate(getPrototype(object)) : {};
              } else {
                accumulator = {};
              }
            }
            (isArrLike ? arrayEach : baseForOwn)(object, function(value, index, object2) {
              return iteratee2(accumulator, value, index, object2);
            });
            return accumulator;
          }
          function unset(object, path) {
            return object == null ? true : baseUnset(object, path);
          }
          function update(object, path, updater) {
            return object == null ? object : baseUpdate(object, path, castFunction(updater));
          }
          function updateWith(object, path, updater, customizer) {
            customizer = typeof customizer == "function" ? customizer : undefined2;
            return object == null ? object : baseUpdate(object, path, castFunction(updater), customizer);
          }
          function values(object) {
            return object == null ? [] : baseValues(object, keys2(object));
          }
          function valuesIn(object) {
            return object == null ? [] : baseValues(object, keysIn(object));
          }
          function clamp(number, lower, upper) {
            if (upper === undefined2) {
              upper = lower;
              lower = undefined2;
            }
            if (upper !== undefined2) {
              upper = toNumber(upper);
              upper = upper === upper ? upper : 0;
            }
            if (lower !== undefined2) {
              lower = toNumber(lower);
              lower = lower === lower ? lower : 0;
            }
            return baseClamp(toNumber(number), lower, upper);
          }
          function inRange(number, start, end) {
            start = toFinite(start);
            if (end === undefined2) {
              end = start;
              start = 0;
            } else {
              end = toFinite(end);
            }
            number = toNumber(number);
            return baseInRange(number, start, end);
          }
          function random(lower, upper, floating) {
            if (floating && typeof floating != "boolean" && isIterateeCall(lower, upper, floating)) {
              upper = floating = undefined2;
            }
            if (floating === undefined2) {
              if (typeof upper == "boolean") {
                floating = upper;
                upper = undefined2;
              } else if (typeof lower == "boolean") {
                floating = lower;
                lower = undefined2;
              }
            }
            if (lower === undefined2 && upper === undefined2) {
              lower = 0;
              upper = 1;
            } else {
              lower = toFinite(lower);
              if (upper === undefined2) {
                upper = lower;
                lower = 0;
              } else {
                upper = toFinite(upper);
              }
            }
            if (lower > upper) {
              var temp = lower;
              lower = upper;
              upper = temp;
            }
            if (floating || lower % 1 || upper % 1) {
              var rand = nativeRandom();
              return nativeMin(lower + rand * (upper - lower + freeParseFloat("1e-" + ((rand + "").length - 1))), upper);
            }
            return baseRandom(lower, upper);
          }
          var camelCase = createCompounder(function(result2, word, index) {
            word = word.toLowerCase();
            return result2 + (index ? capitalize(word) : word);
          });
          function capitalize(string) {
            return upperFirst(toString(string).toLowerCase());
          }
          function deburr(string) {
            string = toString(string);
            return string && string.replace(reLatin, deburrLetter).replace(reComboMark, "");
          }
          function endsWith(string, target, position) {
            string = toString(string);
            target = baseToString(target);
            var length = string.length;
            position = position === undefined2 ? length : baseClamp(toInteger(position), 0, length);
            var end = position;
            position -= target.length;
            return position >= 0 && string.slice(position, end) == target;
          }
          function escape(string) {
            string = toString(string);
            return string && reHasUnescapedHtml.test(string) ? string.replace(reUnescapedHtml, escapeHtmlChar) : string;
          }
          function escapeRegExp(string) {
            string = toString(string);
            return string && reHasRegExpChar.test(string) ? string.replace(reRegExpChar, "\\$&") : string;
          }
          var kebabCase = createCompounder(function(result2, word, index) {
            return result2 + (index ? "-" : "") + word.toLowerCase();
          });
          var lowerCase = createCompounder(function(result2, word, index) {
            return result2 + (index ? " " : "") + word.toLowerCase();
          });
          var lowerFirst = createCaseFirst("toLowerCase");
          function pad(string, length, chars) {
            string = toString(string);
            length = toInteger(length);
            var strLength = length ? stringSize(string) : 0;
            if (!length || strLength >= length) {
              return string;
            }
            var mid = (length - strLength) / 2;
            return createPadding(nativeFloor(mid), chars) + string + createPadding(nativeCeil(mid), chars);
          }
          function padEnd(string, length, chars) {
            string = toString(string);
            length = toInteger(length);
            var strLength = length ? stringSize(string) : 0;
            return length && strLength < length ? string + createPadding(length - strLength, chars) : string;
          }
          function padStart(string, length, chars) {
            string = toString(string);
            length = toInteger(length);
            var strLength = length ? stringSize(string) : 0;
            return length && strLength < length ? createPadding(length - strLength, chars) + string : string;
          }
          function parseInt2(string, radix, guard) {
            if (guard || radix == null) {
              radix = 0;
            } else if (radix) {
              radix = +radix;
            }
            return nativeParseInt(toString(string).replace(reTrimStart, ""), radix || 0);
          }
          function repeat(string, n, guard) {
            if (guard ? isIterateeCall(string, n, guard) : n === undefined2) {
              n = 1;
            } else {
              n = toInteger(n);
            }
            return baseRepeat(toString(string), n);
          }
          function replace() {
            var args = arguments, string = toString(args[0]);
            return args.length < 3 ? string : string.replace(args[1], args[2]);
          }
          var snakeCase = createCompounder(function(result2, word, index) {
            return result2 + (index ? "_" : "") + word.toLowerCase();
          });
          function split(string, separator, limit) {
            if (limit && typeof limit != "number" && isIterateeCall(string, separator, limit)) {
              separator = limit = undefined2;
            }
            limit = limit === undefined2 ? MAX_ARRAY_LENGTH : limit >>> 0;
            if (!limit) {
              return [];
            }
            string = toString(string);
            if (string && (typeof separator == "string" || separator != null && !isRegExp(separator))) {
              separator = baseToString(separator);
              if (!separator && hasUnicode(string)) {
                return castSlice(stringToArray(string), 0, limit);
              }
            }
            return string.split(separator, limit);
          }
          var startCase = createCompounder(function(result2, word, index) {
            return result2 + (index ? " " : "") + upperFirst(word);
          });
          function startsWith(string, target, position) {
            string = toString(string);
            position = position == null ? 0 : baseClamp(toInteger(position), 0, string.length);
            target = baseToString(target);
            return string.slice(position, position + target.length) == target;
          }
          function template(string, options, guard) {
            var settings = lodash.templateSettings;
            if (guard && isIterateeCall(string, options, guard)) {
              options = undefined2;
            }
            string = toString(string);
            options = assignInWith({}, options, settings, customDefaultsAssignIn);
            var imports = assignInWith({}, options.imports, settings.imports, customDefaultsAssignIn), importsKeys = keys2(imports), importsValues = baseValues(imports, importsKeys);
            var isEscaping, isEvaluating, index = 0, interpolate = options.interpolate || reNoMatch, source = "__p += '";
            var reDelimiters = RegExp2((options.escape || reNoMatch).source + "|" + interpolate.source + "|" + (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + "|" + (options.evaluate || reNoMatch).source + "|$", "g");
            var sourceURL = "//# sourceURL=" + (hasOwnProperty.call(options, "sourceURL") ? (options.sourceURL + "").replace(/\s/g, " ") : "lodash.templateSources[" + ++templateCounter + "]") + "\n";
            string.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
              interpolateValue || (interpolateValue = esTemplateValue);
              source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);
              if (escapeValue) {
                isEscaping = true;
                source += "' +\n__e(" + escapeValue + ") +\n'";
              }
              if (evaluateValue) {
                isEvaluating = true;
                source += "';\n" + evaluateValue + ";\n__p += '";
              }
              if (interpolateValue) {
                source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
              }
              index = offset + match.length;
              return match;
            });
            source += "';\n";
            var variable = hasOwnProperty.call(options, "variable") && options.variable;
            if (!variable) {
              source = "with (obj) {\n" + source + "\n}\n";
            } else if (reForbiddenIdentifierChars.test(variable)) {
              throw new Error2(INVALID_TEMPL_VAR_ERROR_TEXT);
            }
            source = (isEvaluating ? source.replace(reEmptyStringLeading, "") : source).replace(reEmptyStringMiddle, "$1").replace(reEmptyStringTrailing, "$1;");
            source = "function(" + (variable || "obj") + ") {\n" + (variable ? "" : "obj || (obj = {});\n") + "var __t, __p = ''" + (isEscaping ? ", __e = _.escape" : "") + (isEvaluating ? ", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n" : ";\n") + source + "return __p\n}";
            var result2 = attempt(function() {
              return Function2(importsKeys, sourceURL + "return " + source).apply(undefined2, importsValues);
            });
            result2.source = source;
            if (isError(result2)) {
              throw result2;
            }
            return result2;
          }
          function toLower(value) {
            return toString(value).toLowerCase();
          }
          function toUpper(value) {
            return toString(value).toUpperCase();
          }
          function trim(string, chars, guard) {
            string = toString(string);
            if (string && (guard || chars === undefined2)) {
              return baseTrim(string);
            }
            if (!string || !(chars = baseToString(chars))) {
              return string;
            }
            var strSymbols = stringToArray(string), chrSymbols = stringToArray(chars), start = charsStartIndex(strSymbols, chrSymbols), end = charsEndIndex(strSymbols, chrSymbols) + 1;
            return castSlice(strSymbols, start, end).join("");
          }
          function trimEnd(string, chars, guard) {
            string = toString(string);
            if (string && (guard || chars === undefined2)) {
              return string.slice(0, trimmedEndIndex(string) + 1);
            }
            if (!string || !(chars = baseToString(chars))) {
              return string;
            }
            var strSymbols = stringToArray(string), end = charsEndIndex(strSymbols, stringToArray(chars)) + 1;
            return castSlice(strSymbols, 0, end).join("");
          }
          function trimStart(string, chars, guard) {
            string = toString(string);
            if (string && (guard || chars === undefined2)) {
              return string.replace(reTrimStart, "");
            }
            if (!string || !(chars = baseToString(chars))) {
              return string;
            }
            var strSymbols = stringToArray(string), start = charsStartIndex(strSymbols, stringToArray(chars));
            return castSlice(strSymbols, start).join("");
          }
          function truncate(string, options) {
            var length = DEFAULT_TRUNC_LENGTH, omission = DEFAULT_TRUNC_OMISSION;
            if (isObject(options)) {
              var separator = "separator" in options ? options.separator : separator;
              length = "length" in options ? toInteger(options.length) : length;
              omission = "omission" in options ? baseToString(options.omission) : omission;
            }
            string = toString(string);
            var strLength = string.length;
            if (hasUnicode(string)) {
              var strSymbols = stringToArray(string);
              strLength = strSymbols.length;
            }
            if (length >= strLength) {
              return string;
            }
            var end = length - stringSize(omission);
            if (end < 1) {
              return omission;
            }
            var result2 = strSymbols ? castSlice(strSymbols, 0, end).join("") : string.slice(0, end);
            if (separator === undefined2) {
              return result2 + omission;
            }
            if (strSymbols) {
              end += result2.length - end;
            }
            if (isRegExp(separator)) {
              if (string.slice(end).search(separator)) {
                var match, substring = result2;
                if (!separator.global) {
                  separator = RegExp2(separator.source, toString(reFlags.exec(separator)) + "g");
                }
                separator.lastIndex = 0;
                while (match = separator.exec(substring)) {
                  var newEnd = match.index;
                }
                result2 = result2.slice(0, newEnd === undefined2 ? end : newEnd);
              }
            } else if (string.indexOf(baseToString(separator), end) != end) {
              var index = result2.lastIndexOf(separator);
              if (index > -1) {
                result2 = result2.slice(0, index);
              }
            }
            return result2 + omission;
          }
          function unescape(string) {
            string = toString(string);
            return string && reHasEscapedHtml.test(string) ? string.replace(reEscapedHtml, unescapeHtmlChar) : string;
          }
          var upperCase = createCompounder(function(result2, word, index) {
            return result2 + (index ? " " : "") + word.toUpperCase();
          });
          var upperFirst = createCaseFirst("toUpperCase");
          function words(string, pattern, guard) {
            string = toString(string);
            pattern = guard ? undefined2 : pattern;
            if (pattern === undefined2) {
              return hasUnicodeWord(string) ? unicodeWords(string) : asciiWords(string);
            }
            return string.match(pattern) || [];
          }
          var attempt = baseRest(function(func, args) {
            try {
              return apply(func, undefined2, args);
            } catch (e) {
              return isError(e) ? e : new Error2(e);
            }
          });
          var bindAll = flatRest(function(object, methodNames) {
            arrayEach(methodNames, function(key) {
              key = toKey(key);
              baseAssignValue(object, key, bind(object[key], object));
            });
            return object;
          });
          function cond(pairs) {
            var length = pairs == null ? 0 : pairs.length, toIteratee = getIteratee();
            pairs = !length ? [] : arrayMap(pairs, function(pair) {
              if (typeof pair[1] != "function") {
                throw new TypeError2(FUNC_ERROR_TEXT);
              }
              return [toIteratee(pair[0]), pair[1]];
            });
            return baseRest(function(args) {
              var index = -1;
              while (++index < length) {
                var pair = pairs[index];
                if (apply(pair[0], this, args)) {
                  return apply(pair[1], this, args);
                }
              }
            });
          }
          function conforms(source) {
            return baseConforms(baseClone(source, CLONE_DEEP_FLAG));
          }
          function constant(value) {
            return function() {
              return value;
            };
          }
          function defaultTo(value, defaultValue) {
            return value == null || value !== value ? defaultValue : value;
          }
          var flow = createFlow();
          var flowRight = createFlow(true);
          function identity(value) {
            return value;
          }
          function iteratee(func) {
            return baseIteratee(typeof func == "function" ? func : baseClone(func, CLONE_DEEP_FLAG));
          }
          function matches(source) {
            return baseMatches(baseClone(source, CLONE_DEEP_FLAG));
          }
          function matchesProperty(path, srcValue) {
            return baseMatchesProperty(path, baseClone(srcValue, CLONE_DEEP_FLAG));
          }
          var method = baseRest(function(path, args) {
            return function(object) {
              return baseInvoke(object, path, args);
            };
          });
          var methodOf = baseRest(function(object, args) {
            return function(path) {
              return baseInvoke(object, path, args);
            };
          });
          function mixin(object, source, options) {
            var props = keys2(source), methodNames = baseFunctions(source, props);
            if (options == null && !(isObject(source) && (methodNames.length || !props.length))) {
              options = source;
              source = object;
              object = this;
              methodNames = baseFunctions(source, keys2(source));
            }
            var chain2 = !(isObject(options) && "chain" in options) || !!options.chain, isFunc = isFunction(object);
            arrayEach(methodNames, function(methodName) {
              var func = source[methodName];
              object[methodName] = func;
              if (isFunc) {
                object.prototype[methodName] = function() {
                  var chainAll = this.__chain__;
                  if (chain2 || chainAll) {
                    var result2 = object(this.__wrapped__), actions = result2.__actions__ = copyArray(this.__actions__);
                    actions.push({ "func": func, "args": arguments, "thisArg": object });
                    result2.__chain__ = chainAll;
                    return result2;
                  }
                  return func.apply(object, arrayPush([this.value()], arguments));
                };
              }
            });
            return object;
          }
          function noConflict() {
            if (root._ === this) {
              root._ = oldDash;
            }
            return this;
          }
          function noop() {
          }
          function nthArg(n) {
            n = toInteger(n);
            return baseRest(function(args) {
              return baseNth(args, n);
            });
          }
          var over = createOver(arrayMap);
          var overEvery = createOver(arrayEvery);
          var overSome = createOver(arraySome);
          function property(path) {
            return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
          }
          function propertyOf(object) {
            return function(path) {
              return object == null ? undefined2 : baseGet(object, path);
            };
          }
          var range = createRange();
          var rangeRight = createRange(true);
          function stubArray() {
            return [];
          }
          function stubFalse() {
            return false;
          }
          function stubObject() {
            return {};
          }
          function stubString() {
            return "";
          }
          function stubTrue() {
            return true;
          }
          function times(n, iteratee2) {
            n = toInteger(n);
            if (n < 1 || n > MAX_SAFE_INTEGER) {
              return [];
            }
            var index = MAX_ARRAY_LENGTH, length = nativeMin(n, MAX_ARRAY_LENGTH);
            iteratee2 = getIteratee(iteratee2);
            n -= MAX_ARRAY_LENGTH;
            var result2 = baseTimes(length, iteratee2);
            while (++index < n) {
              iteratee2(index);
            }
            return result2;
          }
          function toPath(value) {
            if (isArray(value)) {
              return arrayMap(value, toKey);
            }
            return isSymbol(value) ? [value] : copyArray(stringToPath(toString(value)));
          }
          function uniqueId(prefix) {
            var id2 = ++idCounter;
            return toString(prefix) + id2;
          }
          var add = createMathOperation(function(augend, addend) {
            return augend + addend;
          }, 0);
          var ceil = createRound("ceil");
          var divide = createMathOperation(function(dividend, divisor) {
            return dividend / divisor;
          }, 1);
          var floor = createRound("floor");
          function max(array) {
            return array && array.length ? baseExtremum(array, identity, baseGt) : undefined2;
          }
          function maxBy(array, iteratee2) {
            return array && array.length ? baseExtremum(array, getIteratee(iteratee2, 2), baseGt) : undefined2;
          }
          function mean(array) {
            return baseMean(array, identity);
          }
          function meanBy(array, iteratee2) {
            return baseMean(array, getIteratee(iteratee2, 2));
          }
          function min(array) {
            return array && array.length ? baseExtremum(array, identity, baseLt) : undefined2;
          }
          function minBy(array, iteratee2) {
            return array && array.length ? baseExtremum(array, getIteratee(iteratee2, 2), baseLt) : undefined2;
          }
          var multiply = createMathOperation(function(multiplier, multiplicand) {
            return multiplier * multiplicand;
          }, 1);
          var round = createRound("round");
          var subtract = createMathOperation(function(minuend, subtrahend) {
            return minuend - subtrahend;
          }, 0);
          function sum(array) {
            return array && array.length ? baseSum(array, identity) : 0;
          }
          function sumBy(array, iteratee2) {
            return array && array.length ? baseSum(array, getIteratee(iteratee2, 2)) : 0;
          }
          lodash.after = after;
          lodash.ary = ary;
          lodash.assign = assign;
          lodash.assignIn = assignIn;
          lodash.assignInWith = assignInWith;
          lodash.assignWith = assignWith;
          lodash.at = at;
          lodash.before = before;
          lodash.bind = bind;
          lodash.bindAll = bindAll;
          lodash.bindKey = bindKey;
          lodash.castArray = castArray;
          lodash.chain = chain;
          lodash.chunk = chunk;
          lodash.compact = compact;
          lodash.concat = concat;
          lodash.cond = cond;
          lodash.conforms = conforms;
          lodash.constant = constant;
          lodash.countBy = countBy;
          lodash.create = create;
          lodash.curry = curry;
          lodash.curryRight = curryRight;
          lodash.debounce = debounce;
          lodash.defaults = defaults;
          lodash.defaultsDeep = defaultsDeep;
          lodash.defer = defer;
          lodash.delay = delay;
          lodash.difference = difference;
          lodash.differenceBy = differenceBy;
          lodash.differenceWith = differenceWith;
          lodash.drop = drop;
          lodash.dropRight = dropRight;
          lodash.dropRightWhile = dropRightWhile;
          lodash.dropWhile = dropWhile;
          lodash.fill = fill;
          lodash.filter = filter;
          lodash.flatMap = flatMap;
          lodash.flatMapDeep = flatMapDeep;
          lodash.flatMapDepth = flatMapDepth;
          lodash.flatten = flatten;
          lodash.flattenDeep = flattenDeep;
          lodash.flattenDepth = flattenDepth;
          lodash.flip = flip;
          lodash.flow = flow;
          lodash.flowRight = flowRight;
          lodash.fromPairs = fromPairs;
          lodash.functions = functions;
          lodash.functionsIn = functionsIn;
          lodash.groupBy = groupBy;
          lodash.initial = initial;
          lodash.intersection = intersection;
          lodash.intersectionBy = intersectionBy;
          lodash.intersectionWith = intersectionWith;
          lodash.invert = invert;
          lodash.invertBy = invertBy;
          lodash.invokeMap = invokeMap;
          lodash.iteratee = iteratee;
          lodash.keyBy = keyBy;
          lodash.keys = keys2;
          lodash.keysIn = keysIn;
          lodash.map = map;
          lodash.mapKeys = mapKeys;
          lodash.mapValues = mapValues;
          lodash.matches = matches;
          lodash.matchesProperty = matchesProperty;
          lodash.memoize = memoize;
          lodash.merge = merge;
          lodash.mergeWith = mergeWith;
          lodash.method = method;
          lodash.methodOf = methodOf;
          lodash.mixin = mixin;
          lodash.negate = negate;
          lodash.nthArg = nthArg;
          lodash.omit = omit;
          lodash.omitBy = omitBy;
          lodash.once = once;
          lodash.orderBy = orderBy;
          lodash.over = over;
          lodash.overArgs = overArgs;
          lodash.overEvery = overEvery;
          lodash.overSome = overSome;
          lodash.partial = partial;
          lodash.partialRight = partialRight;
          lodash.partition = partition;
          lodash.pick = pick;
          lodash.pickBy = pickBy;
          lodash.property = property;
          lodash.propertyOf = propertyOf;
          lodash.pull = pull;
          lodash.pullAll = pullAll;
          lodash.pullAllBy = pullAllBy;
          lodash.pullAllWith = pullAllWith;
          lodash.pullAt = pullAt;
          lodash.range = range;
          lodash.rangeRight = rangeRight;
          lodash.rearg = rearg;
          lodash.reject = reject;
          lodash.remove = remove;
          lodash.rest = rest;
          lodash.reverse = reverse;
          lodash.sampleSize = sampleSize;
          lodash.set = set;
          lodash.setWith = setWith;
          lodash.shuffle = shuffle;
          lodash.slice = slice;
          lodash.sortBy = sortBy;
          lodash.sortedUniq = sortedUniq;
          lodash.sortedUniqBy = sortedUniqBy;
          lodash.split = split;
          lodash.spread = spread;
          lodash.tail = tail;
          lodash.take = take;
          lodash.takeRight = takeRight;
          lodash.takeRightWhile = takeRightWhile;
          lodash.takeWhile = takeWhile;
          lodash.tap = tap;
          lodash.throttle = throttle;
          lodash.thru = thru;
          lodash.toArray = toArray;
          lodash.toPairs = toPairs;
          lodash.toPairsIn = toPairsIn;
          lodash.toPath = toPath;
          lodash.toPlainObject = toPlainObject;
          lodash.transform = transform;
          lodash.unary = unary;
          lodash.union = union;
          lodash.unionBy = unionBy;
          lodash.unionWith = unionWith;
          lodash.uniq = uniq;
          lodash.uniqBy = uniqBy;
          lodash.uniqWith = uniqWith;
          lodash.unset = unset;
          lodash.unzip = unzip;
          lodash.unzipWith = unzipWith;
          lodash.update = update;
          lodash.updateWith = updateWith;
          lodash.values = values;
          lodash.valuesIn = valuesIn;
          lodash.without = without;
          lodash.words = words;
          lodash.wrap = wrap;
          lodash.xor = xor;
          lodash.xorBy = xorBy;
          lodash.xorWith = xorWith;
          lodash.zip = zip;
          lodash.zipObject = zipObject;
          lodash.zipObjectDeep = zipObjectDeep;
          lodash.zipWith = zipWith;
          lodash.entries = toPairs;
          lodash.entriesIn = toPairsIn;
          lodash.extend = assignIn;
          lodash.extendWith = assignInWith;
          mixin(lodash, lodash);
          lodash.add = add;
          lodash.attempt = attempt;
          lodash.camelCase = camelCase;
          lodash.capitalize = capitalize;
          lodash.ceil = ceil;
          lodash.clamp = clamp;
          lodash.clone = clone;
          lodash.cloneDeep = cloneDeep;
          lodash.cloneDeepWith = cloneDeepWith;
          lodash.cloneWith = cloneWith;
          lodash.conformsTo = conformsTo;
          lodash.deburr = deburr;
          lodash.defaultTo = defaultTo;
          lodash.divide = divide;
          lodash.endsWith = endsWith;
          lodash.eq = eq;
          lodash.escape = escape;
          lodash.escapeRegExp = escapeRegExp;
          lodash.every = every;
          lodash.find = find;
          lodash.findIndex = findIndex;
          lodash.findKey = findKey;
          lodash.findLast = findLast;
          lodash.findLastIndex = findLastIndex;
          lodash.findLastKey = findLastKey;
          lodash.floor = floor;
          lodash.forEach = forEach;
          lodash.forEachRight = forEachRight;
          lodash.forIn = forIn;
          lodash.forInRight = forInRight;
          lodash.forOwn = forOwn;
          lodash.forOwnRight = forOwnRight;
          lodash.get = get;
          lodash.gt = gt;
          lodash.gte = gte;
          lodash.has = has;
          lodash.hasIn = hasIn;
          lodash.head = head;
          lodash.identity = identity;
          lodash.includes = includes;
          lodash.indexOf = indexOf;
          lodash.inRange = inRange;
          lodash.invoke = invoke;
          lodash.isArguments = isArguments;
          lodash.isArray = isArray;
          lodash.isArrayBuffer = isArrayBuffer;
          lodash.isArrayLike = isArrayLike;
          lodash.isArrayLikeObject = isArrayLikeObject;
          lodash.isBoolean = isBoolean;
          lodash.isBuffer = isBuffer;
          lodash.isDate = isDate;
          lodash.isElement = isElement;
          lodash.isEmpty = isEmpty;
          lodash.isEqual = isEqual2;
          lodash.isEqualWith = isEqualWith;
          lodash.isError = isError;
          lodash.isFinite = isFinite;
          lodash.isFunction = isFunction;
          lodash.isInteger = isInteger;
          lodash.isLength = isLength;
          lodash.isMap = isMap;
          lodash.isMatch = isMatch;
          lodash.isMatchWith = isMatchWith;
          lodash.isNaN = isNaN2;
          lodash.isNative = isNative;
          lodash.isNil = isNil;
          lodash.isNull = isNull;
          lodash.isNumber = isNumber;
          lodash.isObject = isObject;
          lodash.isObjectLike = isObjectLike;
          lodash.isPlainObject = isPlainObject;
          lodash.isRegExp = isRegExp;
          lodash.isSafeInteger = isSafeInteger;
          lodash.isSet = isSet;
          lodash.isString = isString;
          lodash.isSymbol = isSymbol;
          lodash.isTypedArray = isTypedArray;
          lodash.isUndefined = isUndefined;
          lodash.isWeakMap = isWeakMap;
          lodash.isWeakSet = isWeakSet;
          lodash.join = join;
          lodash.kebabCase = kebabCase;
          lodash.last = last;
          lodash.lastIndexOf = lastIndexOf;
          lodash.lowerCase = lowerCase;
          lodash.lowerFirst = lowerFirst;
          lodash.lt = lt;
          lodash.lte = lte;
          lodash.max = max;
          lodash.maxBy = maxBy;
          lodash.mean = mean;
          lodash.meanBy = meanBy;
          lodash.min = min;
          lodash.minBy = minBy;
          lodash.stubArray = stubArray;
          lodash.stubFalse = stubFalse;
          lodash.stubObject = stubObject;
          lodash.stubString = stubString;
          lodash.stubTrue = stubTrue;
          lodash.multiply = multiply;
          lodash.nth = nth;
          lodash.noConflict = noConflict;
          lodash.noop = noop;
          lodash.now = now;
          lodash.pad = pad;
          lodash.padEnd = padEnd;
          lodash.padStart = padStart;
          lodash.parseInt = parseInt2;
          lodash.random = random;
          lodash.reduce = reduce;
          lodash.reduceRight = reduceRight;
          lodash.repeat = repeat;
          lodash.replace = replace;
          lodash.result = result;
          lodash.round = round;
          lodash.runInContext = runInContext2;
          lodash.sample = sample;
          lodash.size = size;
          lodash.snakeCase = snakeCase;
          lodash.some = some;
          lodash.sortedIndex = sortedIndex;
          lodash.sortedIndexBy = sortedIndexBy;
          lodash.sortedIndexOf = sortedIndexOf;
          lodash.sortedLastIndex = sortedLastIndex;
          lodash.sortedLastIndexBy = sortedLastIndexBy;
          lodash.sortedLastIndexOf = sortedLastIndexOf;
          lodash.startCase = startCase;
          lodash.startsWith = startsWith;
          lodash.subtract = subtract;
          lodash.sum = sum;
          lodash.sumBy = sumBy;
          lodash.template = template;
          lodash.times = times;
          lodash.toFinite = toFinite;
          lodash.toInteger = toInteger;
          lodash.toLength = toLength;
          lodash.toLower = toLower;
          lodash.toNumber = toNumber;
          lodash.toSafeInteger = toSafeInteger;
          lodash.toString = toString;
          lodash.toUpper = toUpper;
          lodash.trim = trim;
          lodash.trimEnd = trimEnd;
          lodash.trimStart = trimStart;
          lodash.truncate = truncate;
          lodash.unescape = unescape;
          lodash.uniqueId = uniqueId;
          lodash.upperCase = upperCase;
          lodash.upperFirst = upperFirst;
          lodash.each = forEach;
          lodash.eachRight = forEachRight;
          lodash.first = head;
          mixin(lodash, function() {
            var source = {};
            baseForOwn(lodash, function(func, methodName) {
              if (!hasOwnProperty.call(lodash.prototype, methodName)) {
                source[methodName] = func;
              }
            });
            return source;
          }(), { "chain": false });
          lodash.VERSION = VERSION;
          arrayEach(["bind", "bindKey", "curry", "curryRight", "partial", "partialRight"], function(methodName) {
            lodash[methodName].placeholder = lodash;
          });
          arrayEach(["drop", "take"], function(methodName, index) {
            LazyWrapper.prototype[methodName] = function(n) {
              n = n === undefined2 ? 1 : nativeMax(toInteger(n), 0);
              var result2 = this.__filtered__ && !index ? new LazyWrapper(this) : this.clone();
              if (result2.__filtered__) {
                result2.__takeCount__ = nativeMin(n, result2.__takeCount__);
              } else {
                result2.__views__.push({
                  "size": nativeMin(n, MAX_ARRAY_LENGTH),
                  "type": methodName + (result2.__dir__ < 0 ? "Right" : "")
                });
              }
              return result2;
            };
            LazyWrapper.prototype[methodName + "Right"] = function(n) {
              return this.reverse()[methodName](n).reverse();
            };
          });
          arrayEach(["filter", "map", "takeWhile"], function(methodName, index) {
            var type = index + 1, isFilter = type == LAZY_FILTER_FLAG || type == LAZY_WHILE_FLAG;
            LazyWrapper.prototype[methodName] = function(iteratee2) {
              var result2 = this.clone();
              result2.__iteratees__.push({
                "iteratee": getIteratee(iteratee2, 3),
                "type": type
              });
              result2.__filtered__ = result2.__filtered__ || isFilter;
              return result2;
            };
          });
          arrayEach(["head", "last"], function(methodName, index) {
            var takeName = "take" + (index ? "Right" : "");
            LazyWrapper.prototype[methodName] = function() {
              return this[takeName](1).value()[0];
            };
          });
          arrayEach(["initial", "tail"], function(methodName, index) {
            var dropName = "drop" + (index ? "" : "Right");
            LazyWrapper.prototype[methodName] = function() {
              return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
            };
          });
          LazyWrapper.prototype.compact = function() {
            return this.filter(identity);
          };
          LazyWrapper.prototype.find = function(predicate) {
            return this.filter(predicate).head();
          };
          LazyWrapper.prototype.findLast = function(predicate) {
            return this.reverse().find(predicate);
          };
          LazyWrapper.prototype.invokeMap = baseRest(function(path, args) {
            if (typeof path == "function") {
              return new LazyWrapper(this);
            }
            return this.map(function(value) {
              return baseInvoke(value, path, args);
            });
          });
          LazyWrapper.prototype.reject = function(predicate) {
            return this.filter(negate(getIteratee(predicate)));
          };
          LazyWrapper.prototype.slice = function(start, end) {
            start = toInteger(start);
            var result2 = this;
            if (result2.__filtered__ && (start > 0 || end < 0)) {
              return new LazyWrapper(result2);
            }
            if (start < 0) {
              result2 = result2.takeRight(-start);
            } else if (start) {
              result2 = result2.drop(start);
            }
            if (end !== undefined2) {
              end = toInteger(end);
              result2 = end < 0 ? result2.dropRight(-end) : result2.take(end - start);
            }
            return result2;
          };
          LazyWrapper.prototype.takeRightWhile = function(predicate) {
            return this.reverse().takeWhile(predicate).reverse();
          };
          LazyWrapper.prototype.toArray = function() {
            return this.take(MAX_ARRAY_LENGTH);
          };
          baseForOwn(LazyWrapper.prototype, function(func, methodName) {
            var checkIteratee = /^(?:filter|find|map|reject)|While$/.test(methodName), isTaker = /^(?:head|last)$/.test(methodName), lodashFunc = lodash[isTaker ? "take" + (methodName == "last" ? "Right" : "") : methodName], retUnwrapped = isTaker || /^find/.test(methodName);
            if (!lodashFunc) {
              return;
            }
            lodash.prototype[methodName] = function() {
              var value = this.__wrapped__, args = isTaker ? [1] : arguments, isLazy = value instanceof LazyWrapper, iteratee2 = args[0], useLazy = isLazy || isArray(value);
              var interceptor = function(value2) {
                var result3 = lodashFunc.apply(lodash, arrayPush([value2], args));
                return isTaker && chainAll ? result3[0] : result3;
              };
              if (useLazy && checkIteratee && typeof iteratee2 == "function" && iteratee2.length != 1) {
                isLazy = useLazy = false;
              }
              var chainAll = this.__chain__, isHybrid = !!this.__actions__.length, isUnwrapped = retUnwrapped && !chainAll, onlyLazy = isLazy && !isHybrid;
              if (!retUnwrapped && useLazy) {
                value = onlyLazy ? value : new LazyWrapper(this);
                var result2 = func.apply(value, args);
                result2.__actions__.push({ "func": thru, "args": [interceptor], "thisArg": undefined2 });
                return new LodashWrapper(result2, chainAll);
              }
              if (isUnwrapped && onlyLazy) {
                return func.apply(this, args);
              }
              result2 = this.thru(interceptor);
              return isUnwrapped ? isTaker ? result2.value()[0] : result2.value() : result2;
            };
          });
          arrayEach(["pop", "push", "shift", "sort", "splice", "unshift"], function(methodName) {
            var func = arrayProto[methodName], chainName = /^(?:push|sort|unshift)$/.test(methodName) ? "tap" : "thru", retUnwrapped = /^(?:pop|shift)$/.test(methodName);
            lodash.prototype[methodName] = function() {
              var args = arguments;
              if (retUnwrapped && !this.__chain__) {
                var value = this.value();
                return func.apply(isArray(value) ? value : [], args);
              }
              return this[chainName](function(value2) {
                return func.apply(isArray(value2) ? value2 : [], args);
              });
            };
          });
          baseForOwn(LazyWrapper.prototype, function(func, methodName) {
            var lodashFunc = lodash[methodName];
            if (lodashFunc) {
              var key = lodashFunc.name + "";
              if (!hasOwnProperty.call(realNames, key)) {
                realNames[key] = [];
              }
              realNames[key].push({ "name": methodName, "func": lodashFunc });
            }
          });
          realNames[createHybrid(undefined2, WRAP_BIND_KEY_FLAG).name] = [{
            "name": "wrapper",
            "func": undefined2
          }];
          LazyWrapper.prototype.clone = lazyClone;
          LazyWrapper.prototype.reverse = lazyReverse;
          LazyWrapper.prototype.value = lazyValue;
          lodash.prototype.at = wrapperAt;
          lodash.prototype.chain = wrapperChain;
          lodash.prototype.commit = wrapperCommit;
          lodash.prototype.next = wrapperNext;
          lodash.prototype.plant = wrapperPlant;
          lodash.prototype.reverse = wrapperReverse;
          lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;
          lodash.prototype.first = lodash.prototype.head;
          if (symIterator) {
            lodash.prototype[symIterator] = wrapperToIterator;
          }
          return lodash;
        };
        var _ = runInContext();
        if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
          root._ = _;
          define(function() {
            return _;
          });
        } else if (freeModule) {
          (freeModule.exports = _)._ = _;
          freeExports._ = _;
        } else {
          root._ = _;
        }
      }).call(exports);
    }
  });

  // src/log.ts
  var levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };
  var currentLevel = levels.warn;
  function setLogLevel(logLevel) {
    invariant(() => logLevel in levels, logLevel);
    currentLevel = levels[logLevel];
  }
  function debug(...items) {
    if (currentLevel >= levels.debug) {
      console.log(...items);
    }
  }
  function warn(...items) {
    if (currentLevel >= levels.warn) {
      console.warn(...items);
    }
  }
  function error(...items) {
    if (currentLevel >= levels.error) {
      console.error(...items);
    }
  }
  function exception(exception2, ...items) {
    if (exception2 instanceof Error) {
      error(exception2);
      error(...items);
    } else {
      error(exception2, ...items);
    }
  }
  function invariant(check, ...items) {
    if (!check()) {
      error("Invariant error", check.toString(), "is not truthy", ...items);
    }
  }
  function assert(check, ...items) {
    if (!check) {
      error("Assertion failure", check.toString(), "is not truthy", ...items);
      throw new Error("Assertion failure");
    }
  }
  function assertExhausted(context, ...items) {
    error("Assertion failure", context, "is not exhausted", ...items);
    throw new Error("Assertion failure");
  }

  // src/types.ts
  var InvariantError = class extends Error {
  };
  var TypeTag = Symbol("reviseType");
  var CalculationTypeTag = Symbol("calculationType");
  var OwnKeysField = Symbol("ownKeys");
  var ObserveKey = Symbol("observe");
  var GetRawArrayKey = Symbol("getRawArray");
  var FlushKey = Symbol("flush");
  var NotifyKey = Symbol("notifyEvent");
  function isRef(ref2) {
    return ref2 && ref2[TypeTag] === "ref";
  }
  var OnCollectionRelease = Symbol("OnCollectionRelease");
  function makeCalculation(fn) {
    return Object.assign(fn, {
      [TypeTag]: "calculation",
      [CalculationTypeTag]: "calculation"
    });
  }
  function makeEffect(fn) {
    return Object.assign(fn, {
      [TypeTag]: "calculation",
      [CalculationTypeTag]: "effect"
    });
  }
  function isModel(thing) {
    return !!(thing && thing[TypeTag] === "model");
  }
  function isCollection(thing) {
    return !!(thing && thing[TypeTag] === "collection");
  }
  function isCalculation(thing) {
    return !!(thing && thing[TypeTag] === "calculation");
  }
  function isEffect(thing) {
    return thing[CalculationTypeTag] === "effect";
  }

  // src/sentinel.ts
  var sentinel = {};
  var isSentinel = (value) => {
    return value === sentinel;
  };

  // src/dag.ts
  var DAG = class {
    constructor() {
      this.maxId = 0;
      this.idMap = new WeakMap();
      this.nodes = {};
      this.edgeMap = {};
      this.reverseEdgeMap = {};
      this.refCount = {};
      this.cullableSet = {};
      this._addNode(sentinel);
      this.sentinelId = this.getItemId(sentinel);
    }
    getItemId(item) {
      let id2;
      if ((id2 = this.idMap.get(item)) === void 0) {
        id2 = this.maxId.toString();
        this.maxId += 1;
        this.idMap.set(item, id2);
      }
      return id2;
    }
    addNode(node) {
      return this._addNode(node);
    }
    _addNode(node) {
      const itemId = this.getItemId(node);
      if (!this.nodes[itemId]) {
        this.refCount[itemId] = 0;
        if (!isSentinel(node)) {
          this.cullableSet[itemId] = true;
        }
        this.nodes[itemId] = node;
        this.edgeMap[itemId] = {};
        this.reverseEdgeMap[itemId] = {};
        return true;
      }
      return false;
    }
    hasNode(node) {
      return !!this.nodes[this.getItemId(node)];
    }
    addEdge(fromNode, toNode) {
      const fromId = this.getItemId(fromNode);
      const toId = this.getItemId(toNode);
      return this._addEdge(fromId, toId);
    }
    _addEdge(fromId, toId) {
      const fromNode = this.nodes[fromId];
      const toNode = this.nodes[toId];
      invariant(() => fromId === this.sentinelId || !!this.nodes[fromId], "addEdge fromNode does not exist", fromNode);
      invariant(() => !!this.nodes[toId], "addEdge toNode does not exist", toNode);
      if (!this.edgeMap[fromId]) {
        this.edgeMap[fromId] = {};
      }
      if (this.edgeMap[fromId][toId]) {
        return false;
      }
      this.edgeMap[fromId][toId] = toNode;
      if (!this.reverseEdgeMap[toId]) {
        this.reverseEdgeMap[toId] = {};
      }
      this.reverseEdgeMap[toId][fromId] = fromNode;
      this.refCount[fromId] += 1;
      delete this.cullableSet[fromId];
      return true;
    }
    removeEdge(fromNode, toNode) {
      const fromId = this.getItemId(fromNode);
      const toId = this.getItemId(toNode);
      const result = this._removeEdge(fromId, toId);
      invariant(() => result === false, "removeEdge attempted on nonexistent edge", { fromNode, toNode });
      return result;
    }
    removeNode(node) {
      const itemId = this.getItemId(node);
      return this._removeNode(itemId);
    }
    _removeNode(itemId) {
      if (!this.nodes[itemId])
        return true;
      const node = this.nodes[itemId];
      Object.keys(this.edgeMap[itemId]).forEach((toId) => this._removeEdge(itemId, toId));
      Object.keys(this.reverseEdgeMap[itemId]).forEach((fromId) => this._removeEdge(fromId, itemId));
      invariant(() => this.refCount[itemId] === 0, "still has refcount after deleting edges", node);
      invariant(() => this.cullableSet[itemId] === true, "not cullable after deleting edges", node);
      delete this.nodes[itemId];
      delete this.edgeMap[itemId];
      delete this.reverseEdgeMap[itemId];
      delete this.refCount[itemId];
      delete this.cullableSet[itemId];
      return false;
    }
    _removeEdge(fromId, toId) {
      assert(!!this.edgeMap[fromId], "_removeEdge fromId not found in edgeMap", fromId);
      assert(!!this.reverseEdgeMap[toId], "_removeEdge toId not found in reverseEdgeMap", toId);
      if (!this.edgeMap[fromId][toId]) {
        error("_removeEdge edge not found", { fromId, toId });
        return true;
      }
      delete this.edgeMap[fromId][toId];
      this.refCount[fromId] -= 1;
      if (this.refCount[fromId] === 0) {
        this.cullableSet[fromId] = true;
      }
      delete this.reverseEdgeMap[toId][fromId];
      return false;
    }
    retain(node) {
      const retained = this._addEdge(this.getItemId(node), this.sentinelId);
      invariant(() => !!retained, "double-retained", node);
    }
    release(node) {
      const releaseFailed = this._removeEdge(this.getItemId(node), this.sentinelId);
      invariant(() => !releaseFailed, "released a non-retained node", node);
    }
    removeEdges(edges) {
      edges.forEach(([fromNode, toNode]) => {
        const fromId = this.getItemId(fromNode);
        const toId = this.getItemId(toNode);
        this._removeEdge(fromId, toId);
      });
    }
    getDependencies(fromNode) {
      const fromId = this.getItemId(fromNode);
      if (!this.edgeMap[fromId]) {
        return [];
      }
      const deps = [];
      Object.values(this.edgeMap[fromId]).forEach((node) => {
        if (!isSentinel(node)) {
          deps.push(node);
        }
      });
      return deps;
    }
    getReverseDependencies(toNode) {
      const toId = this.getItemId(toNode);
      if (!this.reverseEdgeMap[toId]) {
        return [];
      }
      const revDeps = [];
      Object.values(this.reverseEdgeMap[toId]).forEach((node) => {
        if (!isSentinel(node)) {
          revDeps.push(node);
        }
      });
      return revDeps;
    }
    visitTopological(callback) {
      const visited = {};
      const sorted = [];
      const dfsRecurse = (nodeId) => {
        if (visited[nodeId])
          return;
        visited[nodeId] = true;
        Object.keys(this.edgeMap[nodeId] || {}).forEach((toId) => {
          dfsRecurse(toId);
        });
        const node = this.nodes[nodeId];
        if (!isSentinel(node)) {
          sorted.unshift(node);
        }
      };
      Object.keys(this.nodes).forEach((nodeId) => {
        dfsRecurse(nodeId);
      });
      sorted.forEach((node) => {
        callback(node);
      });
    }
    garbageCollect() {
      const culled = [];
      while (Object.keys(this.cullableSet).length > 0) {
        Object.keys(this.cullableSet).forEach((nodeId) => {
          const node = this.nodes[nodeId];
          assert(!isSentinel(node), "tried to garbage collect sentinel");
          culled.push(node);
          this._removeNode(nodeId);
        });
      }
      return culled;
    }
    graphviz(makeName) {
      const lines = ["digraph dag {"];
      Object.entries(this.nodes).forEach(([nodeId, node]) => {
        if (isSentinel(node))
          return;
        const props = {
          label: makeName(nodeId, node)
        };
        lines.push(`  item_${nodeId} [${Object.entries(props).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(",")}];`);
      });
      Object.entries(this.edgeMap).forEach(([fromNodeId, toNodeMap]) => {
        Object.keys(toNodeMap).forEach((toNodeId) => {
          if (toNodeId === this.sentinelId || fromNodeId === this.sentinelId)
            return;
          lines.push(`  item_${fromNodeId} -> item_${toNodeId};`);
        });
      });
      lines.push("}");
      return lines.join("\n");
    }
  };

  // src/debug.ts
  var nameMap = new WeakMap();
  function clearNames() {
    nameMap = new WeakMap();
  }
  function debugNameFor(item) {
    var _a, _b, _c, _d;
    if (isCollection(item)) {
      return `collection:${(_a = nameMap.get(item)) != null ? _a : "?"}`;
    }
    if (isCalculation(item)) {
      return `${isEffect(item) ? "effect" : "calc"}:${(_b = nameMap.get(item)) != null ? _b : "?"}`;
    }
    if (isModel(item)) {
      return `model:${(_c = nameMap.get(item)) != null ? _c : "?"}`;
    }
    return `field:${(_d = nameMap.get(item.model)) != null ? _d : "?"}:${String(item.key)}`;
  }
  function name(item, name2) {
    nameMap.set(item, name2);
    return item;
  }

  // src/calc.ts
  var activeCalculations = [];
  var calculationToInvalidationMap = new Map();
  var partialDag = new DAG();
  var globalDependencyGraph = new DAG();
  var refcountMap = new WeakMap();
  function reset() {
    partialDag = new DAG();
    activeCalculations = [];
    calculationToInvalidationMap = new Map();
    globalDependencyGraph = new DAG();
    refcountMap = new WeakMap();
    clearNames();
  }
  function calc(func, debugName) {
    const calculation = trackCalculation(func, false);
    if (debugName)
      name(calculation, debugName);
    return calculation;
  }
  function effect(func, debugName) {
    const calculation = trackCalculation(func, true);
    if (debugName)
      name(calculation, debugName);
    return calculation;
  }
  function trackCalculation(func, isEffect2) {
    if (typeof func !== "function") {
      throw new InvariantError("calculation must be provided a function");
    }
    let result = void 0;
    const invalidate = () => {
      result = void 0;
    };
    const trackedCalculation = (isEffect2 ? makeEffect : makeCalculation)(function runCalculation() {
      if (!isEffect2) {
        addDepToCurrentCalculation(trackedCalculation);
      }
      if (result) {
        return result.result;
      }
      const edgesToRemove = globalDependencyGraph.getReverseDependencies(trackedCalculation).map((fromNode) => {
        return [fromNode, trackedCalculation];
      });
      globalDependencyGraph.removeEdges(edgesToRemove);
      activeCalculations.push(trackedCalculation);
      result = { result: func() };
      const sanityCheck = activeCalculations.pop();
      if (sanityCheck !== trackedCalculation) {
        throw new InvariantError("Active calculation stack inconsistency!");
      }
      return result.result;
    });
    globalDependencyGraph.addNode(trackedCalculation);
    calculationToInvalidationMap.set(trackedCalculation, invalidate);
    return trackedCalculation;
  }
  function addDepToCurrentCalculation(item) {
    const dependentCalculation = activeCalculations[activeCalculations.length - 1];
    if (dependentCalculation) {
      globalDependencyGraph.addNode(item);
      if (!globalDependencyGraph.hasNode(dependentCalculation)) {
        globalDependencyGraph.addNode(dependentCalculation);
      }
      if (globalDependencyGraph.addEdge(item, dependentCalculation)) {
        debug("New global dependency", debugNameFor(item), "->", debugNameFor(dependentCalculation));
      }
    }
  }
  function addManualDep(fromNode, toNode) {
    globalDependencyGraph.addNode(fromNode);
    globalDependencyGraph.addNode(toNode);
    if (globalDependencyGraph.addEdge(fromNode, toNode)) {
      debug("New manual dependency", debugNameFor(fromNode), "->", debugNameFor(toNode));
    }
  }
  function processChange(item) {
    const chain = [];
    const addNode = (node) => {
      chain.push(debugNameFor(node));
      partialDag.addNode(node);
      const dependencies = globalDependencyGraph.getDependencies(node);
      dependencies.forEach((dependentItem) => {
        if (!partialDag.hasNode(dependentItem)) {
          addNode(dependentItem);
        }
        if (partialDag.addEdge(node, dependentItem)) {
          debug("New local dependency", debugNameFor(item), "->", debugNameFor(dependentItem));
        }
        if (!needsFlush) {
          needsFlush = true;
          notify();
        }
      });
    };
    addNode(item);
    debug("processChange", chain);
  }
  var needsFlush = false;
  var subscribeListener = () => setTimeout(() => flush(), 0);
  function notify() {
    try {
      subscribeListener();
    } catch (e) {
      exception(e, "uncaught exception in notify");
    }
  }
  function flush() {
    if (!needsFlush) {
      return;
    }
    needsFlush = false;
    const oldPartialDag = partialDag;
    partialDag = new DAG();
    oldPartialDag.visitTopological((item) => {
      if (isCalculation(item)) {
        debug("flushing calculation", debugNameFor(item));
        const invalidation = calculationToInvalidationMap.get(item);
        if (invalidation) {
          invalidation();
        }
        item();
      } else if (isCollection(item)) {
        debug("flushing collection", debugNameFor(item));
        item[FlushKey]();
      } else {
        debug("flushing model", debugNameFor(item));
      }
    });
    globalDependencyGraph.garbageCollect().forEach((item) => {
      if (isCalculation(item)) {
        debug("GC calculation", debugNameFor(item));
      } else if (isCollection(item)) {
        debug("GC collection", debugNameFor(item));
      } else {
        debug("GC model", debugNameFor(item));
      }
    });
  }
  function retain(item) {
    var _a;
    const refcount = (_a = refcountMap.get(item)) != null ? _a : 0;
    const newRefcount = refcount + 1;
    if (refcount === 0) {
      debug(`retain ${debugNameFor(item)} retained; refcount ${refcount} -> ${newRefcount}`);
      if (!globalDependencyGraph.hasNode(item)) {
        globalDependencyGraph.addNode(item);
      }
      globalDependencyGraph.retain(item);
    } else {
      debug(`retain ${debugNameFor(item)} incremented; refcount ${refcount} -> ${newRefcount}`);
    }
    refcountMap.set(item, newRefcount);
  }
  function release(item) {
    var _a;
    const refcount = (_a = refcountMap.get(item)) != null ? _a : 0;
    const newRefcount = Math.min(refcount - 1, 0);
    if (refcount < 1) {
      error(`release called on unretained item ${debugNameFor(item)}`, item);
    }
    if (newRefcount < 1) {
      debug(`release ${debugNameFor(item)} released; refcount ${refcount} -> ${newRefcount}`);
      globalDependencyGraph.release(item);
    } else {
      debug(`release ${debugNameFor(item)} decremented; refcount ${refcount} -> ${newRefcount}`);
    }
    refcountMap.set(item, newRefcount);
  }

  // src/jsx.ts
  function isRenderElement(jsxNode) {
    return !!(jsxNode && typeof jsxNode === "object" && "type" in jsxNode && jsxNode.type === "element");
  }
  function isRenderComponent(jsxNode) {
    return !!(jsxNode && typeof jsxNode === "object" && "type" in jsxNode && jsxNode.type === "component");
  }

  // src/vnode.ts
  var VNodeSymbol = Symbol("VNode");
  function makeRootVNode({ domNode }) {
    const rootVNode = {
      domNode,
      children: [],
      parentNode: null,
      domParent: null,
      jsxNode: null,
      onUnmount: [],
      [VNodeSymbol]: true
    };
    rootVNode.domParent = rootVNode;
    return rootVNode;
  }
  function makeChildVNode({
    jsxNode,
    domNode,
    domParent,
    onUnmount,
    parentNode
  }) {
    return {
      domNode,
      children: [],
      parentNode,
      domParent,
      jsxNode,
      onUnmount,
      [VNodeSymbol]: true
    };
  }
  function makeEmptyVNode({
    parentNode,
    domParent
  }) {
    return {
      domNode: null,
      children: [],
      parentNode,
      domParent,
      jsxNode: null,
      onUnmount: [],
      [VNodeSymbol]: true
    };
  }
  function getShallowNodes(vNode) {
    const nodes = [];
    function visit(node) {
      if (node.domNode) {
        nodes.push(node.domNode);
      } else {
        node.children.forEach((child) => visit(child));
      }
    }
    visit(vNode);
    return nodes;
  }
  function getDomParentChildIndex(domParent, immediateParent, childIndex) {
    let realIndex = 0;
    function visit(node) {
      if (node.domNode) {
        realIndex += 1;
        return false;
      } else {
        return visitChildren(node);
      }
    }
    function visitChildren(node) {
      const visitIndex = node === immediateParent ? childIndex : node.children.length;
      for (let i = 0; i < visitIndex; ++i) {
        if (visit(node.children[i])) {
          return true;
        }
      }
      return node === immediateParent;
    }
    visitChildren(domParent);
    return realIndex;
  }
  function callOnUnmount(node) {
    node.children.forEach((child) => callOnUnmount(child));
    if (node.onUnmount) {
      node.onUnmount.forEach((onUnmount) => {
        try {
          onUnmount();
        } catch (e) {
          exception(e, "VNode node raised exception in onUnmount", node);
        }
      });
    }
  }
  function replaceVNode(replaceNode, newNode) {
    return spliceVNode(replaceNode.parentNode, replaceNode, 1, [newNode])[0];
  }
  function spliceVNode(immediateParent, replaceNode, removeCount, newNodes) {
    let domParent;
    let childIndex;
    if (replaceNode) {
      childIndex = immediateParent.children.indexOf(replaceNode);
      if (childIndex === -1) {
        childIndex = immediateParent.children.length;
      }
      domParent = replaceNode.domParent;
    } else {
      childIndex = immediateParent.children.length;
      domParent = immediateParent.domNode ? immediateParent : immediateParent.domParent;
    }
    assert(domParent, "tried to replace a root tree slot with missing domParent");
    const detachedVNodes = immediateParent.children.splice(childIndex, removeCount, ...newNodes);
    detachedVNodes.forEach((detachedVNode) => {
      callOnUnmount(detachedVNode);
      const nodesToRemove = getShallowNodes(detachedVNode);
      nodesToRemove.forEach((node) => {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });
    });
    if (!domParent.domNode) {
      throw new Error("Invariant: domParent missing domNode");
    }
    const domParentNode = domParent.domNode;
    newNodes.forEach((newNode) => {
      newNode.parentNode = immediateParent;
      newNode.domParent = domParent;
      if (newNode.domNode) {
        const domIndex = getDomParentChildIndex(domParent, immediateParent, childIndex);
        const referenceNode = domParentNode.childNodes[domIndex];
        domParentNode.insertBefore(newNode.domNode, referenceNode || null);
      }
    });
    return detachedVNodes;
  }

  // src/view.ts
  function createElement(Constructor, props, ...children) {
    if (typeof Constructor === "string") {
      return {
        type: "element",
        element: Constructor,
        props,
        children
      };
    }
    return {
      type: "component",
      component: Constructor,
      props,
      children
    };
  }
  var boundEvents = new WeakMap();
  function setBooleanPropertyValue(element, key, value) {
    if (element instanceof HTMLInputElement && (key === "checked" || key === "indeterminate") && element[key] !== value) {
      element[key] = value;
    }
    if (element instanceof HTMLOptionElement && key == "selected" && element[key] !== value) {
      element[key] = value;
    }
    if (element instanceof HTMLDetailsElement && key == "open" && element[key] !== value) {
      element[key] = value;
    }
  }
  function setStringPropertyValue(element, key, value) {
    if (element instanceof HTMLInputElement && key === "value" && element[key] !== value) {
      element[key] = value;
    }
    if (element instanceof HTMLTextAreaElement && key === "value" && element[key] !== value) {
      element[key] = value;
    }
    if (element instanceof HTMLOptionElement && key === "value" && element[key] !== value) {
      element[key] = value;
    }
  }
  function setAttributeValue(element, key, value) {
    if (value === null || value === void 0 || value === false) {
      element.removeAttribute(key);
      setBooleanPropertyValue(element, key, false);
      setStringPropertyValue(element, key, "");
    } else if (value === true) {
      element.setAttribute(key, "");
      setBooleanPropertyValue(element, key, true);
    } else if (typeof value === "string") {
      element.setAttribute(key, value);
      setStringPropertyValue(element, key, value);
    } else if (typeof value === "number") {
      element.setAttribute(key, value.toString());
      setStringPropertyValue(element, key, value.toString());
    } else if (key.startsWith("on:") && typeof value === "function") {
      const eventName = key.slice(3);
      let attributes = boundEvents.get(element);
      if (!attributes) {
        attributes = {};
        boundEvents.set(element, attributes);
      }
      if (attributes[key]) {
        element.removeEventListener(eventName, attributes[key]);
      }
      element.addEventListener(eventName, value);
      attributes[key] = value;
    }
  }
  function renderAppending({
    domParent,
    parentNode,
    jsxNode
  }) {
    const emptyChildVNode = makeEmptyVNode({
      domParent,
      parentNode
    });
    parentNode.children.push(emptyChildVNode);
    renderReplacing({
      nodeToReplace: emptyChildVNode,
      jsxNode
    });
  }
  function renderReplacing({
    nodeToReplace,
    jsxNode
  }) {
    var _a;
    if (jsxNode === null || jsxNode === void 0 || jsxNode === false || jsxNode === true) {
      const emptyVNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount: []
      });
      replaceVNode(nodeToReplace, emptyVNode);
      return emptyVNode;
    }
    if (typeof jsxNode === "string") {
      const stringVNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: document.createTextNode(jsxNode),
        onUnmount: []
      });
      replaceVNode(nodeToReplace, stringVNode);
      return stringVNode;
    }
    if (typeof jsxNode === "number") {
      const numberVNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: document.createTextNode(jsxNode.toString()),
        onUnmount: []
      });
      replaceVNode(nodeToReplace, numberVNode);
      return numberVNode;
    }
    if (isRenderElement(jsxNode)) {
      const element = document.createElement(jsxNode.element);
      const boundEffects = [];
      let refCallback = void 0;
      if (jsxNode.props) {
        Object.entries(jsxNode.props).forEach(([key, value]) => {
          if (key === "ref") {
            if (isRef(value)) {
              value.current = element;
              return;
            }
            if (typeof value === "function" && !isCalculation(value)) {
              refCallback = value;
              return;
            }
          }
          if (isCalculation(value)) {
            const boundEffect = effect(() => {
              const computedValue = value();
              setAttributeValue(element, key, computedValue);
            }, `viewattr:${key}`);
            retain(boundEffect);
            boundEffects.push(boundEffect);
            boundEffect();
          } else {
            setAttributeValue(element, key, value);
          }
        });
      }
      const elementNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: element,
        onUnmount: [
          () => {
            boundEffects.forEach((boundEffect) => release(boundEffect));
            if (refCallback) {
              refCallback(void 0);
            }
          }
        ]
      });
      replaceVNode(nodeToReplace, elementNode);
      jsxNode.children.forEach((child) => {
        renderAppending({
          domParent: elementNode,
          parentNode: elementNode,
          jsxNode: child
        });
      });
      if (refCallback) {
        refCallback(element);
      }
      return elementNode;
    }
    if (isCollection(jsxNode)) {
      const trackedCollection = jsxNode;
      const onUnmount = [];
      const collectionNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount
      });
      replaceVNode(nodeToReplace, collectionNode);
      const unobserve = trackedCollection[ObserveKey]((event) => {
        if (event.type === "init") {
          const { items } = event;
          items.forEach((jsxChild) => {
            renderAppending({
              domParent: collectionNode.domParent,
              parentNode: collectionNode,
              jsxNode: jsxChild
            });
          });
        } else if (event.type === "splice") {
          const { count, index, items } = event;
          const childNodes = items.map(() => makeEmptyVNode({
            domParent: collectionNode.domParent,
            parentNode: collectionNode
          }));
          spliceVNode(collectionNode, collectionNode.children[index], count, childNodes);
          items.forEach((jsxChild, index2) => {
            renderReplacing({
              nodeToReplace: childNodes[index2],
              jsxNode: jsxChild
            });
          });
        }
      });
      retain(trackedCollection);
      onUnmount.push(unobserve);
      onUnmount.push(() => {
        release(trackedCollection);
      });
      return collectionNode;
    }
    if (isCalculation(jsxNode)) {
      const trackedCalculation = jsxNode;
      const onUnmount = [];
      const calculationNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount
      });
      replaceVNode(nodeToReplace, calculationNode);
      let calculationResultNode = makeEmptyVNode({
        parentNode: calculationNode,
        domParent: calculationNode.domParent
      });
      calculationNode.children.push(calculationResultNode);
      const resultEffect = effect(() => {
        const jsxChild = trackedCalculation();
        calculationResultNode = renderReplacing({
          nodeToReplace: calculationResultNode,
          jsxNode: jsxChild
        });
      }, `viewcalc:${(_a = debugNameFor(jsxNode)) != null ? _a : "node"}`);
      retain(resultEffect);
      onUnmount.push(() => release(resultEffect));
      resultEffect();
      return calculationNode;
    }
    if (isRenderComponent(jsxNode)) {
      const onUnmount = [];
      const componentNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount
      });
      replaceVNode(nodeToReplace, componentNode);
      let componentResultNode = makeEmptyVNode({
        parentNode: componentNode,
        domParent: componentNode.domParent
      });
      componentNode.children.push(componentResultNode);
      const Component4 = jsxNode.component;
      const resultEffect = effect(() => {
        const onComponentMount = [];
        const jsxChild = Component4({
          ...jsxNode.props || {},
          children: jsxNode.children
        }, {
          onUnmount: (unmountCallback) => {
            onUnmount.push(unmountCallback);
          },
          onMount: (mountCallback) => {
            onComponentMount.push(mountCallback);
          },
          onEffect: (effectCallback, debugName) => {
            const effectCalc = effect(effectCallback, `componenteffect:${jsxNode.component.name}:${debugName != null ? debugName : onComponentMount.length}`);
            onComponentMount.push(() => {
              retain(effectCalc);
              effectCalc();
            });
            onUnmount.push(() => {
              release(effectCalc);
            });
          }
        });
        componentResultNode = renderReplacing({
          nodeToReplace: componentResultNode,
          jsxNode: jsxChild
        });
        onComponentMount.forEach((mountCallback) => mountCallback());
      }, `component:${jsxNode.component.name}`);
      retain(resultEffect);
      onUnmount.push(() => release(resultEffect));
      resultEffect();
      return componentNode;
    }
    if (Array.isArray(jsxNode)) {
      const items = jsxNode;
      const arrayNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount: []
      });
      replaceVNode(nodeToReplace, arrayNode);
      items.forEach((jsxChild) => {
        renderAppending({
          domParent: arrayNode.domParent,
          parentNode: arrayNode,
          jsxNode: jsxChild
        });
      });
      return arrayNode;
    }
    if (typeof jsxNode === "function") {
      const functionVNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount: []
      });
      replaceVNode(nodeToReplace, functionVNode);
      warn("Attempted to render JSX node that was a function, not rendering anything");
      return functionVNode;
    }
    assertExhausted(jsxNode, "unexpected render type");
  }
  function mount(parentElement, jsxNode) {
    const rootNode = makeRootVNode({ domNode: parentElement });
    renderAppending({
      domParent: rootNode,
      parentNode: rootNode,
      jsxNode
    });
  }

  // src/collection.ts
  function binarySearchIndex(sortedArray, item, sorter) {
    let min = 0;
    let max = sortedArray.length - 1;
    let pivot = min;
    let result = -1;
    while (min <= max) {
      pivot = min + max >> 1;
      result = sorter(item, sortedArray[pivot]);
      if (result < 0) {
        max = pivot - 1;
      } else if (result > 0) {
        min = pivot + 1;
      } else {
        return [result, pivot];
      }
    }
    return [result, pivot];
  }
  function collection(array, debugName) {
    if (!Array.isArray(array)) {
      throw new InvariantError("collection must be provided an array");
    }
    const fields = new Map();
    let observers = [];
    function notify2(event) {
      observers.forEach((observer) => {
        observer(event);
      });
    }
    function splice(index, count, ...items) {
      if (count < 1 && items.length === 0)
        return [];
      const origLength = array.length;
      const removed = array.splice(index, count, ...items);
      const newLength = array.length;
      notify2({
        type: "splice",
        index,
        count,
        items,
        removed
      });
      if (origLength === newLength) {
        for (let i = index; i < index + count; ++i) {
          processChange(getField(i.toString()));
        }
      } else {
        for (let i = index; i < Math.max(newLength, origLength); ++i) {
          processChange(getField(i.toString()));
        }
        processChange(getField("length"));
      }
      processChange(proxy);
      return removed;
    }
    function pop() {
      const removed = splice(array.length - 1, 1);
      return removed[0];
    }
    function shift() {
      const removed = splice(0, 1);
      return removed[0];
    }
    function push(...items) {
      splice(array.length, 0, ...items);
      return array.length;
    }
    function unshift(...items) {
      splice(0, 0, ...items);
      return array.length;
    }
    function reject(func) {
      for (let i = proxy.length - 1; i >= 0; --i) {
        if (!func(proxy[i], i)) {
          proxy.splice(i, 1);
        }
      }
    }
    function sort(_sorter) {
      throw new Error("sort not implemented");
    }
    const deferred = [];
    function sortedView(sorter, viewDebugName) {
      let sortedDebugName;
      if (viewDebugName) {
        sortedDebugName = viewDebugName;
      } else if (debugName) {
        sortedDebugName = `${debugName}:sortedView`;
      }
      const sorted = collection([], sortedDebugName);
      proxy[ObserveKey]((event) => {
        if (event.type === "init") {
          const initialItems = event.items.slice();
          initialItems.sort(sorter);
          sorted.push(...initialItems);
          return;
        } else if (event.type === "splice") {
          deferred.push(() => {
            const { items, removed } = event;
            const rawArray = sorted[GetRawArrayKey]();
            removed.forEach((removedItem, removedItemIndex) => {
              const [lastComparison, index] = binarySearchIndex(rawArray, removedItem, sorter);
              assert(lastComparison === 0, "Missing item removed from source array in sortedView splice", { removedItem, removedItemIndex, event });
              sorted.splice(index, 1);
            });
            items.forEach((item) => {
              const [lastComparison, insertionIndex] = binarySearchIndex(rawArray, item, sorter);
              sorted.splice(lastComparison > 0 ? insertionIndex + 1 : insertionIndex, 0, item);
            });
          });
        }
      });
      return sorted;
    }
    function mapView(mapper, viewDebugName) {
      let mappedDebugName;
      if (viewDebugName) {
        mappedDebugName = viewDebugName;
      } else if (debugName) {
        mappedDebugName = `${debugName}:mapView`;
      }
      const mapped = collection(array.map(mapper), mappedDebugName);
      proxy[ObserveKey]((event) => {
        if (event.type === "splice") {
          deferred.push(() => {
            const { index, count, items } = event;
            mapped.splice(index, count, ...items.map(mapper));
          });
        }
      });
      addManualDep(proxy, mapped);
      return mapped;
    }
    function filterView(fn, viewDebugName) {
      let mappedDebugName;
      if (viewDebugName) {
        mappedDebugName = viewDebugName;
      } else if (debugName) {
        mappedDebugName = `${debugName}:filterView`;
      }
      const filterPresent = [];
      const filtered = collection([], mappedDebugName);
      array.forEach((value, index) => {
        const present = fn(value, index);
        filterPresent.push(present);
        if (present) {
          filtered.push(value);
        }
      });
      proxy[ObserveKey]((event) => {
        if (event.type === "splice") {
          deferred.push(() => {
            const { index, count, items } = event;
            let realIndex = 0;
            let realCount = 0;
            for (let i = 0; i < index; ++i) {
              if (filterPresent[i]) {
                realIndex++;
              }
            }
            for (let i = 0; i < count; ++i) {
              if (filterPresent[index + i]) {
                realCount++;
              }
            }
            const presentItems = items.map(fn);
            filterPresent.splice(index, count, ...presentItems);
            filtered.splice(realIndex, realCount, ...items.filter((_value, index2) => presentItems[index2]));
          });
        }
      });
      addManualDep(proxy, filtered);
      return filtered;
    }
    function flatMapView(fn, viewDebugName) {
      let mappedDebugName;
      if (viewDebugName) {
        mappedDebugName = viewDebugName;
      } else if (debugName) {
        mappedDebugName = `${debugName}:flatMapView`;
      }
      const flatMapped = collection([], mappedDebugName);
      const flatMapCount = [];
      array.forEach((value, index) => {
        const chunk = fn(value, index);
        flatMapped.push(...chunk);
        flatMapCount.push(chunk.length);
      });
      proxy[ObserveKey]((event) => {
        if (event.type === "splice") {
          deferred.push(() => {
            const { index, count, items } = event;
            let realIndex = 0;
            for (let i = 0; i < index; ++i) {
              realIndex += flatMapCount[i];
            }
            let realCount = 0;
            for (let i = index; i < index + count; ++i) {
              realCount += flatMapCount[i];
            }
            const realItems = [];
            const realItemCount = [];
            items.forEach((itemValue, itemIndex) => {
              const chunk = fn(itemValue, itemIndex);
              realItems.push(...chunk);
              realItemCount.push(chunk.length);
            });
            flatMapped.splice(realIndex, realCount, ...realItems);
            flatMapCount.splice(index, count, ...realItemCount);
          });
        }
      });
      addManualDep(proxy, flatMapped);
      return flatMapped;
    }
    function set(index, val) {
      splice(index, 1, val);
    }
    function observe(observer) {
      observers.push(observer);
      observer({
        type: "init",
        items: array
      });
      return () => {
        observers = observers.filter((obs) => obs !== observer);
      };
    }
    function flush2() {
      let thunk;
      while (thunk = deferred.shift()) {
        thunk();
      }
    }
    function getRawArray() {
      return array;
    }
    const methods = {
      splice,
      pop,
      shift,
      push,
      unshift,
      [ObserveKey]: observe,
      [FlushKey]: flush2,
      [GetRawArrayKey]: getRawArray,
      sort,
      reject,
      sortedView,
      mapView,
      filterView,
      flatMapView
    };
    function getField(key) {
      let field = fields.get(key);
      if (!field) {
        field = {
          model: proxy,
          key
        };
        if (debugName)
          name(field, debugName);
        fields.set(key, field);
      }
      return field;
    }
    const proxy = new Proxy(array, {
      get(target, key) {
        if (key in methods) {
          return methods[key];
        }
        if (key === TypeTag) {
          return "collection";
        }
        const field = getField(key);
        addManualDep(proxy, field);
        addDepToCurrentCalculation(field);
        return target[key];
      },
      set(target, key, value) {
        if (key in methods) {
          error("Overriding certain collection methods not supported", key);
          return false;
        }
        const numericKey = Number(key);
        if (!isNaN(numericKey) && numericKey <= array.length) {
          set(numericKey, value);
        } else {
          target[key] = value;
          const field = getField(key);
          processChange(field);
          processChange(proxy);
        }
        return true;
      },
      deleteProperty(target, key) {
        if (key in methods) {
          error("Deleting certain collection methods not supported", key);
          return false;
        }
        const field = getField(key);
        processChange(field);
        delete target[key];
        return true;
      }
    });
    if (debugName)
      name(proxy, debugName);
    return proxy;
  }

  // src/model.ts
  function model(obj, debugName) {
    if (typeof obj !== "object" || !obj) {
      throw new InvariantError("model must be provided an object");
    }
    const fields = new Map();
    let observers = [];
    function notify2(event) {
      observers.forEach((observer) => {
        observer(event);
      });
    }
    function getField(key) {
      let field = fields.get(key);
      if (!field) {
        field = {
          model: proxy,
          key
        };
        if (debugName)
          name(field, debugName);
        fields.set(key, field);
      }
      return field;
    }
    const knownFields = new Set(Object.keys(obj));
    function observe(observer) {
      observers.push(observer);
      observer({
        type: "init",
        keys: Object.keys(obj)
      });
      return () => {
        observers = observers.filter((obs) => obs !== observer);
      };
    }
    const methods = {
      [ObserveKey]: observe
    };
    const proxy = new Proxy(obj, {
      get(target, key) {
        if (key === TypeTag) {
          return "model";
        }
        if (key in methods) {
          return methods[key];
        }
        const field = getField(key);
        addDepToCurrentCalculation(field);
        return target[key];
      },
      has(target, key) {
        if (key === TypeTag) {
          return true;
        }
        if (key in methods) {
          return true;
        }
        const field = getField(key);
        addDepToCurrentCalculation(field);
        return knownFields.has(key);
      },
      set(target, key, value) {
        const field = getField(key);
        const changed = !knownFields.has(key) || target[key] !== value;
        target[key] = value;
        if (changed) {
          processChange(field);
          if (!knownFields.has(key)) {
            knownFields.add(key);
            notify2({ type: "add", key });
            if (typeof key !== "symbol") {
              processChange(getField(OwnKeysField));
            }
          }
          notify2({ type: "set", key, value });
        }
        return true;
      },
      deleteProperty(target, key) {
        const field = getField(key);
        const changed = knownFields.has(key);
        if (changed) {
          processChange(field);
          knownFields.delete(key);
          if (typeof key !== "symbol") {
            processChange(getField(OwnKeysField));
          }
          notify2({ type: "delete", key });
        }
        delete target[key];
        return true;
      }
    });
    if (debugName)
      name(proxy, debugName);
    return proxy;
  }
  model.keys = function keys(target) {
    const view = collection([]);
    name(view, `keys(${debugNameFor(target)})`);
    const keysSet = new Set();
    function addKey(key) {
      if (typeof key === "number" || typeof key === "string") {
        const stringKey = key.toString();
        if (!keysSet.has(stringKey)) {
          keysSet.add(stringKey);
          view.push(stringKey);
        }
      }
    }
    function delKey(key) {
      if (typeof key === "number" || typeof key === "string") {
        const stringKey = key.toString();
        if (keysSet.has(stringKey)) {
          keysSet.delete(stringKey);
          view.reject((k) => k !== stringKey);
        }
      }
    }
    const events = [];
    const updateEffect = effect(() => {
      target[OwnKeysField];
      let event;
      while (event = events.shift()) {
        if (event.type === "init") {
          event.keys.forEach((key) => {
            addKey(key);
          });
        }
        if (event.type === "add") {
          addKey(event.key);
        }
        if (event.type === "delete") {
          delKey(event.key);
        }
      }
    });
    addManualDep(updateEffect, view);
    updateEffect();
    target[ObserveKey]((event) => {
      events.push(event);
    });
    return view;
  };

  // src/index.ts
  var src_default = createElement;

  // src/test.ts
  var import_lodash = __toModule(require_lodash());

  // src/test/types.ts
  function makeResponse(id2, item) {
    return {
      id: id2,
      type: "response",
      response: item,
      isPartial: false
    };
  }
  function makePartialResponse(id2, item) {
    return {
      id: id2,
      type: "response",
      response: item,
      isPartial: true
    };
  }
  function isRequest(msg) {
    return typeof msg.id === "number" && msg.type === "request" && "request" in msg;
  }
  function isInitRequest(msg) {
    if (!isRequest(msg))
      return false;
    const request = msg.request;
    return !!(request && request.type === "init");
  }
  function isRunTestRequest(msg) {
    if (!isRequest(msg))
      return false;
    const request = msg.request;
    return !!(request && request.type === "runtest" && typeof request.suiteId === "number" && typeof request.testId === "number");
  }

  // src/test.ts
  setLogLevel("debug");
  function repr(obj) {
    return JSON.stringify(obj, null, 4);
  }
  var id = 0;
  var makeId = () => ++id;
  var suitesById = {};
  var testsById = {};
  var makeTest = ({
    name: name2,
    impl,
    parent,
    only
  }) => {
    const newTest = {
      id: makeId(),
      name: name2,
      impl,
      parent,
      assertions: 0,
      only
    };
    testsById[newTest.id] = newTest;
    return newTest;
  };
  var makeSuite = ({
    name: name2,
    parent = void 0,
    only
  }) => {
    const newSuite = {
      id: makeId(),
      name: name2,
      beforeEach: [],
      tests: [],
      afterEach: [],
      parent,
      assertions: 0,
      only
    };
    suitesById[newSuite.id] = newSuite;
    return newSuite;
  };
  var currentSuite = makeSuite({ name: "", only: false });
  var suites = [];
  suites.push(currentSuite);
  var AssertionError = class extends Error {
    constructor(name2, format, msg) {
      super(`AssertionError: assert.${name2}`);
      this.format = format;
      this.msg = msg;
    }
  };
  function suiteInner(name2, body, only) {
    currentSuite = makeSuite({ name: name2, parent: currentSuite, only });
    body();
    suites.push(currentSuite);
    if (!currentSuite.parent) {
      throw new Error("Internal test integrity issue: suite tree empty?");
    }
    currentSuite = currentSuite.parent;
  }
  function suite(name2, body) {
    suiteInner(name2, body, false);
  }
  suite.only = function suiteQnly(name2, body) {
    suiteInner(name2, body, true);
  };
  function beforeEach(action) {
    currentSuite.beforeEach.push(action);
  }
  function testInner(name2, impl, only = false) {
    const test2 = makeTest({ name: name2, impl, parent: currentSuite, only });
    currentSuite.tests.push(test2);
  }
  function test(name2, impl) {
    testInner(name2, impl, false);
  }
  test.only = function testOnly(name2, impl) {
    testInner(name2, impl, true);
  };
  async function runBeforeEach(ctx, suite2) {
    if (suite2) {
      await runBeforeEach(ctx, suite2.parent);
      for (const beforeEach2 of suite2.beforeEach)
        await beforeEach2(ctx);
    }
  }
  async function runAfterEach(ctx, suite2) {
    if (suite2) {
      for (const afterEach of suite2.afterEach)
        await afterEach(ctx);
      await runAfterEach(ctx, suite2.parent);
    }
  }
  var runningTest = void 0;
  function countAssertion() {
    if (!runningTest) {
      throw new Error("Internal test integrity issue: assertion performed outside of test?");
    }
    runningTest.assertions += 1;
  }
  var assert2 = {
    fail: (msg) => {
      countAssertion();
      throw new AssertionError("fail", () => `FAIL`, msg);
    },
    is: (a, b, msg) => {
      countAssertion();
      if (a !== b) {
        throw new AssertionError("is", () => `${repr(a)} is not ${repr(b)}`, msg);
      }
    },
    isNot: (a, b, msg) => {
      countAssertion();
      if (a === b) {
        throw new AssertionError("isNot", () => `${repr(a)} is ${repr(b)}`, msg);
      }
    },
    isTruthy: (a, msg) => {
      countAssertion();
      if (!a) {
        throw new AssertionError("isTruthy", () => `${repr(a)} is not truthy`, msg);
      }
    },
    isFalsy: (a, msg) => {
      countAssertion();
      if (!a) {
        throw new AssertionError("isFalsy", () => `${repr(a)} is not falsy`, msg);
      }
    },
    lessThan: (a, b, msg) => {
      countAssertion();
      if (!(a < b)) {
        throw new AssertionError("lessThan", () => `${repr(a)} not < ${repr(b)}`, msg);
      }
    },
    lessThanOrEqual: (a, b, msg) => {
      countAssertion();
      if (!(a <= b)) {
        throw new AssertionError("lessThanOrEqual", () => `${repr(a)} not <= ${repr(b)}`, msg);
      }
    },
    greaterThan: (a, b, msg) => {
      countAssertion();
      if (!(a > b)) {
        throw new AssertionError("greaterThan", () => `${repr(a)} not > ${repr(b)}`, msg);
      }
    },
    greaterThanOrEqual: (a, b, msg) => {
      countAssertion();
      if (!(a >= b)) {
        throw new AssertionError("greaterThan", () => `${repr(a)} not >= ${repr(b)}`, msg);
      }
    },
    arrayIncludes: (haystack, needle, msg) => {
      countAssertion();
      if (!haystack.includes(needle)) {
        throw new AssertionError("arrayIncludes", () => `${repr(needle)} not found within ${repr(haystack)}`, msg);
      }
    },
    notArrayIncludes: (haystack, needle, msg) => {
      countAssertion();
      if (haystack.includes(needle)) {
        throw new AssertionError("notArrayIncludes", () => `${repr(needle)} is found within ${repr(haystack)}`, msg);
      }
    },
    arrayEqualsUnsorted: (a, b, msg) => {
      const setA = new Set(a);
      const setB = new Set(b);
      const isEqual2 = Array.from(setA).every((a2) => setB.has(a2)) && Array.from(setB).every((b2) => setA.has(b2));
      if (!isEqual2) {
        throw new AssertionError("arrayEqualsUnsorted", () => `${repr(a)} does not contain the exact same items as ${repr(b)}`, msg);
      }
    },
    deepEqual: (a, b, msg) => {
      countAssertion();
      if (!(0, import_lodash.isEqual)(a, b)) {
        throw new AssertionError("isEqual", () => `${repr(a)} not deeply equal to ${repr(b)}`, msg);
      }
    },
    notDeepEqual: (a, b, msg) => {
      countAssertion();
      if ((0, import_lodash.isEqual)(a, b)) {
        throw new AssertionError("notDeepEqual", () => `${repr(a)} is deeply equal to ${repr(b)}`, msg);
      }
    },
    assertionCount: (num, msg) => {
      if (!runningTest) {
        throw new Error("Internal test integrity issue: assert.assertionCount() performed outside of test?");
      }
      const currentAssertions = runningTest.assertions;
      countAssertion();
      if (currentAssertions !== num) {
        throw new AssertionError("assertionCount", () => `expected ${repr(num)} assertions in test, but only performed ${repr(currentAssertions)}`, msg);
      }
    }
  };
  var testRoot = document.createElement("div");
  testRoot.id = "test-root";
  document.body.appendChild(testRoot);
  beforeEach(() => {
    while (testRoot.childNodes.length > 0) {
      testRoot.removeChild(testRoot.childNodes[0]);
    }
  });
  function formatError(e) {
    let msg = "";
    if (e instanceof AssertionError) {
      if (e.msg) {
        msg += `Message: ${e.msg}
`;
      }
      msg += `Reason: ${e.format()}
`;
    }
    if (e instanceof Error) {
      msg += `${e.stack}
`;
    }
    return msg === "" ? "unknown error" : msg;
  }
  function sendUpdate(source, id2, response) {
    source.postMessage(makePartialResponse(id2, response));
  }
  function sendResponse(source, id2, response) {
    source.postMessage(makeResponse(id2, response));
  }
  function respond(info, id2, source) {
    if (info.type === "internal") {
      sendUpdate(source, id2, {
        type: "internal",
        error: formatError(info.e)
      });
      console.error(info.e);
    } else if (info.type === "test") {
      switch (info.result) {
        case "fail":
          sendUpdate(source, id2, {
            type: "test",
            suiteId: info.test.parent.id,
            testId: info.test.id,
            result: "fail",
            error: formatError(info.e)
          });
          break;
        case "pass":
          sendUpdate(source, id2, {
            type: "test",
            suiteId: info.test.parent.id,
            testId: info.test.id,
            result: "pass",
            duration: info.duration,
            selfDuration: info.selfDuration
          });
          break;
        case "run":
          sendUpdate(source, id2, {
            type: "test",
            suiteId: info.test.parent.id,
            testId: info.test.id,
            result: "run"
          });
          break;
      }
    } else if (info.type === "runtest") {
      switch (info.result) {
        case "done":
          sendResponse(source, id2, {
            type: info.type,
            result: "done"
          });
          break;
        case "error":
          sendResponse(source, id2, {
            type: info.type,
            result: "error",
            error: info.error
          });
          break;
      }
    }
  }
  function makeInitPayload(allSuites) {
    const suitesList = [];
    allSuites.forEach((suite2) => {
      const tests = [];
      suite2.tests.forEach((test2) => {
        tests.push({
          id: test2.id,
          name: test2.name,
          only: test2.only
        });
      });
      suitesList.push({
        id: suite2.id,
        name: suite2.name,
        parentSuiteId: suite2.parent ? suite2.parent.id : void 0,
        tests,
        only: suite2.only
      });
    });
    return {
      url: window.location.toString(),
      type: "init",
      suites: suitesList
    };
  }
  async function handleRunTest(event, id2, source) {
    const suite2 = suitesById[event.suiteId];
    const test2 = testsById[event.testId];
    runningTest = test2;
    respond({
      type: "test",
      test: test2,
      result: "run"
    }, id2, source);
    const ctx = {};
    try {
      const testStart = performance.now();
      await runBeforeEach(ctx, suite2);
      const testImplStart = performance.now();
      await test2.impl(ctx);
      const selfDuration = performance.now() - testImplStart;
      await runAfterEach(ctx, suite2);
      const duration = performance.now() - testStart;
      respond({
        type: "test",
        test: test2,
        result: "pass",
        selfDuration,
        duration
      }, id2, source);
    } catch (e) {
      console.error("Test failure", window.location, suite2.name, test2.name, e);
      respond({
        type: "test",
        test: test2,
        result: "fail",
        e
      }, id2, source);
      return;
    }
  }
  setTimeout(() => 0);
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return;
    }
    if (!isRequest(event.data)) {
      return;
    }
    const source = event.source;
    if (!source) {
      return;
    }
    if (isInitRequest(event.data)) {
      window.parent.postMessage(makeResponse(event.data.id, makeInitPayload(suites)), window.location.origin);
    }
    if (isRunTestRequest(event.data)) {
      handleRunTest(event.data.request, event.data.id, source).then(() => {
        respond({
          type: "runtest",
          result: "done"
        }, event.data.id, source);
      }).catch((e) => {
        respond({
          type: "runtest",
          result: "error",
          error: e
        }, event.data.id, source);
      });
    }
  }, false);

  // src/view.test.tsx
  var testRoot2 = document.getElementById("test-root");
  if (!testRoot2)
    throw new Error("oops");
  setLogLevel("debug");
  beforeEach(() => {
    reset();
  });
  suite("mount static", () => {
    test("mount renders jsx as html", () => {
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok"
      }, "Hello, world!"));
      assert2.is(testRoot2.querySelector("#ok").textContent, "Hello, world!");
    });
    [void 0, null, false, true].forEach((value) => {
      test(`mount renders jsx ${value} as nonexistent nodes`, () => {
        mount(testRoot2, /* @__PURE__ */ src_default("div", {
          id: "ok"
        }, value));
        assert2.deepEqual(Array.from(testRoot2.querySelector("#ok").childNodes), []);
      });
    });
    test("mount renders jsx functions as nonexistent nodes", () => {
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok"
      }, () => "hello"));
      assert2.deepEqual(Array.from(testRoot2.querySelector("#ok").childNodes), []);
    });
    test("mount renders jsx numbers as strings", () => {
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok"
      }, 0));
      assert2.deepEqual(testRoot2.querySelector("#ok").childNodes[0].data, "0");
    });
    test("mount renders jsx strings as strings", () => {
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok"
      }, "hello"));
      assert2.deepEqual(testRoot2.querySelector("#ok").childNodes[0].data, "hello");
    });
    test("mount renders jsx arrays as contents", () => {
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok"
      }, [
        "zero",
        void 0,
        1,
        null,
        "two",
        false,
        3,
        true,
        "four",
        () => 3,
        5
      ]));
      assert2.deepEqual(Array.from(testRoot2.querySelector("#ok").childNodes).map((text) => text.data), ["zero", "1", "two", "3", "four", "5"]);
    });
  });
  suite("mount calculations", () => {
    test("renders child calculations as their raw value", () => {
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok"
      }, calc(() => "hello")));
      assert2.deepEqual(testRoot2.querySelector("#ok").childNodes[0].data, "hello");
    });
    test("renders attribute calculations as their raw value", () => {
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok",
        "data-whatever": calc(() => "hello")
      }));
      assert2.deepEqual(testRoot2.querySelector("#ok").getAttribute("data-whatever"), "hello");
    });
    test("rerenders child calculations on flush", () => {
      const state = model({ value: "hello" });
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok"
      }, calc(() => state.value)));
      state.value = "goodbye";
      assert2.deepEqual(testRoot2.querySelector("#ok").childNodes[0].data, "hello");
      flush();
      assert2.deepEqual(testRoot2.querySelector("#ok").childNodes[0].data, "goodbye");
    });
    test("rerenders attribute calculations on flush", () => {
      const state = model({ value: "hello" });
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok",
        "data-value": calc(() => state.value)
      }));
      state.value = "goodbye";
      assert2.deepEqual(testRoot2.querySelector("#ok").getAttribute("data-value"), "hello");
      flush();
      assert2.deepEqual(testRoot2.querySelector("#ok").getAttribute("data-value"), "goodbye");
    });
    test("child rerenders do not change DOM node reference", () => {
      const state = model({ value: "hello" });
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok"
      }, calc(() => state.value)));
      state.value = "goodbye";
      const okBefore = testRoot2.querySelector("#ok");
      flush();
      const okAfter = testRoot2.querySelector("#ok");
      assert2.is(okBefore, okAfter);
    });
    test("attribute rerenders do not change DOM node reference", () => {
      const state = model({ value: "hello" });
      mount(testRoot2, /* @__PURE__ */ src_default("div", {
        id: "ok",
        "data-value": calc(() => state.value)
      }));
      state.value = "goodbye";
      const okBefore = testRoot2.querySelector("#ok");
      flush();
      const okAfter = testRoot2.querySelector("#ok");
      assert2.is(okBefore, okAfter);
    });
  });
  suite("mount components", () => {
    test("components are rendered", () => {
      const Greet = ({ name: name2 }) => /* @__PURE__ */ src_default("p", null, "Hello ", name2);
      mount(testRoot2, /* @__PURE__ */ src_default(Greet, {
        name: "world!"
      }));
      assert2.is(testRoot2.innerHTML, "<p>Hello world!</p>");
    });
    test("components can have calculations", () => {
      const state = model({
        name: "world"
      });
      const Greet = () => /* @__PURE__ */ src_default("p", null, "Hello ", calc(() => state.name));
      mount(testRoot2, /* @__PURE__ */ src_default(Greet, null));
      assert2.is(testRoot2.innerHTML, "<p>Hello world</p>");
      state.name = "there";
      flush();
      assert2.is(testRoot2.innerHTML, "<p>Hello there</p>");
    });
    test("components are themselves calculations and rerender upon dependency change", () => {
      const state = model({
        name: "world"
      });
      const Greet = () => {
        const exclaimed = state.name + "!";
        return /* @__PURE__ */ src_default("p", null, "Hello ", exclaimed);
      };
      mount(testRoot2, /* @__PURE__ */ src_default(Greet, null));
      assert2.is(testRoot2.innerHTML, "<p>Hello world!</p>");
      state.name = "there";
      flush();
      assert2.is(testRoot2.innerHTML, "<p>Hello there!</p>");
    });
    test("components with calculations do not change roots", () => {
      const state = model({
        name: "world"
      });
      const Greet = () => {
        return /* @__PURE__ */ src_default("p", {
          id: "p"
        }, "Hello ", calc(() => state.name));
      };
      mount(testRoot2, /* @__PURE__ */ src_default(Greet, null));
      const pBefore = testRoot2.querySelector("#p");
      state.name = "there";
      flush();
      const pAfter = testRoot2.querySelector("#p");
      assert2.is(pBefore, pAfter);
    });
    test("components without calculations that rerender *do* change roots", () => {
      const state = model({
        name: "world"
      });
      const Greet = () => {
        const exclaimed = state.name + "!";
        return /* @__PURE__ */ src_default("p", {
          id: "p"
        }, "Hello ", exclaimed);
      };
      mount(testRoot2, /* @__PURE__ */ src_default(Greet, null));
      const pBefore = testRoot2.querySelector("#p");
      state.name = "there";
      flush();
      const pAfter = testRoot2.querySelector("#p");
      assert2.isNot(pBefore, pAfter);
    });
    test("components are provided an onMount callback which is called immediately after mounted", () => {
      const sequence = [];
      let queried = null;
      const Greet = (props, { onMount }) => {
        sequence.push("render");
        onMount(() => {
          sequence.push("onMount");
          queried = testRoot2.querySelector("#p");
        });
        return /* @__PURE__ */ src_default("p", {
          id: "p"
        }, "Hello!");
      };
      mount(testRoot2, /* @__PURE__ */ src_default(Greet, null));
      assert2.deepEqual(["render", "onMount"], sequence);
      assert2.isTruthy(queried);
      assert2.is(testRoot2.querySelector("#p"), queried);
    });
    test("components are provided an onMount callback which is called immediately before unmount", () => {
      const state = model({
        showingChild: false
      });
      const sequence = [];
      let queried = null;
      const Child = (props, { onMount, onUnmount }) => {
        sequence.push("render");
        onMount(() => {
          sequence.push("onMount");
        });
        onUnmount(() => {
          queried = testRoot2.querySelector("#child");
          sequence.push("onUnmount");
        });
        return /* @__PURE__ */ src_default("p", {
          id: "child"
        }, "child");
      };
      const Parent = (props, { onMount }) => {
        return /* @__PURE__ */ src_default("div", {
          id: "parent"
        }, calc(() => state.showingChild && /* @__PURE__ */ src_default(Child, null)));
      };
      mount(testRoot2, /* @__PURE__ */ src_default(Parent, null));
      assert2.deepEqual([], sequence);
      state.showingChild = true;
      flush();
      assert2.deepEqual(["render", "onMount"], sequence);
      const child = testRoot2.querySelector("#child");
      state.showingChild = false;
      flush();
      assert2.deepEqual(["render", "onMount", "onUnmount"], sequence);
      assert2.isTruthy(queried);
      assert2.is(child, queried);
    });
    test("components are provided an onEffect callback which is called only while component is mounted", () => {
      const state = model({
        showingChild: false,
        counter: 0
      });
      const sequence = [];
      const Child = (props, { onMount, onUnmount, onEffect }) => {
        sequence.push("render");
        onMount(() => {
          sequence.push("onMount");
        });
        onUnmount(() => {
          sequence.push("onUnmount");
        });
        onEffect(() => {
          sequence.push(`effect ${state.counter}`);
        });
        return /* @__PURE__ */ src_default("p", {
          id: "child"
        }, "child");
      };
      const Parent = (props, { onMount }) => {
        return /* @__PURE__ */ src_default("div", {
          id: "parent"
        }, calc(() => state.showingChild && /* @__PURE__ */ src_default(Child, null)));
      };
      mount(testRoot2, /* @__PURE__ */ src_default(Parent, null));
      assert2.deepEqual([], sequence);
      state.showingChild = true;
      flush();
      assert2.deepEqual(["render", "onMount", "effect 0"], sequence);
      state.counter += 1;
      flush();
      assert2.deepEqual(["render", "onMount", "effect 0", "effect 1"], sequence);
      state.counter += 1;
      flush();
      assert2.deepEqual(["render", "onMount", "effect 0", "effect 1", "effect 2"], sequence);
      flush();
      assert2.deepEqual(["render", "onMount", "effect 0", "effect 1", "effect 2"], sequence);
      state.showingChild = false;
      flush();
      assert2.deepEqual([
        "render",
        "onMount",
        "effect 0",
        "effect 1",
        "effect 2",
        "onUnmount"
      ], sequence);
      state.counter += 1;
      flush();
      assert2.deepEqual([
        "render",
        "onMount",
        "effect 0",
        "effect 1",
        "effect 2",
        "onUnmount"
      ], sequence);
    });
  });
  suite("mount arrays", () => {
    test("mapping multiple arrays in a row concats as expected", () => {
      const items = collection([
        "A",
        "is",
        "the",
        "only",
        "thing",
        "unless",
        "letters",
        "continue"
      ]);
      mount(testRoot2, /* @__PURE__ */ src_default("div", null, calc(() => items.map((item) => item)), calc(() => items.map((item) => item))));
      assert2.deepEqual(Array.from(testRoot2.querySelector("div").childNodes).map((item) => item.data), [
        "A",
        "is",
        "the",
        "only",
        "thing",
        "unless",
        "letters",
        "continue",
        "A",
        "is",
        "the",
        "only",
        "thing",
        "unless",
        "letters",
        "continue"
      ]);
    });
    test("rerendering multiple arrays in a row concats as expected", () => {
      const items = collection([
        "A",
        "is",
        "the",
        "only",
        "thing",
        "unless",
        "letters",
        "continue"
      ]);
      mount(testRoot2, /* @__PURE__ */ src_default("div", null, "foo", calc(() => items.map((item, idx) => `A:${item}:${idx} `)), "bar", calc(() => items.map((item, idx) => `B:${item}:${idx} `)), "baz"));
      items[3] = "best";
      items[6] = "not";
      items.shift();
      items.pop();
      flush();
      assert2.deepEqual(Array.from(testRoot2.querySelector("div").childNodes).map((item) => item.data), [
        "foo",
        "A:is:0 ",
        "A:the:1 ",
        "A:best:2 ",
        "A:thing:3 ",
        "A:unless:4 ",
        "A:not:5 ",
        "bar",
        "B:is:0 ",
        "B:the:1 ",
        "B:best:2 ",
        "B:thing:3 ",
        "B:unless:4 ",
        "B:not:5 ",
        "baz"
      ]);
    });
    test("arrays can be nested and concatted as as expected", () => {
      const items = collection([1, 2, 3]);
      mount(testRoot2, /* @__PURE__ */ src_default("div", null, "foo", calc(() => items.map((count) => {
        const array = [];
        for (let i = 0; i < count; ++i) {
          array.push(`A:${i + 1}/${count}`);
        }
        return array;
      })), "bar", calc(() => items.map((count) => {
        const array = [];
        for (let i = 0; i < count; ++i) {
          array.push(`B:${i + 1}/${count}`);
        }
        return array;
      })), "baz"));
      assert2.deepEqual(Array.from(testRoot2.querySelector("div").childNodes).map((item) => item.data), [
        "foo",
        "A:1/1",
        "A:1/2",
        "A:2/2",
        "A:1/3",
        "A:2/3",
        "A:3/3",
        "bar",
        "B:1/1",
        "B:1/2",
        "B:2/2",
        "B:1/3",
        "B:2/3",
        "B:3/3",
        "baz"
      ]);
      items[0] = 3;
      items.push(4);
      flush();
      assert2.deepEqual(Array.from(testRoot2.querySelector("div").childNodes).map((item) => item.data), [
        "foo",
        "A:1/3",
        "A:2/3",
        "A:3/3",
        "A:1/2",
        "A:2/2",
        "A:1/3",
        "A:2/3",
        "A:3/3",
        "A:1/4",
        "A:2/4",
        "A:3/4",
        "A:4/4",
        "bar",
        "B:1/3",
        "B:2/3",
        "B:3/3",
        "B:1/2",
        "B:2/2",
        "B:1/3",
        "B:2/3",
        "B:3/3",
        "B:1/4",
        "B:2/4",
        "B:3/4",
        "B:4/4",
        "baz"
      ]);
    });
  });
})();
/**
 * @license
 * Lodash <https://lodash.com/>
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
//# sourceMappingURL=view.test.js.map
