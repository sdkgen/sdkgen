import { AstJson, AstRoot, jsonToAst } from "@sdkgen/parser";
import { Context, ContextReply } from "./context";

export abstract class BaseApiConfig<extraContextT = {}> {
    astJson: AstJson = null as any
    private _ast: AstRoot | null = null;

    get ast() {
        if (!this._ast)
            this._ast = jsonToAst(this.astJson);

        return this._ast;
    }

    fn: {
        [name: string]: ((ctx: Context & extraContextT, args: any) => any) | undefined
    } = {}

    hook: {
        onRequestStart: (ctx: Context & extraContextT) => Promise<null | ContextReply>
        onRequestEnd: (ctx: Context & extraContextT, reply: ContextReply) => Promise<null | ContextReply>
        onHealthCheck: () => Promise<boolean>
    } = {
        onRequestStart: async () => null,
        onRequestEnd: async () => null,
        onHealthCheck: async () => true
    }
}

export abstract class SdkgenServer<extraContextT = {}> {
    constructor(protected apiConfig: BaseApiConfig<extraContextT>, protected extraContext: extraContextT) {}
}
