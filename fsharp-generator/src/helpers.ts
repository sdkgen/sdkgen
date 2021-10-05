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
    case CpfPrimitiveType:
    case CnpjPrimitiveType:
    case EmailPrimitiveType:
    case HtmlPrimitiveType:
    case UrlPrimitiveType:
    case UuidPrimitiveType:
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
      return `${generateTypeName((type as ArrayType).base)} array`;
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
                if (${jsonElementVar}.ValueKind <> JsonValueKind.Number || not (${jsonElementVar}.TryGetInt32(&${targetVar}))) then raise (FatalException($"'${path}' must be an integer"))
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case UIntPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.Number || not (${jsonElementVar}.TryGetUInt32(&${targetVar}))) then raise (FatalException($"'${path}' must be an unsigned integer."))
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case MoneyPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.Number || not (${jsonElementVar}.TryGetDecimal(&${targetVar})) || ${targetVar} % 1m <> 0m) then raise (FatalException($"'${path}' must be an integer amount of cents."))
                ${targetVar} <- ${targetVar} / 100m;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case FloatPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.Number || not (${jsonElementVar}.TryGetDouble(&${targetVar}))) then raise (FatalException($"'${path}' must be a floating-point number."))
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case BigIntPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String || not (bigint.TryParse(${jsonElementVar}.GetString(), &${targetVar}))) then raise (FatalException($"'${path}' must be an arbitrarily large integer in a string."))
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case StringPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a string."))
                ${targetVar} <- (${jsonElementVar}.GetString())
              `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case HtmlPrimitiveType: {
      // TODO: validate HTML
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a valid HTML string."))
                ${targetVar} <- (${jsonElementVar}.GetString())
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case CpfPrimitiveType: {
      // TODO: validate CPF
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a valid CPF string."))
                ${targetVar} <- (${jsonElementVar}.GetString())
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case CnpjPrimitiveType: {
      // TODO: validate CNPJ
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a valid CNPJ string."))
                ${targetVar} <- (${jsonElementVar}.GetString())
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case EmailPrimitiveType: {
      // TODO: validate Email
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a valid email."))
                ${targetVar} <- (${jsonElementVar}.GetString())
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case UrlPrimitiveType: {
      // TODO: validate URL
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a valid URL string."))
                ${targetVar} <- (${jsonElementVar}.GetString())
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case UuidPrimitiveType: {
      // TODO: validate UUID
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a valid UUID."))
                ${targetVar} <- (${jsonElementVar}.GetString())
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case HexPrimitiveType: {
      // TODO: validate Hex
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a valid hex string."))
                ${targetVar} <- (${jsonElementVar}.GetString())
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case Base64PrimitiveType: {
      // TODO: validate Base64
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a base64 string."))
                ${targetVar} <- (${jsonElementVar}.GetString())
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case XmlPrimitiveType: {
      // TODO: validate XML
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a XML string."))
                ${targetVar} <- (${jsonElementVar}.GetString())
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case BoolPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.True && ${jsonElementVar}.ValueKind <> JsonValueKind.False) then raise (FatalException($"'${path}' must be either true or false."))
                ${targetVar} <- (${jsonElementVar}.GetBoolean())
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case BytesPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String) then raise (FatalException($"'${path}' must be a string."))
                try
                    ${targetVar} <- (Convert.FromBase64String(${jsonElementVar}.GetString()))
                with
                | _ -> raise (FatalException($"'${path}' must be a base64 string."))
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case TypeReference:
      return decodeType((type as TypeReference).type, jsonElementVar, path, targetVar, suffix);
    case OptionalType:
      if (needsTempVarForNullable.includes((type as OptionalType).base.constructor)) {
        const tempVar = `${targetVar.replace(/[^0-9a-zA-Z]/gu, "")}Tmp`;

        return `
                if (${jsonElementVar}.ValueKind = JsonValueKind.Null || ${jsonElementVar}.ValueKind = JsonValueKind.Undefined) then
                  ${targetVar} <- None
                else
                  let mutable ${tempVar}: ${generateTypeName((type as OptionalType).base)} = Unchecked.defaultof<${generateTypeName(
          (type as OptionalType).base,
        )}>;
                  ${decodeType((type as OptionalType).base, jsonElementVar, path, tempVar, suffix, false).replace(/\n/gu, "\n")}
                  ${targetVar} <- Some(${tempVar})
                `
          .replace(/\n {16}/gu, "\n")
          .trim();
      }

      return `
                if (${jsonElementVar}.ValueKind = JsonValueKind.Null || ${jsonElementVar}.ValueKind = JsonValueKind.Undefined) then
                  ${targetVar} <- None
                else
                  ${decodeType((type as OptionalType).base, jsonElementVar, path, targetVar, suffix, false).replace(/\n/gu, "\n")} |> Some
                `
        .replace(/\n {16}/gu, "\n")
        .trim();

    case EnumType:
    case StructType:
      return `${targetVar} <- Decode${type.name}(${jsonElementVar}, $"${path}")`;
    case JsonPrimitiveType:
      if (maybeNull) {
        return `
                if (${jsonElementVar}.ValueKind = JsonValueKind.Null || ${jsonElementVar}.ValueKind = JsonValueKind.Undefined) then raise (FatalException($"'${path}' can't be null."))
                ${targetVar} <- ${jsonElementVar};
            `
          .replace(/\n {16}/gu, "\n")
          .trim();
      }

      return `${targetVar} <- ${jsonElementVar}`;

    case DateTimePrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String || not (DateTime.TryParseExact(${jsonElementVar}.GetString(), "yyyy-MM-ddTHH:mm:ss.FFFFFFF", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal ||| DateTimeStyles.AssumeUniversal, &${targetVar}) || DateTime.TryParseExact(${jsonElementVar}.GetString(), "yyyy-MM-ddTHH:mm:ss.FFFFFFF'Z'", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal ||| DateTimeStyles.AssumeUniversal, &${targetVar}))) then raise (FatalException($"'${path}' must be a datetime."))
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case DatePrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.String || not (DateTime.TryParseExact(${jsonElementVar}.GetString(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal ||| DateTimeStyles.AssumeUniversal, &${targetVar}))) then
                  raise (FatalException($"'${path}' must be a date."))
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case ArrayType: {
      return `
                if (${jsonElementVar}.ValueKind <> JsonValueKind.Array) then raise (FatalException($"'${path}' must be a array."))
                ${targetVar} <- Array.empty
                for i1 in 1 .. ((${jsonElementVar}.GetArrayLength())) do
                  let mutable element${suffix}: ${generateTypeName((type as ArrayType).base)} = Unchecked.defaultof<${generateTypeName(
        (type as ArrayType).base,
      )}>
                  ${decodeType(
                    (type as ArrayType).base,
                    `${jsonElementVar}.[i${suffix}]`,
                    `${path}.[{i${suffix}}]`,
                    `element${suffix}`,
                    suffix + 1,
                  ).replace(/\n/gu, "\n                  ")}
                  ${targetVar} <- ${targetVar} |> Array.append [|element${suffix}|]
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    default:
      throw new Error(`BUG: decodeType with ${type.constructor.name}`);
  }
}

