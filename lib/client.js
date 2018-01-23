'use strict';

const url = require('url');
const httpx = require('httpx');
const kitx = require('kitx');

const actions = require('./actions');
const ots2 = require('./ots2');
const OTSError = ots2.Error;
const debug = require('debug')('ots');

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
class Client {
  constructor(opts) {
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

    var urlobj = url.parse(this.endpoint);
    var httplib = urlobj.protocol === 'http:' ? require('http') : require('https');

    this.keepAliveAgent = httplib.Agent({
      keepAlive: true,
      keepAliveMsecs: opts.keepAliveMsecs
    });

    if (typeof opts.timeout === 'number') {
      this.timeout = opts.timeout;
    }
  }

  sign(input) {
    return kitx.sha1(input, this.accessKeySecret, 'base64');
  }

  buildHeaders(canonicalURI, content) {
    var headers = {
      'x-ots-date': (new Date()).toISOString(),
      'x-ots-apiversion': '2015-12-31',
      'x-ots-accesskeyid': this.accessKeyID,
      'x-ots-instancename': this.instance,
      'x-ots-contentmd5': kitx.md5(content, 'base64'),
      'content-length': Buffer.byteLength(content)
      // 'User-Agent': 'aliyun-tablestore-sdk/'
    };

    var canonicalHeaders = getCanonicalHeaders(headers);
    var method = 'POST';

    var stringToSign = `${canonicalURI}\n${method}\n\n${canonicalHeaders}`;
    debug('basestring is %s', stringToSign);
    headers['x-ots-signature'] = this.sign(stringToSign);
    return headers;
  }

  async request(operation, data) {
    var url = this.endpoint + operation;
    // get body
    var Request = ots2[operation + 'Request'];
    var body = new Request(data).toBuffer();

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

    var res = await httpx.request(url, opts);
    debug('response headers is %j', res.headers);

    var buff = await httpx.read(res);

    if (res.statusCode < 200 || res.statusCode >= 400) {
      var error = OTSError.decode(buff);
      var err = new Error(error.message);
      err.name = error.code + 'Error';
      err.data = data;
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
  }

  checkResponseSign(operation, headers) {
    var canonicalURI = '/' + operation;
    var canonicalHeaders = getCanonicalHeaders(headers);
    var stringToSign = canonicalHeaders + canonicalURI;
    debug('basestring is %s', stringToSign);
    var signature = this.sign(stringToSign);
    var auth = 'OTS ' + this.accessKeyID + ':' + signature;
    return headers['authorization'] === auth;
  }

  checkResponseDate(headers) {
    var now = new Date().getTime();
    var date = Date.parse(headers['x-ots-date']);
    return Math.abs(now - date) < 15 * 60 * 1000; // 对比时间，不能相差超过15分钟
  }

  checkResponseContent(headers, content) {
    var hash = headers['x-ots-contentmd5'];
    return kitx.md5(content, 'base64') === hash;
  }
}


Object.assign(Client.prototype, actions);

module.exports = Client;
