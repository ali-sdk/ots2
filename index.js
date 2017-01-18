'use strict';

const parser = require('./lib/filter_parser');
const runner = require('./lib/filter_runner');
const Client = require('./lib/client');
const helper = require('./lib/helper');

/**
 * 根据选项创建实例的客户端
 *
 * Example:
 * ```
 * var ots = require('ots2');
 * var client = ots.createClient({
 *  accessKeyID: '<YOUR ACCESSKEYID>',
 *  accessKeySecret: '<YOUR ACCESSKEYSECRET>',
 *  instance: '<YOUR INSTANCE>',
 *  region: '<YOUR REGION>'
 * });
 * // or with endpoint
 * var client = ots.createClient({
 *  accessKeyID: '<YOUR ACCESSKEYID>',
 *  accessKeySecret: '<YOUR ACCESSKEYSECRET>',
 *  endpoint: '<YOUR ENDPOINT>'
 * });
 * ```
 * @param {Object} opts 选项
 */
exports.createClient = function (opts) {
  return new Client(opts);
};

// copy helper
Object.assign(exports, helper);

var $$ = function (input) {
  if (typeof input === 'object' && input.type) {
    return input;
  }

  return helper.createValue(input);
};

exports.makeFilter = function (input, locals) {
  var ast = parser.parse(input);
  return runner.parseCondition(ast, locals, $$);
};
