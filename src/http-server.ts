import { generateNodeServerSource } from "@sdkgen/typescript-generator";
import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { hostname } from "os";
import { getClientIp } from "request-ip";
import { parse as parseUrl } from "url";
import { Context, ContextReply, ContextRequest } from "./context";
import { decode } from "./encode-decode";
import { BaseApiConfig, SdkgenServer } from "./server";

export class SdkgenHttpServer extends SdkgenServer {
    public httpServer: Server;
    private headers = new Map<string, string>();
    private handlers: { method: string, matcher: string | RegExp, handler: (req: IncomingMessage, res: ServerResponse, body: string) => void }[] = [];
    public dynamicCorsOrigin = true;

    constructor(protected apiConfig: BaseApiConfig) {
        super(apiConfig);
        this.httpServer = createServer(this.handleRequest.bind(this));
        this.enableCors();

        this.addHttpHandler("GET", "/targets/typescript/nodeserver/api.ts", (req, res) => {
            try {
                res.setHeader("Content-Type", "application/octet-stream");
                res.write(generateNodeServerSource(apiConfig.ast, {}));
            } catch (e) {
                res.statusCode = 500;
                res.write(e.toString());
            }
            res.end();
        });
    }

    listen(port: number = 8000) {
        this.httpServer.listen(port, () => {
            const addr = this.httpServer.address();
            const addrString = addr === null ? "???" : typeof addr === "string" ? addr : `${addr.address}:${addr.port}`;
            console.log(`Listening on ${addrString}`);
        });
    }

    close() {
        this.httpServer.close();
    }

    private enableCors() {
        this.addHeader("Access-Control-Allow-Methods", "PUT, POST, GET, OPTIONS");
        this.addHeader("Access-Control-Allow-Headers", "Content-Type");
        this.addHeader("Access-Control-Max-Age", "86400");
    }

    addHeader(header: string, value: string) {
        header = header.toLowerCase().trim();
        const existing = this.headers.get(header);
        if (existing) {
            this.headers.set(header, `${existing}, ${value}`);
        } else {
            this.headers.set(header, value);
        }
    }

    addHttpHandler(method: string, matcher: string | RegExp, handler: (req: IncomingMessage, res: ServerResponse, body: string) => void) {
        this.handlers.push({ method, matcher, handler });
    }

    private findBestHandler(req: IncomingMessage) {
        const path = parseUrl(req.url || "").pathname;

        if (!path)
            return null;

        return this.handlers.filter(({method}) =>
            method === req.method
        ).filter(({matcher}) => {
            if (typeof matcher === "string") {
                return matcher === path;
            } else {
                return path.search(matcher) === 0;
            }
        }).sort(({ matcher: first }, { matcher: second }) => {
            if (typeof first === "string" && typeof second === "string") {
                return 0;
            } else if (typeof first === "string") {
                return -1
            } else if (typeof second === "string") {
                return 1;
            } else {
                const firstMatch = path.match(first)!;
                const secondMatch = path.match(second)!;
                return secondMatch[0].length - firstMatch[0].length;
            }
        })[0] || null;
    }

