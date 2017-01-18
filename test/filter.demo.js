// BNF

// E = E OR E
// E = E AND E
// E = name == value ifMiss
// E = name != value ifMiss
// E = name > value ifMiss
// E = name >= value ifMiss
// E = name < value ifMiss
// E = name <= value ifMiss

// value = true | false
// value = [A-Za_z]*
// value = \d*
// value = \d+.\d+

'use strict';

var parse = require('../lib/filter').parse;

var OTS = require('../');

var locals = {
  name: OTS.createString('JacksonTian'),
  age: OTS.createInteger(18)
};
var condition = OTS.parse('name == @name true', locals);
console.log(JSON.stringify(condition, null, 2));

var condition = OTS.parse('name > @name true AND age <= @age false', locals);
console.log(JSON.stringify(condition, null, 2));
