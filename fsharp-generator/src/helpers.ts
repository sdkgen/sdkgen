import type { Type } from "@sdkgen/parser";
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

const reservedWords = [
  "abstract",
  "as",
  "base",
  "bool",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "checked",
  "class",
  "const",
  "continue",
  "decimal",
  "default",
  "delegate",
  "do",
  "double",
  "else",
  "enum",
  "event",
  "explicit",
  "extern",
  "false",
  "finally",
  "fixed",
  "float",
  "for",
  "foreach",
  "goto",
  "if",
  "implicit",
  "in",
  "int",
  "interface",
  "internal",
  "is",
  "lock",
  "long",
  "namespace",
  "new",
  "null",
  "object",
  "operator",
  "out",
  "override",
  "params",
  "private",
  "protected",
  "public",
  "readonly",
  "ref",
  "return",
  "sbyte",
  "sealed",
  "short",
  "sizeof",
  "stackalloc",
  "static",
  "string",
  "struct",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "uint",
  "ulong",
  "unchecked",
  "unsafe",
  "ushort",
  "using",
  "using",
  "static",
  "virtual",
  "void",
  "volatile",
  "while",
  "type",
  "end",
  "id",
];

const typesWithNativeNullable: Function[] = [
  StringPrimitiveType,
  HtmlPrimitiveType,
  CpfPrimitiveType,
  CnpjPrimitiveType,
  BytesPrimitiveType,
  EmailPrimitiveType,
  UrlPrimitiveType,
  UuidPrimitiveType,
  HexPrimitiveType,
  Base64PrimitiveType,
  XmlPrimitiveType,
  StructType,
  ArrayType,
];

const needsTempVarForNullable: Function[] = [
  BigIntPrimitiveType,
  DatePrimitiveType,
  DateTimePrimitiveType,
  FloatPrimitiveType,
  IntPrimitiveType,
  MoneyPrimitiveType,
  UIntPrimitiveType,
  ArrayType,
];

export function ident(name: string): string {
  return reservedWords.includes(name) ? `${name}'` : name;
}

export function capitalize(name: string): string {
  return name[0].toUpperCase() + name.slice(1);
}

