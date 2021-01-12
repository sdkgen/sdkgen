import type { ErrorNode, Type } from "@sdkgen/parser";
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

export function generateKotlinTypeName(type: Type): string {
  switch (type.constructor) {
    case IntPrimitiveType:
    case UIntPrimitiveType:
    case MoneyPrimitiveType:
      return "Int";

    case FloatPrimitiveType:
      return "Double";

    case BigIntPrimitiveType:
      return "BigInt";

    case DatePrimitiveType:
    case DateTimePrimitiveType:
      return "Calendar";

    case BoolPrimitiveType:
      return "Boolean";

    case BytesPrimitiveType:
      return "ByteArray";

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
      return "String";

    case VoidPrimitiveType:
      return "Unit";

    case JsonPrimitiveType:
      return "JsonElement";

    case OptionalType:
      return `${generateKotlinTypeName((type as OptionalType).base)}?`;

    case ArrayType: {
      return `ArrayList<${generateKotlinTypeName((type as ArrayType).base)}>`;
    }

    case StructType:
    case EnumType:
      return type.name;

    case TypeReference:
      return generateKotlinTypeName((type as TypeReference).type);

    default:
      throw new Error(`BUG: generateKotlinTypeName with ${type.constructor.name}`);
  }
}

export function mangle(fieldName: string): string {
  const mangleList = [
    "in",
    "out",
    "as",
    "break",
    "class",
    "continue",
    "do",
    "else",
    "false",
    "for",
    "fun",
    "if",
    "in",
    "interface",
    "is",
    "null",
    "object",
    "package",
    "return",
    "super",
    "this",
    "throw",
    "true",
    "try",
    "typealias",
    "val",
    "var",
    "when",
    "while",
    "by",
    "catch",
    "constructor",
    "delegate",
    "dynamic",
    "field",
    "file",
    "finally",
    "get",
    "import",
    "init",
    "param",
    "property",
    "receiver",
    "set",
    "setparam",
    "where",
    "actual",
    "abstract",
    "annotation",
    "companion",
    "const",
    "crossinline",
    "data",
    "enum",
    "expect",
    "external",
    "final",
    "infix",
    "inline",
    "inner",
    "internal",
    "lateinit",
    "noinline",
    "open",
    "operator",
    "out",
    "override",
    "private",
    "protected",
    "public",
    "reified",
    "sealed",
    "suspend",
    "tailrec",
    "vararg",
    "Double",
    "Float",
    "Long",
    "Int",
    "Short",
    "Byte",
  ];

  if (mangleList.includes(fieldName)) {
    return `_${fieldName}`;
  }

  return fieldName;
}

export function generateJsonAddRepresentation(type: Type, fieldName: string): string {
  switch (type.constructor) {
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
    case IntPrimitiveType:
    case UIntPrimitiveType:
    case MoneyPrimitiveType:
    case FloatPrimitiveType:
    case BoolPrimitiveType:
      return `addProperty("${fieldName}", ${mangle(fieldName)})`;
    case OptionalType:
      return generateJsonAddRepresentation((type as OptionalType).base, fieldName);
    case DatePrimitiveType:
      return `addProperty("${fieldName}", ${mangle(fieldName)}?.let { DateAdapter.sdf.format(it.time)}) `;
    case DateTimePrimitiveType:
      return `addProperty("${fieldName}", ${mangle(fieldName)}?.let { DateTimeAdapter.sdf.format(it.time)})`;
    case ArrayType:
    case StructType:
    case EnumType:
    case TypeReference:
    case JsonPrimitiveType:
      return `add("${fieldName}", gson.toJsonTree(${mangle(fieldName)}))`;
    case VoidPrimitiveType:
      return "";
    case BytesPrimitiveType:
      return `addProperty("${fieldName}", Base64.encodeToString(${mangle(fieldName)}, Base64.NO_WRAP))`;
    default:
      throw new Error(`BUG: No result found for generateJsonRepresentation with ${type.constructor.name}`);
  }
}

export function generateEnum(type: EnumType): string {
  let enumDesc = "@Parcelize \n";

  enumDesc += `   enum class ${type.name} : Parcelable { ${type.values.map(x => mangle(x.value)).join(", ")} }\n`;
  return enumDesc;
}

export function getAnnotation(type: Type, fieldName?: string): string {
  let fieldAnnotation = "";

  if (fieldName && fieldName !== mangle(fieldName)) {
    fieldAnnotation += `        @SerializedName("${fieldName}")\n`;
  }

  switch (type.constructor) {
    case DatePrimitiveType:
      fieldAnnotation += "        @JsonAdapter(DateAdapter::class)\n";
      break;
    case DateTimePrimitiveType:
      fieldAnnotation += "        @JsonAdapter(DateTimeAdapter::class)\n";
      break;
    case ArrayType:
      fieldAnnotation += getAnnotation((type as ArrayType).base);
      break;
    case OptionalType:
      fieldAnnotation += getAnnotation((type as OptionalType).base);
      break;
    default:
      break;
  }

  return fieldAnnotation;
}

export function generateClass(type: StructType): string {
  let classDesc = "@Parcelize\n";

  classDesc += `    data class ${type.name}(\n${type.fields
    .map(field => {
      let fieldDesc = getAnnotation(field.type, field.name);

      fieldDesc += `        var ${mangle(field.name)}: ${generateKotlinTypeName(field.type)}${
        field.type.constructor === OptionalType ? " = null" : ""
      }`;
      return fieldDesc;
    })
    .join(",\n")}\n    ) : Parcelable\n`;
  return classDesc;
}

export function generateErrorClass(error: ErrorNode): string {
  return `class ${error.name}(message: String) : Error(message)\n`;
}
