/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { readFileSync, unlinkSync, writeFileSync } from "fs";

import { Parser } from "@sdkgen/parser";
import { generateNodeServerSource } from "@sdkgen/typescript-generator";
import type { AxiosRequestHeaders, Method } from "axios";
import axios from "axios";
import YAML from "yaml";

import type { Context } from "../../src";
import { SdkgenHttpServer } from "../../src";

const ast = new Parser(`${__dirname}/../../../server-spec-data/api.sdkgen`).parse();

writeFileSync(`${__dirname}/api.ts`, generateNodeServerSource(ast).replace(/@sdkgen\/node-runtime/gu, "../../src"));
const { api } = require(`${__dirname}/api.ts`);

unlinkSync(`${__dirname}/api.ts`);

api.fn.add = (_ctx: Context, { first, second }: { first: number; second: number }) => {
  return first + second;
};

api.fn.concat = (_ctx: Context, { first, second }: { first: number; second: string }) => {
  return `${first}${second}`;
};

interface Feature {
  name: string;
  tests: Array<{
    name: string;
    request: {
      method: Method;
      headers?: AxiosRequestHeaders;
      path: string;
      body: unknown;
    };
    response: {
      status?: number;
      body: unknown;
      headers?: Record<string, string>;
    };
  }>;
}

const testData: Feature[] = YAML.parse(readFileSync(`${__dirname}/../../../server-spec-data/tests.yaml`, "utf8"));

const server = new SdkgenHttpServer(api, {});

server.log = () => {};

beforeAll(async () => {
  await server.listen(34368);
});

afterAll(async () => {
  await server.close();
});

for (const feature of testData) {
  describe(feature.name, () => {
    for (const test of feature.tests) {
      it(test.name, async () => {
        const result = await axios.request({
          method: test.request.method,
          baseURL: "http://localhost:34368",
          url: test.request.path,
          data: test.request.body,
          headers: test.request.headers,
          validateStatus: () => true,
          transformResponse: [],
        });

        expect(result.status).toBe(test.response.status ?? 200);
        if (typeof test.response.body === "object") {
          expect(JSON.parse(result.data)).toMatchObject(test.response.body as object);
        } else {
          expect(result.data).toBe(test.response.body);
        }

        if (test.response.headers) {
          for (const [name, value] of Object.entries(test.response.headers)) {
            expect(result.headers[name]).toBe(value);
          }
        }
      });
    }
  });
}
