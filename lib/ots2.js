'use strict';

var path = require('path');

var pb = require('protobufjs');

var protoPath = path.join(__dirname, "../spec/ots2.proto");
var builder = pb.loadProtoFile(protoPath);

module.exports = builder.build('com.aliyun.cloudservice.ots2');
