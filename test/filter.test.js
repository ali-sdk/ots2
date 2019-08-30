'use strict';

// const expect = require('expect.js');
// const kitx = require('kitx');

// const client = require('./common');
const OTS = require('../');

describe('filter', function () {

  xit('makeFilter should ok', async function () {
    var filter = OTS.makeFilter('type == @type1 false true OR type == @type2 false true', {
      type1: 1,
      type2: 2
    });
  });

});
