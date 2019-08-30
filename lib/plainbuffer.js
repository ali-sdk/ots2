'use strict';

const crc8Int8 = require('./crc8').crc8Int8;
const crc8Bytes = require('./crc8').crc8Bytes;
const Long = require('long');

// 各个const字段的值: 各个Tag的值(除header外，类型int8_t):
const Tag = {
  'HEADER': 0x75, // 4 byte
  'PK': 0x01, // 1 byte
  'ATTR': 0x02,
  'CELL': 0x03,
  'CELL_NAME': 0x04,
  'CELL_VALUE': 0x05,
  'CELL_OP': 0x06,
  'CELL_TS': 0x07,
  'DELETE_MARKER': 0x08,
  'ROW_CHECKSUM': 0x09,
  'CELL_CHECKSUM': 0x0A
};
exports.Tag = Tag;

//各个COLUMN VALUE的Type定义(与SQLVariant保持兼容）:
const ColumnType = {
  'VT_INTEGER': 0x0,
  'VT_DOUBLE': 0x1,
  'VT_BOOLEAN': 0x2,
  'VT_STRING': 0x3,
  'VT_NULL': 0x6,
  'VT_BLOB': 0x7,
  'VT_INF_MIN': 0x9,
  'VT_INF_MAX': 0xa,
  'VT_AUTO_INCREMENT': 0xb
};
exports.ColumnType = ColumnType;

var types = {
  'STRING': 'String',
  'BLOB': 'Blob',
  'BOOLEAN': 'Boolean',
  'NULL': 'Null',
  'DOUBLE': 'Double',
  'INTEGER': 'Integer',
  'INF_MIN': 'InfMin',
  'INF_MAX': 'InfMax',
  'AUTO_INCREMENT': 'AutoIncrement'
};

var getColumnValue = function(type) {
  var rawType = '';
  switch (type) {
  case types.INTEGER:
    rawType = ColumnType.VT_INTEGER;
    break;
  case types.DOUBLE:
    rawType = ColumnType.VT_DOUBLE;
    break;
  case types.BOOLEAN:
    rawType = ColumnType.VT_BOOLEAN;
    break;
  case types.STRING:
    rawType = ColumnType.VT_STRING;
    break;
  case types.NULL:
    rawType = ColumnType.VT_NULL;
    break;
  case types.BLOB:
    rawType = ColumnType.VT_BLOB;
    break;
  case types.INF_MIN:
    rawType = ColumnType.VT_INF_MIN;
    break;
  case types.INF_MAX:
    rawType = ColumnType.VT_INF_MAX;
    break;
  case types.AUTO_INCREMENT:
    rawType = ColumnType.VT_AUTO_INCREMENT;
    break;
  default:
    throw new Error('unknown type:' + type);
  }

  return rawType;
};

/**
 * 生成不同类型的Column
 *
 * Example:
 * ```
 * ots.StringColumn('name', 'value');
 * ots.BlobColumn('name', [0,1]);
 * ots.NullColumn('name');
 * ots.BooleanColumn('name', true);
 * ots.DoubleColumn('name', 1.1);
 * ots.IntegerColumn('name', 10);
 * ots.InfMinColumn('name');
 * ots.InfMaxColumn('name');
 * ```
 * @name createXXXColumn
 * @param {String} name column name
 * @param {MIX} value column value
 */
Object.keys(types).forEach(function(key) {
  var shortName = types[key] + 'Column';
  exports[shortName] = function(name, value) {
    return {
      name: name,
      type: getColumnValue(types[key]),
      value: value
    };
  };
});

//各个TAG_CELL_OP_TYPE的Type定义（只保存DeleteCell相关操作，row操作放在跟PlainBuffer平级的PB对象中（如果是deleterow，那么mark也是encode的）]
const TagCellOpType = {
  'DELETE_ALL_VERSION': 0x1,
  'DELETE_ONE_VERSION': 0x3
};
exports.TagCellOpType = TagCellOpType;

