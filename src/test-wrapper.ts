import { BaseApiConfig } from "./server";
import { Context } from "./context";
import { encode, decode } from "./encode-decode";
import { randomBytes } from "crypto";

export function apiTestWrapper<ExtraContextT>(api: BaseApiConfig<ExtraContextT>): BaseApiConfig<ExtraContextT> {
    const wrappedApi = new (api.constructor as any)();
    for (const functionName of Object.keys(api.astJson.functionTable)) {
        (wrappedApi.fn as any)[functionName] = async (ctx: Context & ExtraContextT, args: any) => {
            const encodedArgs = encode(api.astJson.typeTable, `fn.${functionName}.args`, (api.astJson.functionTable as any)[functionName].args, args);
            const decodedArgs = decode(api.astJson.typeTable, `fn.${functionName}.args`, (api.astJson.functionTable as any)[functionName].args, encodedArgs);
            if (!ctx.ip) {
                ctx.ip = "0.0.0.0";
            }
            ctx.request = {
                args: encodedArgs,
                deviceInfo: ctx.request && ctx.request.deviceInfo ? ctx.request.deviceInfo : {
                    id: randomBytes(16).toString("hex"),
                    language: null,
                    platform: null,
                    timezone: null,
                    type: ctx.request && ctx.request.deviceInfo && ctx.request.deviceInfo.type ? ctx.request.deviceInfo.type : "test",
                    version: null
                },
                extra: {},
                headers: {},
                id: randomBytes(16).toString("hex"),
                name: functionName,
                version: 0
            };
            let reply = await api.hook.onRequestStart(ctx);
            if (!reply) {
                try {
                    const ret = await (api.fn as any)[functionName](ctx, decodedArgs);
                    const encodedRet = encode(api.astJson.typeTable, `fn.${functionName}.ret`, (api.astJson.functionTable as any)[functionName].ret, ret);
                    reply = {
                        result: encodedRet
                    };
                } catch (err) {
                    reply = {
                        error: err
                    };
                }
            }
            reply = await api.hook.onRequestEnd(ctx, reply) || reply;

            if (reply.error) {
                try {
                    (api.err[reply.error.type] || api.err.Fatal)(reply.error.message === reply.error.type ? undefined : reply.error.message || reply.error.toString());
                } catch (err) {
                    if (reply.error.stack) err.stack = reply.error.stack;
                    throw err;
                }
            } else {
                const decodedRet = decode(api.astJson.typeTable, `fn.${functionName}.ret`, (api.astJson.functionTable as any)[functionName].ret, reply.result);
                return decodedRet;
            }
        };
    }
    return wrappedApi;
}
