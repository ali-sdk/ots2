'use strict';

const expect = require('expect.js');
const kitx = require('kitx');

const client = require('./common');
const OTS = require('../');

const { serialize } = require('../lib/plainbuffer');

describe('batch', function () {
  before(async function () {
    this.timeout(12000);
    var keys = [{ 'name': 'uid', 'type': 'STRING' }];
    var capacityUnit = {read: 1, write: 1};
    var options = {
      table_options: {
        time_to_live: -1,// 数据的过期时间, 单位秒, -1代表永不过期. 假如设置过期时间为一年, 即为 365 * 24 * 3600.
        max_versions: 1
      }
    };
    var response = await client.createTable('metrics', keys, capacityUnit, options);
    expect(response).to.be.ok();
    await kitx.sleep(5000);
  });

  after(async function () {
    var response = await client.deleteTable('metrics');
    expect(response).to.be.ok();
  });

  it('batchWriteRow should ok', async function () {
    var tables = [
      {
        table_name: 'metrics',
        rows: [
          {
            type: OTS.OperationType.PUT,
            condition: {
              row_existence: OTS.RowExistenceExpectation.IGNORE
            },
            row_change: serialize({
              uid: 'test_uid'
            }, {
              test: 'test_value'
            }),
            return_content: null
          }
        ]
      }
    ];
    var response = await client.batchWriteRow(tables);
    expect(response).to.be.ok();
    expect(response.tables.length).to.be.above(0);
    var table = response.tables[0];
    expect(table.table_name).to.be('metrics');
    expect(table.rows.length).to.be.above(0);
    var row = table.rows[0];
    expect(row.is_ok).to.be(true);
    expect(row.consumed.capacity_unit.read).to.be(0);
    expect(row.consumed.capacity_unit.write).to.be(1);
  });

  it('batchWriteRow delete_rows should ok', async function () {
    var tables = [
      {
        table_name: 'metrics',
        rows: [
          {
            type: OTS.OperationType.DELETE,
            row_change: serialize({
              uid: 'test-uid'
            }, null, true),
            condition: {
              row_existence: OTS.RowExistenceExpectation.IGNORE
            }
          }
        ]
      }
    ];
    var response = await client.batchWriteRow(tables);
    expect(response).to.be.ok();
    expect(response.tables.length).to.be.above(0);
    var table = response.tables[0];
    expect(table.table_name).to.be('metrics');
    expect(table.rows.length).to.be.above(0);
    var row = table.rows[0];
    expect(row.is_ok).to.be(true);
    expect(row.consumed.capacity_unit.read).to.be(0);
    expect(row.consumed.capacity_unit.write).to.be(1);
  });

  it('batchGetRow should ok', async function () {
    var tables = [
      {
        table_name: 'metrics',
        primary_key: [
          serialize({uid: 'test_uid'})
        ],
        columns_to_get: ['test'],
        max_versions: 1
      }
    ];
    var response = await client.batchGetRow(tables);
    expect(response).to.be.ok();
    expect(response.tables.length).to.be.above(0);
    var table = response.tables[0];
    expect(table.table_name).to.be('metrics');
    expect(table.rows.length).to.be.above(0);
    var row = table.rows[0];
    expect(row.is_ok).to.be(true);
    expect(row.row).to.eql({
      uid: 'test_uid',
      test: 'test_value'
    });
    expect(row.consumed.capacity_unit.read).to.be(1);
    expect(row.consumed.capacity_unit.write).to.be(0);
  });

  it('batchGetRow with filter should ok', async function () {
    var tables = [
      {
        table_name: 'metrics',
        primary_key: [
          serialize({uid: 'test_uid'})
        ],
        columns_to_get: ['test'],
        max_versions: 1,
        filter: OTS.makeFilter('test != @test false true', {
          test: 'test_value'
        })
      }
    ];
    var response = await client.batchGetRow(tables);
    expect(response).to.be.ok();
    expect(response.tables.length).to.be.above(0);
    var table = response.tables[0];
    expect(table.table_name).to.be('metrics');
    expect(table.rows.length).to.be.above(0);
    var row = table.rows[0];
    expect(row.is_ok).to.be(true);
    expect(row.row).to.eql(null);
    expect(row.consumed.capacity_unit.read).to.be(1);
    expect(row.consumed.capacity_unit.write).to.be(0);
  });

  it('getRange should ok', async function () {
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
      max_versions: 1,
      limit: 4,
      inclusive_start_primary_key: start,
      exclusive_end_primary_key: end
    };
    var response = await client.getRange(request);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
    expect(response.rows.length).to.be.above(0);
    var row = response.rows[0];
    expect(row).to.eql({ uid: 'test_uid', test: 'test_value' });
  });

  it('getRange with filter should ok', async function () {
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
      max_versions: 1,
      inclusive_start_primary_key: start,
      exclusive_end_primary_key: end,
      filter: OTS.makeFilter('test != @test false true', {
        test: 'test_value'
      })
    };
    var response = await client.getRange(request);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
    expect(response.rows.length).to.be(0);
  });
});
