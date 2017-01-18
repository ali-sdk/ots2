'use strict';

const path = require('path');
const fs = require('fs');

const peg = require('pegjs');

const specPath = path.join(__dirname, '../spec/filter.dsl');
const code = fs.readFileSync(specPath, 'utf8');

module.exports = peg.generate(code);
