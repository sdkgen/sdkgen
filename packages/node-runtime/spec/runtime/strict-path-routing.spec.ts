/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { unlinkSync, writeFileSync } from "fs";

import { Parser } from "@sdkgen/parser";
import { generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import axios from "axios";

import type { Context } from "../../src";
import { SdkgenHttpServer } from "../../src";

const ast = new Parser(`${__dirname}/api.sdkgen`).parse();

writeFileSync(`${__dirname}/strict-path-routing-api.ts`, generateNodeServerSource(ast).replace(/@sdkgen\/node-runtime/gu, "../../src"));
const { api } = require(`${__dirname}/strict-path-routing-api.ts`);

unlinkSync(`${__dirname}/strict-path-routing-api.ts`);

const calls: string[] = [];

api.fn.identity = async (_ctx: Context, args: { value: number }) => {
  calls.push("identity");
  return args.value;
};

api.fn.sum = async (_ctx: Context, args: { a: number; b: number }) => {
  calls.push("sum");
  return args.a + args.b;
};

writeFileSync(`${__dirname}/strict-path-routing-nodeClient.ts`, generateNodeClientSource(ast).replace(/@sdkgen\/node-runtime/gu, "../../src"));
const { ApiClient: NodeApiClient } = require(`${__dirname}/strict-path-routing-nodeClient.ts`);

unlinkSync(`${__dirname}/strict-path-routing-nodeClient.ts`);

const strictServer = new SdkgenHttpServer(api, {});

strictServer.strictPathRouting = true;

const prefixedServer = new SdkgenHttpServer(api, {});

prefixedServer.strictPathRouting = true;
prefixedServer.ignoreUrlPrefix("/api");

const defaultServer = new SdkgenHttpServer(api, {});

for (const server of [strictServer, prefixedServer, defaultServer]) {
  server.log = () => {};

  server.logError = () => {};
}

async function call(port: number, path: string, body: Record<string, unknown>) {
  return axios.request<{ result: unknown; error: { type: string; message: string } | null }>({
    data: JSON.stringify(body),
    headers: { "content-type": "application/sdkgen" },
    method: "POST",
    url: `http://localhost:${port}${path}`,
    validateStatus: () => true,
  });
}

const sumV3 = { args: { a: 2, b: 3 }, name: "sum", version: 3 };

describe("strictPathRouting", () => {
  beforeAll(async () => {
    await strictServer.listen(32611);
    await prefixedServer.listen(32612);
    await defaultServer.listen(32613);
  });

  afterAll(async () => {
    await strictServer.close();
    await prefixedServer.close();
    await defaultServer.close();
  });

  beforeEach(() => {
    calls.length = 0;
  });

  test("is disabled by default, keeping the function name from the body", async () => {
    expect(defaultServer.strictPathRouting).toBe(false);

    const response = await call(32613, "/identity", sumV3);

    expect(response.status).toBe(200);
    expect(response.data.result).toBe(5);
    expect(calls).toEqual(["sum"]);
  });

  test("runs the function when the path matches the name in the body", async () => {
    const response = await call(32611, "/sum", sumV3);

    expect(response.status).toBe(200);
    expect(response.data.result).toBe(5);
    expect(calls).toEqual(["sum"]);
  });

  test("accepts a trailing slash", async () => {
    const response = await call(32611, "/sum/", sumV3);

    expect(response.status).toBe(200);
    expect(response.data.result).toBe(5);
  });

  test("rejects a path that names another function, without running either", async () => {
    const response = await call(32611, "/identity", sumV3);

    expect(response.status).toBe(400);
    expect(response.data.error?.type).toBe("Fatal");
    expect(response.data.result).toBeNull();
    expect(calls).toEqual([]);
  });

  test("rejects a path with extra segments", async () => {
    const response = await call(32611, "/whatever/sum", sumV3);

    expect(response.status).toBe(400);
    expect(calls).toEqual([]);
  });

  test("compares the path case-sensitively", async () => {
    const response = await call(32611, "/SUM", sumV3);

    expect(response.status).toBe(400);
    expect(calls).toEqual([]);
  });

  test("keeps taking the function name from the body on the root path", async () => {
    const response = await call(32611, "/", sumV3);

    expect(response.status).toBe(200);
    expect(response.data.result).toBe(5);
    expect(calls).toEqual(["sum"]);
  });

  test("applies to every request version", async () => {
    const v1 = { args: { a: 2, b: 3 }, device: { type: "test" }, id: "1", name: "sum" };
    const v2 = { args: { a: 2, b: 3 }, deviceId: "d", info: { language: "en", type: "test" }, name: "sum", requestId: "1" };

    expect((await call(32611, "/sum", v1)).status).toBe(200);
    expect((await call(32611, "/sum", v2)).status).toBe(200);
    expect((await call(32611, "/identity", v1)).status).toBe(400);
    expect((await call(32611, "/identity", v2)).status).toBe(400);
    expect(calls).toEqual(["sum", "sum"]);
  });

  test("matches the path after removing the ignored URL prefix", async () => {
    expect((await call(32612, "/api/sum", sumV3)).status).toBe(200);
    expect((await call(32612, "/api", sumV3)).status).toBe(200);
    expect((await call(32612, "/api/identity", sumV3)).status).toBe(400);
    expect(calls).toEqual(["sum", "sum"]);
  });

  test("keeps the health check working", async () => {
    const response = await axios.get(`http://localhost:32611/`, { validateStatus: () => true });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ok: true });
  });

  test("keeps serving clients that call the root path", async () => {
    const nodeClient = new NodeApiClient("http://localhost:32611");

    expect(await nodeClient.sum(null, { a: 2, b: 3 })).toBe(5);
  });
});
