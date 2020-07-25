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
    Type,
    TypeReference,
    UIntPrimitiveType,
    UrlPrimitiveType,
    UuidPrimitiveType,
    VoidPrimitiveType,
    XmlPrimitiveType,
} from "@sdkgen/parser";

export function generateTypescriptInterface(type: StructType) {
    return `export interface ${type.name} {
${type.fields.map(field => `    ${field.name}: ${generateTypescriptTypeName(field.type)}`).join("\n")}
}\n`;
}

export function generateTypescriptEnum(type: EnumType) {
    return `export type ${type.name} = ${type.values.map(x => `"${x.value}"`).join(" | ")};\n`;
}

export function generateTypescriptErrorClass(name: string) {
    return `export class ${name} extends SdkgenError {}\n`;
}

export function clearForLogging(path: string, type: Type): string {
    switch (type.constructor) {
        case TypeReference:
            return clearForLogging(path, (type as TypeReference).type);

        case OptionalType: {
            const code = clearForLogging(path, (type as OptionalType).base);
            if (code) return `if (${path} !== null && ${path} !== undefined) { ${code} }`;
            else return "";
        }

        case ArrayType: {
            const code = clearForLogging("el", (type as ArrayType).base);
            if (code) return `for (const el of ${path}) { ${code} }`;
            else return "";
        }

        case StructType:
            const codes: string[] = [];
            for (const field of (type as StructType).fields) {
                if (field.secret) {
                    codes.push(`${path}.${field.name} = "<secret>";`);
                } else {
                    const code = clearForLogging(`${path}.${field.name}`, field.type);
                    if (code) codes.push(code);
                }
            }
            return codes.join(" ");

        default:
            return "";
    }
}

export function generateTypescriptTypeName(type: Type): string {
    switch (type.constructor) {
        case IntPrimitiveType:
        case UIntPrimitiveType:
        case MoneyPrimitiveType:
        case FloatPrimitiveType:
            return "number";

        case BigIntPrimitiveType:
            return "bigint";

        case DatePrimitiveType:
        case DateTimePrimitiveType:
            return "Date";

        case BoolPrimitiveType:
            return "boolean";

        case BytesPrimitiveType:
            return "Buffer";

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
            return "string";

        case VoidPrimitiveType:
            return "void";

        case JsonPrimitiveType:
            return "any";

        case OptionalType:
            return generateTypescriptTypeName((type as OptionalType).base) + " | null";

        case ArrayType: {
            const base = (type as ArrayType).base;
            const baseGen = generateTypescriptTypeName(base);
            if (base instanceof OptionalType) return `(${baseGen})[]`;
            else return `${baseGen}[]`;
        }

        case StructType:
        case EnumType:
            return type.name;

        case TypeReference:
            return generateTypescriptTypeName((type as TypeReference).type);

        default:
            throw new Error(`BUG: generateTypescriptTypeName with ${type.constructor.name}`);
    }
}