    private handleRequest(req: IncomingMessage, res: ServerResponse) {
        req.on("error", (err) => {
            console.error(err);
            res.end();
        });

        res.on("error", (err) => {
            console.error(err);
            res.end();
        });

        if (this.dynamicCorsOrigin && req.headers.host) {
            res.setHeader("Access-Control-Allow-Origin", req.headers.host);
        }

        for (const [header, value] of this.headers) {
            if (req.method === "OPTIONS" && !header.startsWith("access-control-"))
                continue;
            res.setHeader(header, value);
        }

        if (req.method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
        }

        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", () => this.handleRequestWithBody(req, res, body).catch(e =>
            this.writeReply(res, null, { error: { type: "Fatal", message: e.toString() } })
        ));
    }

    private log(message: string) {
        console.log(`${new Date().toISOString()} ${message}`);
    }

    private async handleRequestWithBody(req: IncomingMessage, res: ServerResponse, body: string) {
        const externalHandler = this.findBestHandler(req);
        if (externalHandler) {
            this.log(`HTTP ${req.method} ${parseUrl(req.url || "").pathname}`);
            externalHandler.handler(req, res, body);
            return;
        }

        if (req.method === "HEAD") {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method === "GET") {
            let ok: boolean;
            try {
                ok = await this.apiConfig.hook.onHealthCheck();
            } catch (e) {
                ok = false;
            }
            res.writeHead(ok ? 200 : 500);
            res.write(JSON.stringify({ ok }));
            res.end();
            return;
        }

        if (req.method !== "POST") {
            res.writeHead(400);
            res.end();
            return;
        }

        const clientIp = getClientIp(req);
        if (!clientIp) {
            this.writeReply(res, null, {
                error: {
                    type: "Fatal",
                    message: "Couldn't determine client IP"
                }
            });
            return;
        }

        const request = this.parseRequest(req, body);
        if (!request) {
            this.writeReply(res, null, {
                error: {
                    type: "Fatal",
                    message: "Couldn't parse request"
                }
            });
            return;
        }

        const ctx: Context = {
            ip: clientIp,
            request,
            hrStart: process.hrtime()
        }

        const functionDescription = this.apiConfig.astJson.functionTable[ctx.request.name];
        const functionImplementation = this.apiConfig.fn[ctx.request.name];
        if (!functionDescription || !functionImplementation) {
            this.writeReply(res, ctx, {
                error: {
                    type: "Fatal",
                    message: `Function does not exist: ${ctx.request.name}`
                }
            });
            return;
        }

        let reply: ContextReply | null;
        try {
            reply = await this.apiConfig.hook.onRequestStart(ctx);
            if (!reply) {
                const args = decode(this.apiConfig.astJson.typeTable, `fn.${ctx.request.name}.args`, functionDescription.args, ctx.request.args);
                const encodedRet = await functionImplementation(ctx, args);
                const ret = decode(this.apiConfig.astJson.typeTable, `fn.${ctx.request.name}.ret`, functionDescription.ret, encodedRet);
                reply = { result: ret };
            }
        } catch (e) {
            reply = {
                error: {
                    type: e._type || "Fatal",
                    message: e._msg || e.toString()
                }
            };
        }

        reply = await this.apiConfig.hook.onRequestEnd(ctx, reply) || reply;
        this.writeReply(res, ctx, reply);
    }

    private parseRequest(req: IncomingMessage, body: string): ContextRequest | null {
        switch (this.identifyRequestVersion(req, body)) {
            case 1:
                return this.parseRequestV1(req, body);
            case 2:
                return this.parseRequestV2(req, body);
            case 3:
                return this.parseRequestV3(req, body);
            default:
                throw new Error("Failed to understand request");
        }
    }

    private identifyRequestVersion(req: IncomingMessage, body: string): number {
        const parsed = JSON.parse(body)
        if ("version" in parsed) {
            return parsed.version;
        } else if ("requestId" in parsed) {
            return 2;
        } else {
            return 1;
        }
    }

    // Old Sdkgen format
    private parseRequestV1(req: IncomingMessage, body: string): ContextRequest {
        const parsed = decode({
            Request: {
                id: "string",
                args: "any",
                name: "string",
                device: {
                    id: "string?",
                    type: "string",
                    platform: "any?",
                    version: "string?",
                    language: "string?",
                    timezone: "string?",
                },
            }
        }, "root", "Request", JSON.parse(body));

        return {
            version: 1,
            id: parsed.id,
            args: parsed.args,
            name: parsed.name,
            extra: {},
            deviceInfo: {
                id: parsed.device.id || parsed.id,
                language: parsed.device.language,
                platform: parsed.device.platform,
                timezone: parsed.device.timezone,
                type: parsed.device.type,
                version: parsed.device.version,
            }
        };
    }

    // Maxima sdkgen format
    private parseRequestV2(req: IncomingMessage, body: string): ContextRequest {
        const parsed = decode({
            Request: {
                requestId: "string",
                deviceId: "string",
                sessionId: "string?",
                partnerId: "string?",
                args: "any",
                name: "string",
                info: {
                    type: "string",
                    browserUserAgent: "string?",
                    language: "string",
                },
            }
        }, "root", "Request", JSON.parse(body));

        return {
            version: 2,
            id: parsed.requestId,
            args: parsed.args,
            name: parsed.name,
            extra: {
                sessionId: parsed.sessionId,
                partnerId: parsed.partnerId,
            },
            deviceInfo: {
                id: parsed.deviceId,
                language: parsed.info.language,
                platform: {},
                timezone: null,
                type: parsed.info.type,
                version: "",
            }
        };
    }

    // New sdkgen format
    private parseRequestV3(req: IncomingMessage, body: string): ContextRequest {
        const parsed = decode({
            Request: {
                requestId: "string",
                name: "string",
                args: "any",
                extra: "any",
                deviceInfo: {
                    id: "string",
                    type: "string",
                    browserUserAgent: "string?",
                    timezone: "string?",
                    version: "string?",
                    language: "string?",
                },
            }
        }, "root", "Request", JSON.parse(body));

        return {
            version: 3,
            id: parsed.requestId,
            args: parsed.args,
            name: parsed.name,
            extra: {
                ...parsed.extra
            },
            deviceInfo: {
                id: parsed.deviceInfo.id,
                language: parsed.deviceInfo.language,
                platform: {},
                timezone: parsed.deviceInfo.timezone,
                type: parsed.deviceInfo.type,
                version: parsed.deviceInfo.version,
            }
        };
    }

    private writeReply(res: ServerResponse, ctx: Context | null, reply: ContextReply) {
        if (!ctx) {
            if (!reply.error) {
                reply = {
                    error: {
                        type: "Fatal",
                        message: "Response without context"
                    }
                }
            }

            res.statusCode = 500;
            res.write(JSON.stringify({ error: reply.error }));
            res.end();
            return;
        }

        const deltaTime = process.hrtime(ctx.hrStart);
        const duration = deltaTime[0] + deltaTime[1] * 1e-9;

        this.log(`${ctx.request.id} [${duration.toFixed(6)}s] ${ctx.request.name}() -> ${reply.error ? reply.error.type : "OK"}`);

        switch (ctx.request.version) {
            case 1: {
                const response = {
                    id: ctx.request.id,
                    ok: !reply.error,
                    deviceId: ctx.request.deviceInfo.id,
                    duration: duration,
                    host: hostname(),
                    result: reply.result || null,
                    error: reply.error || null
                };

                res.statusCode = response.error ? (response.error.type === "Fatal" ? 500 : 400) : 200;
                res.write(JSON.stringify(response));
                res.end();
                break;
            }
            case 2: {
                res.end();
                break;
            }
            case 3: {
                const response = {
                    duration: duration,
                    host: hostname(),
                    result: reply.result || null,
                    error: reply.error || null
                };

                res.statusCode = response.error ? (response.error.type === "Fatal" ? 500 : 400) : 200;
                res.write(JSON.stringify(response));
                res.end();
                break;
            }
        }
    }
}
