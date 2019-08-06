import { AstRoot, AstJson } from "@sdkgen/parser";
import { Context, ContextReply } from "./context";

export abstract class BaseApiConfig {
    astJson: AstJson = null as any
    private _ast: AstRoot | null = null;

    get ast() {
        if (!this._ast)
            this._ast = AstRoot.fromJson(this.astJson);

        return this._ast;
    }

    fn: {
        [name: string]: ((ctx: Context, args: any) => any) | undefined
    } = {}

    hook: {
        onRequestStart: (ctx: Context) => Promise<null | ContextReply>
        onRequestEnd: (ctx: Context, reply: ContextReply) => Promise<null | ContextReply>
        onHealthCheck: () => Promise<boolean>
    } = {
        onRequestStart: async () => null,
        onRequestEnd: async () => null,
        onHealthCheck: async () => true
    }
}

export abstract class SdkgenServer {
    constructor(protected apiConfig: BaseApiConfig) {}
    get fn() { return this.apiConfig; }
}
