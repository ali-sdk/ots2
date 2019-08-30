'use strict';

const ots2 = require('./lib/ots2');
const parser = require('./lib/filter_parser');
const runner = require('./lib/filter_runner');
const Client = require('./lib/client');
const {
  PUT, DELETE, DELETE_ALL,
  InfMin, InfMax,
  serialize
} = require('./lib/plainbuffer');

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

/**
 * 相关Enum类型
 *
 * Example:
 * ```
 * enum PrimaryKeyType {
 *     INTEGER = 1;
 *     STRING = 2;
 *     BINARY = 3;
 * }
 *
 * enum PrimaryKeyOption {
 *     AUTO_INCREMENT = 1;
 * }
 *
 * enum RowExistenceExpectation {
 *     IGNORE = 0;
 *     EXPECT_EXIST = 1;
 *     EXPECT_NOT_EXIST = 2;
 * }
 *
 * enum ReturnType {
 *     RT_NONE = 0;
 *     RT_PK = 1;
 * }
 *
 * enum OperationType {
 *     PUT = 1;
 *     UPDATE = 2;
 *     DELETE = 3;
 * }
 * ```
 */
// 拷贝所有的Enum
for (var key in ots2) {
  if (typeof ots2[key] !== 'function') {
    exports[key] = ots2[key];
  }
}

exports.InfMin = InfMin;
exports.InfMax = InfMax;

exports.$put = function (value) {
  return {
    type: PUT,
    value: value
  };
};

exports.$delete = function (timestamp) {
  return {type: DELETE, timestamp: timestamp};
};

exports.$deleteAll = function () {
  return {type: DELETE_ALL};
};

exports.makeFilter = function (input, locals) {
  var ast = parser.parse(input);
  return runner.parseFilter(ast, locals);
};

exports.serialize = serialize;
