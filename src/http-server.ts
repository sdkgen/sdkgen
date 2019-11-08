import { generateDartClientSource } from "@sdkgen/dart-generator";
import { ThrowsAnnotation } from "@sdkgen/parser";
import { PLAYGROUND_PUBLIC_PATH } from "@sdkgen/playground";
import { generateBrowserClientSource, generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import { randomBytes } from "crypto";
import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { hostname } from "os";
import { getClientIp } from "request-ip";
import handler from "serve-handler";
import { parse as parseUrl } from "url";
import { Context, ContextReply, ContextRequest } from "./context";
import { decode, encode } from "./encode-decode";
import { BaseApiConfig, SdkgenServer } from "./server";

export class SdkgenHttpServer<ExtraContextT = {}> extends SdkgenServer<ExtraContextT> {
    public httpServer: Server;
    private headers = new Map<string, string>();
    private handlers: { method: string, matcher: string | RegExp, handler: (req: IncomingMessage, res: ServerResponse, body: string) => void }[] = [];
    public dynamicCorsOrigin = true;
    private ignoredUrlPrefix = "";

    constructor(apiConfig: BaseApiConfig<ExtraContextT>, extraContext: ExtraContextT) {
        super(apiConfig, extraContext);
        this.httpServer = createServer(this.handleRequest.bind(this));
        this.enableCors();

        this.addHttpHandler("GET", "/targets/node/api.ts", (req, res) => {
            try {
                res.setHeader("Content-Type", "application/octet-stream");
                res.write(generateNodeServerSource(apiConfig.ast, {}));
            } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.write(e.toString());
            }
            res.end();
        });

        this.addHttpHandler("GET", "/targets/node/client.ts", (req, res) => {
            try {
                res.setHeader("Content-Type", "application/octet-stream");
                res.write(generateNodeClientSource(apiConfig.ast, {}));
            } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.write(e.toString());
            }
            res.end();
        });

        this.addHttpHandler("GET", "/targets/web/client.ts", (req, res) => {
            try {
                res.setHeader("Content-Type", "application/octet-stream");
                res.write(generateBrowserClientSource(apiConfig.ast, {}));
            } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.write(e.toString());
            }
            res.end();
        });

        this.addHttpHandler("GET", "/targets/flutter/client.dart", (req, res) => {
            try {
                res.setHeader("Content-Type", "application/octet-stream");
                res.write(generateDartClientSource(apiConfig.ast, {}));
            } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.write(e.toString());
            }
            res.end();
        });

        this.addHttpHandler("GET", /^\/playground/, (req, res) => {
            if (req.url) {
                req.url = req.url.endsWith("/playground") ? req.url.replace(/\/playground/, "/index.html") : req.url.replace(/\/playground/, "");
            }
            handler(req, res, {
                cleanUrls: false,
                directoryListing: false,
                public: PLAYGROUND_PUBLIC_PATH,
                etag: true
            }).catch(e => {
                console.error(e);
                res.statusCode = 500;
                res.write(e.toString());
                res.end();
            });
        });

        this.addHttpHandler("GET", "/ast.json", (req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.write(JSON.stringify(apiConfig.astJson));
            res.end();
        });
    }

    ignoreUrlPrefix(urlPrefix: string) {
        this.ignoredUrlPrefix = urlPrefix;
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
        this.addHeader("Access-Control-Allow-Methods", "DELETE, HEAD, PUT, POST, PATCH, GET, OPTIONS");
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

    private findBestHandler(path: string, req: IncomingMessage) {
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
        const hrStart = process.hrtime();
        req.on("error", (err) => {
            console.error(err);
            res.end();
        });

        res.on("error", (err) => {
            console.error(err);
            res.end();
        });

        if (this.dynamicCorsOrigin && req.headers.origin) {
            res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
            res.setHeader("Vary", "Origin");
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
        req.on("end", () => this.handleRequestWithBody(req, res, body, hrStart).catch(e =>
            this.writeReply(res, null, { error: e }, hrStart)
        ));
    }

    private fatalError(message: string) {
        try {
            this.apiConfig.err.Fatal(message);
        } catch (fatal) {
            return fatal;
        }
    }

    private log(message: string) {
        console.log(`${new Date().toISOString()} ${message}`);
    }

    private async handleRequestWithBody(req: IncomingMessage, res: ServerResponse, body: string, hrStart: [number, number]) {
        let path = parseUrl(req.url || "").pathname || "";

        if (path.startsWith(this.ignoredUrlPrefix))
            path = path.slice(this.ignoredUrlPrefix.length);

        const externalHandler = this.findBestHandler(path, req);
        if (externalHandler) {
            this.log(`HTTP ${req.method} ${path}`);
            externalHandler.handler(req, res, body);
            return;
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8");

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
                error: this.fatalError("Couldn't determine client IP")
            }, hrStart);
            return;
        }

        const request = this.parseRequest(req, body);
        if (!request) {
            this.writeReply(res, null, {
                error: this.fatalError("Couldn't parse request")
            }, hrStart);
            return;
        }

        const ctx: Context & ExtraContextT = {
            ...this.extraContext,
            ip: clientIp,
            request,
        };

        const functionDescription = this.apiConfig.astJson.functionTable[ctx.request.name];
        const functionImplementation = this.apiConfig.fn[ctx.request.name];
        if (!functionDescription || !functionImplementation) {
            this.writeReply(res, ctx, {
                error: this.fatalError(`Function does not exist: ${ctx.request.name}`)
            }, hrStart);
            return;
        }

        let reply: ContextReply | null;
        try {
            reply = await this.apiConfig.hook.onRequestStart(ctx);
            if (!reply) {
                const args = decode(this.apiConfig.astJson.typeTable, `${ctx.request.name}.args`, functionDescription.args, ctx.request.args);
                const ret = await functionImplementation(ctx, args);
                const encodedRet = encode(this.apiConfig.astJson.typeTable, `${ctx.request.name}.ret`, functionDescription.ret, ret);
                reply = { result: encodedRet };
            }
        } catch (e) {
            reply = {
                error: e
            };
        }

        reply = await this.apiConfig.hook.onRequestEnd(ctx, reply) || reply;

        // If errors, check if the error type is one of the @throws annotation. If it isn't, change to Fatal
        if (reply.error) {
            const functionAst = this.apiConfig.ast.operations.find(op => op.name === ctx.request.name);
            if (functionAst) {
                const allowedErrors = functionAst.annotations.filter(ann => ann instanceof ThrowsAnnotation).map(ann => (ann as ThrowsAnnotation).error);
                if (allowedErrors.length > 0) {
                    if (!allowedErrors.includes(reply.error.type)) {
                        reply.error.type = "Fatal";
                    }
                }
            }
        }

        this.writeReply(res, ctx, reply, hrStart);
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
                args: "json",
                name: "string",
                device: {
                    id: "string?",
                    type: "string?",
                    platform: "json?",
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
            headers: req.headers,
            deviceInfo: {
                id: parsed.device.id || parsed.id,
                language: parsed.device.language,
                platform: parsed.device.platform,
                timezone: parsed.device.timezone,
                type: parsed.device.type || parsed.device.platform || "",
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
                args: "json",
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
            headers: req.headers,
            deviceInfo: {
                id: parsed.deviceId,
                language: parsed.info.language,
                platform: {
                    browserUserAgent: parsed.info.browserUserAgent || null,
                },
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
                requestId: "string?",
                name: "string",
                args: "json",
                extra: "json?",
                deviceInfo: "DeviceInfo?",
            },
            DeviceInfo: {
                id: "string?",
                type: "string?",
                browserUserAgent: "string?",
                timezone: "string?",
                version: "string?",
                language: "string?",
            }
        }, "root", "Request", JSON.parse(body));

        const deviceInfo = parsed.deviceInfo || {};

        return {
            version: 3,
            id: parsed.requestId || randomBytes(16).toString("hex"),
            args: parsed.args,
            name: parsed.name,
            extra: parsed.extra ? {
                ...parsed.extra
            } : {},
            headers: req.headers,
            deviceInfo: {
                id: deviceInfo.id || randomBytes(16).toString("hex"),
                language: deviceInfo.language || null,
                platform: {
                    browserUserAgent: deviceInfo.browserUserAgent || null,
                },
                timezone: deviceInfo.timezone || null,
                type: deviceInfo.type || "api",
                version: deviceInfo.version || null,
            }
        };
    }

    private makeResponseError(err: any) {
        return {
            type: err.type || "Fatal",
            message: err.message || err.toString()
        };
    }

    private writeReply(res: ServerResponse, ctx: Context | null, reply: ContextReply, hrStart: [number, number]) {
        if (!ctx) {
            if (!reply.error) {
                reply = {
                    error: this.fatalError("Response without context")
                }
            }

            res.statusCode = 500;
            res.write(JSON.stringify({ error: this.makeResponseError(reply.error) }));
            res.end();
            return;
        }

        const deltaTime = process.hrtime(hrStart);
        const duration = deltaTime[0] + deltaTime[1] * 1e-9;

        this.log(`${ctx.request.id} [${duration.toFixed(6)}s] ${ctx.request.name}() -> ${reply.error ? this.makeResponseError(reply.error).type : "OK"}`);

        switch (ctx.request.version) {
            case 1: {
                const response = {
                    id: ctx.request.id,
                    ok: !reply.error,
                    deviceId: ctx.request.deviceInfo.id,
                    duration: duration,
                    host: hostname(),
                    result: reply.error ? null : reply.result,
                    error: reply.error ? this.makeResponseError(reply.error) : null
                };

                res.statusCode = response.error ? (this.makeResponseError(response.error).type === "Fatal" ? 500 : 400) : 200;
                res.write(JSON.stringify(response));
                res.end();
                break;
            }
            case 2: {
                const response = {
                    ok: !reply.error,
                    deviceId: ctx.request.deviceInfo.id,
                    sessionId: ctx.request.extra.sessionId,
                    requestId: ctx.request.id,
                    result: reply.error ? null : reply.result,
                    error: reply.error ? this.makeResponseError(reply.error) : null
                };

                res.statusCode = response.error ? (this.makeResponseError(response.error).type === "Fatal" ? 500 : 400) : 200;
                res.write(JSON.stringify(response));
                res.end();
                break;
            }
            case 3: {
                const response = {
                    duration: duration,
                    host: hostname(),
                    result: reply.error ? null : reply.result,
                    error: reply.error ? this.makeResponseError(reply.error) : null
                };

                res.statusCode = response.error ? (this.makeResponseError(response.error).type === "Fatal" ? 500 : 400) : 200;
                res.setHeader("x-request-id", ctx.request.id);
                res.write(JSON.stringify(response));
                res.end();
                break;
            }
        }
    }
}
