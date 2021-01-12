import { ThrowsAnnotation } from "@sdkgen/parser";

import type { BaseApiConfig } from "./api-config";
import type { Context, ContextReply } from "./context";
import { decode, encode } from "./encode-decode";
import { Fatal } from "./error";
import { has } from "./utils";

export async function executeRequest<ExtraContextT>(ctx: Context & ExtraContextT, apiConfig: BaseApiConfig<ExtraContextT>) {
  // eslint-disable-next-line func-style
  let next = async () => {
    try {
      const functionDescription = apiConfig.astJson.functionTable[ctx.request.name];
      const functionImplementation = apiConfig.fn[ctx.request.name];

      if (!functionDescription || !functionImplementation) {
        throw new Fatal(`Function does not exist: ${ctx.request.name}`);
      }

      const args = decode(apiConfig.astJson.typeTable, `${ctx.request.name}.args`, functionDescription.args, ctx.request.args);
      const ret = await functionImplementation(ctx, args);
      const encodedRet = encode(apiConfig.astJson.typeTable, `${ctx.request.name}.ret`, functionDescription.ret, ret);

      return { result: encodedRet } as ContextReply;
    } catch (error) {
      return { error } as ContextReply;
    }
  };

  for (let i = apiConfig.middlewares.length - 1; i >= 0; --i) {
    const middleware = apiConfig.middlewares[i];
    const previousNext = next;

    next = async () => {
      try {
        return await middleware(ctx, previousNext);
      } catch (error) {
        return { error } as ContextReply;
      }
    };
  }

  const reply = await next();

  // If errors, check if the error type is one of the @throws annotation. If it isn't, change to Fatal
  if (reply.error) {
    const functionAst = apiConfig.ast.operations.find(op => op.name === ctx.request.name);

    if (functionAst) {
      const allowedErrors = functionAst.annotations.filter(ann => ann instanceof ThrowsAnnotation).map(ann => (ann as ThrowsAnnotation).error);

      if (
        typeof reply.error !== "object" ||
        reply.error === null ||
        !has(reply.error, "type") ||
        typeof reply.error.type !== "string" ||
        (allowedErrors.length > 0 && !allowedErrors.includes(reply.error.type)) ||
        !apiConfig.astJson.errors.map(error => (typeof error === "string" ? error : error[0])).includes(reply.error.type)
      ) {
        Object.defineProperty(reply.error, "type", { value: "Fatal" });
      }
    }
  }

  return reply;
}
