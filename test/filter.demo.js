// BNF

// E = E OR E
// E = E AND E
// E = NOT E
// E = e
// e = name operator value ifMiss

// name = [A-Za-z_] + [A-Za-z_\d]*
// operator = == | != | > | >= | < | <=
// value = @ + [A-Za-z_] + [A-Za-z_\d]*
// ifMiss = true | false

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
