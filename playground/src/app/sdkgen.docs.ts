import {
  Type,
  StringPrimitiveType,
  IntPrimitiveType,
  UIntPrimitiveType,
  FloatPrimitiveType,
  BigIntPrimitiveType,
  MoneyPrimitiveType,
  DatePrimitiveType,
  DateTimePrimitiveType,
  BoolPrimitiveType,
  VoidPrimitiveType,
  CpfPrimitiveType,
  CnpjPrimitiveType,
  EmailPrimitiveType,
  UrlPrimitiveType,
  UuidPrimitiveType,
  HexPrimitiveType,
  HtmlPrimitiveType,
  BytesPrimitiveType,
  Base64PrimitiveType,
  XmlPrimitiveType,
  JsonPrimitiveType,
  OptionalType,
  TypeReference,
  EnumType,
  ArrayType,
  StructType,
  DescriptionAnnotation,
} from "@sdkgen/parser";

import { SdkgenService } from "./sdkgen.service";

export const primitiveTypes: Record<string, string> = {
  StringPrimitiveType: "Um texto livre, potencialmente de múltiplas linhas, codificado como UTF-8.",
  IntPrimitiveType: "Um número inteiro de 32 bits, no intervalo de -2147483648 até 2147483647.",
  UIntPrimitiveType: "Um número inteiro não negativo, no intervalo de 0 até 4294967295.",
  FloatPrimitiveType: "Um número de ponto flutuante de 64 bits, similar ao double do C.",
  BigIntPrimitiveType: "Um número inteiro sem limite de precisão. Na maioria das plataformas este tipo é mais custoso.",
  MoneyPrimitiveType:
    "Um número inteiro com precisão estendida, mas performático. Está no intervalo de -9007199254740991 a 9007199254740991. Útil para operações financeiras",
  DatePrimitiveType:
    "Representa conceitualmente uma data do calendário Gregoriano. Essa mesma data pode representar diferentes momento no tempo a depender da timezone. Para especificar um ponto no tempo utilize datetime.",
  DateTimePrimitiveType:
    "Representa um instante no tempo com precisão de milissegundos. Este instante será sempre traduzido para o fuso horário local do recebedor da mensagem.",
  BoolPrimitiveType: "Ou true ou false.",
  VoidPrimitiveType: "Tipo vazio, sem conteúdo.",
  CpfPrimitiveType: "Similar a uma string, mas contendo um CPF válido.",
  CnpjPrimitiveType: "Similar a uma string, mas contendo um CNPJ válido.",
  EmailPrimitiveType: "Similar a uma string, mas contendo um e-mail válido.",
  UrlPrimitiveType: "Similar a uma string, mas contendo uma URL válida.",
  UuidPrimitiveType: "Similar a uma string, mas contendo um UUID válido.",
  HexPrimitiveType:
    "Similar a uma string, mas contendo uma quantidade par de caracteres hexadecimais, útil para representar bytes.",
  HtmlPrimitiveType: "Similar a uma string, mas contendo um HTML válido.",
  BytesPrimitiveType:
    "Uma sequência arbitrária de bytes de qualquer comprimento. Pode ser utilizado para tráfego de dados binários.",
  Base64PrimitiveType: "Similar a uma string, mas necessariamente com uma codificação Base 64 válida.",
  XmlPrimitiveType: "Similar a uma string, mas contendo um XML válido.",
  JsonPrimitiveType:
    "Um valor JSON qualquer, incluindo objetos, arrays, strings, números e boleanos, em qualquer profundidade. Note que embora null possa aparecer dentro de um objeto ou array, o valor deste campo não pode ser null diretamente. Para isso utilize json?.",
};

