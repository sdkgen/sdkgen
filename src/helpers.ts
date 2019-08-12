import { ArrayType, EnumType, OptionalType, StructType, Type, TypeReference } from "@sdkgen/parser";

export function generateTypescriptInterface(type: StructType) {
    return `export interface ${type.name} {
${type.fields.map(field => `    ${field.name}: ${generateTypescriptTypeName(field.type)}`).join("\n")}
}\n`;
}

export function generateTypescriptEnum(type: EnumType) {
    return `export type ${type.name} = ${type.values.map(x => `"${x}"`).join(" | ")};\n`;
}

export function generateTypescriptErrorClass(name: string) {
    return `export class ${name} extends Error {
    type = "${name}";
    message: string;
    constructor(message?: string) {
        super("${name}" + (message ? ": " + message : "");
        this.message = message || "";
    }
}\n`;
}

export function clearForLogging(path: string, type: Type): string {
    switch (type.constructor.name) {
        case "TypeReference":
            return clearForLogging(path, (type as TypeReference).type);

        case "OptionalType": {
            const code = clearForLogging(path, (type as OptionalType).base);
            if (code) return `if (${path} !== null && ${path} !== undefined) { ${code} }`;
            else return "";
        }

        case "ArrayType": {
            const code = clearForLogging("el", (type as ArrayType).base);
            if (code) return `for (const el of ${path}) { ${code} }`;
            else return "";
        }

        case "StructType":
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
    switch (type.constructor.name) {
        case "StringPrimitiveType":
            return "string";

        case "IntPrimitiveType":
            return "number";

        case "UIntPrimitiveType":
            return "number";

        case "FloatPrimitiveType":
            return "number";

        case "DatePrimitiveType":
            return "Date";

        case "DateTimePrimitiveType":
            return "Date";

        case "BoolPrimitiveType":
            return "boolean";

        case "BytesPrimitiveType":
            return "Buffer";

        case "MoneyPrimitiveType":
            return "number";

        case "CpfPrimitiveType":
            return "string";

        case "CnpjPrimitiveType":
            return "string";

        case "EmailPrimitiveType":
            return "string";

        case "PhonePrimitiveType":
            return "string";

        case "CepPrimitiveType":
            return "string";

        case "LatLngPrimitiveType":
            return "{lat: number, lng: number}";

        case "UrlPrimitiveType":
            return "string";

        case "UuidPrimitiveType":
            return "string";

        case "HexPrimitiveType":
            return "string";

        case "Base64PrimitiveType":
            return "string";

        case "SafeHtmlPrimitiveType":
            return "string";

        case "XmlPrimitiveType":
            return "string";

        case "VoidPrimitiveType":
            return "void";

        case "OptionalType":
            return generateTypescriptTypeName((type as OptionalType).base) + " | null";

        case "ArrayType":
            return generateTypescriptTypeName((type as ArrayType).base) + "[]";

        case "StructType":
            return type.name;

        case "EnumType":
            return type.name;

        case "TypeReference":
            return generateTypescriptTypeName((type as TypeReference).type);

        default:
            throw new Error(`BUG: generateTypescriptTypeName with ${type.constructor.name}`);
    }
}
