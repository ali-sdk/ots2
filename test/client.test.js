'use strict';

var expect = require('expect.js');

var ots = require('../lib/client');

describe('client', function () {
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
      expect(e.message).to.be('Signature mismatch.');
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

  it('createInteger should ok', function () {
    var value = ots.createInteger(1);
    expect(value).to.eql({ type: 2, v_int: 1 });
  });

  it('createString should ok', function () {
    var value = ots.createString('hi');
    expect(value).to.eql({ type: 3, v_string: 'hi' });
  });

  it('createBoolean should ok', function () {
    var value = ots.createBoolean(true);
    expect(value).to.eql({ type: 4, v_bool: true });
  });

  it('createDouble should ok', function () {
    var value = ots.createDouble(1.2);
    expect(value).to.eql({ type: 5, v_double: 1.2 });
  });

  it('createBinary should ok', function () {
    var value = ots.createBinary(1);
    expect(value).to.eql({ type: 6, v_binary: 1 });
  });
});
