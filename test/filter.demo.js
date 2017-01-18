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

var parse = require('../lib/filter_parser').parse;

var tree = parse('name == @name true');
console.log(JSON.stringify(tree, null, 2));

var tree = parse('NOT name == @name true');
console.log(JSON.stringify(tree, null, 2));

var tree = parse('NOT NOT name == @name true');
console.log(JSON.stringify(tree, null, 2));

var tree = parse('name > @name true AND age <= @age false');
console.log(JSON.stringify(tree, null, 2));

var tree = parse('NOT name > @name true AND age <= @age false');
console.log(JSON.stringify(tree, null, 2));

var tree = parse('name > @name true AND age <= @age false AND gender == @gender true');
console.log(JSON.stringify(tree, null, 2));

var tree = parse('name > @name true OR age <= @age false AND gender == @gender true');
console.log(JSON.stringify(tree, null, 2));
