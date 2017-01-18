'use strict';

const ots2 = require('./ots2');

var types = {
  'STRING': 'String',
  'BINARY': 'Binary',
  'BOOLEAN': 'Boolean',
  'DOUBLE': 'Double',
  'INTEGER': 'Integer',
  'INF_MIN': 'InfMin',
  'INF_MAX': 'InfMax'
};

var setColumnValue = function (type, value) {
  var ColumnType = ots2.ColumnType;
  var v = {type: type};
  switch (type) {
  case ColumnType.STRING:
    v.v_string = value;
    break;
  case ColumnType.INTEGER:
    v.v_int = value;
    break;
  case ColumnType.BOOLEAN:
    v.v_bool = value;
    break;
  case ColumnType.DOUBLE:
    v.v_double = value;
    break;
  case ColumnType.BINARY:
    v.v_binary = value;
    break;
  }

  return v;
};

/**
 * 生成不同类型的Column
 *
 * Example:
 * ```
 * ots.createStringColumn('name', 'value');
 * ots.createBinaryColumn('name', bin);
 * ots.createBooleanColumn('name', true);
 * ots.createDoubleColumn('name', 1.1);
 * ots.createIntegerColumn('name', 10);
 * ots.createInfMinColumn('name');
 * ots.createInfMaxColumn('name');
 * ```
 * @name createXXXColumn
 * @param {String} name column name
 * @param {MIX} value column value
 */
const ColumnType = ots2.ColumnType;
Object.keys(ColumnType).forEach(function (key) {
  var type = ColumnType[key];
  exports['create' + types[key]] = function (value) {
    return setColumnValue(type, value);
  };

  exports['create' + types[key] + 'Column'] = function (name, value) {
    return {
      name: name,
      value: setColumnValue(type, value)
    };
  };
});

exports.createValue = function (value) {
  var v;
  if (typeof value === 'string') {
    v = {
      type: ColumnType.STRING,
      v_string: value
    };
  } else if (typeof value === 'boolean') {
    v = {
      type: ColumnType.BOOLEAN,
      v_bool: value
    };
  } else if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      v = {
        type: ColumnType.INTEGER,
        v_int: value
      };
    } else {
      v = {
        type: ColumnType.DOUBLE,
        v_double: value
      };
    }
  } else if (Buffer.isBuffer(value)) {
    v = {
      type: ColumnType.BINARY,
      v_binary: value
    };
  } else if (value === exports.InfMin) {
    v = {
      type: ColumnType.INF_MIN
    };
  } else if (value === exports.InfMax) {
    v = {
      type: ColumnType.INF_MAX
    };
  } else {
    throw new TypeError(`unsupport type: ${typeof value}`);
  }

  return v;
};

exports.$put = function (value) {
  return {
    symbol: exports.PUT,
    value: value
  };
};

exports.$delete = function () {
  return {
    symbol: exports.DELETE
  };
};

var createPutColumn = function (key, value) {
  return {
    type: exports.OperationType.PUT,
    name: key,
    value: exports.createValue(value)
  };
};

var createDeleteColumn = function (name) {
  return {
    type: exports.OperationType.DELETE,
    name: name
  };
};

/**
 * 相关Enum类型
 *
 * Example:
 * ```
 * ots.ColumnType = {
 *   INF_MIN,
 *   INF_MAX,
 *   INTEGER,
 *   STRING,
 *   BOOLEAN,
 *   DOUBLE,
 *   BINARY
 * }
 * ots.RowExistenceExpectation = {
 *   IGNORE,
 *   EXPECT_EXIST,
 *   EXPECT_NOT_EXIST }
 * ots.ColumnConditionType = { CCT_RELATION: 1, CCT_COMPOSITE: 2 }
 * ots.ComparatorType = { CT_EQUAL: 1,
 *   CT_NOT_EQUAL: 2,
 *   CT_GREATER_THAN: 3,
 *   CT_GREATER_EQUAL: 4,
 *   CT_LESS_THAN: 5,
 *   CT_LESS_EQUAL: 6 },
 * ots.LogicalOperator = { LO_NOT: 1, LO_AND: 2, LO_OR: 3 }
 * ots.OperationType: { PUT, DELETE }
 * ots.Direction = { FORWARD, BACKWARD }
 * ```
 */
// 拷贝所有的Enum
for (var key in ots2) {
  if (typeof ots2[key] !== 'function') {
    exports[key] = ots2[key];
  }
}

exports.InfMin = Symbol('InfMin');
exports.InfMax = Symbol('InfMax');

exports.PUT = Symbol('PUT');
exports.DELETE = Symbol('DELETE');

exports.$ = function (obj) {
  if (Array.isArray(obj)) {
    return obj;
  }

  var keys = Object.keys(obj);
  var columns = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = obj[key];
    columns.push(exports.createColumn(key, value));
  }

  return columns;
};

exports.createColumn = function (key, value) {
  var column;

  if (value && value.symbol === exports.PUT) {
    column = createPutColumn(key, value.value);
  } else if (value && value.symbol === exports.DELETE) {
    column = createDeleteColumn(key);
  } else {
    column = {
      name: key,
      value: exports.createValue(value)
    };
  }

  return column;
};
