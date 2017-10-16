'use strict';

const path = require('path');
const fs = require('fs');

const pb = require('protobufjs');

const builder = pb.newBuilder();

const protoPath = path.join(__dirname, '../spec/table_store.proto');
const protoContent = fs.readFileSync(protoPath, 'utf8');
pb.loadProto(protoContent, builder, protoPath);

const filterProtoPath = path.join(__dirname, '../spec/table_store_filter.proto');
const protoFilterContent = fs.readFileSync(filterProtoPath, 'utf8');
pb.loadProto(protoFilterContent, builder, filterProtoPath);

/**
 * ProtoBuf定义
 * @name ots2
 */
module.exports = builder.build('com.aliyun.tablestore.protocol');