export function generateTypeName(type: Type): string {
  switch (type.constructor) {
    case StringPrimitiveType:
      return "string";
    case IntPrimitiveType:
      return "int";
    case UIntPrimitiveType:
      return "uint";
    case FloatPrimitiveType:
      return "double";
    case BigIntPrimitiveType:
      return "bigint";
    case DatePrimitiveType:
    case DateTimePrimitiveType:
      return "DateTime";
    case BoolPrimitiveType:
      return "bool";
    case BytesPrimitiveType:
      return "byte[]";
    case MoneyPrimitiveType:
      return "decimal";
    case UuidPrimitiveType:
      return "Guid";
    case CpfPrimitiveType:
    case CnpjPrimitiveType:
    case EmailPrimitiveType:
    case HtmlPrimitiveType:
    case UrlPrimitiveType:
    case HexPrimitiveType:
    case Base64PrimitiveType:
    case XmlPrimitiveType:
      return "string";
    case VoidPrimitiveType:
      return "void";
    case JsonPrimitiveType:
      return "JsonElement";
    case OptionalType:
      return `${generateTypeName((type as OptionalType).base)} option`;
    case ArrayType:
      return `${generateTypeName((type as ArrayType).base)} list`;
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

export function decodeType(type: Type, jsonElementVar: string, path: string, targetVar: string, suffix = 1, maybeNull = true): string {
  switch (type.constructor) {
    case IntPrimitiveType: {
      return `
              decodeInt32 ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case UIntPrimitiveType: {
      return `
              decodeUInt32 ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case MoneyPrimitiveType: {
      return `
                (decodeMoney ${jsonElementVar} ${path}) / 100m
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case FloatPrimitiveType: {
      return `
                decodeFloat ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case BigIntPrimitiveType: {
      return `
                decodeBigInt ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case StringPrimitiveType: {
      return `
                decodeString ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case HtmlPrimitiveType: {
      // TODO: validate HTML
      return `
                decodeHtml ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case CpfPrimitiveType: {
      // TODO: validate CPF
      return `
                decodeCpf ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case CnpjPrimitiveType: {
      // TODO: validate CNPJ
      return `
                decodeCnpj ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case EmailPrimitiveType: {
      // TODO: validate Email
      return `
                decodeEmail ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case UrlPrimitiveType: {
      // TODO: validate URL
      return `
                decodeUrl ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case UuidPrimitiveType: {
      // TODO: validate UUID
      return `
                decodeUuid ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case HexPrimitiveType: {
      // TODO: validate Hex
      return `
                decodeHex ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case Base64PrimitiveType: {
      // TODO: validate Base64
      return `
                decodeBase64 ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case XmlPrimitiveType: {
      // TODO: validate XML
      return `
                decodeXml ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case BoolPrimitiveType: {
      return `
                decodeBool ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case BytesPrimitiveType: {
      return `
                decodeBytes ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case TypeReference:
      return decodeType((type as TypeReference).type, jsonElementVar, path, targetVar, suffix);
    case OptionalType:
      if (needsTempVarForNullable.includes((type as OptionalType).base.constructor)) {
        return `match ${jsonElementVar}.ValueKind with
                  | JsonValueKind.Null | JsonValueKind.Undefined -> None
                  | _ -> ${decodeType((type as OptionalType).base, jsonElementVar, path, targetVar, suffix, false)} |> Some
                `
          .replace(/\n {16}/gu, "\n")
          .trim();
      }

      return `
                decodeOptional ${decodeType((type as OptionalType).base, jsonElementVar, path, targetVar, suffix, false)}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    case EnumType:
    case StructType:
      return `Decode${type.name} ${jsonElementVar} ${path}`;
    case JsonPrimitiveType:
      if (maybeNull) {
        return `
                ${jsonElementVar}
            `
          .replace(/\n {16}/gu, "\n")
          .trim();
      }

      return `${targetVar} <- ${jsonElementVar}`;

    case DateTimePrimitiveType: {
      return `
                decodeDateTime ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case DatePrimitiveType: {
      return `
                decodeDate ${jsonElementVar} ${path}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case ArrayType: {
      return `
                decodeArray ${decodeType((type as ArrayType).base, jsonElementVar, path, targetVar, suffix, false)}
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    default:
      throw new Error(`BUG: decodeType with ${type.constructor.name}`);
  }
}

export function encodeType(type: Type, valueVar: string, path: string, suffix = 1, isRef = true): string {
  switch (type.constructor) {
    case StringPrimitiveType: {
      return `resultWriter_.WriteStringValue(${valueVar})`;
    }

    case FloatPrimitiveType:
    case UIntPrimitiveType:
    case IntPrimitiveType: {
      return `resultWriter_.WriteNumberValue(${valueVar})`;
    }

    case MoneyPrimitiveType: {
      return `resultWriter_.WriteNumberValue(int (Math.Round(${valueVar} * 100m)))`;
    }

    case BigIntPrimitiveType: {
      return `resultWriter_.WriteStringValue(${valueVar}.ToString())`;
    }

    case BoolPrimitiveType: {
      return `resultWriter_.WriteBooleanValue(${valueVar})`;
    }

    case BytesPrimitiveType: {
      return `resultWriter_.WriteStringValue(Convert.ToBase64String(${valueVar}))`;
    }

    case DateTimePrimitiveType: {
      return `resultWriter_.WriteStringValue(${valueVar}.ToString("yyyy-MM-ddTHH:mm:ss.FFFFFF'Z'"))`;
    }

    case DatePrimitiveType: {
      return `resultWriter_.WriteStringValue(${valueVar}.ToString("yyyy-MM-dd"))`;
    }

    // TODO: format those
    case CpfPrimitiveType:
    case CnpjPrimitiveType:
    case EmailPrimitiveType:
    case HtmlPrimitiveType:
    case UrlPrimitiveType:
    case UuidPrimitiveType:
    case Base64PrimitiveType:
    case HexPrimitiveType:
    case XmlPrimitiveType: {
      return `resultWriter_.WriteStringValue(${valueVar})`;
    }

    case OptionalType: {
      let realBaseType = (type as OptionalType).base;

      while (realBaseType instanceof TypeReference) {
        realBaseType = realBaseType.type;
      }

      return `
      if (${valueVar}.IsNone) then
        resultWriter_.WriteNullValue()
      else
        ${encodeType(realBaseType, `${valueVar}.Value`, path, suffix, isRef)}
      `
        .replace(/\n {6}/gu, "\n")
        .trim();
    }

    case TypeReference:
      return encodeType((type as TypeReference).type, valueVar, path, suffix, isRef);
    case EnumType:
      return `Encode${type.name} ${valueVar} resultWriter_, ${path}`;
    case StructType:
      return `Encode${type.name} ${valueVar} resultWriter_ ${path}`;
    case JsonPrimitiveType:
      return `${valueVar}.WriteTo(resultWriter_)`;
    case ArrayType: {
      return `
              resultWriter_.WriteStartArray()
                for i${suffix} in 0..${valueVar}.Length - 1 do
                  ${encodeType((type as ArrayType).base, `${valueVar}.[i${suffix}]`, `${path}`, suffix + 1)}
                resultWriter_.WriteEndArray()
              `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    default:
      throw new Error(`BUG: encodeType with ${type.constructor.name}`);
  }
}

export function generateStruct(struct: StructType): string {
  return `
type ${struct.name} = {
  ${struct.fields.map(field => `${capitalize(field.name)}: ${generateTypeName(field.type)}`).join(";\n  ")}
}

let Decode${struct.name} (json_: JsonElement) (path_: string): ${struct.name} =
  if (json_.ValueKind <> JsonValueKind.Object) then raise (FatalException($"'{path_}' must be an object."))
  ${struct.fields
    .map(
      field =>
        `
  let ${field.name}Json_ = decodeJsonElementStrict ${JSON.stringify(field.name)} json_ $"{path_}.${field.name}"
  let ${ident(field.name)} = 
    ${decodeType(field.type, `${field.name}Json_`, `$"{path_}.${field.name}"`, ident(field.name)).replace(/\n/gu, "\n  ")}
  `,
    )
    .join("")}
  { ${struct.fields.map(field => `${capitalize(field.name)} = ${ident(field.name)}`).join("; ")} }

let Encode${struct.name} (obj_: ${struct.name}) (resultWriter_: Utf8JsonWriter) (path_: string) =
  resultWriter_.WriteStartObject()
  ${struct.fields
    .map(
      field =>
        `
  resultWriter_.WritePropertyName(${JSON.stringify(field.name)})
  ${encodeType(field.type, `obj_.${capitalize(field.name)}`, `$"{path_}.${field.name}"`).replace(/\n/gu, "\n  ")}`,
    )
    .join("\n")}
  resultWriter_.WriteEndObject()`;
}

export function generateEnum(type: EnumType): string {
  return `
type ${type.name} =
  ${type.values.map(({ value }) => `| ${capitalize(value)}`).join("\n  ")}

let Decode${type.name} (json_: JsonElement) (path_: string): ${type.name} =
  if (json_.ValueKind <> JsonValueKind.String) then raise (FatalException($"'{path_}' must be a string."))
  match json_.GetString() with
  ${type.values.map(({ value }) => `| "${value}" -> ${type.name}.${capitalize(value)}`).join("\n  ")}
  | _ -> raise (FatalException($"'{path_}' must be one of: (${type.values.map(({ value }) => `'${value}'`).join(", ")})."))

let Encode${type.name} (obj_: ${type.name}) (resultWriter_: Utf8JsonWriter) (path_: string) =
  match obj_ with
  ${type.values.map(({ value }) => `| ${type.name}.${capitalize(value)} -> resultWriter_.WriteStringValue("${value}")`).join("\n  ")}

`;
}
