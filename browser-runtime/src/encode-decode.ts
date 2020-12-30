import type { TypeDescription, TypeTable } from "./ast";

const simpleStringTypes = ["string", "email", "phone", "html", "xml"];
const simpleTypes = ["json", "bool", "url", "int", "uint", "float", "money", "hex", "uuid", "base64", "void", ...simpleStringTypes];

class ParseError extends Error {
  constructor(path: string, type: TypeDescription, value: unknown) {
    let str: string;

    try {
      str = JSON.stringify(value);
    } catch (err) {
      str = String(value);
    }

    super(`Invalid type at '${path}', expected ${type}, got ${str}`);
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
    if (typeof value !== "string" || !/^(?:[A-Fa-f0-9]{2})*$/u.exec(value)) {
      throw new ParseError(path, type, value);
    }

    return value.toLowerCase();
  } else if (type === "uuid") {
    if (typeof value !== "string" || !/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$/u.exec(value)) {
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

export function encode(typeTable: TypeTable, path: string, type: TypeDescription, value: unknown): unknown {
  if (typeof type === "string" && !type.endsWith("?") && type !== "void" && (value === null || value === undefined)) {
    throw new Error(`Invalid type at '${path}', cannot be null`);
  } else if (Array.isArray(type)) {
    if (typeof value !== "string" || type.indexOf(value) < 0) {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (typeof type === "object") {
    if (typeof value !== "object") {
      throw new ParseError(path, type, value);
    }

    const obj: Record<string, unknown> = {};

    for (const key of Object.keys(type)) {
      obj[key] = encode(typeTable, `${path}.${key}`, type[key], (value as Record<string, unknown>)[key]);
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
    if (!(value instanceof Buffer)) {
      throw new ParseError(path, type, value);
    }

    return value.toString("base64");
  } else if (type === "bigint") {
    if (!(typeof value === "bigint")) {
      throw new ParseError(path, type, value);
    }

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
    if (!(value instanceof Date) && !(typeof value === "string" && /^[0-9]{4}-[01][0-9]-[0123][0-9]$/u.exec(value))) {
      throw new ParseError(path, type, value);
    }

    return typeof value === "string" ? new Date(value).toISOString().split("T")[0] : value.toISOString().split("T")[0];
  } else if (type === "datetime") {
    if (
      !(value instanceof Date) &&
      !(
        typeof value === "string" &&
        /^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](?:\.[0-9]{1,6})?(?:Z|[+-][012][0-9]:[0123456][0-9])?$/u.exec(value)
      )
    ) {
      throw new ParseError(path, type, value);
    }

    return (typeof value === "string" ? new Date(value) : value).toISOString().replace("Z", "");
  } else {
    const resolved = typeTable[type];

    if (resolved) {
      return encode(typeTable, path, resolved, value);
    }

    throw new Error(`Unknown type '${type}' at '${path}'`);
  }
}

export function decode(typeTable: TypeTable, path: string, type: TypeDescription, value: unknown): unknown {
  if (typeof type === "string" && !type.endsWith("?") && type !== "void" && (value === null || value === undefined)) {
    throw new Error(`Invalid type at '${path}', cannot be null`);
  } else if (Array.isArray(type)) {
    if (typeof value !== "string" || type.indexOf(value) < 0) {
      throw new ParseError(path, type, value);
    }

    return value;
  } else if (typeof type === "object") {
    if (typeof value !== "object") {
      throw new ParseError(path, type, value);
    }

    const obj: Record<string, unknown> = {};

    for (const key of Object.keys(type)) {
      obj[key] = decode(typeTable, `${path}.${key}`, type[key], (value as Record<string, unknown>)[key]);
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

    const buffer = Buffer.from(value, "base64");

    if (buffer.toString("base64") !== value) {
      throw new ParseError(path, `${type} (base 64)`, value);
    }

    return buffer;
  } else if (type === "bigint") {
    if (typeof value !== "number" && (typeof value !== "string" || !/^-?[0-9]+$/u.exec(value))) {
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
    if (typeof value !== "string" || !/^[0-9]{4}-[01][0-9]-[0123][0-9]$/u.exec(value)) {
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
    if (typeof value !== "string" || !/^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](?:\.[0-9]{1,6})?Z?$/u.exec(value)) {
      throw new ParseError(path, type, value);
    }

    return new Date(`${value.endsWith("Z") ? value : value.concat("Z")}`);
  } else {
    const resolved = typeTable[type];

    if (resolved) {
      return decode(typeTable, path, resolved, value);
    }

    throw new Error(`Unknown type '${type}' at '${path}'`);
  }
}
