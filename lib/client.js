'use strict';

const httpx = require('httpx');
const kitx = require('kitx');

const actions = require('./actions');
const ots2 = require('./ots2');
const parser = require('./filter_parser');
const runner = require('./filter_runner');
const OTSError = ots2.Error;
const debug = require('debug')('ots');

/**
 * OTS Client
 * @param {Object} opts
 *  - instance {String} instance
 *  - region {String} region
 *  - internal
 *  - endpoint
 *  - accessKeyID
 *  - accessKeySecret
 *  - keepAliveMsecs {Number} http(s) agent keep socket conn time, unit ms
 *  - timeout
 */
var Client = function (opts) {
  if (!opts || typeof opts !== 'object') {
    throw new TypeError('must pass in opts as Object');
  }

  this.accessKeyID = opts.accessKeyID;
  this.accessKeySecret = opts.accessKeySecret;
  if (!this.accessKeyID || !this.accessKeySecret) {
    throw new Error('must pass in accessKeyID and accessKeySecret');
  }

  this.instance = opts.instance;
  if (!this.instance) {
    throw new Error('must pass in instance');
  }

  if (opts.endpoint) {
    this.endpoint = opts.endpoint;
  } else {
    this.region = opts.region;
    if (!this.region) {
      throw new Error('must pass in region');
    }

    var env = opts.internal ? 'ots-internal' : 'ots';

    this.endpoint = `http://${opts.instance}.${opts.region}.${env}.aliyuncs.com/`;
  }

  // parse raw row to object
  this.parseRow = (typeof opts.parseRow !== 'undefined' ? opts.parseRow : true);

  this.keepAliveAgent = new require('http').Agent({
    keepAlive: true,
    keepAliveMsecs: opts.keepAliveMsecs
  });

  if (typeof opts.timeout === 'number') {
    this.timeout = opts.timeout;
  }
};

var getCanonicalHeaders = function (headers) {
  var keys = Object.keys(headers);
  var selectedKeys = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key.indexOf('x-ots-') !== -1 && key !== 'x-ots-signature') {
      selectedKeys.push(key);
    }
  }

  selectedKeys.sort();

  var str = '';
  for (var j = 0; j < selectedKeys.length; j++) {
    var name = selectedKeys[j];
    str += name + ':' + headers[name].trim() + '\n';
  }

  return str;
};

Client.prototype.sign = function (input) {
  return kitx.sha1(input, this.accessKeySecret, 'base64');
};

Client.prototype.buildHeaders = function (canonicalURI, content) {
  var headers = {
    'x-ots-date': (new Date()).toUTCString(),
    'x-ots-apiversion': '2014-08-08',
    'x-ots-accesskeyid': this.accessKeyID,
    'x-ots-instancename': this.instance,
    'x-ots-contentmd5': kitx.md5(content, 'base64')
  };

  var canonicalHeaders = getCanonicalHeaders(headers);
  var method = 'POST';

  var stringToSign = `${canonicalURI}\n${method}\n\n${canonicalHeaders}`;
  debug('basestring is %s', stringToSign);
  headers['x-ots-signature'] = this.sign(stringToSign);
  return headers;
};

Client.prototype.request = function* (operation, data) {
  var url = this.endpoint + operation;

  // get body
  var Request = ots2[operation + 'Request'];
  var request = new Request(data);
  var body = request.toBuffer();

  var headers = this.buildHeaders('/' + operation, body);
  var opts = {
    method: 'POST',
    data: body,
    headers: headers,
    agent: this.keepAliveAgent
  };

  if (this.timeout) {
    opts.timeout = this.timeout;
  }

  debug('url is %s', url);

  var res = yield httpx.request(url, opts);
  debug('response headers is %j', res.headers);

  var buff = yield httpx.read(res);

  if (res.statusCode < 200 || res.statusCode >= 400) {
    var error = OTSError.decode(buff);
    var err = new Error(error.message);
    err.name = error.code + 'Error';
    throw err;
  }

  if (!this.checkResponseSign(operation, res.headers)) {
    throw new Error('响应签名不对');
  }

  if (!this.checkResponseDate(res.headers)) {
    throw new Error('响应时间不对');
  }

  if (!this.checkResponseContent(res.headers, buff)) {
    throw new Error('响应内容不对');
  }

  return ots2[operation + 'Response'].decode(buff);
};

Client.prototype.checkResponseSign = function (operation, headers) {
  var canonicalURI = '/' + operation;
  var canonicalHeaders = getCanonicalHeaders(headers);
  var stringToSign = canonicalHeaders + canonicalURI;
  debug('basestring is %s', stringToSign);
  var signature = this.sign(stringToSign);
  var auth = 'OTS ' + this.accessKeyID + ':' + signature;
  return headers['authorization'] === auth;
};

Client.prototype.checkResponseDate = function (headers) {
  var now = new Date().getTime();
  var date = Date.parse(headers['x-ots-date']);
  return Math.abs(now - date) < 15 * 60 * 1000; // 对比时间，不能相差超过15分钟
};

