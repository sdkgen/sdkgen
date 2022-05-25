/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { randomBytes } from "crypto";

import type { BaseApiConfig } from "./api-config";
import type { Context } from "./context";
import { decode, encode } from "./encode-decode";
import { executeRequest } from "./execute";

export function apiTestWrapper<T>(api: T extends BaseApiConfig<Context & infer _ExtraContextT> ? T : never): T {
  const wrappedApi = new (api.constructor as any)();

  for (const functionName of Object.keys(api.astJson.functionTable)) {
    wrappedApi.fn[functionName] = async (partialCtx: Partial<Context>, args: any) => {
      const encodedArgs = encode(api.astJson.typeTable, `fn.${functionName}.args`, (api.astJson.functionTable as any)[functionName].args, args);

      const ctx: Context = {
        ...partialCtx,
        request: {
          args: encodedArgs as Record<string, unknown>,
          deviceInfo: partialCtx.request?.deviceInfo ?? {
            fingerprint: null,
            id: randomBytes(16).toString("hex"),
            language: null,
            platform: null,
            timezone: null,
            type: "test",
            version: null,
          },
          extra: partialCtx.request?.extra ?? {},
          files: partialCtx.request?.files ?? [],
          headers: partialCtx.request?.headers ?? {},
          id: partialCtx.request?.id ?? randomBytes(16).toString("hex"),
          ip: partialCtx.request?.ip ?? "0.0.0.0",
          name: functionName,
          version: 3,
        },
        response: {
          headers: new Map(),
        },
      };

      const reply = await executeRequest(ctx, api);

      if (reply.error) {
        throw reply.error;
      } else {
        const decodedRet = decode(
          api.astJson.typeTable,
          `fn.${functionName}.ret`,
          (api.astJson.functionTable as any)[functionName].ret,
          JSON.parse(JSON.stringify(reply.result)),
        );

        return decodedRet;
      }
    };
  }

  return wrappedApi;
}
