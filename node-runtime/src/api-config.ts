import { AstJson } from "@sdkgen/parser";
import { Context, ContextReply } from "./context";

export abstract class BaseApiConfig<ExtraContextT = unknown> {
  astJson!: AstJson;

  fn: {
    [name: string]: ((ctx: Context & ExtraContextT, args: any) => any) | undefined;
  } = {};

  err: {
    [name: string]: (message?: string) => never;
  } = {};

  hook: {
    onHealthCheck: () => Promise<boolean>;
    onRequestEnd: (ctx: Context & ExtraContextT, reply: ContextReply) => Promise<null | ContextReply>;
    onRequestStart: (ctx: Context & ExtraContextT) => Promise<null | ContextReply>;
  } = {
    onHealthCheck: async () => true,
    onRequestEnd: async () => null,
    onRequestStart: async () => null,
  };
}
