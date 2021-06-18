import type { Operation, Type } from "@sdkgen/parser";

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

export function generateSwiftTypeName(type: Type): string {
  switch (type.constructor) {
    case IntPrimitiveType:
    case UIntPrimitiveType:
    case MoneyPrimitiveType:
      return "Int";

    case FloatPrimitiveType:
      return "Double";

    case BigIntPrimitiveType:
      return "Decimal";

    case DatePrimitiveType:
    case DateTimePrimitiveType:
      return "Date";

    case BoolPrimitiveType:
      return "Bool";

    case BytesPrimitiveType:
      return "[UInt8]";

    case StringPrimitiveType:
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
      return "Void";

    case JsonPrimitiveType:
      return "Data";

    case OptionalType:
      return `${generateSwiftTypeName((type as OptionalType).base)}?`;

    case ArrayType: {
      return `[${generateSwiftTypeName((type as ArrayType).base)}]`;
    }

    case StructType:
    case EnumType:
      return "API." + type.name;

    case TypeReference:
      return generateSwiftTypeName((type as TypeReference).type);

    default:
      throw new Error(`BUG: generateSwiftTypeName with ${type.constructor.name}`);
  }
}

export function mangle(fieldName: string): string {
  const mangleList = [
    "associatedtype",
    "deinit",
    "extension",
    "inout",
    "let",
    "in",
    "as",
    "break",
    "class",
    "continue",
    "protocol",
    "Protocol",
    "rethrows",
    "throws",
    "static",
    "do",
    "else",
    "false",
    "for",
    "guard",
    "func",
    "if",
    "internal",
    "struct",
    "subscript",
    "repeat",
    "is",
    "nil",
    "Any",
    "associativity",
    "convenience",
    "import",
    "return",
    "super",
    "self",
    "Self",
    "throw",
    "true",
    "try",
    "typealias",
    "switch",
    "case",
    "default",
    "defer",
    "fallthrough",
    "optional",
    "var",
    "while",
    "catch",
    "dynamic",
    "didSet",
    "Set",
    "fileprivate",
    "lazy",
    "get",
    "init",
    "required",
    "right",
    "param",
    "property",
    "receiver",
    "set",
    "left",
    "where",
    "final",
    "infix",
    "indirect",
    "open",
    "operator",
    "override",
    "private",
    "postfix",
    "public",
    "mutating",
    "none",
    "nonmutating",
    "precedence",
    "prefix",
    "Type",
    "unowned",
    "weak",
    "willSet",
    "Double",
    "Float",
    "Bool",
    "Int",
    "String",
    "Array",
    "Data",
    "Dictionary",
  ];

  if (mangleList.includes(fieldName)) {
    return `_${fieldName}`;
  }

  return fieldName;
}

export function generateJsonRepresentation(type: Type, fieldName: string): string {
  switch (type.constructor) {
    case StringPrimitiveType:
    case CpfPrimitiveType:
    case CnpjPrimitiveType:
    case EmailPrimitiveType:
    case HtmlPrimitiveType:
    case UrlPrimitiveType:
    case UuidPrimitiveType:
    case HexPrimitiveType:
    case Base64PrimitiveType:
    case XmlPrimitiveType:
    case IntPrimitiveType:
    case UIntPrimitiveType:
    case MoneyPrimitiveType:
    case FloatPrimitiveType:
    case BoolPrimitiveType:
      return `${mangle(fieldName)}`;
    case OptionalType:
      return `${mangle(fieldName)} == nil ? nil : ${generateJsonRepresentation((type as OptionalType).base, `${mangle(fieldName)}!`)}`
    case DatePrimitiveType:
    case DateTimePrimitiveType:
      return `SdkgenHelper.encodeDateTime(date: ${fieldName})`
    case EnumType:
      return `${mangle(fieldName)}.rawValue`;
    case TypeReference:
      return `${generateJsonRepresentation((type as TypeReference).type, `${mangle(fieldName)}`)}`;
    case StructType:
      return `${mangle(fieldName)}.toJSON()`;
    case ArrayType:
    case JsonPrimitiveType:
      return `${mangle(fieldName)}.map({ return ${generateJsonRepresentation((type as ArrayType).base, "$0")} })`;
    case VoidPrimitiveType:
      return `nil`;
    case BytesPrimitiveType:
      return `String(bytes: ${mangle(fieldName)}, encoding: .utf8)`;
    default:
      throw new Error(`BUG: No result found for generateJsonRepresentation with ${type.constructor.name}`);
  }
}

export function generateEnum(type: EnumType): string {
    let str = `    public enum ${type.name}: String, Codable {\n`;
    type.values.map(x => {
      str += `        case ${mangle(x.value)} = \"${x.value}\"\n`;
    });
    str += `    }\n`;
    return str;
}

export function generateErrorType(types: string[]): string {
  let str = `    public enum ErrorType: String, Codable {\n`;
  types.map(x => {
    str += `        case ${mangle(x)} = \"${x}\"\n`;
  });
  str += `    }\n`;
  return str;
}

function generateConstructor(type: StructType): string {
  let str = `        init(`;
  
  str += type.fields.map(field => 
    `${mangle(field.name)}: ${generateSwiftTypeName(field.type)}`
  ).join(", ");
  str += `) {\n`;
  
  str += type.fields.map(field => 
    `            self.${mangle(field.name)} = ${mangle(field.name)}`
  ).join("\n"); 

  str += `\n        }\n`;
  
  return str;
}

function generateToJson(type: StructType): string {
  let str = `        func toJSON() -> [String: Any] {\n`;
  str += `            var json = [String: Any]()\n`;
  str += type.fields.map(field => 
    `            json[\"${mangle(field.name)}\"] = ${generateJsonRepresentation(field.type, field.name)}`
  ).join("\n"); 
  str += `\n            return json`;
  str += `\n        }\n`;
  return str;
}

export function generateClass(type: StructType): string {
  return `    public class ${type.name}: Codable {\n${type.fields
    .map(field => `        var ${mangle(field.name)}: ${generateSwiftTypeName(field.type)}`)
    .join("\n")}\n\n${generateConstructor(type)}\n${generateToJson(type)}\n    }\n`;
}

export function generateErrorClass(): string {
  let str = `    public class Error {
        var message: String?
        var code: Int?
        var type: ErrorType?
    \n        init(message: String?, code: Int?, type: String?) {
            self.message = message
            self.code = code
            if let typeString = type {
              self.type = ErrorType(rawValue: typeString) ?? nil
            }
        }
    }\n`;

    return str;
}

export function generateMethodSignature(op: Operation) {
  let argsString = op.args.map(arg => { return `${mangle(arg.name)}: ${generateSwiftTypeName(arg.type)}`})
    .concat([`timeoutSeconds: Double?`, `callback: ((_ result: ${op.returnType instanceof VoidPrimitiveType ? "API.Result<API.NoReply>" : `API.Result<${generateSwiftTypeName(op.returnType)}>`}) -> Void)?`]);

  return `    func ${mangle(op.prettyName)}(${argsString.join(", ")})`
}
