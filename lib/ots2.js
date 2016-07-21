'use strict';

const path = require('path');

const pb = require('protobufjs');

const protoPath = path.join(__dirname, '../spec/ots2.proto');
const builder = pb.loadProtoFile(protoPath);

/**
 * ProtoBuf定义
 * @name ots2
 */
module.exports = builder.build('com.aliyun.cloudservice.ots2');
