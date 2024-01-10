import type { PrimitiveType } from "./ast";
import {
  Base64PrimitiveType,
  BigIntPrimitiveType,
  BoolPrimitiveType,
  BytesPrimitiveType,
  CnpjPrimitiveType,
  CpfPrimitiveType,
  DatePrimitiveType,
  DateTimePrimitiveType,
  EmailPrimitiveType,
  FloatPrimitiveType,
  HexPrimitiveType,
  HtmlPrimitiveType,
  IntPrimitiveType,
  JsonPrimitiveType,
  MoneyPrimitiveType,
  DecimalPrimitiveType,
  StringPrimitiveType,
  UIntPrimitiveType,
  UrlPrimitiveType,
  UuidPrimitiveType,
  VoidPrimitiveType,
  XmlPrimitiveType,
} from "./ast";

export const primitiveToAstClass = new Map<string, new () => PrimitiveType>();
primitiveToAstClass.set("string", StringPrimitiveType);
primitiveToAstClass.set("int", IntPrimitiveType);
primitiveToAstClass.set("uint", UIntPrimitiveType);
primitiveToAstClass.set("date", DatePrimitiveType);
primitiveToAstClass.set("datetime", DateTimePrimitiveType);
primitiveToAstClass.set("float", FloatPrimitiveType);
primitiveToAstClass.set("bigint", BigIntPrimitiveType);
primitiveToAstClass.set("bool", BoolPrimitiveType);
primitiveToAstClass.set("bytes", BytesPrimitiveType);
primitiveToAstClass.set("money", MoneyPrimitiveType);
primitiveToAstClass.set("decimal", DecimalPrimitiveType);
primitiveToAstClass.set("cpf", CpfPrimitiveType);
primitiveToAstClass.set("cnpj", CnpjPrimitiveType);
primitiveToAstClass.set("email", EmailPrimitiveType);
primitiveToAstClass.set("html", HtmlPrimitiveType);
primitiveToAstClass.set("url", UrlPrimitiveType);
primitiveToAstClass.set("uuid", UuidPrimitiveType);
primitiveToAstClass.set("hex", HexPrimitiveType);
primitiveToAstClass.set("base64", Base64PrimitiveType);
primitiveToAstClass.set("xml", XmlPrimitiveType);
primitiveToAstClass.set("json", JsonPrimitiveType);
primitiveToAstClass.set("void", VoidPrimitiveType);

export type DeepReadonly<T> = T extends undefined | null | boolean | string | number | Function
  ? T
  : T extends []
    ? readonly []
    : T extends [infer U, ...infer Rest]
      ? readonly [DeepReadonly<U>, ...DeepReadonly<Rest>]
      : T extends Array<infer U>
        ? ReadonlyArray<DeepReadonly<U>>
        : T extends Map<infer K, infer V>
          ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
          : T extends Set<infer U>
            ? ReadonlySet<DeepReadonly<U>>
            : { readonly [K in keyof T]: DeepReadonly<T[K]> };
