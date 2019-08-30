'use strict';

const ots = require('../');

const {
  ACCESS_KEY_ID,
  ACCESS_KEY_SECRET,
  OTS_INSTANCE,
  OTS_ENDPOINT
} = process.env;

if (!ACCESS_KEY_ID || !ACCESS_KEY_SECRET || !OTS_INSTANCE || !OTS_ENDPOINT) {
  throw new Error(`Must set env variables ACCESS_KEY_ID, ACCESS_KEY_SECRET, OTS_INSTANCE, OTS_ENDPOINT for test`);
}

var options = {
  accessKeyID: ACCESS_KEY_ID,
  accessKeySecret: ACCESS_KEY_SECRET,
  instance: OTS_INSTANCE,
  endpoint: OTS_ENDPOINT
};

module.exports = ots.createClient(options);