Client.prototype.checkResponseContent = function (headers, content) {
  var hash = headers['x-ots-contentmd5'];
  return kitx.md5(content, 'base64') === hash;
};

Object.assign(Client.prototype, actions);

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

var types = {
  'STRING': 'String',
  'BINARY': 'Binary',
  'BOOLEAN': 'Boolean',
  'DOUBLE': 'Double',
  'INTEGER': 'Integer',
  'INF_MIN': 'InfMin',
  'INF_MAX': 'InfMax'
};

var setColumnValue = function (type, value) {
  var ColumnType = ots2.ColumnType;
  var v = {type: type};
  switch (type) {
  case ColumnType.STRING:
    v.v_string = value;
    break;
  case ColumnType.INTEGER:
    v.v_int = value;
    break;
  case ColumnType.BOOLEAN:
    v.v_bool = value;
    break;
  case ColumnType.DOUBLE:
    v.v_double = value;
    break;
  case ColumnType.BINARY:
    v.v_binary = value;
    break;
  }

  return v;
};

/**
 * 生成不同类型的Column
 *
 * Example:
 * ```
 * ots.createStringColumn('name', 'value');
 * ots.createBinaryColumn('name', bin);
 * ots.createBooleanColumn('name', true);
 * ots.createDoubleColumn('name', 1.1);
 * ots.createIntegerColumn('name', 10);
 * ots.createInfMinColumn('name');
 * ots.createInfMaxColumn('name');
 * ```
 * @name createXXXColumn
 * @param {String} name column name
 * @param {MIX} value column value
 */
const ColumnType = ots2.ColumnType;
Object.keys(ColumnType).forEach(function (key) {
  var type = ColumnType[key];
  exports['create' + types[key]] = function (value) {
    return setColumnValue(type, value);
  };

  exports['create' + types[key] + 'Column'] = function (name, value) {
    return {
      name: name,
      value: setColumnValue(type, value)
    };
  };
});

exports.$put = function (value) {
  return {
    symbol: exports.PUT,
    value: value
  };
};

exports.$delete = function () {
  return {
    symbol: exports.DELETE
  };
};

var createPutColumn = function (key, value) {
  var column = exports.createColumn(key, value);
  column.type = exports.OperationType.PUT;
  return column;
};

var createDeleteColumn = function (name) {
  return {
    name: name,
    type: exports.OperationType.DELETE
  };
};

/**
 * 相关Enum类型
 *
 * Example:
 * ```
 * ots.ColumnType = {
 *   INF_MIN,
 *   INF_MAX,
 *   INTEGER,
 *   STRING,
 *   BOOLEAN,
 *   DOUBLE,
 *   BINARY
 * }
 * ots.RowExistenceExpectation = {
 *   IGNORE,
 *   EXPECT_EXIST,
 *   EXPECT_NOT_EXIST }
 * ots.ColumnConditionType = { CCT_RELATION: 1, CCT_COMPOSITE: 2 }
 * ots.ComparatorType = { CT_EQUAL: 1,
 *   CT_NOT_EQUAL: 2,
 *   CT_GREATER_THAN: 3,
 *   CT_GREATER_EQUAL: 4,
 *   CT_LESS_THAN: 5,
 *   CT_LESS_EQUAL: 6 },
 * ots.LogicalOperator = { LO_NOT: 1, LO_AND: 2, LO_OR: 3 }
 * ots.OperationType: { PUT, DELETE }
 * ots.Direction = { FORWARD, BACKWARD }
 * ```
 */
// 拷贝所有的Enum
for (var key in ots2) {
  if (typeof ots2[key] !== 'function') {
    exports[key] = ots2[key];
  }
}

exports.InfMin = Symbol('InfMin');
exports.InfMax = Symbol('InfMax');

exports.PUT = Symbol('PUT');
exports.DELETE = Symbol('DELETE');

exports.createColumn = function (key, value) {
  var column;
  if (typeof value === 'string') {
    column = exports.createStringColumn(key, value);
  } else if (typeof value === 'boolean') {
    column = exports.createBooleanColumn(key, value);
  } else if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      column = exports.createIntegerColumn(key, value);
    } else {
      column = exports.createDoubleColumn(key, value);
    }
  } else if (Buffer.isBuffer(value)) {
    column = exports.createBinaryColumn(key, value);
  } else if (value === exports.InfMin) {
    column = exports.createInfMinColumn(key);
  } else if (value === exports.InfMax) {
    column = exports.createInfMaxColumn(key);
  } else if (value && value.symbol === exports.PUT) {
    column = createPutColumn(key, value.value);
  } else if (value && value.symbol === exports.DELETE) {
    column = createDeleteColumn(key);
  } else {
    throw new TypeError(`unsupport type: ${typeof value}`);
  }

  return column;
};

exports.$ = function (obj) {
  if (Array.isArray(obj)) {
    return obj;
  }

  var keys = Object.keys(obj);
  var columns = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = obj[key];
    columns.push(exports.createColumn(key, value));
  }

  return columns;
};

exports.makeFilter = function (input, locals) {
  var ast = parser.parse(input);
  return runner.parseCondition(ast, locals);
};
