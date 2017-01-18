'use strict';

var expect = require('expect.js');
var client = require('./common');

describe('table', function () {
  it('createTable should ok', function* () {
    var keys = [{ 'name': 'uid', 'type': 'STRING' }];
    var capacityUnit = {read: 1, write: 1};
    var response = yield* client.createTable('metrics', keys, capacityUnit);
    expect(response).to.be.ok();
  });

  it('updateTable should ok', function* () {
    try {
      var capacityUnit = {read: 2, write: 1};
      var response = yield* client.updateTable('metrics', capacityUnit);
      expect(response).to.be.ok();
      expect(response.capacity_unit_details.capacity_unit.read).to.be(2);
      expect(response.capacity_unit_details.capacity_unit.write).to.be(1);
    } catch (e) {
      expect(e.name).to.be('OTSTooFrequentReservedThroughputAdjustmentError');
      expect(e.message).to.be('Reserved throughput adjustment is too frequent.');
      return;
    }
  });

  it('listTable should ok', function* () {
    var response = yield* client.listTable();
    expect(response.table_names).to.be.ok();
    expect(response.table_names.length).to.be.above(0);
  });

  it('describeTable should ok', function* () {
    var response = yield* client.describeTable('metrics');
    expect(response).to.be.ok();
    expect(response.table_meta.table_name).to.be('metrics');
    expect(response.reserved_throughput_details).to.be.ok();
  });

  it('deleteTable should ok', function* () {
    var response = yield* client.deleteTable('metrics');
    expect(response).to.be.ok();
  });
});
