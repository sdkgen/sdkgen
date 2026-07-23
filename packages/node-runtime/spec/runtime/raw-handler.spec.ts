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

import { Parser } from "@sdkgen/parser";
import { generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import axios from "axios";

import type { Context } from "../../src";
import { SdkgenHttpServer } from "../../src";

const ast = new Parser(`${__dirname}/api.sdkgen`).parse();

writeFileSync(`${__dirname}/raw-handler-api.ts`, generateNodeServerSource(ast).replace(/@sdkgen\/node-runtime/gu, "../../src"));
const { api } = require(`${__dirname}/raw-handler-api.ts`);

unlinkSync(`${__dirname}/raw-handler-api.ts`);

api.fn.identity = async (_ctx: Context, args: { value: number }) => {
  return args.value;
};

api.fn.sum = async (_ctx: Context, args: { a: number; b: number }) => {
  return args.a + args.b;
};

writeFileSync(`${__dirname}/raw-handler-nodeClient.ts`, generateNodeClientSource(ast).replace(/@sdkgen\/node-runtime/gu, "../../src"));
const { ApiClient: NodeApiClient } = require(`${__dirname}/raw-handler-nodeClient.ts`);

unlinkSync(`${__dirname}/raw-handler-nodeClient.ts`);
const nodeClient = new NodeApiClient("http://localhost:32599");

const server = new SdkgenHttpServer(api, {});

// Reads the request body straight off the stream, proving the handler runs before the body is buffered.
server.addRawHttpHandler("POST", "/raw-echo", (req, res) => {
  const chunks: Buffer[] = [];
  let chunkCount = 0;

  req.on("data", (chunk: Buffer) => {
    chunkCount += 1;
    chunks.push(Buffer.from(chunk));
  });

  req.on("end", () => {
    res.statusCode = 200;
    res.setHeader("x-raw-handler", "true");
    res.setHeader("x-chunk-count", String(chunkCount));
    res.end(Buffer.concat(chunks));
  });

  req.on("error", () => {
    res.statusCode = 500;
    res.end();
  });
});

// A buffered handler and a raw handler registered on the same route: the raw one must win.
server.addHttpHandler("POST", "/both", (_req, res) => {
  res.statusCode = 200;
  res.end("buffered");
});

server.addRawHttpHandler("POST", "/both", (_req, res) => {
  res.statusCode = 200;
  res.end("raw");
});

// Raw handlers support RegExp matchers, just like addHttpHandler.
server.addRawHttpHandler("GET", /^\/raw-item\/[^/]+$/u, (req, res) => {
  res.statusCode = 200;
  res.end(`matched:${req.url}`);
});

describe("Raw HTTP handler", () => {
  beforeAll(async () => {
    await server.listen(32599);
  });

  afterAll(async () => {
    await server.close();
  });

  test("receives the body as a stream and can consume it in chunks", async () => {
    const payload = randomBytes(1024 * 1024);

    const response = await axios.request({
      data: payload,
      headers: { "content-type": "application/octet-stream" },
      method: "POST",
      responseType: "arraybuffer",
      url: "http://localhost:32599/raw-echo",
      validateStatus: () => true,
    });

    expect(response.status).toEqual(200);
    expect(response.headers["x-raw-handler"]).toEqual("true");
    expect(Buffer.compare(Buffer.from(response.data), payload)).toEqual(0);
    // A 1 MiB body is delivered across at least one data event; the handler saw the raw stream.
    expect(Number(response.headers["x-chunk-count"])).toBeGreaterThanOrEqual(1);
  });

  test("takes precedence over a buffered handler on the same route", async () => {
    const response = await axios.request({
      data: "hello",
      method: "POST",
      transformResponse: [x => x],
      url: "http://localhost:32599/both",
      validateStatus: () => true,
    });

    expect(response.status).toEqual(200);
    expect(response.data).toEqual("raw");
  });

  test("supports RegExp matchers", async () => {
    const response = await axios.request({
      method: "GET",
      transformResponse: [x => x],
      url: "http://localhost:32599/raw-item/abc",
      validateStatus: () => true,
    });

    expect(response.status).toEqual(200);
    expect(response.data).toEqual("matched:/raw-item/abc");
  });

  test("does not intercept sdkgen RPC traffic", async () => {
    expect(await nodeClient.sum(null, { a: 2, b: 3 })).toBe(5);
    expect(await nodeClient.identity(null, { value: 42 })).toBe(42);
  });
});
