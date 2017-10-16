'use strict';

const expect = require('expect.js');

const ots2 = require('../lib/ots2');

function getBuffer(bytebuff) {
  var {
    offset, limit, buffer
  } = bytebuff;
  return buffer.slice(offset, offset + limit);
}

describe('encode', function () {
  it('CapacityUnit', function () {
    var capacityUnit = {read: 5, write: 5};
    var bytebuff = ots2.CapacityUnit.encode(capacityUnit);
    expect(getBuffer(bytebuff)).to.be.eql([
      0x08, 0x05, 0x10, 0x05
    ]);
  });

  it('should encode ok', function () {
    var primaryKeys = [{ 'name': 'uid', 'type': 'STRING' }];
    var capacityUnit = {read: 5, write: 5};
    var name = 'metrics';

    var request = {
      table_meta: {
        table_name: name,
        primary_key: primaryKeys
      },
      reserved_throughput: {
        capacity_unit: capacityUnit
      }
    };

    var bytebuff = ots2.CreateTableRequest.encode(request);
    expect(getBuffer(bytebuff)).to.have.length(28);
    expect(Buffer.from(JSON.stringify(request))).to.have.length(147);
  });

  it('enum', function () {
    var primaryKeySchema = { 'name': 'uid', 'type': 'STRING' };
    var bytebuff = ots2.PrimaryKeySchema.encode(primaryKeySchema);
    var schema = ots2.PrimaryKeySchema.decode(bytebuff);
    expect(schema).to.have.property('name', 'uid');
    expect(schema).to.have.property('type', ots2.PrimaryKeySchema.STRING);
  });
});
