'use strict';

const expect = require('expect.js');
const kitx = require('kitx');

const client = require('./common');
const OTS = require('../');

const { serialize } = require('../lib/plainbuffer');

describe('row', function () {
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

  it('putRow should ok', async function () {
    var name = 'metrics';
    var condition = {
      row_existence: OTS.RowExistenceExpectation.IGNORE
    };
    var primaryKeys = {uid: 'test_uid'};
    var columns = {
      test: 'test_value',
      integer: 1,
      double: 1.1,
      boolean: true,
      binary: Buffer.from([0x01])
    };
    var row = serialize(primaryKeys, columns);

    var response = await client.putRow(name, condition, row);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);
  });

  it('getRow should ok', async function () {
    var name = 'metrics';
    var primaryKeys = {uid: 'test_uid'};
    var columns = ['test', 'integer', 'double', 'boolean', 'binary'];
    var row = serialize(primaryKeys);
    var response = await client.getRow(name, row, columns);
    expect(response).to.be.ok();
    expect(response.row).to.be.eql({
      uid: 'test_uid',
      test: 'test_value',
      boolean: true,
      integer: 1,
      double: 1.1,
      binary: Buffer.from([0x01])
    });
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });

  it('getRow with filter should ok', async function () {
    var name = 'metrics';
    var primaryKeys = {uid: 'test_uid'};
    var row = serialize(primaryKeys);
    var columns = ['test', 'integer', 'double', 'boolean', 'binary'];
    var filter = OTS.makeFilter('test == @test false true', {
      test: '!testvalue'
    });
    var response = await client.getRow(name, row, columns, {
      filter
    });
    expect(response).to.be.ok();
    expect(response.row).to.be.eql(null);
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });

  it('updateRow should ok', async function () {
    const name = 'metrics';
    var condition = {
      row_existence: OTS.RowExistenceExpectation.IGNORE
    };
    var primaryKeys = {
      uid: 'test_uid'
    };
    var columns = {
      test: 'test_value_replaced_origin'
    };

    var row = serialize(primaryKeys, columns);
    var response = await client.updateRow(name, row, condition);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);

    response = await client.getRow(name, serialize(primaryKeys), ['test']);
    expect(response).to.be.ok();
    expect(response.row).to.be.eql({
      'test': 'test_value_replaced_origin',
      'uid': 'test_uid'
    });
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });

  it('updateRow with $put should ok', async function () {
    const name = 'metrics';
    var condition = {
      row_existence: OTS.RowExistenceExpectation.IGNORE
    };
    var primaryKeys = {
      uid: 'test_uid'
    };
    var columns = {
      test: OTS.$put('test_value_replaced_put')
    };

    var row = serialize(primaryKeys, columns);
    var response = await client.updateRow(name, row, condition);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);

    response = await client.getRow(name, serialize(primaryKeys), ['test']);
    expect(response).to.be.ok();
    expect(response.row).to.be.eql({
      'test': 'test_value_replaced_put',
      'uid': 'test_uid'
    });
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });

  xit('updateRow with delete should ok', async function () {
    const name = 'metrics';
    var condition = {
      row_existence: OTS.RowExistenceExpectation.IGNORE
    };
    var primaryKeys = {
      uid: 'test_uid'
    };
    var columns = {
      test: OTS.$delete(Date.now())
    };
    var row = serialize(primaryKeys, columns);
    var response = await client.updateRow(name, row, condition, columns);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);
    response = await client.getRow(name, serialize(primaryKeys), ['uid', 'test']);
    expect(response).to.be.ok();
    expect(response.row).to.not.have.property('test');
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });

  it('updateRow with deleteAll should ok', async function () {
    const name = 'metrics';
    var condition = {
      row_existence: OTS.RowExistenceExpectation.IGNORE
    };
    var primaryKeys = {
      uid: 'test_uid'
    };
    var columns = {
      test: OTS.$deleteAll()
    };
    var row = serialize(primaryKeys, columns);
    var response = await client.updateRow(name, row, condition, columns);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);
    response = await client.getRow(name, serialize(primaryKeys), ['uid', 'test']);
    expect(response).to.be.ok();
    expect(response.row).to.not.have.property('test');
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });

  it('deleteRow should ok', async function () {
    const name = 'metrics';
    var condition = {
      row_existence: OTS.RowExistenceExpectation.IGNORE
    };
    var primaryKeys = {uid: 'test_uid'};
    var row = serialize(primaryKeys, null, true);
    var response = await client.deleteRow(name, row, condition);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);

    var columns = ['test'];
    response = await client.getRow(name, serialize(primaryKeys), columns);
    expect(response).to.be.ok();
    expect(response.row).to.be.eql(null);
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });
});
