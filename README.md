Aliyun OTS client for Node.js(ES6)
==================================

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![codecov][cov-image]][cov-url]

[npm-image]: https://img.shields.io/npm/v/@alicloud/ots2.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@alicloud/ots2
[travis-image]: https://img.shields.io/travis/ali-sdk/ots2/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/ali-sdk/ots2
[cov-image]: https://codecov.io/gh/ali-sdk/ots2/branch/master/graph/badge.svg
[cov-url]: https://codecov.io/gh/ali-sdk/ots2

Aliyun OTS数据库服务Node.js客户端。

## OTS介绍
OTS是构建在阿里云飞天分布式系统之上的NoSQL数据库服务，提供海量结构化数据的存储和实时访问。OTS以实例和表的形式组织数据，通过数据分片和负载均衡技术，达到规模的无缝扩展。OTS向应用程序屏蔽底层硬件平台的故障和错误，能自动从各类错误中快速恢复，提供非常高的服务可用性。OTS管理的数据全部存储在SSD中并具有多个备份，提供了快速的访问性能和极高的数据可靠性。用户在使用OTS服务时，只需要按照预留和使用的资源进行付费，无需关心数据库的软硬件升级维护、集群缩容扩容等复杂问题。

更多细节请参见：<https://help.aliyun.com/product/27278.html>

## 安装

```sh
$ npm install @alicloud/ots2 --save
```

## 使用

### 创建客户端
```js
const ots = require('@alicloud/ots2');
var client = ots.createClient({
  accessKeyID: '<YOUR ACCESSKEYID>',
  accessKeySecret: '<YOUR ACCESSKEYSECRET>',
  instance: '<YOUR INSTANCE>',
  region: '<YOUR REGION>',
  keepAliveMsecs: 1000, // default 1000
  timeout: 3000 // default 3000ms
});
```

### 调用API

详细API文档请参见：<http://doxmate.cool/ali-sdk/ots2/index.html>

所有表的操作
```js
// 列出所有表名
await client.listTable();
// 创建表
var keys = [{ 'name': 'uid', 'type': 'STRING' }];
// 若实例为‘容量型’，read 和 write 值必须为0，否则会报错 OTSParameterInvalidError: Can not reserve read capacity unit on capacity cluster
var capacityUnit = {read: 0, write: 0};
var options = {
  table_options: {
    time_to_live: -1,// 数据的过期时间, 单位秒, -1代表永不过期. 假如设置过期时间为一年, 即为 365 * 24 * 3600.
    max_versions: 1
  }
};
var response = await client.createTable('metrics', keys, capacityUnit, options);
// 更新表
var capacityUnit = {read: 2, write: 1};
var response = await client.updateTable('metrics', capacityUnit);
// 查看表信息
var response = await client.describeTable('metrics');
// 删除表
var response = await client.deleteTable('metrics');
```

所有行的操作

```js
// 写入行
var name = 'metrics';
var condition = {
  row_existence: ots.RowExistenceExpectation.IGNORE
};
var primaryKeys = {uid: 'test_uid'};

var columns = {test: 'test_value'};

var response = await client.putRow(name, condition, primaryKeys, columns);

// 读取行
var name = 'metrics';
var primaryKeys = {uid: 'test_uid'};

var columns = ['test'];
var response = await client.getRow(name, primaryKeys, columns);

// 更新行
var name = 'metrics';
var condition = {
  row_existence: ots.RowExistenceExpectation.IGNORE
};
var primaryKeys = {uid: 'test_uid'};

var columns = {
  test: ots.$put('test_value_replaced')
};

var response = await client.updateRow(name, condition, primaryKeys, columns);

// 删除行
var name = 'metrics';
var condition = {
  row_existence: ots.RowExistenceExpectation.IGNORE
};
var primaryKeys = {
  uid: 'test_uid'
};

var response = await client.deleteRow(name, condition, primaryKeys);
```

批量操作

```js
// 批量写
var tables = [
  {
    table_name: 'metrics',
    put_rows: [
      {
        condition: {
          row_existence: ots.RowExistenceExpectation.IGNORE
        },
        primary_key: {
          uid: 'test_uid'
        },
        attribute_columns: {
          test: 'test_value'
        }
      }
    ],
    update_rows: {},
    delete_rows: {}
  }
];
var response = await client.batchWriteRow(tables);

// 批量读
var tables = [
  {
    table_name: 'metrics',
    rows: [
      {
        primary_key: {
          uid: 'test_uid'
        }
      }
    ],
    columns_to_get: ['test']
  }
];
var response = await client.batchGetRow(tables);

// 范围读
var start = {
  uid: ots.InfMin
};

var end = {
  uid: ots.InfMax
};

var request = {
  table_name: 'metrics',
  direction: ots.Direction.FORWARD,
  columns_to_get: ['test'],
  limit: 4,
  inclusive_start_primary_key: start,
  exclusive_end_primary_key: end
};
var response = await client.getRange(request);
```

### 条件更新（Conditional Update）和过滤器（Filter）支持

条件更新和过滤器是一个 ConditionColumn 类型，是一种类似 SQL 中的 where 条件。

本模块提供一个makeFilter方法来快速生成一个 ConditionColumn 对象。

```js
ots.makeFilter('column_name < @name true', {
  name: 'Jackson Tian'
});
// column_name => 表中的列名
// < => 操作符：==, !=, <, <=, >, >=
// @name 上下文中的属性名
// true => 列不存在时，默认结果
```

其中组合条件的语法（DSL）如下：

```js
name == @name true
NOT name == @name true
NOT NOT name == @name true
name > @name true AND age <= @age false
name > @name true OR age <= @age false
NOT name > @name true AND age <= @age false
name > @name true AND age <= @age false AND gender == @gender true
name > @name true OR age <= @age false AND gender == @gender true
```

优先级顺序为：NOT > AND > OR

## License
OTS服务由阿里云提供。但本模块在MIT许可下自由使用。

(The MIT license)
