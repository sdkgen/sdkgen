import type { AstJson } from "@sdkgen/parser";

import type { Context, ContextReply } from "./context";
import type { DeepReadonly } from "./utils";

export abstract class BaseApiConfig<ExtraContextT = unknown> {
  astJson!: DeepReadonly<AstJson>;

  fn: {
    [name: string]: ((ctx: Context & ExtraContextT, args: any) => Promise<any>) | undefined;
  } = {};

  err: {
    [name: string]: (message?: string) => never;
  } = {};

  hook: {
    onHealthCheck(): Promise<boolean>;
    onRequestEnd(ctx: Context & ExtraContextT, reply: ContextReply): Promise<null | ContextReply>;
    onRequestStart(ctx: Context & ExtraContextT): Promise<null | ContextReply>;
  } = {
    onHealthCheck: async () => Promise.resolve(true),
    onRequestEnd: async () => Promise.resolve(null),
    onRequestStart: async () => Promise.resolve(null),
  };
}
