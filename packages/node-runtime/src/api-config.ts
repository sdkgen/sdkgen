import type { AstJson, AstRoot } from "@sdkgen/parser";
import { jsonToAst } from "@sdkgen/parser";

import type { Context, ContextReply } from "./context";
import type { DeepReadonly } from "./utils";

type Middleware<ExtraContextT> = (ctx: Context & ExtraContextT, next: () => Promise<ContextReply>) => Promise<ContextReply>;

export abstract class BaseApiConfig<ExtraContextT = unknown> {
  private _ast: AstRoot | undefined;

  get ast() {
    return (this._ast ??= jsonToAst(this.astJson));
  }

  astJson!: DeepReadonly<AstJson>;

  fn: {
    [name: string]: ((args: any) => Promise<any>) | undefined;
  } = {};

  readonly middlewares: Array<Middleware<ExtraContextT>> = [];

  use(middleware: Middleware<ExtraContextT>): void {
    this.middlewares.push(middleware);
  }
}