export const primitiveTypesExamples: Record<string, string[]> = {
  StringPrimitiveType: ["", "lorem ipsum", "strings podem conter caracteres especiais 😉"],
  IntPrimitiveType: ["0", "6725082065", "-3096576054"],
  UIntPrimitiveType: ["0", "1", "340953460"],
  FloatPrimitiveType: ["0.0", "1.050654", "-3454.6396854"],
  BigIntPrimitiveType: ["87175082235506108544888893172310", "0", "1"],
  MoneyPrimitiveType: ["100", "-450954636342", "121611633162977184630315"],
  DatePrimitiveType: ["2020-01-01", "1950-04-15", "2194-12-31"],
  DateTimePrimitiveType: ["2020-01-01T00:00:00.000", "1950-04-15T02:11:58.892", "2194-12-31T23:31:58.491"],
  BoolPrimitiveType: ["true", "false"],
  // VoidPrimitiveType: [],
  CpfPrimitiveType: ["000.000.001-91", "00000000191", "000.000.002-72"],
  CnpjPrimitiveType: ["00.000.000/0001-91", "00000000000191", "00.000.000/0002-72"],
  EmailPrimitiveType: ["sample@example.com", "root@localhost", "test+label@10.0.0.5"],
  UrlPrimitiveType: ["https://sdkgen.github.io/", "https://goo.gl/maps/gUaKGTqR8BHXfX7b7", "http://jobs.cubos.io"],
  UuidPrimitiveType: [
    "c12c3329-c558-4c76-9a16-0efeb2b01605",
    "00000000-0000-0000-0000-000000000000",
    "1d5f2ef6-0def-11ec-82a8-0242ac130003",
  ],
  HexPrimitiveType: ["00", "6375626f73", "73646b67656e20706c617967726f756e64"],
  HtmlPrimitiveType: [
    "<html><body><p>sdkgen</p></body></html>",
    "<html><h1>Sdkgen",
    "<script> alert('Hello world!'); </script>",
  ],
  BytesPrimitiveType: [],
  Base64PrimitiveType: ["Y3Vib3M=", "c2RrZ2Vu", "c2RrZ2VuIHBsYXlncm91bmQ="],
  XmlPrimitiveType: [
    "<items><item>something</item></items>",
    "<list />",
    `<?xml version="1.0" encoding="UTF-8"?><resposta><![CDATA[olá <xml>]]></resposta>`,
  ],
  JsonPrimitiveType: ["{}", `{"sdkgen":"playground"}`, `{"type":"json","items":[1,2,3],"some":null}`],
};

export function getConstructorName(type: Type) {
  switch (type.constructor) {
    case StringPrimitiveType:
      return "StringPrimitiveType";
    case IntPrimitiveType:
      return "IntPrimitiveType";
    case UIntPrimitiveType:
      return "UIntPrimitiveType";
    case FloatPrimitiveType:
      return "FloatPrimitiveType";
    case BigIntPrimitiveType:
      return "BigIntPrimitiveType";
    case MoneyPrimitiveType:
      return "MoneyPrimitiveType";
    case DatePrimitiveType:
      return "DatePrimitiveType";
    case DateTimePrimitiveType:
      return "DateTimePrimitiveType";
    case BoolPrimitiveType:
      return "BoolPrimitiveType";
    case VoidPrimitiveType:
      return "VoidPrimitiveType";
    case CpfPrimitiveType:
      return "CpfPrimitiveType";
    case CnpjPrimitiveType:
      return "CnpjPrimitiveType";
    case EmailPrimitiveType:
      return "EmailPrimitiveType";
    case UrlPrimitiveType:
      return "UrlPrimitiveType";
    case UuidPrimitiveType:
      return "UuidPrimitiveType";
    case HexPrimitiveType:
      return "HexPrimitiveType";
    case HtmlPrimitiveType:
      return "HtmlPrimitiveType";
    case BytesPrimitiveType:
      return "BytesPrimitiveType";
    case Base64PrimitiveType:
      return "Base64PrimitiveType";
    case XmlPrimitiveType:
      return "XmlPrimitiveType";
    case JsonPrimitiveType:
      return "JsonPrimitiveType";
    case OptionalType:
      return "OptionalType";
    case EnumType:
      return "EnumType";
    case ArrayType:
      return "ArrayType";
    case StructType:
      return "StructType";
    default:
      return type.constructor.name;
  }
}

