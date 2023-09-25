import * as CNPJ from "@fnando/cnpj";
import * as CPF from "@fnando/cpf";
import type { AstJson, TypeDescription } from "@sdkgen/parser";
import { Decimal } from "decimal.js";

import type { DeepReadonly } from "./utils";

type TypeTable = AstJson["typeTable"];

const simpleStringTypes = ["string", "email", "html", "xml"];
const simpleTypes = ["json", "bool", "url", "int", "uint", "float", "money", "hex", "uuid", "base64", "void", ...simpleStringTypes];

type ExpandRecursively<T> = T extends object ? (T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never) : T;

type JsonType = number | string | boolean | null | JsonType[] | { [Key in string]: JsonType };

type AnyDecodedType = number | string | boolean | null | bigint | Decimal | Buffer | Date | AnyDecodedType[] | { [Key in string]: AnyDecodedType };

export type DecodedType<Type, Table extends object = {}> = TypeDescription extends Type
  ? AnyDecodedType
  : Type extends "string" | "email" | "html" | "xml" | "url" | "hex" | "uuid" | "base64" | "cpf" | "cnpj"
  ? string
  : Type extends "json"
  ? JsonType
  : Type extends "bool"
  ? boolean
  : Type extends "void"
  ? null
  : Type extends "int" | "uint" | "float" | "money"
  ? number
  : Type extends "bigint"
  ? bigint
  : Type extends "bytes"
  ? Buffer
  : Type extends "decimal"
  ? Decimal
  : Type extends "date" | "datetime"
  ? Date
  : Type extends `${infer X}?`
  ? DecodedType<X, Table> | null
  : Type extends `${infer X}[]`
  ? Array<DecodedType<X, Table>>
  : Type extends Array<string | [string, string]>
  ? DecodedEnumType<Type, Table>
  : Type extends ReadonlyArray<string | readonly [string, string]>
  ? DecodedEnumType<Type, Table>
  : Type extends object
  ? { -readonly [Key in keyof Type]: DecodedType<Type[Key], Table> }
  : object extends Table
  ? never
  : Type extends keyof Table
  ? DecodedType<Table[Type], Table>
  : never;

type DecodedEnumType<
  Type extends Array<string | [string, string]> | ReadonlyArray<string | readonly [string, string]>,
  Table extends object,
> = Type[number] extends string ? Type[number] : DecodeTaggedEnumValueType<Type[number], Table>;

type DecodeTaggedEnumValueType<
  ValueType extends string | [string, string] | readonly [string, string],
  Table extends object,
> = ValueType extends string
  ? { tag: ValueType }
  : ValueType extends [infer Tag, infer Struct]
  ? ExpandRecursively<{ tag: Tag } & DecodedType<Struct, Table>>
  : ValueType extends readonly [infer Tag, infer Struct]
  ? ExpandRecursively<{ tag: Tag } & DecodedType<Struct, Table>>
  : never;

export type EncodedType<Type, Table extends object = {}> = TypeDescription extends Type
  ? JsonType
  : Type extends "string" | "email" | "html" | "xml" | "url" | "hex" | "uuid" | "base64" | "cpf" | "cnpj"
  ? string
  : Type extends "json"
  ? JsonType
  : Type extends "bool"
  ? boolean
  : Type extends "void"
  ? null
  : Type extends "int" | "uint" | "float" | "money"
  ? number
  : Type extends "bigint" | "bytes" | "date" | "datetime" | "decimal"
  ? string
  : Type extends `${infer X}?`
  ? EncodedType<X, Table> | null
  : Type extends `${infer X}[]`
  ? Array<EncodedType<X, Table>>
  : Type extends Array<string | [string, string]>
  ? EnumEncodedValueType<Type[number], Table>
  : Type extends ReadonlyArray<string | readonly [string, string]>
  ? EnumEncodedValueType<Type[number], Table>
  : Type extends object
  ? { -readonly [Key in keyof Type]: EncodedType<Type[Key], Table> }
  : object extends Table
  ? never
  : Type extends keyof Table
  ? EncodedType<Table[Type], Table>
  : never;

