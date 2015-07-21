var path = require('path');
var fs = require('fs');
var schema = require('protobuf-schema');

var proto = fs.readFileSync(path.join(__dirname, 'lib', 'ots2.proto'));
// pass a buffer or string to schema.parse
var sch = schema.parse(proto);

// will print out the schema as a javascript object
console.log(sch);
