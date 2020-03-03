import { IncomingHttpHeaders } from "http";

export interface Context {
    request: ContextRequest;
}

export interface ContextRequest {
    args: any;
    deviceInfo: {
        id: string;
        language: string | null;
        platform: any;
        timezone: string | null;
        type: string;
        version: string | null;
    };
    extra: {
        [name: string]: any;
    };
    headers: IncomingHttpHeaders;
    id: string;
    ip: string;
    name: string;
    version: number;
    files: {
        name: string;
        data: Buffer;
    }[];
}

export interface ContextReply {
    error?: any;
    result?: any;
}
