ColumnCondition
  = CompositeCondition
  / RelationCondition

CompositeCondition
  = left:RelationCondition _ combinar:Combinator _ right:RelationCondition {
    return {
      type: 'COMPOSITE',
      combinar: combinar,
      conditions: [left, right]
    };
  }

Combinator
  = "AND"
  / "OR"
  / "NOT"

RelationCondition
  = column_name:ColumnName _ comparator:Comparetor _ column_value:Value _ passIfMissing:ifMissing {
    return {
      type: 'RELATION',
      condition: [column_name, comparator, column_value, passIfMissing]
    };
  }

ColumnName
  = start:NameStart part:NamePart {
    return start + part;
  }

Comparetor
  = "=="
  / "!="
  / ">="
  / ">"
  / "<="
  / "<"

Value
  = "@" value_name:ColumnName {
    return value_name;
  }

ifMissing
  = "true" {
    return true;
  }
  / "false" {
    return false;
  }

NameStart
  = [a-zA-Z_]

NamePart
  = chars:[a-zA-Z0-9_]* {
    return chars.join("");
  }

_ "whitespace"
  = [ \t\n\r]*
