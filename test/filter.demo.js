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

var tree = parse('name == @name true true');
console.log(JSON.stringify(tree, null, 2));

var tree = parse('NOT name == @name true true');
console.log(JSON.stringify(tree, null, 2));

var tree = parse('NOT NOT name == @name true true');
console.log(JSON.stringify(tree, null, 2));

try {
  var tree = parse('name > @name true true AND age <= @age false true');
  console.log(JSON.stringify(tree, null, 2));
} catch (ex) {
  console.log(ex);
}

var tree = parse('NOT name > @name true true AND age <= @age false true');
console.log(JSON.stringify(tree, null, 2));

var tree = parse('name > @name true true AND age <= @age false true AND gender == @gender true true');
console.log(JSON.stringify(tree, null, 2));

var tree = parse('name > @name true true OR age <= @age false true AND gender == @gender true true');
console.log(JSON.stringify(tree, null, 2));
