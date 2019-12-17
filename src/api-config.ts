import { AstJson, AstRoot, jsonToAst } from "@sdkgen/parser";
import { Context, ContextReply } from "./context";

export abstract class BaseApiConfig<ExtraContextT = {}> {
    astJson!: AstJson;

    private _ast: AstRoot | null = null;

    get ast() {
        if (!this._ast) {
            this._ast = jsonToAst(this.astJson);
        }

        return this._ast;
    }

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
