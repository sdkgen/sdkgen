/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { randomBytes } from "crypto";

import { BaseApiConfig } from "./api-config.js";
import type { Context } from "./context.js";
import { decode, encode } from "./encode-decode.js";
import { executeRequest } from "./execute.js";

export function apiTestWrapper<ExtraContextT, ApiT extends BaseApiConfig<ExtraContextT>>(api: ApiT, extraContext: Partial<ExtraContextT>): ApiT {
  const wrappedApi = new BaseApiConfig<ExtraContextT>();

  for (const functionName of Object.keys(api.astJson.functionTable)) {
    wrappedApi.fn[functionName] = async (partialCtx: Partial<Context>, args: any) => {
      const encodedArgs = encode(api.astJson.typeTable, `fn.${functionName}.args`, (api.astJson.functionTable as any)[functionName].args, args);

      const ctx: Context = {
        ...extraContext,
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

      const reply = await executeRequest(ctx as Context & ExtraContextT, api);

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

  return wrappedApi as ApiT;
}
