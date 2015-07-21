'use strict';

var expect = require('expect.js');
var client = require('./common');
var ots2 = require('../lib/ots2');

var sleep = function (ms) {
  return new Promise(function (fulfill, reject) {
    setTimeout(function () {
      fulfill();
    }, ms);
  });
};

describe('row', function () {
  before(function* () {
    this.timeout(12000);
    var keys = [{ 'name': 'uid', 'type': 'STRING' }];
    var capacityUnit = {read: 1, write: 1};
    var response = yield* client.createTable('metrics', keys, capacityUnit);
    expect(response).to.be.ok();
    yield sleep(5000);
  });

  after(function* () {
    var response = yield* client.deleteTable('metrics');
    expect(response).to.be.ok();
  });

  it('putRow should ok', function* () {
    var name = 'metrics';
    var condition = {
      row_existence: ots2.RowExistenceExpectation.IGNORE
    };
    var primaryKeys = [
      {
        name: 'uid',
        value: {
          type: ots2.ColumnType.STRING,
          v_string: "test_uid"
        }
      }
    ];
    var columns = [
      {
        name: 'test',
        value: {
          type: ots2.ColumnType.STRING,
          v_string: "test_value"
        }
      }
    ];
    var response = yield* client.putRow(name, condition, primaryKeys, columns);
    expect(response).to.be.ok();
    expect(response.consumed.capacity_unit.read).to.be(0);
    expect(response.consumed.capacity_unit.write).to.be(1);
  });

  it('getRow should ok', function* () {
    var name = 'metrics';
    var primaryKeys = [
      {
        name: 'uid',
        value: {
          type: ots2.ColumnType.STRING,
          v_string: "test_uid"
        }
      }
    ];
    var columns = ['test'];
    var response = yield* client.getRow(name, primaryKeys, columns);
    expect(response).to.be.ok();
    expect(response.parsedRow).to.be.eql({'test': 'test_value'});
    expect(response.consumed.capacity_unit.read).to.be(1);
    expect(response.consumed.capacity_unit.write).to.be(0);
  });
});
