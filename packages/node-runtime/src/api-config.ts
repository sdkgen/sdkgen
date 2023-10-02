import type { AstJson, AstRoot } from "@sdkgen/parser";
import { jsonToAst } from "@sdkgen/parser";

import type { Context, ContextReply } from "./context";
import type { DeepReadonly } from "./utils";

type Middleware<ExtraContextT> = (ctx: Context & ExtraContextT, next: () => Promise<ContextReply>) => Promise<ContextReply>;

export class BaseApiConfig<ExtraContextT = unknown> {
  private _ast: AstRoot | undefined;

  get ast() {
    return (this._ast ??= jsonToAst(this.astJson));
  }

  astJson!: DeepReadonly<AstJson>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: Record<string, ((ctx: Context & ExtraContextT, args: any) => Promise<any>) | undefined> = {};

  readonly middlewares: Array<Middleware<ExtraContextT>> = [];

  use(middleware: Middleware<ExtraContextT>): void {
    this.middlewares.push(middleware);
  }
}
