'use strict';

var expect = require('expect.js');
var ots = require('../lib/client');

describe('ots', function () {
  it('should ok', function* () {
    var client = ots.createClient({
      accessKeyID: 'QpavStUJkTjCGixr',
      accessKeySecret: 'xxx',
      instance: 'testalinode',
      region: 'cn-hangzhou'
    });

    try {
      yield client.listTable();
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
      yield client.listTable();
    } catch (e) {
      expect(e.name).to.be('OTSAuthFailedError');
      expect(e.message).to.be('The AccessKeyID does not exist.');
      return;
    }
    expect(false).to.be.ok();
  });
});
