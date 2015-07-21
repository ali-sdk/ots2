'use strict';

var protobuf = require('./protobuf');

exports.listTable = function * () {
  var operation = 'ListTable';
  var request = {};

  var buff = yield * this.request(operation);
  console.log(buff);
  return protobuf.decode(buff);
};

