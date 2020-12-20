import { Parser } from "@sdkgen/parser";
import { generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import { unlinkSync, writeFileSync } from "fs";
import { Context } from "vm";
import { BaseApiConfig, SdkgenHttpServer } from "../../src";

const ast = new Parser(`${__dirname}/api.sdkgen`).parse();

writeFileSync(`${__dirname}/middleware-api.ts`, generateNodeServerSource(ast).replace("@sdkgen/node-runtime", "../../src"));
const { api } = require(`${__dirname}/middleware-api.ts`);

unlinkSync(`${__dirname}/middleware-api.ts`);

api.fn.identity = async (_ctx: Context, args: { value: number }) => {
  return args.value;
};

writeFileSync(`${__dirname}/middleware-nodeClient.ts`, generateNodeClientSource(ast).replace("@sdkgen/node-runtime", "../../src"));
const { ApiClient: NodeApiClient } = require(`${__dirname}/middleware-nodeClient.ts`);

unlinkSync(`${__dirname}/middleware-nodeClient.ts`);
const nodeClient = new NodeApiClient("http://localhost:32542");

const server = new SdkgenHttpServer(api, {});

describe("Middleware", () => {
  beforeAll(async () => {
    await server.listen(32542);
  });

  afterAll(async () => {
    await server.close();
  });

  test("A single middeware can intercept calls", async () => {
    expect(await nodeClient.identity(null, { value: 1 })).toBe(1);
    expect(await nodeClient.identity(null, { value: 2 })).toBe(2);
    expect(await nodeClient.identity(null, { value: 3 })).toBe(3);

    (api as BaseApiConfig).use(async (ctx, next) => {
      if (ctx.request.args.value === 2) {
        return {
          result: 17,
        };
      }

      return next(ctx);
    });

    expect(await nodeClient.identity(null, { value: 1 })).toBe(1);
    expect(await nodeClient.identity(null, { value: 2 })).toBe(17);
    expect(await nodeClient.identity(null, { value: 3 })).toBe(3);

    (api as BaseApiConfig).middlewares.pop();
  });

  test("onRequestStart still work as expected", async () => {
    const previous = (api as BaseApiConfig).hook.onRequestStart;

    expect(await nodeClient.identity(null, { value: 1 })).toBe(1);
    expect(await nodeClient.identity(null, { value: 2 })).toBe(2);
    expect(await nodeClient.identity(null, { value: 3 })).toBe(3);

    (api as BaseApiConfig).hook.onRequestStart = async ctx => {
      if (ctx.request.args.value === 2) {
        return {
          result: 17,
        };
      }

      return null;
    };

    expect(await nodeClient.identity(null, { value: 1 })).toBe(1);
    expect(await nodeClient.identity(null, { value: 2 })).toBe(17);
    expect(await nodeClient.identity(null, { value: 3 })).toBe(3);

    (api as BaseApiConfig).hook.onRequestStart = previous;
  });

  test("Multiple middlewares stack", async () => {
    expect(await nodeClient.identity(null, { value: 1 })).toBe(1);
    expect(await nodeClient.identity(null, { value: 2 })).toBe(2);
    expect(await nodeClient.identity(null, { value: 3 })).toBe(3);

    (api as BaseApiConfig).use(async (ctx, next) => {
      if (ctx.request.args.value === 2) {
        return {
          result: 17,
        };
      }

      return next(ctx);
    });

    (api as BaseApiConfig).use(async (ctx, next) => {
      if (ctx.request.args.value < 3) {
        return {
          result: 10,
        };
      }

      return next(ctx);
    });

    expect(await nodeClient.identity(null, { value: 1 })).toBe(10);
    expect(await nodeClient.identity(null, { value: 2 })).toBe(17);
    expect(await nodeClient.identity(null, { value: 3 })).toBe(3);

    (api as BaseApiConfig).middlewares.pop();
  });
});
