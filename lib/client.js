'use strict';

var format = require('util').format;
var httpx = require('httpx');
var streamx = require('streamx');
var md5 = require('./util').md5;
var sha1 = require('./util').sha1;
var actions = require('./actions');
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

  headers['x-ots-signature'] = this.sign(stringToSign);
  return headers;
};

Client.prototype.request = function * (operation, body) {
  var url = this.endpoint + operation;
  body || (body = '');
  var headers = this.buildHeaders(url, body);
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
    var delimiter = /\u0012[\u001c|\u001f]/;
    var parts = buff.toString('utf8').split(delimiter);
    var err = new Error(parts[1]);
    err.name = parts[0].trim() + 'Error';
    throw err;
  }

  if (!this.checkResponseSign(operation, res)) {
    throw new Error('响应签名不对');
  }

  if (!this.checkResponseDate(res)) {
    throw new Error('响应时间不对');
  }


  if (!this.checkResponseContent(res, buff)) {
    throw new Error('响应内容不对');
  }

  return buff;
};

Client.prototype.checkResponse = function () {

};

Client.prototype.checkResponseSign = function (operation, res) {
  var headers = res.headers;
  var canonicalURI = ('/' + operation);
  var canonicalHeaders = getCanonicalHeaders(headers);
  var stringToSign = canonicalHeaders + canonicalURI;
  var signature = this.sign(stringToSign);
  var auth = 'OTS ' + this.accessKeyID + ':' + signature;
  return res['Authorization'] === auth;
};

Client.prototype.checkResponseDate = function (res) {
  var now = new Date().getTime();
  var date = Date.parse(res.headers['x-ots-date']);
  return Math.abs(now - date) < 15 * 60 * 1000; // 对比时间，不能相差超过15分钟
};

Client.prototype.checkResponseContent = function (res, content) {
  var hash = res.headers['x-ots-contentmd5'];
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
