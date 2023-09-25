import Decimal from "decimal.js-light";

import type { TypeDescription, TypeTable } from "./ast";
import type { DeepReadonly } from "./utils";

const simpleStringTypes = ["string", "email", "phone", "html", "xml"];
const simpleTypes = ["json", "bool", "url", "int", "uint", "float", "money", "hex", "uuid", "base64", "void", ...simpleStringTypes];

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
  } else if (simpleStringTypes.indexOf(type) >= 0) {
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
    let isValidBase64 = true;

    try {
      atob(value as string);
    } catch {
      isValidBase64 = false;
    }

    if (typeof value !== "string" || !isValidBase64) {
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

export function encode(typeTable: DeepReadonly<TypeTable>, path: string, type: DeepReadonly<TypeDescription>, value: unknown): unknown {
  if (typeof type === "string" && !type.endsWith("?") && type !== "void" && (value === null || value === undefined)) {
    throw new Error(`Invalid type at '${path}', cannot be null`);
  } else if (Array.isArray(type)) {
    for (const entry of type) {
      if (entry === value) {
        return value;
      }

      if (Array.isArray(value) && value.length === 2 && entry === value[0]) {
        return value[0];
      }

      if (Array.isArray(entry) && entry.length === 2) {
        if (entry[0] === value) {
          return [value, encode(typeTable, `${path}.${entry[0]}`, entry[1], {})];
        } else if (Array.isArray(value) && value.length === 2 && entry[0] === value[0]) {
          return [value[0], encode(typeTable, `${path}.${entry[0]}`, entry[1], value[1])] as unknown;
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

    return obj;
  } else if (type.endsWith("?")) {
    if (value === null || value === undefined) {
      return null;
    }

    return encode(typeTable, path, type.slice(0, type.length - 1), value);
  } else if (type.endsWith("[]")) {
    if (!Array.isArray(value)) {
      throw new ParseError(path, type, value);
    }

    return value.map((entry, index) => encode(typeTable, `${path}[${index}]`, type.slice(0, type.length - 2), entry));
  } else if (simpleTypes.indexOf(type) >= 0) {
    return simpleEncodeDecode(path, type, value);
  } else if (type === "bytes") {
    if (!(value instanceof ArrayBuffer)) {
      throw new ParseError(path, type, value);
    }

    return btoa(String.fromCharCode(...(new Uint8Array(value) as unknown as number[])));
  } else if (type === "bigint") {
    if (!(typeof value === "bigint")) {
      throw new ParseError(path, type, value);
    }

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return value.toString();
  } else if (type === "cpf") {
    if (typeof value !== "string") {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (type === "cnpj") {
    if (typeof value !== "string") {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (type === "date") {
    if (!(value instanceof Date && !isNaN(value.getTime())) && !(typeof value === "string" && /^[0-9]{4}-[01][0-9]-[0123][0-9]$/u.test(value))) {
      throw new ParseError(path, type, value);
    }

    const dateValue = value instanceof Date ? value : new Date(value);

    return `${dateValue.getFullYear().toString().padStart(4, "0")}-${(dateValue.getMonth() + 1).toString().padStart(2, "0")}-${dateValue
      .getDate()
      .toString()
      .padStart(2, "0")}`;
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

    return (typeof value === "string" ? new Date(value) : value).toISOString().replace("Z", "");
  } else if (type === "decimal") {
    if (typeof value !== "number" && (typeof value !== "string" || !/^-?[0-9]+(?:\.[0-9]+)?$/u.test(value)) && !(value instanceof Decimal)) {
      throw new ParseError(path, type, value);
    }

    return new Decimal(value).toString();
  } else {
    const resolved = typeTable[type];

    if (resolved) {
      return encode(typeTable, path, resolved, value);
    }

    throw new Error(`Unknown type '${type}' at '${path}'`);
  }
}

export function decode(typeTable: DeepReadonly<TypeTable>, path: string, type: DeepReadonly<TypeDescription>, value: unknown): unknown {
  if (typeof type === "string" && !type.endsWith("?") && type !== "void" && (value === null || value === undefined)) {
    throw new Error(`Invalid type at '${path}', cannot be null`);
  } else if (Array.isArray(type)) {
    for (const entry of type) {
      if (entry === value) {
        return value;
      }

      if (Array.isArray(value) && value.length === 2 && entry === value[0]) {
        return value[0];
      }

      if (Array.isArray(entry) && entry.length === 2) {
        if (entry[0] === value) {
          return [value, decode(typeTable, `${path}.${entry[0]}`, entry[1], {})];
        } else if (Array.isArray(value) && value.length === 2 && entry[0] === value[0]) {
          return [value[0], decode(typeTable, `${path}.${entry[0]}`, entry[1], value[1])] as unknown;
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

    return obj;
  } else if (type.endsWith("?")) {
    if (value === null || value === undefined) {
      return null;
    }

    return decode(typeTable, path, type.slice(0, type.length - 1), value);
  } else if (type.endsWith("[]")) {
    if (!Array.isArray(value)) {
      throw new ParseError(path, type, value);
    }

    return value.map((entry, index) => decode(typeTable, `${path}[${index}]`, type.slice(0, type.length - 2), entry));
  } else if (simpleTypes.indexOf(type) >= 0) {
    return simpleEncodeDecode(path, type, value);
  } else if (type === "bytes") {
    if (typeof value !== "string") {
      throw new ParseError(path, `${type} (base 64)`, value);
    }

    try {
      return Uint8Array.from(atob(value), c => c.charCodeAt(0));
    } catch {
      throw new ParseError(path, `${type} (base 64)`, value);
    }
  } else if (type === "bigint") {
    if (typeof value !== "number" && (typeof value !== "string" || !/^-?[0-9]+$/u.test(value))) {
      throw new ParseError(path, type, value);
    }

    return BigInt(value);
  } else if (type === "cpf") {
    if (typeof value !== "string") {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (type === "cnpj") {
    if (typeof value !== "string") {
      throw new ParseError(path, type, value);
    }

    return value;
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

    return date;
  } else if (type === "datetime") {
    if (typeof value !== "string" || !/^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](?:\.[0-9]{1,6})?Z?$/u.test(value)) {
      throw new ParseError(path, type, value);
    }

    return new Date(`${value.endsWith("Z") ? value : value.concat("Z")}`);
  } else if (type === "decimal") {
    if (typeof value !== "number" && (typeof value !== "string" || !/^-?[0-9]+(?:\.[0-9]+)?$/u.test(value))) {
      throw new ParseError(path, type, value);
    }

    return new Decimal(value);
  } else {
    const resolved = typeTable[type];

    if (resolved) {
      return decode(typeTable, path, resolved, value);
    }

    throw new Error(`Unknown type '${type}' at '${path}'`);
  }
}
