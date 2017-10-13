// E = E OR E
OrCompositeColumnValueFilter
  = left:AndCompositeColumnValueFilter _ "OR" _ right:OrCompositeColumnValueFilter {
    return {
      type: 'CompositeColumnValueFilter',
      combinar: "OR",
      conditions: [left, right]
    };
  }
  / AndCompositeColumnValueFilter

// E = E AND E
AndCompositeColumnValueFilter
  = left:NotCompositeColumnValueFilter _ "AND" _ right:AndCompositeColumnValueFilter {
    return {
      type: 'CompositeColumnValueFilter',
      combinar: "AND",
      conditions: [left, right]
    };
  }
  / NotCompositeColumnValueFilter

// E = NOT E
NotCompositeColumnValueFilter
  = "NOT" _ condition:NotCompositeColumnValueFilter {
    return {
      type: 'CompositeColumnValueFilter',
      combinar: "NOT",
      conditions: [condition]
    };
  }
  / SingleColumnValueFilter // E = NOT e

// E = e
SingleColumnValueFilter
  = column_name:ColumnName _ comparator:Comparetor _ column_value:Value _ passIfMissing:ifMissing _ latestVersionOnly:latestVersionOnly {
    return {
      type: 'SingleColumnValueFilter',
      condition: [column_name, comparator, column_value, passIfMissing, latestVersionOnly]
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

BOOL
  = "true" {
    return true;
  }
  / "false" {
    return false;
  }

ifMissing
  = BOOL

latestVersionOnly
  = BOOL

NameStart
  = [a-zA-Z_]

NamePart
  = chars:[a-zA-Z0-9_]* {
    return chars.join("");
  }

_ "whitespace"
  = [ \t\n\r]*