exports.PutColumn = function (name, value) {
  var type;
  if (typeof value === 'string') {
    type = types.STRING;
  } else if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      type = types.INTEGER;
    } else {
      type = types.DOUBLE;
    }
  } else if (Buffer.isBuffer(value)) {
    type = types.BLOB;
  } else if (typeof value === 'undefined' || value === null) {
    // ignore null value
    // columns.push(exports.NullColumn(key, value));
  } else if (value === true || value === false) {
    type = types.BOOLEAN;
  }

  return {
    name: name,
    type: getColumnValue(type),
    value: value
  };
};

exports.DeleteColumn = function (name, timestamp) {
  return {
    name: name,
    ts: timestamp,
    op: TagCellOpType.DELETE_ONE_VERSION
  };
};

exports.DeleteAllColumn = function (name, ts) {
  return {
    name: name,
    op: TagCellOpType.DELETE_ALL_VERSION
  };
};

exports.InfMin = Symbol('InfMin');
exports.InfMax = Symbol('InfMax');

const Header = {
  LITTLE_ENDIAN_32_SIZE: 4,
  LITTLE_ENDIAN_64_SIZE: 8
};
exports.Header = Header;

class Row {
  constructor(pk, attr, deleteMarker) {
    this.pk = pk;
    this.attr = attr;
    this.deleteMarker = deleteMarker;
  }

  toBytes() {
    var buffs = [];
    var checksum = 0x00;
    // row = ( pk [attr] | [pk] attr | pk attr ) [tag_delete_marker] row_checksum;

    // pk
    if (this.pk) {
      buffs.push(this.pk.toBytes());
      checksum = this.pk.getChecksum(checksum);
    }

    // attr
    if (this.attr) {
      buffs.push(this.attr.toBytes());
      checksum = this.attr.getChecksum(checksum);
    }

    // tag_delete_marker
    var del = 0x00;
    if (typeof this.deleteMarker !== 'undefined') {
      buffs.push(Buffer.from([Tag.DELETE_MARKER]));
      del = 0x01;
    }

    // 没有deleteMarker, 要与0x0做crc.
    checksum = crc8Int8(checksum, del);

    // row_checksum = tag_row_checksum row_crc8
    buffs.push(Buffer.from([Tag.ROW_CHECKSUM, checksum]));

    return Buffer.concat(buffs);
  }
}

var Value = function(type, value) {
  this.type = type;
  this.value = value;
};

Value.prototype.toBytes = function() {
  // formated_value = value_type value_len value_data
  var type = Buffer.from([this.type]);
  var buffs = [];
  switch (this.type) {
  case ColumnType.VT_INTEGER:
    buffs.push(type);
    var buf = Buffer.alloc(8);
    var val = Long.fromNumber(this.value);
    buf.writeInt32LE(val.low, 0);
    buf.writeInt32LE(val.high, 4);
    buffs.push(buf);
    break;
  case ColumnType.VT_DOUBLE:
    buffs.push(type);
    var buf = Buffer.alloc(Header.LITTLE_ENDIAN_64_SIZE);
    buf.writeDoubleLE(this.value, 0);
    buffs.push(buf);
    break;
  case ColumnType.VT_BOOLEAN:
    buffs.push(type);
    buffs.push(Buffer.from([(this.value ? 1 : 0)]));
    break;
  case ColumnType.VT_STRING:
    var valueLength = Buffer.alloc(Header.LITTLE_ENDIAN_32_SIZE);
    var value = Buffer.from('' + this.value);
    valueLength.writeInt32LE(value.length, 0);

    buffs.push(type);
    buffs.push(valueLength);
    buffs.push(value);
    break;
  case ColumnType.VT_NULL:
    break;
  case ColumnType.VT_BLOB:
    buffs.push(type);
    var buf = Buffer.alloc(Header.LITTLE_ENDIAN_32_SIZE);
    buf.writeInt32LE(this.value.length, 0);
    buffs.push(buf);
    buffs.push(this.value);
    break;
  case ColumnType.VT_INF_MIN:
  case ColumnType.VT_INF_MAX:
    buffs.push(type);
    break;
  }

  return Buffer.concat(buffs);
};

exports.Value = Value;

class Cells {
  constructor(tag, cells) {
    this.tag = Buffer.from([tag]);
    this.cells = cells;
  }

