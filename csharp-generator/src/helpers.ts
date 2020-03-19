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
    IntPrimitiveType,
    JsonPrimitiveType,
    MoneyPrimitiveType,
    OptionalType,
    StringPrimitiveType,
    StructType,
    Type,
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

const typesWithNativeNullable: any[] = [
    StringPrimitiveType,
    CpfPrimitiveType,
    CnpjPrimitiveType,
    BytesPrimitiveType,
    EmailPrimitiveType,
    UrlPrimitiveType,
    UuidPrimitiveType,
    HexPrimitiveType,
    Base64PrimitiveType,
    XmlPrimitiveType,
    ArrayType,
];

const needsTempVarForNullable: any[] = [
    BigIntPrimitiveType,
    DatePrimitiveType,
    DateTimePrimitiveType,
    FloatPrimitiveType,
    IntPrimitiveType,
    MoneyPrimitiveType,
    UIntPrimitiveType,
];

export function ident(name: string) {
    return reservedWords.includes(name) ? `@${name}` : name;
}

export function capitalize(name: string) {
    return name[0].toUpperCase() + name.slice(1);
}

export function generateStruct(struct: StructType) {
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
                throw new FatalException(string.Format("'{0}' must be an object.", path_));
            }\n${struct.fields
                .map(
                    field => `            JsonElement ${field.name}Json_;
            if (!json_.TryGetProperty(${JSON.stringify(field.name)}, out ${field.name}Json_))
            {
                ${
                    field.type instanceof OptionalType
                        ? `${field.name}Json_ = new JsonElement();`
                        : `throw new FatalException(string.Format("'{0}.${field.name}' must be set to a value of type ${field.type.name}.", path_));`
                }
            }
            ${generateTypeName(field.type)} ${ident(field.name)};
            ${decodeType(field.type, `${field.name}Json_`, `string.Format("{0}.${field.name}", path_)`, ident(field.name)).replace(
                /\n/g,
                "\n            ",
            )}`,
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
            ${encodeType(field.type, `obj_.${capitalize(field.name)}`, `string.Format("{0}.${field.name}", path_)`).replace(
                /\n/g,
                "\n            ",
            )}`,
                )
                .join("\n            ")}
            resultWriter_.WriteEndObject();
        }
`;
}

export function generateEnum(type: EnumType) {
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
                throw new FatalException(string.Format("'{0}' must be a string.", path_));
            }
            var value = json_.GetString();${type.values
                .map(
                    ({ value }) => `
            if (value == "${value}")
            {
                return ${type.name}.${capitalize(value)};
            }`,
                )
                .join("")}
            throw new FatalException(string.Format("'{0}' must be one of: (${type.values.map(({ value }) => `'${value}'`).join(", ")}).", path_));
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

export function decodeType(type: Type, jsonElementVar: string, path: string, targetVar: string, suffix = 1, maybeNull = true): string {
    switch (type.constructor) {
        case IntPrimitiveType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.Number || !${jsonElementVar}.TryGetInt32(out ${targetVar}))
                {
                    throw new FatalException(string.Format("'{0}' must be an integer", ${path}));
                }
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case UIntPrimitiveType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.Number || !${jsonElementVar}.TryGetUInt32(out ${targetVar}))
                {
                    throw new FatalException(string.Format("'{0}' must be an unsigned integer.", ${path}));
                }
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case MoneyPrimitiveType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.Number || !${jsonElementVar}.TryGetDecimal(out ${targetVar}) || ${targetVar} % 1 != 0)
                {
                    throw new FatalException(string.Format("'{0}' must be an integer amount of cents.", ${path}));
                }
                ${targetVar} /= 100;
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case FloatPrimitiveType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.Number || !${jsonElementVar}.TryGetDouble(out ${targetVar}))
                {
                    throw new FatalException(string.Format("'{0}' must be a floating-point number.", ${path}));
                }
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case BigIntPrimitiveType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String || !BigInteger.TryParse(${jsonElementVar}.GetString(), out ${targetVar}))
                {
                    throw new FatalException(string.Format("'{0}' must be an arbitrarily large integer in a string.", ${path}));
                }
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case StringPrimitiveType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException(string.Format("'{0}' must be a string.", ${path}));
                }
                ${targetVar} = ${jsonElementVar}.GetString();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case CpfPrimitiveType: {
            // TODO: validate CPF
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException(string.Format("'{0}' must be a valid CPF string.", ${path}));
                }
                ${targetVar} = ${jsonElementVar}.GetString();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case CnpjPrimitiveType: {
            // TODO: validate CNPJ
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException(string.Format("'{0}' must be a valid CNPJ string.", ${path}));
                }
                ${targetVar} = ${jsonElementVar}.GetString();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case EmailPrimitiveType: {
            // TODO: validate Email
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException(string.Format("'{0}' must be a valid email.", ${path}));
                }
                ${targetVar} = ${jsonElementVar}.GetString();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case UrlPrimitiveType: {
            // TODO: validate URL
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException(string.Format("'{0}' must be a valid URL string.", ${path}));
                }
                ${targetVar} = ${jsonElementVar}.GetString();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case UuidPrimitiveType: {
            // TODO: validate UUID
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException(string.Format("'{0}' must be a valid UUID.", ${path}));
                }
                ${targetVar} = ${jsonElementVar}.GetString();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case HexPrimitiveType: {
            // TODO: validate Hex
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException(string.Format("'{0}' must be a valid hex string.", ${path}));
                }
                ${targetVar} = ${jsonElementVar}.GetString();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case Base64PrimitiveType: {
            // TODO: validate Base64
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException(string.Format("'{0}' must be a base64 string.", ${path}));
                }
                ${targetVar} = ${jsonElementVar}.GetString();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case XmlPrimitiveType: {
            // TODO: validate XML
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException(string.Format("'{0}' must be a XML string.", ${path}));
                }
                ${targetVar} = ${jsonElementVar}.GetString();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case BoolPrimitiveType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.True && ${jsonElementVar}.ValueKind != JsonValueKind.False)
                {
                    throw new FatalException(string.Format("'{0}' must be either true or false.", ${path}));
                }
                ${targetVar} = ${jsonElementVar}.GetBoolean();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case BytesPrimitiveType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String)
                {
                    throw new FatalException(string.Format("'{0}' must be a string.", ${path}));
                }
                try
                {
                    ${targetVar} = Convert.FromBase64String(${jsonElementVar}.GetString());
                }
                catch (FormatException)
                {
                    throw new FatalException(string.Format("'{0}' must be a base64 string.", ${path}));
                }
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case TypeReference:
            return decodeType((type as TypeReference).type, jsonElementVar, path, targetVar, suffix);
        case OptionalType:
            if (needsTempVarForNullable.includes((type as OptionalType).base.constructor)) {
                const tempVar = targetVar.replace(/[^0-9a-zA-Z]/g, "") + "Tmp";
                return `
                    if (${jsonElementVar}.ValueKind == JsonValueKind.Null || ${jsonElementVar}.ValueKind == JsonValueKind.Undefined)
                    {
                        ${targetVar} = null;
                    }
                    else
                    {
                        ${generateTypeName((type as OptionalType).base)} ${tempVar};
                        ${decodeType((type as OptionalType).base, jsonElementVar, path, tempVar, suffix, false).replace(
                            /\n/g,
                            "\n                        ",
                        )}
                        ${targetVar} = ${tempVar};
                    }
                `
                    .replace(/\n                    /g, "\n")
                    .trim();
            } else {
                return `
                    if (${jsonElementVar}.ValueKind == JsonValueKind.Null || ${jsonElementVar}.ValueKind == JsonValueKind.Undefined)
                    {
                        ${targetVar} = null;
                    }
                    else
                    {
                        ${decodeType((type as OptionalType).base, jsonElementVar, path, targetVar, suffix, false).replace(
                            /\n/g,
                            "\n                        ",
                        )}
                    }
                `
                    .replace(/\n                    /g, "\n")
                    .trim();
            }
        case EnumType:
        case StructType:
            return `${targetVar} = Decode${type.name}(${jsonElementVar}, ${path});`;
        case JsonPrimitiveType:
            if (maybeNull) {
                return `
                if (${jsonElementVar}.ValueKind == JsonValueKind.Null || ${jsonElementVar}.ValueKind == JsonValueKind.Undefined)
                {
                    throw new FatalException(string.Format("'{0}' can't be null.", ${path}));
                }
                ${targetVar} = ${jsonElementVar};
            `
                    .replace(/\n                /g, "\n")
                    .trim();
            } else {
                return `${targetVar} = ${jsonElementVar};`;
            }
        case DateTimePrimitiveType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String || !(DateTime.TryParseExact(${jsonElementVar}.GetString(), "yyyy-MM-ddTHH:mm:ss.FFFFFFF", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out ${targetVar}) || DateTime.TryParseExact(${jsonElementVar}.GetString(), "yyyy-MM-ddTHH:mm:ss.FFFFFFF'Z'", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out ${targetVar})))
                {
                    throw new FatalException(string.Format("'{0}' must be a datetime.", ${path}));
                }
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case DatePrimitiveType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.String || !(DateTime.TryParseExact(${jsonElementVar}.GetString(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out ${targetVar})))
                {
                    throw new FatalException(string.Format("'{0}' must be a date.", ${path}));
                }
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        case ArrayType: {
            return `
                if (${jsonElementVar}.ValueKind != JsonValueKind.Array)
                {
                    throw new FatalException(string.Format("'{0}' must be a date.", ${path}));
                }
                ${targetVar} = new ${generateTypeName(type)}();
                for (var i${suffix} = 0; i${suffix} < ${jsonElementVar}.GetArrayLength(); ++i${suffix})
                {
                    ${generateTypeName((type as ArrayType).base)} element${suffix};
                    ${decodeType(
                        (type as ArrayType).base,
                        `${jsonElementVar}[i${suffix}]`,
                        `string.Format("{0}[{1}]", ${path}, i${suffix})`,
                        `element${suffix}`,
                        suffix + 1,
                    ).replace(/\n/g, "\n                    ")}
                    ${targetVar}.Add(element${suffix});
                }
            `
                .replace(/\n                /g, "\n")
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
        case UrlPrimitiveType:
        case UuidPrimitiveType:
        case Base64PrimitiveType:
        case HexPrimitiveType:
        case Base64PrimitiveType:
        case XmlPrimitiveType: {
            return `resultWriter_.WriteStringValue(${valueVar});`;
        }
        case OptionalType: {
            return `
                if (${valueVar} == null)
                {
                    resultWriter_.WriteNullValue();
                }
                else
                {
                    ${encodeType(
                        (type as OptionalType).base,
                        typesWithNativeNullable.includes((type as OptionalType).base.constructor) ? valueVar : `${valueVar}.Value`,
                        path,
                        suffix,
                    ).replace(/\n/g, "\n                    ")}
                }`
                .replace(/\n                /g, "\n")
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
                    ${encodeType(
                        (type as ArrayType).base,
                        `${valueVar}[i${suffix}]`,
                        `string.Format("{0}[{1}]", ${path}, i${suffix})`,
                        suffix + 1,
                    ).replace(/\n/g, "\n                    ")}
                }
                resultWriter_.WriteEndArray();
            `
                .replace(/\n                /g, "\n")
                .trim();
        }
        default:
            throw new Error(`BUG: encodeType with ${type.constructor.name}`);
    }
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
            return generateTypeName((type as OptionalType).base) + "?";
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
