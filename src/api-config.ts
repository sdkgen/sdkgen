import { AstJson, AstRoot, jsonToAst } from "@sdkgen/parser";
import { Context, ContextReply } from "./context";

export abstract class BaseApiConfig<ExtraContextT = {}> {
    astJson!: AstJson;
    private _ast: AstRoot | null = null;

    constructor() {
        for (const name of Object.keys(this.astJson.functionTable)) {
            this.fn[name] = async () => { this.err.Fatal(`Function '${name}' is not implemented`); };
        }
    }

    get ast() {
        if (!this._ast)
            this._ast = jsonToAst(this.astJson);

        return this._ast;
    }

    fn: {
        [name: string]: ((ctx: Context & ExtraContextT, args: any) => any) | undefined
    } = {}

    err: {
        [name: string]: (message?: string) => never
    } = {}

    hook: {
        onRequestStart: (ctx: Context & ExtraContextT) => Promise<null | ContextReply>
        onRequestEnd: (ctx: Context & ExtraContextT, reply: ContextReply) => Promise<null | ContextReply>
        onHealthCheck: () => Promise<boolean>
    } = {
        onRequestStart: async () => null,
        onRequestEnd: async () => null,
        onHealthCheck: async () => true
    }
}
