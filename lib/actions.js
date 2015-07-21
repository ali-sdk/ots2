'use strict';

exports.listTable = function * () {
  return yield * this.request('ListTable', {});
};

exports.describeTable = function * (name) {
  return yield * this.request('DescribeTable', {
    table_name: name
  });
};

exports.deleteTable = function * (name) {
  return yield * this.request('DeleteTable', {
    table_name: name
  });
};