  toBytes() {
    // attr = tag_attr cell1 [cell_2] [cell_3]
    var buffs = [];

    if (this.cells.length) {
      buffs.push(this.tag);

      for (var i = 0; i < this.cells.length; i++) {
        var cell = this.cells[i];
        buffs.push(cell.toBytes());
      }
    }

    return Buffer.concat(buffs);
  }

  getChecksum(checksum) {
    for (var i = 0; i < this.cells.length; i++) {
      var cell = this.cells[i];
      checksum = crc8Int8(checksum, cell.checksum);
    }

    return checksum;
  }
}

class PK extends Cells {
  constructor(cells) {
    super(Tag.PK, cells);
  }
}

class Attr extends Cells {
  constructor(cells) {
    super(Tag.ATTR, cells);
  }
}

class Cell {
  constructor(cell) {
    this.name = cell.name;
    this.type = cell.type;
    this.value = cell.value;
    this.op = cell.op;
    this.ts = cell.ts;
    this.checksum = null;
  }

  toBytes() {
    // cell = tag_cell cell_name [cell_value] [cell_op] [cell_ts] cell_checksum
    var checksum = 0x00;
    // tag_cell
    var buffs = [
      Buffer.from([Tag.CELL])
    ];

    // cell_name = tag_cell_name formated_value
    // tag_cell_name
    buffs.push(Buffer.from([Tag.CELL_NAME]));
    // formated_value for name
    // value_len value_data
    var len = Buffer.alloc(Header.LITTLE_ENDIAN_32_SIZE);
    var cellName = Buffer.from(this.name);
    len.writeInt32LE(cellName.length, 0);

    buffs.push(len);
    buffs.push(cellName);

    checksum = crc8Bytes(checksum, cellName);

    // cell_value = tag_cell_value formated_value
    if (typeof this.value !== 'undefined' ||
      this.type === ColumnType.VT_INF_MAX ||
      this.type === ColumnType.VT_INF_MIN) {
      // tag_cell_value
      buffs.push(Buffer.from([Tag.CELL_VALUE]));
      // formated_value
      var cellValue = new Value(this.type, this.value).toBytes();
      // cell value length
      var totalLength = Buffer.alloc(Header.LITTLE_ENDIAN_32_SIZE);
      totalLength.writeInt32LE(cellValue.length);

      buffs.push(totalLength);
      buffs.push(cellValue);
      checksum = crc8Bytes(checksum, cellValue);
    }

    // cell_op = tag_cell_op  cell_op_value
    if (this.op) {
      // delete_all_version = 0x01 (1byte)
      // delete_one_version = 0x03 (1byte)
      buffs.push(Buffer.from([
        Tag.CELL_OP, // tag_cell_op
        this.op // cell_op_value
      ]));
    }

    // cell_ts = tag_cell_ts cell_ts_value
    if (this.ts) {
      // tag_cell_ts
      buffs.push(Buffer.from([Tag.CELL_TS]));
      // cell_ts_value
      var buff = Buffer.alloc(8);
      var val = Long.fromNumber(this.ts);
      buff.writeInt32LE(val.low, 0);
      buff.writeInt32LE(val.high, 4);
      buffs.push(buff);
      checksum = crc8Bytes(checksum, buff);
    }

    // 先算 ts 再算 op 的 checksum
    if (this.op) {
      checksum = crc8Int8(checksum, this.op);
    }

    // cell_checksum = tag_cell_checksum row_crc8
    buffs.push(Buffer.from([Tag.CELL_CHECKSUM, checksum]));

    this.checksum = checksum;

    return Buffer.concat(buffs);
  }
}

const TagHeader = Buffer.from([
  Tag.HEADER, 0x00, 0x00, 0x00
]);

class PlainBuffer {
  constructor(rows) {
    // 小端
    this.tag_header = TagHeader;
    this.rows = rows;
  }

  toBytes() {
    // plainbuffer = tag_header row1 [row2] [row3]
    var buffs = [];

    // tag_header
    buffs.push(this.tag_header);

    // rows
    for (var i = 0; i < this.rows.length; i++) {
      var row = this.rows[i];
      buffs.push(row.toBytes());
    }

    return Buffer.concat(buffs);
  }
}

