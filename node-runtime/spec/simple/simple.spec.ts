/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { randomBytes } from "crypto";
import { unlinkSync, writeFileSync } from "fs";

import { astToJson, Parser } from "@sdkgen/parser";
import { generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import axios from "axios";

import type { Context } from "../../src";
import { SdkgenHttpServer } from "../../src";

const ast = new Parser(`${__dirname}/api.sdkgen`).parse();

writeFileSync(`${__dirname}/api.ts`, generateNodeServerSource(ast).replace("@sdkgen/node-runtime", "../../src"));
const { api, SomeError } = require(`${__dirname}/api.ts`);

unlinkSync(`${__dirname}/api.ts`);

let lastCallCtx: Context & { aaa: boolean } = null as any;

api.fn.getUser = async (ctx: Context & { aaa: boolean }, { id }: { id: string }) => {
  lastCallCtx = ctx;
  return {
    age: 1,
    name: id,
  };
};

api.fn.identity = async (ctx: Context & { aaa: boolean }, { types }: { types: any }) => {
  lastCallCtx = ctx;
  return types;
};

api.fn.throwsError = async () => {
  throw new SomeError("Some message");
};

// ExecSync(`../../cubos/sdkgen/sdkgen ${__dirname + "/api.sdkgen"} -o ${__dirname + "/legacyNodeClient.ts"} -t typescript_nodeclient`);
const { ApiClient: NodeLegacyApiClient } = require(`${__dirname}/legacyNodeClient.ts`);
const nodeLegacyClient = new NodeLegacyApiClient("http://localhost:8000");

writeFileSync(`${__dirname}/nodeClient.ts`, generateNodeClientSource(ast).replace("@sdkgen/node-runtime", "../../src"));
const { ApiClient: NodeApiClient } = require(`${__dirname}/nodeClient.ts`);

unlinkSync(`${__dirname}/nodeClient.ts`);
const nodeClient = new NodeApiClient("http://localhost:8000");

const server = new SdkgenHttpServer(api, { aaa: true });

describe("Simple API", () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(async () => {
    await server.close();
  });

  test("Healthcheck on 'GET /' only", async () => {
    expect(await axios.get("http://localhost:8000/")).toMatchObject({ data: { ok: true } });
    await expect(axios.get("http://localhost:8000/egesg")).rejects.toThrowError();
  });

  test("Can get ast.json at runtime", async () => {
    expect(await axios.get("http://localhost:8000/ast.json")).toMatchObject({ data: astToJson(ast) });
    server.introspection = false;
    await expect(axios.get("http://localhost:8000/ast.json")).rejects.toThrowError();
  });

  test("Can make a call from legacy node client", async () => {
    expect(await nodeLegacyClient.getUser("abc")).toEqual({ age: 1, name: "abc" });
    expect(await nodeLegacyClient.getUser("5hdr")).toEqual({ age: 1, name: "5hdr" });

    expect(lastCallCtx.request).toMatchObject({ deviceInfo: { type: "node" }, name: "getUser" });
    expect(lastCallCtx.aaa).toBe(true);
  });

  test("Can make a call from newer node client", async () => {
    expect(await nodeClient.getUser(null, { id: "abc" })).toEqual({ age: 1, name: "abc" });
    expect(await nodeClient.getUser(null, { id: "5hdr" })).toEqual({ age: 1, name: "5hdr" });

    expect(lastCallCtx.request).toMatchObject({ deviceInfo: { type: "node" }, name: "getUser" });
  });

  test("Can process all types as identity", async () => {
    const types = {
      array: [1, 2, 3],
      arrayOfOptionals: [1, null, 3],
      base64: "SGVsbG8K",
      bool: true,
      bytes: randomBytes(23),
      date: new Date(2019, 12, 3),
      datetime: new Date(),
      enum: "aa",
      float: 22235.6,
      hex: "f84c4d20",
      int: -25,
      json: [{ a: 23, b: "odcbu" }],
      money: 356,
      optional1: null,
      optional2: 2525,
      string: "efvregare",
      struct: { aa: 42 },
      uint: 243,
      uuid: "f84c4d20-eed8-4004-b236-74aaa71fbeca",
    };

    expect(await nodeClient.identity(null, { types })).toEqual(types);
  });

  test("Errors are passed correctly", async () => {
    await expect(nodeClient.throwsError(null, {})).rejects.toMatchObject({
      message: "Some message",
      type: "SomeError",
    });
  });
});
