'use strict';

var crypto = require('crypto');

/**
 * 对字符串进行hmac sha1签名
 * @param {String} input 待签名的字符串内容
 * @param {String} key 签名所用key
 * @return {String} 按base64编码的签名
 */
exports.sha1 = function (input, key) {
  return crypto.createHmac('sha1', key).update(input).digest("base64");
};

/**
 * 对字符串进行md5签名
 * @param {String} input 待签名的字符串内容
 * @return {String} 按base64编码的签名
 */
exports.md5 = function (input) {
  return crypto.createHash('md5').update(input).digest("base64");
};