var createRow = function(primaryKeys, columns, deleteMarker) {
  var pk;
  if (primaryKeys && Object.keys(primaryKeys).length > 0) {
    let cells = exports.$(primaryKeys).map(function(item) {
      return new Cell(item);
    });
    pk = new PK(cells);
  }

  var attr;
  if (columns && Object.keys(columns).length > 0) {
    let cells = exports.$(columns).map(function(item) {
      return new Cell(item);
    });
    attr = new Attr(cells);
  }

  return new Row(pk, attr, deleteMarker);
};

exports.serializeRows = function(list) {
  if (!list.length) {
    return undefined;
  }

  return list.map(function(item) {
    return exports.serialize(item.primaryKeys, item.columns, item.deleteMarker);
  });
};

var readString = function(buff, index, len) {
  return buff.slice(index, index + len).toString();
};

var readName = function(buff, index) {
  var len = buff.readInt32LE(index);
  index += 4;
  var name = readString(buff, index, len);
  index += len;
  return {
    name: name,
    index: index
  };
};

var readValue = function(buff, index, cell) {
  var len = buff.readInt32LE(index);
  index += 4;
  var type = buff.readInt8(index);
  cell.type = type;
  index++;
  if (type === ColumnType.VT_STRING) {
    let len = buff.readInt32LE(index);
    index += 4;
    cell.value = readString(buff, index, len);
    index += len;
  } else if (type === ColumnType.VT_INTEGER) {
    var low = buff.readInt32LE(index);
    var high = buff.readInt32LE(index + 4);
    cell.value = Long.fromBits(low, high).toNumber();
    index += 8;
  } else if (type === ColumnType.VT_DOUBLE) {
    cell.value = buff.readDoubleLE(index);
    index += 8;
  } else if (type === ColumnType.VT_BLOB) {
    let len = buff.readInt32LE(index);
    index += 4;
    cell.value = buff.slice(index, index + len);
    index += len;
  } else if (type === ColumnType.VT_BOOLEAN) {
    let val = buff.readInt8(index);
    index++;
    cell.value = val === 0x01;
  }

  return {
    index: index
  };
};

var readCell = function(buff, index) {
  var cell = new Cell({});
  var tag = buff.readInt8(index);
  if (tag === Tag.CELL_NAME) {
    index++;
    var result = readName(buff, index);
    cell.name = result.name;
    index = result.index;
    tag = buff.readInt8(index);

    if (tag === Tag.CELL_VALUE) {
      index++;
      result = readValue(buff, index, cell);
      index = result.index;
      tag = buff.readInt8(index);
    }

    if (tag === Tag.CELL_OP) {
      index++;
      // TODO
      tag = buff.readInt8(index);
    }

    if (tag === Tag.CELL_TS) {
      index++;
      var low = buff.readInt32LE(index);
      var high = buff.readInt32LE(index + 4);
      cell.ts = Long.fromBits(low, high).toNumber();
      index += 8;
      tag = buff.readInt8(index);
    }

    if (tag === Tag.CELL_CHECKSUM) {
      index++;
      cell.checksum = buff.readUInt8(index);
      index++;
    }
  }

  return {
    cell: cell,
    index: index
  };
};

var readCells = function(buff, index) {
  var cells = [];
  while (buff.readInt8(index) === Tag.CELL) {
    index++;
    var result = readCell(buff, index);
    cells.push(result.cell);
    index = result.index;
  }

  return {
    cells: cells,
    index: index
  };
};

var readRow = function(buff, index) {
  var row = {
    primaryKeys: [],
    columns: []
  };
  // read row
  var tag = buff.readInt8(index);

  if (tag === Tag.PK) {
    index++;
    let result = readCells(buff, index);
    row.primaryKeys = result.cells;
    index = result.index;
    tag = buff.readInt8(index);
  }

  if (tag === Tag.ATTR) {
    index++;
    let result = readCells(buff, index);
    row.columns = result.cells;
    index = result.index;
    tag = buff.readInt8(index);
  }

  if (tag === Tag.DELETE_MARKER) {
    index++;
    tag = buff.readInt8(index);
  }

  if (tag === Tag.ROW_CHECKSUM) {
    index++;
    row.checksum = buff.readUInt8(index);
    index++;
  }

  return {
    row: row,
    index: index
  };
};

