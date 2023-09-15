import type { ErrorNode, Type } from "@sdkgen/parser";
import {
  ArrayType,
  Base64PrimitiveType,
  BigIntPrimitiveType,
  BoolPrimitiveType,
  BytesPrimitiveType,
  CnpjPrimitiveType,
  CpfPrimitiveType,
  DatePrimitiveType,
  DateTimePrimitiveType,
  EmailPrimitiveType,
  EnumType,
  FloatPrimitiveType,
  HexPrimitiveType,
  HtmlPrimitiveType,
  IntPrimitiveType,
  JsonPrimitiveType,
  MoneyPrimitiveType,
  DecimalPrimitiveType,
  OptionalType,
  StringPrimitiveType,
  StructType,
  TypeReference,
  UIntPrimitiveType,
  UrlPrimitiveType,
  UuidPrimitiveType,
  VoidPrimitiveType,
  XmlPrimitiveType,
} from "@sdkgen/parser";

export function mangle(fieldName: string): string {
  const mangleList = [
    "abstract",
    "as",
    "assert",
    "async",
    "await",
    "bool",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "covariant",
    "default",
    "deferred",
    "do",
    "double",
    "dynamic",
    "else",
    "enum",
    "export",
    "extends",
    "extension",
    "external",
    "factory",
    "false",
    "final",
    "finally",
    "for",
    "Function",
    "get",
    "hide",
    "if",
    "implements",
    "import",
    "in",
    "int",
    "interface",
    "is",
    "library",
    "mixin",
    "new",
    "null",
    "on",
    "operator",
    "part",
    "rethrow",
    "return",
    "set",
    "show",
    "static",
    "super",
    "switch",
    "sync",
    "this",
    "throw",
    "true",
    "try",
    "typedef",
    "var",
    "void",
    "while",
    "with",
    "yield",
  ];

  if (mangleList.includes(fieldName)) {
    return `$${fieldName}`;
  }

  return fieldName;
}

export function generateEnum(type: EnumType): string {
  return `enum ${type.name} {\n  ${type.values.map(x => x.value).join(",\n  ")}\n}\n`;
}

export function generateTypeName(type: Type): string {
  switch (type.constructor) {
    case StringPrimitiveType:
      return "String";
    case IntPrimitiveType:
    case UIntPrimitiveType:
      return "int";
    case FloatPrimitiveType:
      return "double";
    case BigIntPrimitiveType:
      return "BigInt";
    case DatePrimitiveType:
    case DateTimePrimitiveType:
      return "DateTime";
    case BoolPrimitiveType:
      return "bool";
    case BytesPrimitiveType:
      return "Uint8List";
    case MoneyPrimitiveType:
      return "int";
    case DecimalPrimitiveType:
      return "Decimal";
    case CpfPrimitiveType:
    case CnpjPrimitiveType:
    case EmailPrimitiveType:
    case HtmlPrimitiveType:
    case UrlPrimitiveType:
    case UuidPrimitiveType:
    case HexPrimitiveType:
    case Base64PrimitiveType:
    case XmlPrimitiveType:
      return "String";
    case VoidPrimitiveType:
      return "void";
    case JsonPrimitiveType:
      return "dynamic";
    case OptionalType:
      return `${generateTypeName((type as OptionalType).base)}?`;
    case ArrayType:
      return `List<${generateTypeName((type as ArrayType).base)}>`;
    case StructType:
      return type.name;
    case EnumType:
      return type.name;
    case TypeReference:
      return generateTypeName((type as TypeReference).type);
    default:
      throw new Error(`BUG: generateTypeName with ${type.constructor.name}`);
  }
}

export function generateErrorClass(error: ErrorNode): string {
  if (error.dataType instanceof VoidPrimitiveType) {
    return `class ${error.name} extends SdkgenError {\n  ${error.name}(super.msg, super.request);\n}\n`;
  }

  const dataType = generateTypeName(error.dataType);

  return `class ${error.name} extends SdkgenErrorWithData<${dataType}> {\n  ${error.name}(super.msg, super.request, super.data);\n}\n`;
}

export function cast(value: string, type: Type): string {
  if (type instanceof OptionalType) {
    return `${value} == null ? null : ${cast(value, type.base)}`;
  } else if (type instanceof ArrayType) {
    return `(${value} as List).map((e) => ${cast("e", type.base)}).toList()`;
  } else if (type instanceof VoidPrimitiveType) {
    return value;
  } else if (type instanceof FloatPrimitiveType) {
    return `(${value} as num).toDouble()`;
  } else if (type instanceof MoneyPrimitiveType) {
    return `${value} as int`;
  }

  return `${value} as ${generateTypeName(type)}`;
}

function generateConstructor(type: StructType): string {
  let str = `  ${type.name}({\n`;

  for (const field of type.fields) {
    if (field.type instanceof OptionalType) {
      str += "    ";
    } else {
      str += `    required `;
    }

    str += `this.${mangle(field.name)},\n`;
  }

  str += `  });\n`;
  return str;
}

function generateEquality(type: StructType): string {
  let str = `  @override\n  bool operator ==(other){\n`;

  str += `    if (identical(this, other)) return true;\n`;
  str += `    return ${[`other is ${type.name}`, ...type.fields.map(field => `${mangle(field.name)} == other.${mangle(field.name)}`)].join(
    " && ",
  )};\n`;

  str += `  }\n`;
  return str;
}

function generateHashcode(type: StructType): string {
  return `  @override\n  int get hashCode => Object.hashAllUnordered([${type.fields.map(field => mangle(field.name)).join(", ")}]);\n`;
}

function generateToString(type: StructType): string {
  return `  @override\n  String toString() {\n    return '${type.name} { ${type.fields
    .map(field => `${field.name}: $${mangle(field.name).startsWith("$") ? `{${mangle(field.name)}}` : mangle(field.name)}`)
    .join(", ")} }';\n  }\n`;
}

export function generateClass(type: StructType): string {
  return `class ${type.name} {\n  ${type.fields
    .map(field => `final ${generateTypeName(field.type)} ${mangle(field.name)};`)
    .join("\n  ")}\n\n${generateConstructor(type)}\n${generateEquality(type)}\n${generateHashcode(type)}\n${generateToString(type)}}\n`;
}