export function getTypeLabels(type: Type) {
  const labels: string[] = [];

  switch (type.constructor) {
    case StringPrimitiveType:
    case IntPrimitiveType:
    case UIntPrimitiveType:
    case FloatPrimitiveType:
    case BigIntPrimitiveType:
    case MoneyPrimitiveType:
    case DatePrimitiveType:
    case DateTimePrimitiveType:
    case BoolPrimitiveType:
    case VoidPrimitiveType:
    case CpfPrimitiveType:
    case CnpjPrimitiveType:
    case EmailPrimitiveType:
    case UrlPrimitiveType:
    case UuidPrimitiveType:
    case HexPrimitiveType:
    case HtmlPrimitiveType:
    case BytesPrimitiveType:
    case Base64PrimitiveType:
    case XmlPrimitiveType:
    case JsonPrimitiveType:
      labels.push("Primitivo");
      break;

    case OptionalType:
      labels.push("Opcional");
      labels.push(...getTypeLabels((type as OptionalType).base));
      break;

    case TypeReference:
      labels.push(...getTypeLabels((type as TypeReference).type));
      break;

    case ArrayType:
      labels.push("Array");
      labels.push(...getTypeLabels((type as ArrayType).base));
      break;

    case EnumType:
      labels.push("Enum");
      break;

    default:
      console.error("No labels for", getConstructorName(type));
      break;
  }

  return labels;
}

export interface TypeDoc {
  shortDescription: string;
  longDescription: string;
  examples?: string[];

  isStruct?: boolean;
  isEnum?: boolean;

  structFields?: Array<{
    name: string;
    type: Type;
    description?: string;
    secret: boolean;
  }>;
}

export function getTypeDoc(type: Type): TypeDoc {
  switch (type.constructor) {
    case StringPrimitiveType:
    case IntPrimitiveType:
    case UIntPrimitiveType:
    case FloatPrimitiveType:
    case BigIntPrimitiveType:
    case MoneyPrimitiveType:
    case DatePrimitiveType:
    case DateTimePrimitiveType:
    case BoolPrimitiveType:
    case VoidPrimitiveType:
    case CpfPrimitiveType:
    case CnpjPrimitiveType:
    case EmailPrimitiveType:
    case UrlPrimitiveType:
    case UuidPrimitiveType:
    case HexPrimitiveType:
    case HtmlPrimitiveType:
    case BytesPrimitiveType:
    case Base64PrimitiveType:
    case XmlPrimitiveType:
    case JsonPrimitiveType:
      return {
        longDescription: primitiveTypes[getConstructorName(type)],
        shortDescription: primitiveTypes[getConstructorName(type)],
        examples: primitiveTypesExamples[getConstructorName(type)],
      };

    case OptionalType: {
      const baseTypeDoc = getTypeDoc((type as OptionalType).base);

      return {
        ...baseTypeDoc,
        longDescription: baseTypeDoc.longDescription,
        shortDescription: `(opcional) ${baseTypeDoc.shortDescription}`,
        examples: ["null", ...(baseTypeDoc.examples ?? [])],
      };
    }

    case TypeReference:
      return getTypeDoc((type as TypeReference).type);

    case ArrayType: {
      const baseTypeDoc = getTypeDoc((type as ArrayType).base);

      return {
        ...baseTypeDoc,
        longDescription: baseTypeDoc.longDescription,
        shortDescription: `(array) ${baseTypeDoc.shortDescription}`,
        examples: ["[]", ...(baseTypeDoc.examples?.map(e => `[${e}]`) ?? [])],
      };
    }

    case EnumType:
      const values = (type as EnumType).values.map(v => v.value);

      return {
        longDescription:
          "enum representa um conjunto limitado de possibilidades de valores, similar as enumerações em outras linguagens.",
        shortDescription: `(enum) ${values.slice(0, 3).join(", ")}${values.length > 3 ? "…" : ""}`,
        examples: values,
        isEnum: true,
      };

    case StructType:
      return {
        longDescription: "",
        shortDescription: `(objeto complexo) ${(type as StructType).fields
          .slice(0, 3)
          .map(f => f.name)
          .join(", ")}…`,
        isStruct: true,
        structFields: (type as StructType).fields.map(field => ({
          name: field.name,
          description: (
            field.annotations.find(ann => ann instanceof DescriptionAnnotation) as DescriptionAnnotation | undefined
          )?.text,
          type: field.type,
          secret: field.secret,
        })),
        examples: [JSON.stringify(new SdkgenService().buildJsonObject((type as StructType).fields), null, 2)],
      };

    default:
      return {
        longDescription: "BUG: Unknown Type",
        shortDescription: "BUG: Unknown Type",
        examples: [],
      };
  }
}
