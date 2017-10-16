'use strict';

const ots2 = require('./ots2');
const {
  serialize, deserialize
} = require('./plainbuffer');

function getOne(list) {
  return list && list.length > 0 && list[0] || null;
}

/**
 * 根据给定的表结构信息创建相应的表。
 *
 * Example:
 * ```
 * var keys = [{ 'name': 'uid', 'type': 'STRING' }];
 * var capacityUnit = {read: 1, write: 1};
 * yield client.createTable('metrics', keys, capacityUnit);
 * ```
 * @param {String} name 表名
 * @param {Array} keys 主键列表
 * @param {Object} capacity 保留容量单元
 * @return {Object} 返回值
 */
exports.createTable = async function (name, primaryKeys, capacity, options = {}) {
  return this.request('CreateTable', {
    table_meta: {
      table_name: name,
      primary_key: primaryKeys
    },
    reserved_throughput: {
      capacity_unit: capacity
    },
    table_options: options.table_options,
    // partitions: options.partitions,
    // stream_spec: options.stream_spec
  });
};

/**
 * 更新指定表的预留读吞吐量或预留写吞吐量设置，新设定将于更新成功一分钟内生效。
 *
 * Example:
 * ```
 * var capacityUnit = {read: 2, write: 1};
 * yield client.updateTable('metrics', capacityUnit);
 * ```
 * @param {String} name 表名
 * @param {Object} capacity 保留容量单元
 * @return {Object} 返回值
 */
exports.updateTable = async function (name, capacity) {
  return this.request('UpdateTable', {
    table_name: name,
    reserved_throughput: {
      capacity_unit: capacity
    }
  });
};

/**
 * 获取当前实例下已创建的所有表的表名。
 *
 * Example:
 * ```
 * yield client.listTable();
 * ```
 * @return {Object} 返回值
 */
exports.listTable = async function () {
  return this.request('ListTable', {});
};

/**
 * 查询指定表的结构信息和预留读写吞吐量设置信息。
 * Example:
 * ```
 * yield client.describeTable('metrics');
 * ```
 * @param {String} name 表名
 * @return {Object} 返回值
 */
exports.describeTable = async function (name) {
  return this.request('DescribeTable', {
    table_name: name
  });
};

/**
 * 删除本实例下指定的表
 * Example:
 * ```
 * yield client.deleteTable('metrics');
 * ```
 * @param {String} name 表名
 * @return {Object} 返回值
 */
exports.deleteTable = async function (name) {
  return this.request('DeleteTable', {
    table_name: name
  });
};

/**
 * 插入数据到指定的行，如果该行不存在，则新增一行；若该行存在，则覆盖原有行。
 *
 * Example:
 * @param {String} name 表名
 * @return {Object} 返回值
 */
exports.putRow = async function (name, condition, row, returnContent) {
  return this.request('PutRow', {
    table_name: name,
    row: row,
    condition: condition,
    return_content: returnContent
  });
};

// message GetRowRequest {
//     required string table_name = 1;
//     required bytes primary_key = 2; // encoded as InplaceRowChangeSet, but only has primary key
//     repeated string columns_to_get = 3; // 不指定则读出所有的列
//     optional TimeRange time_range = 4;
//     optional int32 max_versions = 5;
//     optional bytes filter = 7;
//     optional string start_column = 8;
//     optional string end_column = 9;
//     optional bytes token = 10;
// }

/**
 * 根据给定的主键读取单行数据。
 *
 * Example:
 * ```
 * ```
 * @param {String} name 表名
 * @return {Object} 返回值
 */
exports.getRow = async function (name, row, columns, options) {
  var data = Object.assign({
    table_name: name,
    primary_key: row,
    columns_to_get: columns,
    max_versions: 1
  }, options);
  // time_range: range,
  // max_versions: maxVersions;
  // filter: filter,
  // start_column;
  // end_column;
  // token;
  var result = await this.request('GetRow', data);
  result.row = getOne(deserialize(result.row));
  return result;
};

