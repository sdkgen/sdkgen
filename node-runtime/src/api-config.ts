import { AstJson } from "@sdkgen/parser";
import { Context, ContextReply } from "./context";

type Middleware<ExtraContextT> = (
  ctx: Context & ExtraContextT,
  next: (nextCtx: Context & ExtraContextT) => Promise<ContextReply>,
) => Promise<ContextReply>;

export abstract class BaseApiConfig<ExtraContextT = unknown> {
  constructor() {
    this.use(async (ctx, next) => {
      const reply = (await this.hook.onRequestStart(ctx)) ?? (await next(ctx));

      return (await this.hook.onRequestEnd(ctx, reply)) ?? reply;
    });
  }

  astJson!: AstJson;

  fn: {
    [name: string]: ((ctx: Context & ExtraContextT, args: any) => any) | undefined;
  } = {};

  err: {
    [name: string]: (message?: string) => never;
  } = {};

  hook: {
    /** @deprecated Use server.registerHealthCheck() instead. */
    onHealthCheck: () => Promise<boolean>;
    /** @deprecated Use middlewares with api.use() instead. */
    onRequestEnd: (ctx: Context & ExtraContextT, reply: ContextReply) => Promise<null | ContextReply>;
    /** @deprecated Use middlewares with api.use() instead. */
    onRequestStart: (ctx: Context & ExtraContextT) => Promise<null | ContextReply>;
  } = {
    onHealthCheck: async () => true,
    onRequestEnd: async () => null,
    onRequestStart: async () => null,
  };

  readonly middlewares: Array<Middleware<ExtraContextT>> = [];

  use(middleware: Middleware<ExtraContextT>): void {
    this.middlewares.push(middleware);
  }
}
