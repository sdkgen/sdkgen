import type { ErrorNode, Type } from "@sdkgen/parser";
import {
  UnionType,
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

export function generateTypescriptTypeName(type: Type, isBrowser: boolean): string {
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
      return isBrowser ? "ArrayBuffer" : "Buffer";

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
      return `${generateTypescriptTypeName((type as OptionalType).base, isBrowser)} | null`;

    case UnionType:
      return (type as UnionType).types
        .map(t => {
          const gen = generateTypescriptTypeName(t, isBrowser);

          if (t instanceof OptionalType || t instanceof UnionType) {
            return `(${gen})`;
          }

          return gen;
        })
        .join("|");

    case ArrayType: {
      const { base } = type as ArrayType;
      const baseGen = generateTypescriptTypeName(base, isBrowser);

      if (base instanceof OptionalType || base instanceof UnionType) {
        return `(${baseGen})[]`;
      }

      return `${baseGen}[]`;
    }

    case StructType:
    case EnumType:
      return type.name;

    case TypeReference:
      return generateTypescriptTypeName((type as TypeReference).type, isBrowser);

    default:
      throw new Error(`BUG: generateTypescriptTypeName with ${type.constructor.name}`);
  }
}

export function generateTypescriptInterface(type: StructType, isBrowser: boolean): string {
  return `export interface ${type.name} {
${type.fields.map(field => `    ${field.name}: ${generateTypescriptTypeName(field.type, isBrowser)}`).join("\n")}
}\n`;
}

export function generateTypescriptEnum(type: EnumType): string {
  return `export type ${type.name} = ${type.values.map(x => `"${x.value}"`).join(" | ")};\n`;
}

export function generateTypescriptErrorClass(error: ErrorNode, isBrowser: boolean): string {
  return `export class ${error.name} extends ${
    error.dataType instanceof VoidPrimitiveType ? "SdkgenError" : `SdkgenErrorWithData<${generateTypescriptTypeName(error.dataType, isBrowser)}>`
  } {}\n`;
}
