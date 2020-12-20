import { Parser } from "@sdkgen/parser";
import { generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import { unlinkSync, writeFileSync } from "fs";
import { Context } from "vm";
import { SdkgenHttpServer } from "../../src";

const ast = new Parser(`${__dirname}/api.sdkgen`).parse();

writeFileSync(`${__dirname}/errors-api.ts`, generateNodeServerSource(ast).replace("@sdkgen/node-runtime", "../../src"));
const { api, CustomError } = require(`${__dirname}/errors-api.ts`);

unlinkSync(`${__dirname}/errors-api.ts`);

api.fn.throwCustomError = async (ctx: Context, args: { value: number }) => {
  throw new CustomError("Some message", args);
};

writeFileSync(`${__dirname}/errors-nodeClient.ts`, generateNodeClientSource(ast).replace("@sdkgen/node-runtime", "../../src"));
const { ApiClient: NodeApiClient } = require(`${__dirname}/errors-nodeClient.ts`);

unlinkSync(`${__dirname}/errors-nodeClient.ts`);
const nodeClient = new NodeApiClient("http://localhost:35437");

const server = new SdkgenHttpServer(api, {});

describe("Errors", () => {
  beforeAll(async () => {
    await server.listen(35437);
  });

  afterAll(async () => {
    await server.close();
  });

  test("Errors are passed correctly", async () => {
    await expect(nodeClient.throwCustomError(null, { value: 235 })).rejects.toMatchObject({
      data: {
        value: 235,
      },
      message: "Some message",
      type: "CustomError",
    });
  });
});
