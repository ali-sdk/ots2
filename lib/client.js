'use strict';

var format = require('util').format;
var httpx = require('httpx');
var streamx = require('streamx');
var md5 = require('./util').md5;
var sha1 = require('./util').sha1;
var actions = require('./actions');
var ots2 = require('./ots2');
var OTSError = ots2.Error;
var debug = require('debug')('ots');

var Client = function (opts) {
  opts || (opts = {});
  this.instance = opts.instance;
  this.region = opts.region;
  if (!this.instance || !this.region) {
    throw new Error("must pass in instance and region");
  }

  this.accessKeyID = opts.accessKeyID;
  this.accessKeySecret = opts.accessKeySecret;
  if (!this.accessKeyID || !this.accessKeySecret) {
    throw new Error("must pass in accessKeyID and accessKeySecret");
  }

  var tpl = 'http://%s.%s.%s.aliyuncs.com/';
  var env = opts.internal ? 'ots-internal' : 'ots';
  this.endpoint = format(tpl, opts.instance, opts.region, env);
  // parse raw row to object
  this.parseRow = (typeof opts.parseRow !== 'undefined' ? opts.parseRow : true);
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
  return sha1(input, this.accessKeySecret);
};

Client.prototype.buildHeaders = function (canonicalURI, content) {
  var headers = {
    'x-ots-date': (new Date()).toUTCString(),
    'x-ots-apiversion': '2014-08-08',
    'x-ots-accesskeyid': this.accessKeyID,
    'x-ots-instancename': this.instance,
    'x-ots-contentmd5': md5(content),
  };

  var canonicalHeaders = getCanonicalHeaders(headers);
  var method = 'POST';

  var stringToSign = canonicalURI + '\n' + method + '\n\n' + canonicalHeaders;
  debug('basestring is %s', stringToSign);
  headers['x-ots-signature'] = this.sign(stringToSign);
  return headers;
};

Client.prototype.request = function * (operation, data) {
  var url = this.endpoint + operation;

  // get body
  var Request = ots2[operation + 'Request'];
  var request = new Request(data);
  var body = request.toBuffer();

  var headers = this.buildHeaders('/' + operation, body);
  var opts = {
    method: 'POST',
    data: body,
    headers: headers
  };
  debug('url is %s', url);

  var res = yield httpx.request(url, opts);
  debug('response headers is %j', res.headers);

  var buff = yield streamx.read(res);

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
  return md5(content) === hash;
};

var mixin = function (target, source) {
  for (var key in source) {
    target[key] = source[key];
  }
};

mixin(Client.prototype, actions);

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

Object.keys(ots2.ColumnType).forEach(function (key) {
  var type = ots2.ColumnType[key];
  exports['create' + types[key]] = function (value) {
    return setColumnValue(type, value);
  };
});
