'use strict';

var expect = require('expect.js');
var ots = require('../lib/client');
var client = require('./common');

describe('ots', function () {
  it('should ok', function* () {
    var client = ots.createClient({
      accessKeyID: 'QpavStUJkTjCGixr',
      accessKeySecret: 'xxx',
      instance: 'testalinode',
      region: 'cn-hangzhou'
    });

    try {
      yield* client.listTable();
    } catch (e) {
      expect(e.name).to.be('OTSAuthFailedError');
      expect(e.message).to.be('The AccessKeyID is disabled.');
      return;
    }
    expect(false).to.be.ok();
  });

  it('should ok with inexist id', function* () {
    var client = ots.createClient({
      accessKeyID: 'xxxxx',
      accessKeySecret: 'xxx',
      instance: 'testalinode',
      region: 'cn-hangzhou'
    });

    try {
      yield* client.listTable();
    } catch (e) {
      expect(e.name).to.be('OTSAuthFailedError');
      expect(e.message).to.be('The AccessKeyID does not exist.');
      return;
    }
    expect(false).to.be.ok();
  });

  it('should ok with tables', function* () {
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
});
