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
  return reservedWords.includes(name) ? `@${name}` : name;
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
      return "BigInteger";
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

export function decodeType(type: Type, jsonElementVar: string, path: string, targetVar: string, suffix = 1, maybeNull = true): string {
  switch (type.constructor) {
    case IntPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.Number || !${jsonElementVar}.TryGetInt32(out ${targetVar}))
                {
                    throw new FatalException($"'{${path}}' must be an integer");
                }
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case UIntPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.Number || !${jsonElementVar}.TryGetUInt32(out ${targetVar}))
                {
                    throw new FatalException($"'{${path}}' must be an unsigned integer.");
                }
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case MoneyPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.Number || !${jsonElementVar}.TryGetDecimal(out ${targetVar}) || ${targetVar} % 1 != 0)
                {
                    throw new FatalException($"'{${path}}' must be an integer amount of cents.");
                }
                ${targetVar} /= 100;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case FloatPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.Number || !${jsonElementVar}.TryGetDouble(out ${targetVar}))
                {
                    throw new FatalException($"'{${path}}' must be a floating-point number.");
                }
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case BigIntPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String || !BigInteger.TryParse(${jsonElementVar}.GetString()!, out ${targetVar}))
                {
                    throw new FatalException($"'{${path}}' must be an arbitrarily large integer in a string.");
                }
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case StringPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a string.");
                }
                ${targetVar} = ${jsonElementVar}.GetString()!;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case HtmlPrimitiveType: {
      // TODO: validate HTML
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a valid HTML string.");
                }
                ${targetVar} = ${jsonElementVar}.GetString()!;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case CpfPrimitiveType: {
      // TODO: validate CPF
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a valid CPF string.");
                }
                ${targetVar} = ${jsonElementVar}.GetString()!;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case CnpjPrimitiveType: {
      // TODO: validate CNPJ
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a valid CNPJ string.");
                }
                ${targetVar} = ${jsonElementVar}.GetString()!;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case EmailPrimitiveType: {
      // TODO: validate Email
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a valid email.");
                }
                ${targetVar} = ${jsonElementVar}.GetString()!;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case UrlPrimitiveType: {
      // TODO: validate URL
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a valid URL string.");
                }
                ${targetVar} = ${jsonElementVar}.GetString()!;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case UuidPrimitiveType: {
      // TODO: validate UUID
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a valid UUID.");
                }
                ${targetVar} = ${jsonElementVar}.GetString()!;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case HexPrimitiveType: {
      // TODO: validate Hex
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a valid hex string.");
                }
                ${targetVar} = ${jsonElementVar}.GetString()!;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case Base64PrimitiveType: {
      // TODO: validate Base64
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a base64 string.");
                }
                ${targetVar} = ${jsonElementVar}.GetString()!;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case XmlPrimitiveType: {
      // TODO: validate XML
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a XML string.");
                }
                ${targetVar} = ${jsonElementVar}.GetString()!;
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case BoolPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.True && ${jsonElementVar}.ValueKind != JsonValueKind.False)
                {
                    throw new FatalException($"'{${path}}' must be either true or false.");
                }
                ${targetVar} = ${jsonElementVar}.GetBoolean();
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case BytesPrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException($"'{${path}}' must be a string.");
                }
                try
                {
                    ${targetVar} = Convert.FromBase64String(${jsonElementVar}.GetString()!);
                }
                catch (FormatException)
                {
                    throw new FatalException($"'{${path}}' must be a base64 string.");
                }
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
                    if (${jsonElementVar}.ValueKind == JsonValueKind.Null || ${jsonElementVar}.ValueKind == JsonValueKind.Undefined)
                    {
                        ${targetVar} = null;
                    }
                    else
                    {
                        ${generateTypeName((type as OptionalType).base)} ${tempVar};
                        ${decodeType((type as OptionalType).base, jsonElementVar, path, tempVar, suffix, false).replace(
                          /\n/gu,
                          "\n                        ",
                        )}
                        ${targetVar} = ${tempVar};
                    }
                `
          .replace(/\n {20}/gu, "\n")
          .trim();
      }

      return `
                    if (${jsonElementVar}.ValueKind == JsonValueKind.Null || ${jsonElementVar}.ValueKind == JsonValueKind.Undefined)
                    {
                        ${targetVar} = null;
                    }
                    else
                    {
                        ${decodeType((type as OptionalType).base, jsonElementVar, path, targetVar, suffix, false).replace(
                          /\n/gu,
                          "\n                        ",
                        )}
                    }
                `
        .replace(/\n {20}/gu, "\n")
        .trim();

    case EnumType:
    case StructType:
      return `${targetVar} = Decode${type.name}(${jsonElementVar}, ${path});`;
    case JsonPrimitiveType:
      if (maybeNull) {
        return `
                if (${jsonElementVar}.ValueKind == JsonValueKind.Null || ${jsonElementVar}.ValueKind == JsonValueKind.Undefined)
                {
                    throw new FatalException($"'{${path}}' can't be null.");
                }
                ${targetVar} = ${jsonElementVar};
            `
          .replace(/\n {16}/gu, "\n")
          .trim();
      }

      return `${targetVar} = ${jsonElementVar};`;

    case DateTimePrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String || !(DateTime.TryParseExact(${jsonElementVar}.GetString()!, "yyyy-MM-ddTHH:mm:ss.FFFFFFF", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out ${targetVar}) || DateTime.TryParseExact(${jsonElementVar}.GetString()!, "yyyy-MM-ddTHH:mm:ss.FFFFFFF'Z'", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out ${targetVar})))
                {
                    throw new FatalException($"'{${path}}' must be a datetime.");
                }
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case DatePrimitiveType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String || !(DateTime.TryParseExact(${jsonElementVar}.GetString()!, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out ${targetVar})))
                {
                    throw new FatalException($"'{${path}}' must be a date.");
                }
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case ArrayType: {
      return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.Array)
                {
                    throw new FatalException($"'{${path}}' must be a date.");
                }
                ${targetVar} = new ${generateTypeName(type)}();
                for (var i${suffix} = 0; i${suffix} < ${jsonElementVar}.GetArrayLength(); ++i${suffix})
                {
                    ${generateTypeName((type as ArrayType).base)} element${suffix};
                    ${decodeType(
                      (type as ArrayType).base,
                      `${jsonElementVar}[i${suffix}]`,
                      `$"{${path}}[{i${suffix}}]"`,
                      `element${suffix}`,
                      suffix + 1,
                    ).replace(/\n/gu, "\n                    ")}
                    ${targetVar}.Add(element${suffix});
                }
            `
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    default:
      throw new Error(`BUG: decodeType with ${type.constructor.name}`);
  }
}

