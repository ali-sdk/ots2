'use strict';

var expect = require('expect.js');

var ots = require('../');

describe('client', function () {
  it('should ok', function* () {
    var client = ots.createClient({
      accessKeyID: 'QpavStUJkTjCGixrx',
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

  it('$ should ok', function () {
    var columns = ots.$({
      uid: 'test_uid',
      boolean: true,
      integer: 1,
      double: 1.1,
      binary: new Buffer([1]),
      infmin: ots.InfMin,
      infmax: ots.InfMax
    });

    expect(columns).to.eql([
      {name: 'uid', value: { type: 3, v_string: 'test_uid' }},
      {name: 'boolean', value: { type: 4, v_bool: true }},
      {name: 'integer', value: { type: 2, v_int: 1 }},
      {name: 'double', value: { type: 5, v_double: 1.1 }},
      {name: 'binary', value: { type: 6, v_binary: new Buffer([1]) }},
      {name: 'infmin', value: { type: 0 }},
      {name: 'infmax', value: { type: 1 }}
    ]);
  });

  it('$put should ok', function () {
    var columns = ots.$({
      put_string: ots.$put('string')
    });

    expect(columns).to.eql([
      {
        name: 'put_string',
        type: 1,
        value: {
          type: 3,
          v_string: 'string'
        }
      }
    ]);
  });

  it('$delete should ok', function () {
    var columns = ots.$({
      delete_string: ots.$delete()
    });

    expect(columns).to.eql([
      {
        name: 'delete_string',
        type: 2
      }
    ]);
  });
});
