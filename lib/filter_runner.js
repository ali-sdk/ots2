'use strict';

const ots2 = require('./ots2');

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

const ColumnConditionType = ots2.ColumnConditionType;

var parseRelationCondition = function (condition, locals, $$) {
  var [columnName, comparator, columnValue, passIfMissing] = condition;
  return {
    type: ColumnConditionType.CCT_RELATION,
    condition: new ots2.RelationCondition({
      comparator: getComparatorType(comparator),
      column_name: columnName,
      column_value: $$(locals[columnValue]),
      pass_if_missing: passIfMissing
    }).toBuffer()
  };
};

var parseCompositeCondition = function (combinator, conditions, locals) {
  return {
    type: ColumnConditionType.CCT_COMPOSITE,
    condition: new ots2.CompositeCondition({
      combinator: getCombinatorType(combinator),
      sub_conditions: conditions.map(function (node) {
        return exports.parseCondition(node, locals);
      })
    }).toBuffer()
  };
};

exports.parseCondition = function (node, locals, $$) {
  switch (node.type) {
  case 'COMPOSITE':
    return parseCompositeCondition(node.combinar, node.conditions, locals);
  case 'RELATION':
    return parseRelationCondition(node.condition, locals, $$);
  }
};