export function encodeType(type: Type, valueVar: string, path: string, suffix = 1): string {
  switch (type.constructor) {
    case StringPrimitiveType: {
      return `resultWriter_.WriteStringValue(${valueVar});`;
    }

    case FloatPrimitiveType:
    case UIntPrimitiveType:
    case IntPrimitiveType: {
      return `resultWriter_.WriteNumberValue(${valueVar});`;
    }

    case MoneyPrimitiveType: {
      return `resultWriter_.WriteNumberValue(Math.Round(${valueVar} * 100));`;
    }

    case BigIntPrimitiveType: {
      return `resultWriter_.WriteStringValue(${valueVar}.ToString());`;
    }

    case BoolPrimitiveType: {
      return `resultWriter_.WriteBooleanValue(${valueVar});`;
    }

    case BytesPrimitiveType: {
      return `resultWriter_.WriteStringValue(Convert.ToBase64String(${valueVar}));`;
    }

    case DateTimePrimitiveType: {
      return `resultWriter_.WriteStringValue(${valueVar}.ToString("yyyy-MM-ddTHH:mm:ss.FFFFFF'Z'"));`;
    }

    case DatePrimitiveType: {
      return `resultWriter_.WriteStringValue(${valueVar}.ToString("yyyy-MM-dd"));`;
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
      return `resultWriter_.WriteStringValue(${valueVar});`;
    }

    case OptionalType: {
      let realBaseType = (type as OptionalType).base;

      while (realBaseType instanceof TypeReference) {
        realBaseType = realBaseType.type;
      }

      return `
                if (${valueVar} == null)
                {
                    resultWriter_.WriteNullValue();
                }
                else
                {
                    ${encodeType(
                      realBaseType,
                      typesWithNativeNullable.includes(realBaseType.constructor) ? valueVar : `${valueVar}.Value`,
                      path,
                      suffix,
                    ).replace(/\n/gu, "\n                    ")}
                }`
        .replace(/\n {16}/gu, "\n")
        .trim();
    }

    case TypeReference:
      return encodeType((type as TypeReference).type, valueVar, path, suffix);
    case EnumType:
    case StructType:
      return `Encode${type.name}(${valueVar}, resultWriter_, ${path});`;
    case JsonPrimitiveType:
      return `${valueVar}.WriteTo(resultWriter_);`;
    case ArrayType: {
      return `
                resultWriter_.WriteStartArray();
                for (var i${suffix} = 0; i${suffix} < ${valueVar}.Count; ++i${suffix})
                {
                    ${encodeType((type as ArrayType).base, `${valueVar}[i${suffix}]`, `$"{${path}}[{i${suffix}}]"`, suffix + 1).replace(
                      /\n/gu,
                      "\n                    ",
                    )}
                }
                resultWriter_.WriteEndArray();
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
        public class ${struct.name}
        {${struct.fields
          .map(
            field => `
            public ${generateTypeName(field.type)} ${capitalize(field.name)};`,
          )
          .join("")}
            public ${struct.name}(${struct.fields.map(field => `${generateTypeName(field.type)} ${ident(field.name)}`).join(", ")})
            {${struct.fields
              .map(
                field => `
                ${capitalize(field.name)} = ${ident(field.name)};`,
              )
              .join("")}
            }
        }

        ${struct.name} Decode${struct.name}(JsonElement json_, string path_)
        {
            if (json_.ValueKind != JsonValueKind.Object)
            {
                throw new FatalException($"'{path_}' must be an object.");
            }\n${struct.fields
              .map(
                field => `            JsonElement ${field.name}Json_;
            if (!json_.TryGetProperty(${JSON.stringify(field.name)}, out ${field.name}Json_))
            {
                ${
                  field.type instanceof OptionalType
                    ? `${field.name}Json_ = new JsonElement();`
                    : `throw new FatalException($"'{path_}.${field.name}' must be set to a value of type ${field.type.name}.");`
                }
            }
            ${generateTypeName(field.type)} ${ident(field.name)};
            ${decodeType(field.type, `${field.name}Json_`, `$"{path_}.${field.name}"`, ident(field.name)).replace(/\n/gu, "\n            ")}`,
              )
              .join("\n")}
            return new ${struct.name}(${struct.fields.map(field => ident(field.name)).join(", ")});
        }

        void Encode${struct.name}(${struct.name} obj_, Utf8JsonWriter resultWriter_, string path_)
        {
            resultWriter_.WriteStartObject();
            ${struct.fields
              .map(
                field => `resultWriter_.WritePropertyName(${JSON.stringify(field.name)});
            ${encodeType(field.type, `obj_.${capitalize(field.name)}`, `$"{path_}.${field.name}"`).replace(/\n/gu, "\n            ")}`,
              )
              .join("\n            ")}
            resultWriter_.WriteEndObject();
        }
`;
}

export function generateEnum(type: EnumType): string {
  return `
        public enum ${type.name}
        {${type.values
          .map(
            ({ value }) => `
            ${capitalize(value)}`,
          )
          .join(",\n            ")}
        }

        ${type.name} Decode${type.name}(JsonElement json_, string path_)
        {
            if (json_.ValueKind != JsonValueKind.String)
            {
                throw new FatalException($"'{path_}' must be a string.");
            }
            var value = json_.GetString()!;${type.values
              .map(
                ({ value }) => `
            if (value == "${value}")
            {
                return ${type.name}.${capitalize(value)};
            }`,
              )
              .join("")}
            throw new FatalException($"'{path_}' must be one of: (${type.values.map(({ value }) => `'${value}'`).join(", ")}).");
        }

        void Encode${type.name}(${type.name} obj_, Utf8JsonWriter resultWriter_, string path_)
        {${type.values
          .map(
            ({ value }) => `
            if (obj_ == ${type.name}.${capitalize(value)})
            {
                resultWriter_.WriteStringValue("${value}");
            }`,
          )
          .join("")}
        }
`;
}
