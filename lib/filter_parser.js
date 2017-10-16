'use strict';

const path = require('path');
const fs = require('fs');

const peg = require('pegjs');

const specPath = path.join(__dirname, '../spec/filter.dsl');
const code = fs.readFileSync(specPath, 'utf8');

const parser = peg.generate(code);

exports.parse = function (source) {
  try {
    return parser.parse(source);
  } catch (ex) {
    console.log(source);
    var {start, end} = ex.location;
    console.log(' '.repeat(start.offset) + '^'.repeat(end.offset - start.offset));
    throw ex;
  }
};
