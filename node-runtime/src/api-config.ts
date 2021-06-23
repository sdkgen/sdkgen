import type { AstJson, AstRoot } from "@sdkgen/parser";
import { jsonToAst } from "@sdkgen/parser";

import type { Context, ContextReply } from "./context";
import type { DeepReadonly } from "./utils";

type Middleware<ExtraContextT> = (ctx: Context & ExtraContextT, next: () => Promise<ContextReply>) => Promise<ContextReply>;

export abstract class BaseApiConfig<ExtraContextT = unknown> {
  constructor() {
    this.use(async (ctx, next) => {
      const reply = (await this.hook.onRequestStart(ctx)) ?? (await next());

      return (await this.hook.onRequestEnd(ctx, reply)) ?? reply;
    });
  }

  private _ast: AstRoot | undefined;

  get ast() {
    return (this._ast ??= jsonToAst(this.astJson));
  }

  astJson!: DeepReadonly<AstJson>;

  fn: {
    [name: string]: ((args: any) => Promise<any>) | undefined;
  } = {};

  err: {
    [name: string]: (message?: string) => never;
  } = {};

  hook: {
    /** @deprecated Use server.registerHealthCheck() instead. */
    onHealthCheck(): Promise<boolean>;
    /** @deprecated Use middlewares with api.use() instead. */
    onRequestEnd(ctx: Context & ExtraContextT, reply: ContextReply): Promise<null | ContextReply>;
    /** @deprecated Use middlewares with api.use() instead. */
    onRequestStart(ctx: Context & ExtraContextT): Promise<null | ContextReply>;
  } = {
    onHealthCheck: async () => Promise.resolve(true),
    onRequestEnd: async () => Promise.resolve(null),
    onRequestStart: async () => Promise.resolve(null),
  };

  readonly middlewares: Array<Middleware<ExtraContextT>> = [];

  use(middleware: Middleware<ExtraContextT>): void {
    this.middlewares.push(middleware);
  }
}