export function encodeType(type: Type, valueVar: string, path: string, suffix = 1, isRef = true): string {
  const valueRef = isRef ? `Value.` : ``;

  switch (type.constructor) {
    case StringPrimitiveType: {
      return `resultWriter_.${valueRef}WriteStringValue(${valueVar})`;
    }

    case FloatPrimitiveType:
    case UIntPrimitiveType:
    case IntPrimitiveType: {
      return `resultWriter_.${valueRef}WriteNumberValue(${valueVar})`;
    }

    case MoneyPrimitiveType: {
      return `resultWriter_.${valueRef}WriteNumberValue(int (Math.Round(${valueVar} * 100m)))`;
    }

    case BigIntPrimitiveType: {
      return `resultWriter_.${valueRef}WriteStringValue(${valueVar}.ToString())`;
    }

    case BoolPrimitiveType: {
      return `resultWriter_.${valueRef}WriteBooleanValue(${valueVar})`;
    }

    case BytesPrimitiveType: {
      return `resultWriter_.${valueRef}WriteStringValue(Convert.ToBase64String(${valueVar}))`;
    }

    case DateTimePrimitiveType: {
      return `resultWriter_.${valueRef}WriteStringValue(${valueVar}.ToString("yyyy-MM-ddTHH:mm:ss.FFFFFF'Z'"))`;
    }

    case DatePrimitiveType: {
      return `resultWriter_.${valueRef}WriteStringValue(${valueVar}.ToString("yyyy-MM-dd"))`;
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
      return `resultWriter_.${valueRef}WriteStringValue(${valueVar})`;
    }

    case OptionalType: {
      let realBaseType = (type as OptionalType).base;

      while (realBaseType instanceof TypeReference) {
        realBaseType = realBaseType.type;
      }

      return `
        if (${valueVar}.IsNone) then
    resultWriter_.${valueRef}WriteNullValue()
  else 
    ${encodeType(realBaseType, `${valueVar}.Value`, path, suffix, isRef)}\n\n
      `.trim();
    }

    case TypeReference:
      return encodeType((type as TypeReference).type, valueVar, path, suffix, isRef);
    case EnumType:
      return `Encode${type.name}(${valueVar}, ref resultWriter_, ${path})`;
    case StructType:
      return `Encode${type.name}(${valueVar}, ref resultWriter_, ${path})`;
    case JsonPrimitiveType:
      return `${valueVar}.${valueRef}WriteTo(resultWriter_.Value)`;
    case ArrayType: {
      return `resultWriter_.${valueRef}WriteStartArray()
      for i${suffix} in 1..${valueVar}.Length do
        ${encodeType((type as ArrayType).base, `${valueVar}.[i${suffix}]`, `$"{${path}}.[{i${suffix}}]"`, suffix + 1)}
      resultWriter_.${valueRef}WriteEndArray()
    \n`.trim();
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

let Decode${struct.name}(json_: JsonElement, path_: string): ${struct.name} =
  if (json_.ValueKind <> JsonValueKind.Object) then raise (FatalException($"'{path_}' must be an object."))
  \n${struct.fields
    .map(
      field => `  let mutable ${field.name}Json_ = Unchecked.defaultof<JsonElement>
  if not (json_.TryGetProperty(${JSON.stringify(field.name)}, &${field.name}Json_)) then
    ${
      field.type instanceof OptionalType
        ? `${field.name}Json_ <- new JsonElement()`
        : `raise (FatalException($"'{path_}.${field.name}' must be set to a value of type ${field.type.name}."))`
    }

  let mutable ${ident(field.name)}: ${generateTypeName(field.type)} = Unchecked.defaultof<${generateTypeName(field.type)}>
  ${decodeType(field.type, `${field.name}Json_`, `{path_}.${field.name}`, ident(field.name)).replace(/\n/gu, "\n  ")}`,
    )
    .join("\n")}

  { ${struct.fields.map(field => `${capitalize(field.name)} = ${ident(field.name)}`).join("; ")} }

let Encode${struct.name}(obj_: ${struct.name} , resultWriter_: Utf8JsonWriter ref, path_: string) =
  resultWriter_.Value.WriteStartObject()
  ${struct.fields
    .map(
      field =>
        `
  resultWriter_.Value.WritePropertyName(${JSON.stringify(field.name)})
  ${encodeType(field.type, `obj_.${capitalize(field.name)}`, `$"{path_}.${field.name}"`)}`,
    )
    .join("\n")}
  resultWriter_.Value.WriteEndObject()`;
}

export function generateEnum(type: EnumType): string {
  return `
type ${type.name} =
  ${type.values.map(({ value }) => `| ${capitalize(value)}`).join("\n  ")}

let Decode${type.name}(json_: JsonElement, path_: string): ${type.name} =
  if (json_.ValueKind <> JsonValueKind.String) then raise (FatalException($"'{path_}' must be a string."))
  match json_.GetString() with
  ${type.values.map(({ value }) => `| "${value}" -> ${type.name}.${capitalize(value)}`).join("\n  ")}
  | _ -> raise (FatalException($"'{path_}' must be one of: (${type.values.map(({ value }) => `'${value}'`).join(", ")})."))

let Encode${type.name}(obj_: ${type.name}, resultWriter_: Utf8JsonWriter ref, path_: string) =
  match obj_ with
  ${type.values.map(({ value }) => `| ${type.name}.${capitalize(value)} -> resultWriter_.Value.WriteStringValue("${value}")`).join("\n  ")}

`;
}