var flatten = function(row) {
  var obj = {};
  if (row.primaryKeys) {
    for (let i = 0; i < row.primaryKeys.length; i++) {
      let cell = row.primaryKeys[i];
      obj[cell.name] = cell.value;
    }
  }

  if (row.columns) {
    for (let i = 0; i < row.columns.length; i++) {
      let cell = row.columns[i];
      obj[cell.name] = cell.value;
    }
  }

  return obj;
};

var readRows = function(buff, index) {
  var rows = [];

  var result;

  while (index < buff.length) {
    result = readRow(buff, index);
    rows.push(flatten(result.row));
    index = result.index;
  }

  return rows;
};

/**
 * 反序列化行
 * @param row
 * @returns {Buffer|*}
 */
exports.deserialize = function(bytes) {
  if (!bytes) {
    return bytes;
  }

  var buff = bytes.buffer.slice(bytes.offset, bytes.limit);

  // nothing
  if (buff.length === 0) {
    return [];
  }

  var tag = buff.readInt32LE(0); //read tag
  if (tag !== Tag.HEADER) {
    throw Error('No Header');
  }

  var index = 4;

  return readRows(buff, index);
};

const PUT = Symbol('PUT');
const DELETE = Symbol('DELETE');
const DELETE_ALL = Symbol('DELETE_ALL');

/**
 * flatten Object to Columns
 *
 * @param {Object} obj 对象
 */
exports.$ = function(obj) {
  var keys = Object.keys(obj);
  var columns = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = obj[key];

    if (typeof value === 'string') {
      columns.push(exports.StringColumn(key, value));
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        columns.push(exports.IntegerColumn(key, value));
      } else {
        columns.push(exports.DoubleColumn(key, value));
      }
    } else if (Buffer.isBuffer(value)) {
      columns.push(exports.BlobColumn(key, value));
    } else if (typeof value === 'undefined' || value === null) {
      // ignore null value
      // columns.push(exports.NullColumn(key, value));
    } else if (value === true || value === false) {
      columns.push(exports.BooleanColumn(key, value));
    } else if (value === exports.InfMin) {
      columns.push(exports.InfMinColumn(key));
    } else if (value === exports.InfMax) {
      columns.push(exports.InfMaxColumn(key));
    } else if (value && value.type === PUT) {
      columns.push(exports.PutColumn(key, value.value));
    } else if (value && value.type === DELETE) {
      columns.push(exports.DeleteColumn(key, value.timestamp));
    } else if (value && value.type === DELETE_ALL) {
      columns.push(exports.DeleteAllColumn(key));
    } else {
      throw new TypeError(`unknown value type ${typeof value}`);
    }
  }

  return columns;
};

exports.newValue = function (value) {
  var type;
  if (typeof value === 'string') {
    type = types.STRING;
  } else if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      type = types.INTEGER;
    } else {
      type = types.DOUBLE;
    }
  } else if (Buffer.isBuffer(value)) {
    type = types.BLOB;
  } else if (typeof value === 'undefined' || value === null) {
    // ignore null value
    // columns.push(exports.NullColumn(key, value));
  } else if (value === true || value === false) {
    type = types.BOOLEAN;
  } else {
    throw new TypeError('unsupported type');
  }

  return new Value(getColumnValue(type), value);
};

/**
 * 行序列化
 * @param row
 * @returns {number}
 */
exports.serialize = function(primaryKeys, columns, deleteMarker) {
  if (!primaryKeys && !columns) {
    throw new Error('Must have primary keys or attr keys');
  }

  var row = createRow(primaryKeys, columns, deleteMarker);

  var buffer = new PlainBuffer([row]);

  return buffer.toBytes();
};

exports.PUT = PUT;
exports.DELETE = DELETE;
exports.DELETE_ALL = DELETE_ALL;
