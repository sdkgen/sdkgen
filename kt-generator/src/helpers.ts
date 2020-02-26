import { ArrayType, EnumType, OptionalType, StructType, Type, TypeReference } from "@sdkgen/parser";

export function generateEnum(type: EnumType) {
    return `enum class ${type.name} { ${type.values.map(x => mangle(x.value)).join(", ")} }\n`;
}

export function generateClass(type: StructType) {
    return `data class ${type.name}(${type.fields.map(field => `val ${mangle(field.name)}: ${generateTypeName(field.type)}`).join(",  ")})\n`;
}

export function generateErrorClass(error: string) {
    return `class ${error}(message: String): Error(message)\n`;
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
            return "Unit";
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

export function generateJsonAddRepresentation(type: Type, fieldName: string): string {
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
        case "IntPrimitiveType":
        case "UIntPrimitiveType":
        case "MoneyPrimitiveType":
        case "FloatPrimitiveType":
        case "BoolPrimitiveType":
            return `addProperty(\"${fieldName}\", ${mangle(fieldName)})\n`;
        case "OptionalType":
            return generateJsonAddRepresentation((type as OptionalType).base, fieldName)
        case "DatePrimitiveType":
            return `addProperty(\"${fieldName}\", SimpleDateFormat(\"yyyy-MM-dd\", Locale.getDefault()).format(${mangle(fieldName)}))`;
        case "DateTimePrimitiveType":
            return `addProperty(\"${fieldName}\", SimpleDateFormat(\"yyyy-MM-dd'T'HH:mm:ss.SSS\", Locale.getDefault()).format(${mangle(fieldName)}))`;
        case "LatLngPrimitiveType":
        case "ArrayType":
        case "StructType":
        case "EnumType":
        case "TypeReference":
        case "AnyPrimitiveType":
            return `add(\"${fieldName}\", gson.toJsonTree(${mangle(fieldName)}))`;
        case "VoidPrimitiveType":
            return "";
        case "BytesPrimitiveType":
            return `addProperty(\"${fieldName}\", android.util.Base64.encodeToString(${mangle(fieldName)}, android.util.Base64.DEFAULT))`;
        default:
            throw new Error(`BUG: No result found for generateJsonRepresentation with ${type.constructor.name}`);
    }
}

export function mangle(fieldName: string): string {
    const mangleList = [
        "in", "out", "as", "as?", "break", "class", "continue", "do", "else", "false",
        "for", "fun", "if", "in", "!in", "interface", "is", "!is", "null", "object",
        "package", "return", "super", "this", "throw", "true", "try", "typealias",
        "val", "var", "when", "while", "by", "catch", "constructor", "delegate",
        "dynamic", "field", "file", "finally", "get", "import", "init", "param",
        "property", "receiver", "set", "setparam", "where", "actual", "abstract",
        "annotation", "companion", "const", "crossinline", "data", "enum", "expect",
        "external", "final", "infix", "inline", "inner", "internal", "lateinit", "noinline",
        "open", "operator", "out", "override", "private", "protected", "public", "reified",
        "sealed", "suspend", "tailrec", "vararg", "Double", "Float", "Long", "Int", "Short", "Byte"
    ];

    const hasConflicted = (element: string) => element === fieldName;
    if (mangleList.some(hasConflicted)) {
        return `_${fieldName}`;
    } 

    return fieldName;
}
