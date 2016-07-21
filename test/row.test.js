'use strict';

const expect = require('expect.js');
const kitx = require('kitx');

const client = require('./common');
const OTS = require('../lib/client');

describe('row', function () {
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

  it('putRow should ok', function* () {
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
      binary: new Buffer([0x01])
    };
    var response = yield client.putRow(name, condition, primaryKeys, columns);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);
  });

  it('getRow should ok', function* () {
    var name = 'metrics';
    var primaryKeys = {uid: 'test_uid'};
    var columns = ['test', 'integer', 'double', 'boolean', 'binary'];
    var response = yield client.getRow(name, primaryKeys, columns);
    expect(response).to.be.ok();
    expect(response.parsedRow).to.be.eql({
      'test': 'test_value',
      boolean: true,
      integer: {low: 1, high: 0, unsigned: false},
      double: 1.1,
      binary: new Buffer([0x01])
    });
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });

  it('updateRow with put should ok', function* () {
    const name = 'metrics';
    var condition = {
      row_existence: OTS.RowExistenceExpectation.IGNORE
    };
    var primaryKeys = {uid: 'test_uid'};
    var columns = {
      test: OTS.$put('test_value_replaced')
    };

    var response = yield client.updateRow(name, condition, primaryKeys, columns);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);

    response = yield client.getRow(name, primaryKeys, ['test']);
    expect(response).to.be.ok();
    expect(response.parsedRow).to.be.eql({'test': 'test_value_replaced'});
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });

  it('updateRow with delete should ok', function* () {
    const name = 'metrics';
    var condition = {
      row_existence: OTS.RowExistenceExpectation.IGNORE
    };
    var primaryKeys = {uid: 'test_uid'};
    var columns = {
      test: OTS.$delete()
    };

    var response = yield client.updateRow(name, condition, primaryKeys, columns);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);

    response = yield client.getRow(name, primaryKeys, ['uid', 'test']);
    expect(response).to.be.ok();
    expect(response.parsedRow).to.not.have.property('test');
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });

  it('deleteRow should ok', function* () {
    const name = 'metrics';
    var condition = {
      row_existence: OTS.RowExistenceExpectation.IGNORE
    };
    var primaryKeys = {uid: 'test_uid'};
    var response = yield client.deleteRow(name, condition, primaryKeys);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);

    var columns = ['test'];
    response = yield client.getRow(name, primaryKeys, columns);
    expect(response).to.be.ok();
    expect(response.parsedRow).to.be.eql(null);
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });
});