type EnumEncodedValueType<ValueType extends string | [string, string] | readonly [string, string], Table extends object> = ValueType extends string
  ? ValueType
  : ValueType extends [infer Tag, infer Struct]
  ? [Tag, EncodedType<Struct, Table>]
  : ValueType extends readonly [infer Tag, infer Struct]
  ? [Tag, EncodedType<Struct, Table>]
  : never;

class ParseError extends Error {
  constructor(path: string, type: DeepReadonly<TypeDescription>, value: unknown) {
    let str: string;

    try {
      str = JSON.stringify(value);
    } catch (err) {
      str = String(value);
    }

    super(`Invalid type at '${path}', expected ${String(type)}, got ${str}`);
  }
}

function simpleEncodeDecode(path: string, type: string, value: unknown) {
  if (type === "json") {
    if (value === null || value === undefined) {
      return null;
    }

    return JSON.parse(JSON.stringify(value)) as unknown;
  } else if (type === "bool") {
    if (typeof value !== "boolean") {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (simpleStringTypes.includes(type)) {
    if (typeof value !== "string") {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (type === "hex") {
    if (typeof value !== "string" || !/^(?:[A-Fa-f0-9]{2})*$/u.test(value)) {
      throw new ParseError(path, type, value);
    }

    return value.toLowerCase();
  } else if (type === "uuid") {
    if (typeof value !== "string" || !/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$/u.test(value)) {
      throw new ParseError(path, type, value);
    }

    return value.toLowerCase();
  } else if (type === "base64") {
    if (typeof value !== "string" || Buffer.from(value, "base64").toString("base64") !== value) {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (type === "int") {
    if (typeof value !== "number" || (value | 0) !== value) {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (type === "uint") {
    if (typeof value !== "number" || (value | 0) !== value || value < 0) {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (type === "float") {
    if (typeof value !== "number") {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (type === "money") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (type === "url") {
    let url: URL | undefined;

    if (typeof value === "string") {
      try {
        url = new URL(value);
      } catch (e) {
        // ignore
      }
    }

    if (!url) {
      throw new ParseError(path, type, value);
    }

    return url.toString();
  } else if (type === "void") {
    return null;
  }

  throw new Error(`Unknown type '${type}' at '${path}'`);
}

export function encode<Table extends DeepReadonly<TypeTable>, Type extends DeepReadonly<TypeDescription>>(
  typeTable: Table,
  path: string,
  type: Type,
  value: unknown,
): EncodedType<Type, Table> {
  if (typeof type === "string" && !type.endsWith("?") && type !== "void" && (value === null || value === undefined)) {
    throw new Error(`Invalid type at '${path}', cannot be null`);
  } else if (Array.isArray(type)) {
    if (type.every(tag => typeof tag === "string")) {
      for (const tag of type) {
        if (tag === value) {
          return tag as EncodedType<Type, Table>;
        }
      }
    } else if (typeof value === "object" && value && "tag" in value) {
      const { tag: tagValue, ...restValue } = value as object & { tag: unknown };

      for (const entry of type) {
        if (typeof entry === "string") {
          if (entry === tagValue) {
            return entry as EncodedType<Type, Table>;
          }
        } else {
          const [tag, valueType] = entry as [string, string];

          if (tag === tagValue) {
            const encodedValues = encode(typeTable, `${path}.${tag}`, valueType, restValue) as object;

            // eslint-disable-next-line max-depth
            if (Object.values(encodedValues).every(v => v === null)) {
              return tag as EncodedType<Type, Table>;
            }

            return [tag, encodedValues] as EncodedType<Type, Table>;
          }
        }
      }
    }

    throw new ParseError(path, type, value);
  } else if (typeof type === "object") {
    if (typeof value !== "object") {
      throw new ParseError(path, type, value);
    }

    const obj: Record<string, unknown> = {};

    for (const key of Object.keys(type)) {
      obj[key] = encode(typeTable, `${path}.${key}`, (type as Record<string, TypeDescription>)[key], (value as Record<string, unknown>)[key]);
    }

    return obj as EncodedType<Type, Table>;
  } else if (typeof type === "string" && type.endsWith("?")) {
    if (value === null || value === undefined) {
      return null as EncodedType<Type, Table>;
    }

    return encode(typeTable, path, type.slice(0, type.length - 1), value) as EncodedType<Type, Table>;
  } else if (typeof type === "string" && type.endsWith("[]")) {
    if (!Array.isArray(value)) {
      throw new ParseError(path, type, value);
    }

    return value.map((entry, index) => encode(typeTable, `${path}[${index}]`, type.slice(0, type.length - 2), entry)) as EncodedType<Type, Table>;
  } else if (typeof type === "string" && simpleTypes.includes(type)) {
    return simpleEncodeDecode(path, type, value) as EncodedType<Type, Table>;
  } else if (type === "bytes") {
    if (!(value instanceof Buffer)) {
      throw new ParseError(path, type, value);
    }

    return value.toString("base64") as EncodedType<Type, Table>;
  } else if (type === "bigint") {
    if (!(typeof value === "bigint")) {
      throw new ParseError(path, type, value);
    }

    return value.toString() as EncodedType<Type, Table>;
  } else if (type === "cpf") {
    if (typeof value !== "string" || !CPF.isValid(value)) {
      throw new ParseError(path, type, value);
    }

    return CPF.strip(value) as EncodedType<Type, Table>;
  } else if (type === "cnpj") {
    if (typeof value !== "string" || !CNPJ.isValid(value)) {
      throw new ParseError(path, type, value);
    }

    return CNPJ.strip(value) as EncodedType<Type, Table>;
  } else if (type === "date") {
    if (!(value instanceof Date && !isNaN(value.getTime())) && !(typeof value === "string" && /^[0-9]{4}-[01][0-9]-[0123][0-9]$/u.test(value))) {
      throw new ParseError(path, type, value);
    }

    const dateValue = value instanceof Date ? value : new Date(value);

    return `${dateValue.getFullYear().toString().padStart(4, "0")}-${(dateValue.getMonth() + 1).toString().padStart(2, "0")}-${dateValue
      .getDate()
      .toString()
      .padStart(2, "0")}` as EncodedType<Type, Table>;
  } else if (type === "datetime") {
    if (
      !(value instanceof Date && !isNaN(value.getTime())) &&
      !(
        typeof value === "string" &&
        /^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](?:\.[0-9]{1,6})?(?:Z|[+-][012][0-9]:[0123456][0-9])?$/u.test(value)
      )
    ) {
      throw new ParseError(path, type, value);
    }

    return (typeof value === "string" ? new Date(value) : value).toISOString().replace("Z", "") as EncodedType<Type, Table>;
  } else if (type === "decimal") {
    if (typeof value !== "number" && (typeof value !== "string" || !/^-?[0-9]+(?:\.[0-9]+)?$/u.test(value)) && !Decimal.isDecimal(value)) {
      throw new ParseError(path, type, value);
    }

    return new Decimal(value).toString() as EncodedType<Type, Table>;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const resolved = (typeTable as Record<string, TypeDescription>)[type as string];

    if (resolved) {
      return encode(typeTable, path, resolved, value) as EncodedType<Type, Table>;
    }

    throw new Error(`Unknown type '${String(type)}' at '${path}'`);
  }
}

export function decode<Table extends DeepReadonly<TypeTable>, Type extends DeepReadonly<TypeDescription>>(
  typeTable: Table,
  path: string,
  type: Type,
  value: unknown,
): DecodedType<Type, Table> {
  if (typeof type === "string" && !type.endsWith("?") && type !== "void" && (value === null || value === undefined)) {
    throw new Error(`Invalid type at '${path}', cannot be null`);
  } else if (Array.isArray(type)) {
    if (type.every(tag => typeof tag === "string")) {
      for (const tag of type) {
        if (tag === value) {
          return tag as DecodedType<Type, Table>;
        }
      }
    } else {
      for (const entry of type) {
        if (typeof entry === "string") {
          if (entry === value) {
            return { tag: entry } as DecodedType<Type, Table>;
          }
        } else {
          const [tag, valueType] = entry as [string, string];

          if (tag === value) {
            const decodedValues = decode(typeTable, `${path}.${tag}`, valueType, {}) as object;

            return { ...decodedValues, tag } as DecodedType<Type, Table>;
          } else if (Array.isArray(value) && value.length === 2 && tag === value[0]) {
            const decodedValues = decode(typeTable, `${path}.${tag}`, valueType, value[1]) as object;

            return { ...decodedValues, tag } as DecodedType<Type, Table>;
          }
        }
      }
    }

    throw new ParseError(path, type, value);
  } else if (typeof type === "object") {
    if (typeof value !== "object") {
      throw new ParseError(path, type, value);
    }

    const obj: Record<string, unknown> = {};

    for (const key of Object.keys(type)) {
      obj[key] = decode(typeTable, `${path}.${key}`, (type as Record<string, TypeDescription>)[key], (value as Record<string, unknown>)[key]);
    }

    return obj as DecodedType<Type, Table>;
  } else if (typeof type === "string" && type.endsWith("?")) {
    if (value === null || value === undefined) {
      return null as DecodedType<Type, Table>;
    }

    return decode(typeTable, path, type.slice(0, type.length - 1), value) as unknown as DecodedType<Type, Table>;
  } else if (typeof type === "string" && type.endsWith("[]")) {
    if (!Array.isArray(value)) {
      throw new ParseError(path, type, value);
    }

    return value.map((entry, index) => decode(typeTable, `${path}[${index}]`, type.slice(0, type.length - 2), entry)) as DecodedType<Type, Table>;
  } else if (typeof type === "string" && simpleTypes.includes(type)) {
    return simpleEncodeDecode(path, type, value) as DecodedType<Type, Table>;
  } else if (type === "bytes") {
    if (typeof value !== "string") {
      throw new ParseError(path, `${String(type)} (base 64)`, value);
    }

    const buffer = Buffer.from(value, "base64");

    if (buffer.toString("base64") !== value) {
      throw new ParseError(path, `${String(type)} (base 64)`, value);
    }

    return buffer as DecodedType<Type, Table>;
  } else if (type === "bigint") {
    if (typeof value !== "number" && (typeof value !== "string" || !/^-?[0-9]+$/u.test(value))) {
      throw new ParseError(path, type, value);
    }

    return BigInt(value) as DecodedType<Type, Table>;
  } else if (type === "cpf") {
    if (typeof value !== "string" || !CPF.isValid(value)) {
      throw new ParseError(path, type, value);
    }

    return CPF.format(value) as DecodedType<Type, Table>;
  } else if (type === "cnpj") {
    if (typeof value !== "string" || !CNPJ.isValid(value)) {
      throw new ParseError(path, type, value);
    }

    return CNPJ.format(value) as DecodedType<Type, Table>;
  } else if (type === "date") {
    if (typeof value !== "string" || !/^[0-9]{4}-[01][0-9]-[0123][0-9]$/u.test(value)) {
      throw new ParseError(path, type, value);
    }

    const day = parseInt(value.split("-")[2], 10);
    const month = parseInt(value.split("-")[1], 10) - 1;
    const year = parseInt(value.split("-")[0], 10);
    const date = new Date(year, month, day);

    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      throw new ParseError(path, type, value);
    }

    return date as DecodedType<Type, Table>;
  } else if (type === "datetime") {
    if (typeof value !== "string" || !/^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](?:\.[0-9]{1,6})?Z?$/u.test(value)) {
      throw new ParseError(path, type, value);
    }

    return new Date(`${value.endsWith("Z") ? value : value.concat("Z")}`) as DecodedType<Type, Table>;
  } else if (type === "decimal") {
    if (typeof value !== "number" && (typeof value !== "string" || !/^-?[0-9]+(?:\.[0-9]+)?$/u.test(value))) {
      throw new ParseError(path, type, value);
    }

    return new Decimal(value) as DecodedType<Type, Table>;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const resolved = (typeTable as Record<string, TypeDescription>)[type as string];

    if (resolved) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return decode(typeTable, path, resolved, value) as unknown as DecodedType<Type, Table>;
    }

    throw new Error(`Unknown type '${String(type)}' at '${path}'`);
  }
}
