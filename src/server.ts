import { Context, ContextReply } from "./context";
import { TypeDescription } from "./encode-decode";

export abstract class BaseApiConfig {
    typeTable: {
        [name: string]: TypeDescription
    } = {}

    functionTable: {
        [name: string]: {
            args: {
                [name: string]: TypeDescription
            },
            ret: TypeDescription
        }
    } = {}

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
