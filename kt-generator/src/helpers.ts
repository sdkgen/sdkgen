import { ArrayType, EnumType, OptionalType, StructType, Type, TypeReference } from "@sdkgen/parser";

export function generateEnum(type: EnumType) {
    return `enum class ${type.name} {\n  ${type.values.map(x => x.value).join(",\n  ")}\n}\n`;
}

export function generateClass(type: StructType) {
    return `data class ${type.name}(${type.fields.map(field => `val ${field.name}: ${generateTypeName(field.type)}`).join(",  ")})\n`;
}

export function generateErrorClass(error: string) {
    return `data class ${error}(val msg: String): SdkgenError(msg)\n`;
}


// Don`t know if will have use to this method yet.
// export function cast(value: string, type: Type): string {
//     if (type.constructor.name === "ArrayType") {
//         return `(${value} as List).map((e) => ${cast("e", (type as ArrayType).base)}).toList()`;
//     } else if (type.constructor.name === "VoidPrimitiveType") {
//         return value;
//     } else if (type.constructor.name === "FloatPrimitiveType" || type.constructor.name === "MoneyPrimitiveType") {
//         return `(${value} as num)?.toDouble()`;
//     } else {
//         return `${value} as ${generateTypeName(type)}`;
//     }
// }

export function generateTypeName(type: Type): string {
    switch (type.constructor.name) {
        case "StringPrimitiveType":
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
        case "IntPrimitiveType":
        case "UIntPrimitiveType":
        case "MoneyPrimitiveType":
            return "Int";
        case "FloatPrimitiveType":
            return "Double";
        case "DatePrimitiveType":
        case "DateTimePrimitiveType":
            return "Calendar";
        case "BoolPrimitiveType":
            return "Boolean";
        case "BytesPrimitiveType":
            return "ByteArray";
        case "LatLngPrimitiveType":
            return "Location";
        case "VoidPrimitiveType":
            return "";
        case "AnyPrimitiveType":
            return "Any";
        case "OptionalType":
            return `${generateTypeName((type as OptionalType).base)}?`;
        case "ArrayType":
            return `ArrayList<${generateTypeName((type as ArrayType).base)}>`
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