/**
 * 更新指定行的数据，如果该行不存在，则新增一行；
 * 若该行存在，则根据请求的内容在这一行中新增、修改或者删除指定列的值。
 *
 * Example:
 * ```
 * ```
 * @param {String} name 表名
 * @return {Object} 返回值
 */
exports.updateRow = function (name, row, condition, returnContent) {
  return this.request('UpdateRow', {
    table_name: name,
    row_change: row,
    condition: condition,
    // return_content: returnContent
  });
};

/**
 * 删除一行数据。
 *
 * Example:
 * ```
 * ```
 * @param {String} name 表名
 * @return {Object} 返回值
 */
exports.deleteRow = function (name, row, condition, returnContent) {
  return this.request('DeleteRow', {
    table_name: name,
    primary_key: row, // only with primaryKeys
    condition: condition,
    return_content: returnContent
  });
};

/**
 * 读取指定主键范围内的数据。
 *
 * Example:
 * ```
 * var start = {
 *   uid: OTS.InfMin
 * };
 * var end = {
 *   uid: OTS.InfMax
 * };
 * var request = {
 *   table_name: 'metrics',
 *   direction: OTS.Direction.FORWARD,
 *   columns_to_get: ['test'],
 *   limit: 4,
 *   inclusive_start_primary_key: start,
 *   exclusive_end_primary_key: end
 * };
 * var response = yield client.getRange(request);
 * ```
 * @param {String} name 表名
 * @return {Object} 返回值
 */
exports.getRange = async function (request) {
  request.inclusive_start_primary_key = serialize(request.inclusive_start_primary_key);
  request.exclusive_end_primary_key = serialize(request.exclusive_end_primary_key);

  var response = await this.request('GetRange', request);

  response.rows = deserialize(response.rows);

  return response;
};

/**
 * 批量读取一个或多个表中的若干行数据。
 * BatchGetRow操作可视为多个GetRow操作的集合，各个操作独立执行，独立返回结果，
 * 独立计算服务能力单元。与执行大量的GetRow操作相比，使用BatchGetRow操作可以有效减少
 * 请求的响应时间，提高数据的读取速率。
 *
 * Example:
 * ```
 * var tables = [
 *   {
 *     table_name: 'metrics',
 *     put_rows: [
 *       {
 *         condition: {
 *           row_existence: OTS.RowExistenceExpectation.IGNORE
 *         },
 *         primary_key: {
 *           uid: 'test_uid'
 *         },
 *         attribute_columns: {
 *           test: 'test_value'
 *         }
 *       }
 *     ],
 *     update_rows: [],
 *     delete_rows: []
 *   }
 * ];
 * var response = yield client.batchWriteRow(tables);
 * ```
 * @param {String} name 表名
 * @return {Object} 返回值
 */
exports.batchGetRow = async function (tables) {
  var response = await this.request('BatchGetRow', {
    tables: tables
  });

  var _tables = response.tables;
  for (var i = 0; i < _tables.length; i++) {
    var table = _tables[i];
    var rows = table.rows;
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      if (row.is_ok) {
        row.row = getOne(deserialize(row.row));
      }
    }
  }

  return response;
};

/**
 * 批量插入，修改或删除一个或多个表中的若干行数据。
 * BatchWriteRow操作可视为多个PutRow、UpdateRow、DeleteRow操作的
 * 集合，各个操作独立执行，独立返回结果，独立计算服务能力单元。
 * 与执行大量的单行写操作相比，使用BatchWriteRow操作可以有效减少请求
 * 的响应时间，提高数据的写入速率。
 *
 * Example:
 * ```
 *
 * ```
 * @param {Array} tables 对应了每个table下各操作的响应信息，
 * 包括是否成功执行，错误码和消耗的服务能力单元。
 * @return {Object} 返回值
 */
exports.batchWriteRow = function (tables) {
  return this.request('BatchWriteRow', {
    tables: tables
  });
};
