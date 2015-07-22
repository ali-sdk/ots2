Aliyun OTS client for Node.js(ES6)
==================================
Aliyun OTS数据库服务Node.js客户端。

## OTS介绍
OTS是构建在阿里云飞天分布式系统之上的NoSQL数据库服务，提供海量结构化数据的存储和实时访问。OTS以实例和表的形式组织数据，通过数据分片和负载均衡技术，达到规模的无缝扩展。OTS向应用程序屏蔽底层硬件平台的故障和错误，能自动从各类错误中快速恢复，提供非常高的服务可用性。OTS管理的数据全部存储在SSD中并具有多个备份，提供了快速的访问性能和极高的数据可靠性。用户在使用OTS服务时，只需要按照预留和使用的资源进行付费，无需关心数据库的软硬件升级维护、集群缩容扩容等复杂问题。

更多细节请参见：<http://docs.aliyun.com/?#/pub/ots/Getting-Started/OTSIntroduction>

## 安装

```sh
$ npm install ots2 --save
```

## 使用

### 创建客户端
```js
var ots = require('ots2');
var client = ots.createClient({
  accessKeyID: '<YOUR ACCESSKEYID>',
  accessKeySecret: '<YOUR ACCESSKEYSECRET>',
  instance: '<YOUR INSTANCE>',
  region: '<YOUR REGION>'
});
```

### 调用API

所有表的操作
```js
// 列出所有表名
yield* client.listTable();
// 创建表
var keys = [{ 'name': 'uid', 'type': 'STRING' }];
var capacityUnit = {read: 1, write: 1};
var response = yield* client.createTable('metrics', keys, capacityUnit);
// 更新表
var capacityUnit = {read: 2, write: 1};
var response = yield* client.updateTable('metrics', capacityUnit);
// 查看表信息
var response = yield* client.describeTable('metrics');
// 删除表
var response = yield* client.deleteTable('metrics');
```

所有行的操作

```js
// 写入行
var name = 'metrics';
var condition = {
  row_existence: ots.RowExistenceExpectation.IGNORE
};
var primaryKeys = [
  {
    name: 'uid',
    value: ots.createString('test_uid')
  }
];
var columns = [
  {
    name: 'test',
    value: ots.createString('test_value')
  }
];
var response = yield* client.putRow(name, condition, primaryKeys, columns);

// 读取行
var name = 'metrics';
var primaryKeys = [
  {
    name: 'uid',
    value: ots.createString('test_uid')
  }
];
var columns = ['test'];
var response = yield* client.getRow(name, primaryKeys, columns);

// 更新行
var name = 'metrics';
var condition = {
  row_existence: ots.RowExistenceExpectation.IGNORE
};
var primaryKeys = [
  {
    name: 'uid',
    value: ots.createString('test_uid')
  }
];
var columns = [
  {
    name: 'test',
    type: ots.OperationType.PUT,
    value: ots.createString('test_value_replaced')
  }
];
var response = yield* client.updateRow(name, condition, primaryKeys, columns);

// 删除行
var name = 'metrics';
var condition = {
  row_existence: OTS.RowExistenceExpectation.IGNORE
};
var primaryKeys = [
  {
    name: 'uid',
    value: OTS.createString('test_uid')
  }
];
var response = yield* client.deleteRow(name, condition, primaryKeys);
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
          row_existence: OTS.RowExistenceExpectation.IGNORE
        },
        primary_key: [
          {
            name: 'uid',
            value: OTS.createString('test_uid')
          }
        ],
        attribute_columns: [
          {
            name: 'test',
            value: OTS.createString('test_value')
          }
        ]
      }
    ],
    update_rows: [],
    delete_rows: []
  }
];
var response = yield* client.batchWriteRow(tables);

// 批量读
var tables = [
  {
    table_name: 'metrics',
    rows: [
      {
        primary_key: [
          {
            name: 'uid',
            value: OTS.createString('test_uid')
          }
        ]
      }
    ],
    columns_to_get: ['test']
  }
];
var response = yield* client.batchGetRow(tables);

// 范围读
var start = [
  {
    name: 'uid',
    value: OTS.createInfMin()
  }
];
var end = [
  {
    name: 'uid',
    value: OTS.createInfMax()
  }
];

var request = {
  table_name: 'metrics',
  direction: OTS.Direction.FORWARD,
  columns_to_get: ['test'],
  limit: 4,
  inclusive_start_primary_key: start,
  exclusive_end_primary_key: end
};
var response = yield* client.getRange(request);
```

## License
OTS服务由阿里云提供。但本模块在MIT许可下自由使用。

(The MIT license)
