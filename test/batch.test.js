'use strict';

var expect = require('expect.js');
var client = require('./common');
var OTS = require('../lib/client');
var ots2 = require('../lib/ots2');

var sleep = function (ms) {
  return new Promise(function (fulfill, reject) {
    setTimeout(function () {
      fulfill();
    }, ms);
  });
};

describe('batch', function () {
  before(function* () {
    this.timeout(12000);
    var keys = [{ 'name': 'uid', 'type': 'STRING' }];
    var capacityUnit = {read: 5, write: 5};
    var response = yield* client.createTable('metrics', keys, capacityUnit);
    expect(response).to.be.ok();
    yield sleep(5000);
  });

  after(function* () {
    var response = yield* client.deleteTable('metrics');
    expect(response).to.be.ok();
  });

  it('batchWriteRow should ok', function* () {
    var tables = [
      {
        table_name: 'metrics',
        put_rows: [
          {
            condition: {
              row_existence: ots2.RowExistenceExpectation.IGNORE
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
    expect(response).to.be.ok();
    expect(response.tables.length).to.be.above(0);
    var table = response.tables[0];
    expect(table.table_name).to.be('metrics');
    expect(table.put_rows.length).to.be.above(0);
    var row = table.put_rows[0];
    expect(row.is_ok).to.be(true);
    expect(row.consumed.capacity_unit.read).to.be(0);
    expect(row.consumed.capacity_unit.write).to.be(1);
  });

  it('batchGetRow should ok', function* () {
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
    expect(response).to.be.ok();
    expect(response.tables.length).to.be.above(0);
    var table = response.tables[0];
    expect(table.table_name).to.be('metrics');
    expect(table.rows.length).to.be.above(0);
    var row = table.rows[0];
    expect(row.is_ok).to.be(true);
    expect(row.parsedRow).to.be({ test: 'test_value' });
    expect(row.consumed.capacity_unit.read).to.be(1);
    expect(row.consumed.capacity_unit.write).to.be(0);
  });
});
