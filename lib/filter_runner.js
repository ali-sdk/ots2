'use strict';

const ots2 = require('./ots2');

const serialize = require('./plainbuffer').serialize;

const ComparatorType = ots2.ComparatorType;
const comparators = {
  '==': ComparatorType.CT_EQUAL,
  '!=': ComparatorType.CT_NOT_EQUAL,
  '>': ComparatorType.CT_GREATER_THAN,
  '>=': ComparatorType.CT_GREATER_EQUAL,
  '<': ComparatorType.CT_LESS_THAN,
  '<=': ComparatorType.CT_LESS_EQUAL
};

var getComparatorType = function (comparator) {
  var type = comparators[comparator];
  if (!type) {
    throw new Error(`unsupported comparator '${comparator}'`);
  }
  return type;
};

const LogicalOperator = ots2.LogicalOperator;
const combinators = {
  'NOT': LogicalOperator.LO_NOT,
  'AND': LogicalOperator.LO_AND,
  'OR': LogicalOperator.LO_OR
};

var getCombinatorType = function (combinator) {
  var type = combinators[combinator];
  if (!type) {
    throw new Error(`unsupported combinator '${combinator}'`);
  }
  return type;
};

const FilterType = ots2.FilterType;

var parseSingleColumnValueFilter = function (condition, locals) {
  var [
    columnName,
    comparator,
    columnValue,
    passIfMissing,
    latestVersionOnly
  ] = condition;
  return {
    type: FilterType.FT_SINGLE_COLUMN_VALUE,
    filter: new ots2.SingleColumnValueFilter({
      comparator: getComparatorType(comparator),
      column_name: columnName,
      column_value: serialize(locals[columnValue]),
      filter_if_missing: passIfMissing,
      latest_version_only: latestVersionOnly
    }).toBuffer()
  };
};

var parseCompositeColumnValueFilter = function (combinator, conditions, locals, $$) {
  return {
    type: FilterType.FT_COMPOSITE_COLUMN_VALUE,
    filter: new ots2.CompositeColumnValueFilter({
      combinator: getCombinatorType(combinator),
      sub_filters: conditions.map(function (node) {
        return exports.parseFilter(node, locals);
      })
    }).toBuffer()
  };
};

exports.parseFilter = function (node, locals) {
  switch (node.type) {
  case 'CompositeColumnValueFilter':
    return parseCompositeColumnValueFilter(node.combinar, node.conditions, locals);
  case 'SingleColumnValueFilter':
    return parseSingleColumnValueFilter(node.condition, locals);
  }
};
