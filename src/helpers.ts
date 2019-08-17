import { ArrayType, EnumType, OptionalType, StructType, Type, TypeReference } from "@sdkgen/parser";

export function generateEnum(type: EnumType) {
    return `enum ${type.name} {\n  ${type.values.join(",\n  ")}\n}\n`;
}

export function generateClass(type: StructType) {
    return `class ${type.name} {\n  ${type.fields.map(field => `${generateTypeName(field.type)} ${field.name};`).join("\n  ")}\n}\n`;
}

export function generateErrorClass(error: string) {
    return `class ${error} extends SdkgenError {\n  ${error}(msg) : super(msg);\n}\n`;
}

export function generateTypeName(type: Type): string {
    switch (type.constructor.name) {
        case "StringPrimitiveType":
            return "String";
        case "IntPrimitiveType":
        case "UIntPrimitiveType":
            return "int";
        case "FloatPrimitiveType":
            return "double";
        case "DatePrimitiveType":
        case "DateTimePrimitiveType":
            return "DateTime";
        case "BoolPrimitiveType":
            return "bool";
        case "BytesPrimitiveType":
            return "List<int>";
        case "MoneyPrimitiveType":
            return "int";
        case "LatLngPrimitiveType":
            return "LatLng";
        case "CpfPrimitiveType":
        case "CnpjPrimitiveType":
        case "EmailPrimitiveType":
        case "PhonePrimitiveType":
        case "CepPrimitiveType":
        case "UrlPrimitiveType":
        case "UuidPrimitiveType":
        case "HexPrimitiveType":
        case "Base64PrimitiveType":
        case "SafeHtmlPrimitiveType":
        case "XmlPrimitiveType":
            return "String";
        case "VoidPrimitiveType":
            return "void";
        case "AnyPrimitiveType":
            return "Object";
        case "OptionalType":
            return generateTypeName((type as OptionalType).base);
        case "ArrayType":
            return `List<${generateTypeName((type as ArrayType).base)}>`
        case "StructType":
            return type.name;
        case "EnumType":
            return type.name;
        case "TypeReference":
            return generateTypeName((type as TypeReference).type);
        default:
            throw new Error(`BUG: generateTypeName with ${type.constructor.name}`);
    }
}
