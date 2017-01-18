'use strict';

const expect = require('expect.js');
const kitx = require('kitx');

const client = require('./common');
const OTS = require('../lib/client');

describe('batch', function () {
  before(function* () {
    this.timeout(12000);
    var keys = [{ 'name': 'uid', 'type': 'STRING' }];
    var capacityUnit = {read: 5, write: 5};
    var response = yield client.createTable('metrics', keys, capacityUnit);
    expect(response).to.be.ok();
    yield kitx.sleep(5000);
  });

  after(function* () {
    var response = yield client.deleteTable('metrics');
    expect(response).to.be.ok();
  });

  it('batchWriteRow should ok', function* () {
    var tables = [
      {
        table_name: 'metrics',
        put_rows: [
          {
            condition: {
              row_existence: OTS.RowExistenceExpectation.IGNORE
            },
            primary_key: [
              OTS.createStringColumn('uid', 'test_uid')
            ],
            attribute_columns: [
              OTS.createStringColumn('test', 'test_value')
            ]
          }
        ],
        update_rows: []
      }
    ];
    var response = yield client.batchWriteRow(tables);
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
            primary_key: {uid: 'test_uid'}
          }
        ],
        columns_to_get: ['test']
      }
    ];
    var response = yield client.batchGetRow(tables);
    expect(response).to.be.ok();
    expect(response.tables.length).to.be.above(0);
    var table = response.tables[0];
    expect(table.table_name).to.be('metrics');
    expect(table.rows.length).to.be.above(0);
    var row = table.rows[0];
    expect(row.is_ok).to.be(true);
    expect(row.parsedRow).to.eql({ test: 'test_value' });
    expect(row.consumed.capacity_unit.read).to.be(1);
    expect(row.consumed.capacity_unit.write).to.be(0);
  });

  it('batchGetRow with filter should ok', function* () {
    var tables = [
      {
        table_name: 'metrics',
        rows: [
          {
            primary_key: {uid: 'test_uid'}
          }
        ],
        columns_to_get: ['test'],
        filter: OTS.makeFilter('test != @test false', {
          test: OTS.createString('test_value')
        })
      }
    ];
    var response = yield client.batchGetRow(tables);
    expect(response).to.be.ok();
    expect(response.tables.length).to.be.above(0);
    var table = response.tables[0];
    expect(table.table_name).to.be('metrics');
    expect(table.rows.length).to.be.above(0);
    var row = table.rows[0];
    expect(row.is_ok).to.be(true);
    expect(row.parsedRow).to.eql(null);
    expect(row.consumed.capacity_unit.read).to.be(1);
    expect(row.consumed.capacity_unit.write).to.be(0);
  });

  it('getRange should ok', function* () {
    var start = {
      uid: OTS.InfMin
    };
    var end = {
      uid: OTS.InfMax
    };

    var request = {
      table_name: 'metrics',
      direction: OTS.Direction.FORWARD,
      columns_to_get: ['test'],
      limit: 4,
      inclusive_start_primary_key: start,
      exclusive_end_primary_key: end
    };
    var response = yield client.getRange(request);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
    expect(response.rows.length).to.be.above(0);
    var row = response.rows[0];
    expect(row.parsedRow).to.eql({ test: 'test_value' });
  });

  it('getRange with filter should ok', function* () {
    var start = {
      uid: OTS.InfMin
    };
    var end = {
      uid: OTS.InfMax
    };

    var request = {
      table_name: 'metrics',
      direction: OTS.Direction.FORWARD,
      columns_to_get: ['test'],
      limit: 4,
      inclusive_start_primary_key: start,
      exclusive_end_primary_key: end,
      filter: OTS.makeFilter('test != @test false', {
        test: OTS.createString('test_value')
      })
    };
    var response = yield client.getRange(request);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
    expect(response.rows.length).to.be(0);
  });
});
