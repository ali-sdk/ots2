'use strict';

const spaceSize = 256;
const crc8Table = new Int8Array(spaceSize);

/**
 * 初始化表
 */
(function() {
  for (var i = 0; i < spaceSize; ++i) {
    var x = i;
    for (var j = 8; j > 0; --j) {
      x = ((x << 1) ^ (((x & 0x80) !== 0) ? 0x07 : 0));
    }
    crc8Table[i] = x;
  }
})();

var crc8Int8 = function(crc, val) {
  return crc8Table[(crc ^ val) & 0xff];
};

var crc8Bytes = function(crc, bytes) {
  for (var i = 0; i < bytes.length; i++) {
    crc = crc8Int8(crc, bytes[i]);
  }

  return crc;
};

exports.crc8Int8 = crc8Int8;
exports.crc8Bytes = crc8Bytes;
