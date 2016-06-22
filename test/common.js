'use strict';

var ots = require('../lib/client');

var options = {
  accessKeyID: '<YOUR ACCESSKEYID>',
  accessKeySecret: '<YOUR ACCESSKEYSECRET>',
  instance: '<YOUR INSTANCE>',
  region: '<YOUR REGION>'
};

try { // 覆盖
  options = require('./config');
} catch (ex) {

}

module.exports = ots.createClient(options);
