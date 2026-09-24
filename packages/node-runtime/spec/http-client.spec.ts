import { createServer } from "http";
import type { Server } from "http";
import type { AddressInfo } from "net";

import type { AstJson } from "@sdkgen/parser";

import { Fatal, SdkgenHttpClient } from "../src";

const astJson: AstJson = {
  annotations: {},
  errors: ["Fatal"],
  functionTable: { ping: { args: {}, ret: "void" } },
  typeTable: {},
};

async function listen(body: string): Promise<Server> {
  const server = createServer((_req, res) => {
    res.end(body);
  });

  return new Promise(resolve => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function call(url: string): Promise<unknown> {
  return new SdkgenHttpClient(url, astJson, { Fatal }).makeRequest(null, "ping", {}).catch((error: unknown) => error);
}

describe("SdkgenHttpClient errors", () => {
  test("keeps the connection error as the cause of the Fatal", async () => {
    const error = (await call("http://127.0.0.1:1")) as Fatal;

    expect(error).toBeInstanceOf(Fatal);
    expect(error.message).toBe(String(error.cause));
    expect(error.cause).toMatchObject({ code: "ECONNREFUSED" });
    expect(Object.keys(error)).not.toContain("cause");
  });

  test("keeps the parse error as the cause of the Fatal when the response is not JSON", async () => {
    const server = await listen("not json");

    try {
      const error = (await call(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)) as Fatal;

      expect(error).toBeInstanceOf(Fatal);
      expect(error.cause).toBeInstanceOf(SyntaxError);
    } finally {
      server.close();
    }
  });

  test("does not take a cause from an error sent by the server", async () => {
    const server = await listen(JSON.stringify({ error: { cause: "from the server", message: "boom", type: "Fatal" } }));

    try {
      const error = (await call(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)) as Fatal;

      expect(error).toBeInstanceOf(Fatal);
      expect(error.message).toBe("boom");
      expect(error.cause).toBeUndefined();
    } finally {
      server.close();
    }
  });
});
