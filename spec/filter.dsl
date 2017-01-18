// E = E OR E
OrCompositeCondition
  = left:AndCompositeCondition _ "OR" _ right:OrCompositeCondition {
    return {
      type: 'COMPOSITE',
      combinar: "OR",
      conditions: [left, right]
    };
  }
  / AndCompositeCondition

// E = E AND E
AndCompositeCondition
  = left:NotCompositeCondition _ "AND" _ right:AndCompositeCondition {
    return {
      type: 'COMPOSITE',
      combinar: "AND",
      conditions: [left, right]
    };
  }
  / NotCompositeCondition

// E = NOT E
NotCompositeCondition
  = "NOT" _ condition:NotCompositeCondition {
    return {
      type: 'COMPOSITE',
      combinar: "NOT",
      conditions: [condition]
    };
  }
  / RelationCondition // E = NOT e

// E = e
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
