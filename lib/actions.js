'use strict';

const ots2 = require('./ots2');

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
exports.createTable = function* (name, primaryKeys, capacity) {
  return yield this.request('CreateTable', {
    table_meta: {
      table_name: name,
      primary_key: primaryKeys
    },
    reserved_throughput: {
      capacity_unit: capacity
    }
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
exports.updateTable = function* (name, capacity) {
  return yield * this.request('UpdateTable', {
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
exports.listTable = function* () {
  return yield this.request('ListTable', {});
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
exports.describeTable = function* (name) {
  return yield this.request('DescribeTable', {
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
exports.deleteTable = function* (name) {
  return yield this.request('DeleteTable', {
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
exports.putRow = function* (name, condition, primaryKeys, columns) {
  var $ = require('./client').$;
  return yield this.request('PutRow', {
    table_name: name,
    condition: condition,
    primary_key: $(primaryKeys),
    attribute_columns: $(columns)
  });
};

var parseColumnValue = function (value) {
  var type = ots2.ColumnType;
  var v;
  switch (value.type) {
  case type.STRING:
    v = value.v_string;
    break;
  case type.INTEGER:
    v = value.v_int;
    break;
  case type.BOOLEAN:
    v = value.v_bool;
    break;
  case type.DOUBLE:
    v = value.v_double;
    break;
  case type.BINARY:
    v = value.v_binary;
    v = v.buffer.slice(v.offset, v.limit);
    break;
  }
  return v;
};

var parseRow = function (row) {
  var parsed = null;
  if (row.primary_key_columns.length > 0 || row.attribute_columns.length) {
    parsed = {};

    var primaries = row.primary_key_columns;
    for (var i = 0; i < primaries.length; i++) {
      var col = primaries[i];
      parsed[col.name] = parseColumnValue(col.value);
    }

    var attributes = row.attribute_columns;
    for (var j = 0; j < attributes.length; j++) {
      var attr = attributes[j];
      parsed[attr.name] = parseColumnValue(attr.value);
    }
  }
  return parsed;
};

/**
 * 根据给定的主键读取单行数据。
 *
 * Example:
 * ```
 * ```
 * @param {String} name 表名
 * @return {Object} 返回值
 */
exports.getRow = function* (name, primaryKeys, columns) {
  var $ = require('./client').$;

  var result = yield this.request('GetRow', {
    table_name: name,
    primary_key: $(primaryKeys),
    columns_to_get: columns
  });

  if (this.parseRow) {
    result.parsedRow = parseRow(result.row);
  }
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
exports.updateRow = function* (name, condition, primaryKeys, columns) {
  var $ = require('./client').$;

  return yield this.request('UpdateRow', {
    table_name: name,
    condition: condition,
    primary_key: $(primaryKeys),
    attribute_columns: $(columns)
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
exports.deleteRow = function* (name, condition, primaryKeys) {
  var $ = require('./client').$;

  return yield this.request('DeleteRow', {
    table_name: name,
    condition: condition,
    primary_key: $(primaryKeys)
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
exports.getRange = function* (request) {
  var $ = require('./client').$;
  request.inclusive_start_primary_key = $(request.inclusive_start_primary_key);
  request.exclusive_end_primary_key = $(request.exclusive_end_primary_key);

  var response = yield this.request('GetRange', request);
  if (this.parseRow) {
    var rows = response.rows;
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      row.parsedRow = parseRow(row);
    }
  }
  return response;
};


var hookColumns = function (tables) {
  var $ = require('./client').$;
  for (var i = 0; i < tables.length; i++) {
    var table = tables[i];
    for (var j = 0; j < table.rows.length; j++) {
      var row = table.rows[j];
      row.primary_key = $(row.primary_key);
    }
  }

  return tables;
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
exports.batchGetRow = function* (tables) {
  var response = yield this.request('BatchGetRow', {
    tables: hookColumns(tables)
  });

  if (this.parseRow) {
    var _tables = response.tables;
    for (var i = 0; i < _tables.length; i++) {
      var table = _tables[i];
      var rows = table.rows;
      for (var j = 0; j < rows.length; j++) {
        var row = rows[j];
        if (row.is_ok) {
          row.parsedRow = parseRow(row.row);
        }
      }
    }
  }
  return response;
};

var hook = function (rows) {
  if (!rows) {
    return;
  }

  var $ = require('./client').$;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    row.primary_key = $(row.primary_key);
    row.attribute_columns = $(row.attribute_columns);
  }
};

/**
 * 批量插入，修改或删除一个或多个表中的若干行数据。
 * BatchWriteRow操作可视为多个PutRow、UpdateRow、DeleteRow操作的集合，各个操作独立执行，独立返回结果，独立计算服务能力单元。
 * 与执行大量的单行写操作相比，使用BatchWriteRow操作可以有效减少请求的响应时间，提高数据的写入速率。
 *
 * Example:
 * ```
 *
 * ```
 * @param {Array} tables 对应了每个table下各操作的响应信息，包括是否成功执行，错误码和消耗的服务能力单元。
 * @return {Object} 返回值
 */
exports.batchWriteRow = function* (tables) {
  for (var i = 0; i < tables.length; i++) {
    var table = tables[i];
    hook(table.put_rows);
    hook(table.update_rows);
    hook(table.delete_rows);
  }

  return yield this.request('BatchWriteRow', {
    tables: tables
  });
};
