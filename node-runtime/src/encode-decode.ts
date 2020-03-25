import * as CNPJ from "@fnando/cnpj";
import * as CPF from "@fnando/cpf";
import { AstJson, TypeDescription } from "@sdkgen/parser";

type TypeTable = AstJson["typeTable"];

const simpleStringTypes = ["string", "email", "xml"];
const simpleTypes = [
    "json",
    "bool",
    "url",
    "int",
    "uint",
    "float",
    "money",
    "hex",
    "uuid",
    "base64",
    "void",
    ...simpleStringTypes,
];

function simpleEncodeDecode(path: string, type: string, value: any) {
    if (type === "json") {
        if (value === null || value === undefined) {
            return null;
        }

        return JSON.parse(JSON.stringify(value));
    } else if (type === "bool") {
        if (typeof value !== "boolean") {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value;
    } else if (simpleStringTypes.includes(type)) {
        if (typeof value !== "string") {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value;
    } else if (type === "hex") {
        if (typeof value !== "string" || !value.match(/^(?:[A-Fa-f0-9]{2})*$/u)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value.toLowerCase();
    } else if (type === "uuid") {
        if (
            typeof value !== "string" ||
            !value.match(/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$/u)
        ) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value.toLowerCase();
    } else if (type === "base64") {
        if (typeof value !== "string" || Buffer.from(value, "base64").toString("base64") !== value) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value;
    } else if (type === "int") {
        if (typeof value !== "number" || (value | 0) !== value) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value;
    } else if (type === "uint") {
        if (typeof value !== "number" || (value | 0) !== value || value < 0) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value;
    } else if (type === "float") {
        if (typeof value !== "number") {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value;
    } else if (type === "money") {
        if (typeof value !== "number" || !Number.isInteger(value)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value;
    } else if (type === "url") {
        let isValid = typeof value === "string";
        let url!: URL;

        if (isValid) {
            try {
                url = new URL(value);
            } catch (e) {
                isValid = false;
            }
        }

        if (!isValid) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return url.toString();
    } else if (type === "void") {
        return null;
    }

    throw new Error(`Unknown type '${type}' at '${path}'`);
}

export function encode(typeTable: TypeTable, path: string, type: TypeDescription, value: any): any {
    if (typeof type === "string" && !type.endsWith("?") && type !== "void" && (value === null || value === undefined)) {
        throw new Error(`Invalid type at '${path}', cannot be null`);
    } else if (Array.isArray(type)) {
        if (!type.includes(value)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value;
    } else if (typeof type === "object") {
        if (typeof value !== "object" || value === undefined) {
            throw new Error(`Invalid type at '${path}', expected object, got ${JSON.stringify(value)}`);
        }

        const obj: any = {};

        for (const key of Object.keys(type)) {
            obj[key] = encode(typeTable, `${path}.${key}`, type[key], value[key]);
        }

        return obj;
    } else if (type.endsWith("?")) {
        if (value === null || value === undefined) {
            return null;
        }

        return encode(typeTable, path, type.slice(0, type.length - 1), value);
    } else if (type.endsWith("[]")) {
        if (!Array.isArray(value)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value.map((entry, index) =>
            encode(typeTable, `${path}[${index}]`, type.slice(0, type.length - 2), entry),
        );
    } else if (simpleTypes.includes(type)) {
        return simpleEncodeDecode(path, type, value);
    } else if (type === "bytes") {
        if (!(value instanceof Buffer)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value.toString("base64");
    } else if (type === "bigint") {
        if (!(value instanceof BigInt)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }
        return value.toString();
    } else if (type === "cpf") {
        if (typeof value !== "string" || !CPF.isValid(value)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return CPF.strip(value);
    } else if (type === "cnpj") {
        if (typeof value !== "string" || !CNPJ.isValid(value)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return CNPJ.strip(value);
    } else if (type === "date") {
        if (
            !(value instanceof Date) &&
            !(typeof value === "string" && value.match(/^[0-9]{4}-[01][0-9]-[0123][0-9]$/))
        ) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return typeof value === "string"
            ? new Date(value).toISOString().split("T")[0]
            : value.toISOString().split("T")[0];
    } else if (type === "datetime") {
        if (
            !(value instanceof Date) &&
            !(
                typeof value === "string" &&
                value.match(
                    /^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](?:\.[0-9]{1,6})?(?:Z|[+-][012][0-9]:[0123456][0-9])?$/,
                )
            )
        ) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
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

export function decode(typeTable: TypeTable, path: string, type: TypeDescription, value: any): any {
    if (typeof type === "string" && !type.endsWith("?") && type !== "void" && (value === null || value === undefined)) {
        throw new Error(`Invalid type at '${path}', cannot be null`);
    } else if (Array.isArray(type)) {
        if (!type.includes(value)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value;
    } else if (typeof type === "object") {
        if (typeof value !== "object" || value === undefined) {
            throw new Error(`Invalid type at '${path}', expected object, got ${JSON.stringify(value)}`);
        }

        const obj: any = {};

        for (const key of Object.keys(type)) {
            obj[key] = decode(typeTable, `${path}.${key}`, type[key], value[key]);
        }

        return obj;
    } else if (type.endsWith("?")) {
        if (value === null || value === undefined) {
            return null;
        }

        return decode(typeTable, path, type.slice(0, type.length - 1), value);
    } else if (type.endsWith("[]")) {
        if (!Array.isArray(value)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return value.map((entry, index) =>
            decode(typeTable, `${path}[${index}]`, type.slice(0, type.length - 2), entry),
        );
    } else if (simpleTypes.includes(type)) {
        return simpleEncodeDecode(path, type, value);
    } else if (type === "bytes") {
        if (typeof value !== "string") {
            throw new Error(`Invalid type at '${path}', expected ${type} (base64), got ${JSON.stringify(value)}`);
        }

        const buffer = Buffer.from(value, "base64");

        if (buffer.toString("base64") !== value) {
            throw new Error(`Invalid type at '${path}', expected ${type} (base64), got ${JSON.stringify(value)}`);
        }

        return buffer;
    } else if (type === "bigint") {
        if (typeof value !== "number" && (typeof value !== "string" || !value.match(/^-?[0-9]+$/))) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }
        return BigInt(value);
    } else if (type === "cpf") {
        if (typeof value !== "string" || !CPF.isValid(value)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return CPF.format(value);
    } else if (type === "cnpj") {
        if (typeof value !== "string" || !CNPJ.isValid(value)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return CNPJ.format(value);
    } else if (type === "date") {
        if (typeof value !== "string" || !value.match(/^[0-9]{4}-[01][0-9]-[0123][0-9]$/u)) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        if (parseInt(value.split("-")[2], 10) > 31 || parseInt(value.split("-")[1], 10) - 1 > 11) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return new Date(
            parseInt(value.split("-")[0], 10),
            parseInt(value.split("-")[1], 10) - 1,
            parseInt(value.split("-")[2], 10),
        );
    } else if (type === "datetime") {
        if (
            typeof value !== "string" ||
            !value.match(
                /^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](?:\.[0-9]{1,6})?Z?$/u,
            )
        ) {
            throw new Error(`Invalid type at '${path}', expected ${type}, got ${JSON.stringify(value)}`);
        }

        return new Date(`${value}Z`);
    } else {
        const resolved = typeTable[type];

        if (resolved) {
            return decode(typeTable, path, resolved, value);
        }

        throw new Error(`Unknown type '${type}' at '${path}'`);
    }
}
