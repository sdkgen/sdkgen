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

export function generateEnum(type: EnumType) {
    return `enum ${type.name} {\n  ${type.values.map(x => x.value).join(",\n  ")}\n}\n`;
}

export function generateClass(type: StructType) {
    return `class ${type.name} {\n  ${type.fields
        .map((field: any) => `${generateTypeName(field.type)} ${field.name};`)
        .join("\n  ")}\n\n${generateConstructor(type)}}\n`;
}

///Generate the class constructor with the tag [@required] for non nullable types
function generateConstructor(type: StructType): string {
    const doubleSpace = "  ";
    const fourSpaces = "    ";
    var str = `${doubleSpace}${type.name}({\n`;

    type.fields.forEach((field: any) => {
        if (field.type instanceof OptionalType) {
            str = str.concat(fourSpaces);
        } else {
            str = str.concat(`${fourSpaces}@required `);
        }
        str = str.concat(`this.${field.name},\n`);
    });
    str = str.concat(`${doubleSpace}});\n`);
    return str;
}

export function generateErrorClass(error: string) {
    return `class ${error} extends SdkgenError {\n  ${error}(msg) : super(msg);\n}\n`;
}

export function cast(value: string, type: Type): string {
    if (type instanceof ArrayType) {
        return `(${value} as List).map((e) => ${cast("e", (type as ArrayType).base)}).toList()`;
    } else if (type instanceof VoidPrimitiveType) {
        return value;
    } else if (type instanceof FloatPrimitiveType || type instanceof MoneyPrimitiveType) {
        return `(${value} as num)?.toDouble()`;
    } else {
        return `${value} as ${generateTypeName(type)}`;
    }
}

export function generateTypeName(type: Type): string {
    switch (type.constructor) {
        case StringPrimitiveType:
            return "String";
        case IntPrimitiveType:
        case UIntPrimitiveType:
            return "int";
        case FloatPrimitiveType:
            return "double";
        case BigIntPrimitiveType:
            return "BigInt";
        case DatePrimitiveType:
        case DateTimePrimitiveType:
            return "DateTime";
        case BoolPrimitiveType:
            return "bool";
        case BytesPrimitiveType:
            return "List<int>";
        case MoneyPrimitiveType:
            return "int";
        case CpfPrimitiveType:
        case CnpjPrimitiveType:
        case EmailPrimitiveType:
        case UrlPrimitiveType:
        case UuidPrimitiveType:
        case HexPrimitiveType:
        case Base64PrimitiveType:
        case XmlPrimitiveType:
            return "String";
        case VoidPrimitiveType:
            return "void";
        case JsonPrimitiveType:
            return "Object";
        case OptionalType:
            return generateTypeName((type as OptionalType).base);
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
