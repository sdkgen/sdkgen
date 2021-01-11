/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { unlinkSync, writeFileSync } from "fs";
import type { Readable } from "stream";

import { Parser } from "@sdkgen/parser";
import { generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import axios from "axios";
import FormData from "form-data";

import type { Context } from "../../src";
import { SdkgenHttpServer } from "../../src";

const ast = new Parser(`${__dirname}/api.sdkgen`).parse();

writeFileSync(`${__dirname}/api.ts`, generateNodeServerSource(ast).replace(/@sdkgen\/node-runtime/gu, "../../src"));
const { api, TestError } = require(`${__dirname}/api.ts`);

unlinkSync(`${__dirname}/api.ts`);

api.fn.add = async (ctx: Context, { first, second }: { first: number; second: string }) => {
  return `${first}${second}`;
};

api.fn.maybe = async (ctx: Context, { bin }: { bin: string | null }) => {
  return bin === null ? null : Buffer.from(bin, "hex");
};

api.fn.hex = async (ctx: Context, { bin }: { bin: Buffer }) => {
  return bin.toString("hex");
};

api.fn.obj = async (ctx: Context, { obj }: { obj: { val: number } }) => {
  if (obj.val === 0) {
    throw new Error("Value is zero ~ Fatal");
  }

  if (obj.val === -100) {
    throw new TestError("Value is -100 ~ TestError");
  }

  return obj;
};

async function readAllStream(stream: Readable) {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on("error", err => reject(err));
    stream.on("data", data => chunks.push(Buffer.from(data)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

api.fn.uploadFile = async (ctx: Context) => {
  return Promise.all(
    ctx.request.files.map(async ({ name, contents }) => ({
      data: await readAllStream(contents),
      name,
    })),
  );
};

api.fn.getHtml = async () => {
  return "<h1>Hello world!</h1>";
};

api.fn.getXml = async () => {
  return "<h1>Hello world!</h1>";
};

writeFileSync(`${__dirname}/nodeClient.ts`, generateNodeClientSource(ast).replace(/@sdkgen\/node-runtime/gu, "../../src"));
const { ApiClient: NodeApiClient } = require(`${__dirname}/nodeClient.ts`);

unlinkSync(`${__dirname}/nodeClient.ts`);

const nodeClient = new NodeApiClient("http://localhost:8001");

const server = new SdkgenHttpServer(api, {});

describe("Rest API", () => {
  beforeAll(() => {
    server.listen(8001);
  });

  afterAll(async () => {
    await server.close();
  });

  test("add with sdkgen", async () => {
    expect(await nodeClient.add(null, { first: 1, second: "aa" })).toEqual("1aa");
  });

  const table: Array<{
    method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
    path: string;
    result: string;
    data?: string | Buffer;
    headers?: Record<string, string | string[]>;
    statusCode?: number;
    resultHeaders?: Record<string, string | string[]>;
  }> = [
    { method: "GET", path: "/add1/1/aa", result: "1aa" },
    { method: "GET", path: "/add1/1/aa/", result: "1aa" },
    {
      headers: {
        accept: "application/json",
      },
      method: "GET",
      path: "/add1/1/aa",
      result: '"1aa"',
    },
    { method: "GET", path: "/add2&second=aa&first=1", result: "", statusCode: 404 },
    { method: "GET", path: "/add2?second=aa&first=1", result: "1aa" },
    { method: "GET", path: "/add2?first=1&second=aa", result: "1aa" },
    {
      headers: {
        "x-second": "aa",
      },
      method: "GET",
      path: "/add3?first=1",
      result: "1aa",
    },
    {
      headers: {
        accept: "application/json",
        "x-second": "aa",
      },
      method: "GET",
      path: "/add3?first=1",
      result: '"1aa"',
    },
    {
      data: "1",
      headers: {
        "x-second": "aa",
      },
      method: "POST",
      path: "/add4",
      result: "1aa",
    },
    {
      data: "1",
      headers: {
        accept: "application/json",
        "x-second": "aa",
      },
      method: "POST",
      path: "/add4",
      result: '"1aa"',
    },
    {
      data: "aa",
      headers: {
        "x-first": "1",
      },
      method: "POST",
      path: "/add5",
      result: "1aa",
    },
    {
      data: '"aa"',
      headers: {
        "content-type": "application/json",
        "x-first": "1",
      },
      method: "POST",
      path: "/add5",
      result: "1aa",
    },
    {
      data: '"aa"',
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-first": "1",
      },
      method: "POST",
      path: "/add5",
      result: '"1aa"',
    },
    { method: "POST", path: "/add6?second=aa&first=1", result: "1aa" },
    { method: "POST", path: "/add6?first=1&second=aa", result: "1aa" },
    {
      data: "second=aa&first=1",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
      path: "/add6",
      result: "1aa",
    },
    {
      data: "first=1&second=aa",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
      path: "/add6",
      result: "1aa",
    },
    {
      method: "GET",
      path: "/maybe",
      result: "",
      statusCode: 404,
    },
    {
      method: "GET",
      path: "/maybe?bin=4d546864",
      result: "MThd",
      resultHeaders: {
        "content-type": "audio/midi",
      },
    },
    {
      method: "GET",
      path: "/maybe?bin=61",
      result: "a",
      resultHeaders: {
        "content-type": "application/octet-stream",
      },
    },
    {
      headers: {
        accept: "application/json",
      },
      method: "GET",
      path: "/maybe?bin=61",
      result: '"YQ=="',
    },
    {
      method: "POST",
      path: "/maybe",
      result: "",
      statusCode: 204,
    },
    {
      data: "61",
      method: "POST",
      path: "/maybe",
      result: "a",
      resultHeaders: {
        "content-type": "application/octet-stream",
      },
    },
    {
      data: "a",
      method: "POST",
      path: "/hex",
      result: "61",
    },
    {
      data: `{"val":15}`,
      method: "POST",
      path: "/obj",
      result: `{"val":15}`,
      resultHeaders: {
        "content-type": "application/json",
      },
    },
    {
      data: `{"val":0}`,
      method: "POST",
      path: "/obj",
      result: `{"message":"Value is zero ~ Fatal","type":"Fatal"}`,
      resultHeaders: {
        "content-type": "application/json",
      },
      statusCode: 500,
    },
    {
      data: `{"val":-100}`,
      method: "POST",
      path: "/obj",
      result: `{"message":"Value is -100 ~ TestError","type":"TestError"}`,
      resultHeaders: {
        "content-type": "application/json",
      },
      statusCode: 400,
    },
    {
      method: "POST",
      path: "/upload",
      result: `[]`,
      resultHeaders: {
        "content-type": "application/json",
      },
      statusCode: 200,
    },
    {
      method: "GET",
      path: "/html",
      result: "<h1>Hello world!</h1>",
      resultHeaders: {
        "content-type": "text/html",
      },
    },
    {
      method: "GET",
      path: "/xml",
      result: "<h1>Hello world!</h1>",
      resultHeaders: {
        "content-type": "text/xml",
      },
    },
    (() => {
      const form = new FormData();

      form.append("file", Buffer.from("Hello"), "test.txt");
      return {
        data: form.getBuffer(),
        headers: {
          ...form.getHeaders(),
        },
        method: "POST" as const,
        path: "/upload",
        result: `[{"name":"test.txt","data":"SGVsbG8="}]`,
        resultHeaders: {
          "content-type": "application/json",
        },
        statusCode: 200,
      };
    })(),
  ];

  for (const { method, path, result, headers, data, statusCode, resultHeaders } of table) {
    test(`${method} ${path}${headers ? ` with headers ${JSON.stringify(headers)}` : ""}`, async () => {
      const response = await axios.request({
        data,
        headers,
        method,
        transformResponse: [x => x],
        url: `http://localhost:8001${path}`,
        validateStatus: () => true,
      });

      expect(response.data).toEqual(result);
      expect(response.status).toEqual(statusCode ?? 200);
      expect(response.headers).toMatchObject(resultHeaders ?? {});
    });
  }
});
