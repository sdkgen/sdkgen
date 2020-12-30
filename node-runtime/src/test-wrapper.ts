/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { randomBytes } from "crypto";

import type { BaseApiConfig } from "./api-config";
import type { Context } from "./context";
import { decode, encode } from "./encode-decode";

function has<P extends PropertyKey>(target: object, property: P): target is { [K in P]: unknown } {
  return property in target;
}

export function apiTestWrapper<T extends BaseApiConfig>(api: T): T {
  const wrappedApi = new (api.constructor as any)();

  for (const functionName of Object.keys(api.astJson.functionTable)) {
    wrappedApi.fn[functionName] = async (ctx: Partial<Context>, args: any) => {
      const encodedArgs = encode(api.astJson.typeTable, `fn.${functionName}.args`, (api.astJson.functionTable as any)[functionName].args, args);
      const decodedArgs = decode(
        api.astJson.typeTable,
        `fn.${functionName}.args`,
        (api.astJson.functionTable as any)[functionName].args,
        encodedArgs,
      );

      ctx.request = {
        args: encodedArgs,
        deviceInfo: ctx.request?.deviceInfo
          ? ctx.request.deviceInfo
          : {
              fingerprint: null,
              id: randomBytes(16).toString("hex"),
              language: null,
              platform: null,
              timezone: null,
              type: ctx.request?.deviceInfo && ctx.request.deviceInfo.type ? ctx.request.deviceInfo.type : "test",
              version: null,
            },
        extra: ctx.request?.extra ? ctx.request.extra : {},
        files: ctx.request?.files ? ctx.request.files : [],
        headers: ctx.request?.headers ? ctx.request.headers : {},
        id: randomBytes(16).toString("hex"),
        ip: ctx.request?.ip ? ctx.request.ip : "0.0.0.0",
        name: functionName,
        version: 3,
      };

      let reply = await api.hook.onRequestStart(ctx as Context);

      if (!reply) {
        try {
          const ret = await (api.fn as any)[functionName](ctx, decodedArgs);
          const encodedRet = encode(api.astJson.typeTable, `fn.${functionName}.ret`, (api.astJson.functionTable as any)[functionName].ret, ret);

          reply = {
            result: encodedRet,
          };
        } catch (err) {
          reply = {
            error: err,
          };
        }
      }

      reply = (await api.hook.onRequestEnd(ctx as Context, reply)) ?? reply;

      if (
        typeof reply.error === "object" &&
        reply.error &&
        has(reply.error, "type") &&
        has(reply.error, "message") &&
        typeof reply.error.type === "string" &&
        typeof reply.error.message === "string"
      ) {
        try {
          const { type } = reply.error;
          const errorJson = api.astJson.errors.find(err => reply && (Array.isArray(err) ? err[0] === type : err === type));

          if (errorJson) {
            throw reply.error;
          } else {
            throw api.err.Fatal(reply.error.message === type ? undefined : reply.error.message || reply.error.toString());
          }
        } catch (err) {
          if (has(reply.error, "stack")) {
            err.stack = reply.error.stack;
          }

          throw err;
        }
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
