import { generateDartClientSource } from "@sdkgen/dart-generator";
import {
    AstJson,
    AstRoot,
    Base64PrimitiveType,
    BoolPrimitiveType,
    BytesPrimitiveType,
    CepPrimitiveType,
    CnpjPrimitiveType,
    CpfPrimitiveType,
    DatePrimitiveType,
    DateTimePrimitiveType,
    FloatPrimitiveType,
    HexPrimitiveType,
    IntPrimitiveType,
    jsonToAst,
    MoneyPrimitiveType,
    OptionalType,
    RestAnnotation,
    StringPrimitiveType,
    ThrowsAnnotation,
    UIntPrimitiveType,
    UuidPrimitiveType,
} from "@sdkgen/parser";
import { PLAYGROUND_PUBLIC_PATH } from "@sdkgen/playground";
import {
    generateBrowserClientSource,
    generateNodeClientSource,
    generateNodeServerSource,
} from "@sdkgen/typescript-generator";
import { randomBytes } from "crypto";
import FileType from "file-type";
import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { hostname } from "os";
import { parse as parseQuerystring } from "querystring";
import { getClientIp } from "request-ip";
import staticFilesHandler from "serve-handler";
import { parse as parseUrl } from "url";
import { BaseApiConfig } from "./api-config";
import { Context, ContextReply, ContextRequest } from "./context";
import { decode, encode } from "./encode-decode";

export class SdkgenHttpServer<ExtraContextT = {}> {
    public httpServer: Server;

    private headers = new Map<string, string>();

    private handlers: Array<{
        method: string;
        matcher: string | RegExp;
        handler: (req: IncomingMessage, res: ServerResponse, body: Buffer) => void;
    }> = [];

    public dynamicCorsOrigin = true;

    public introspection = true;

    private ignoredUrlPrefix = "";

    private ast: AstRoot;

    constructor(protected apiConfig: BaseApiConfig<ExtraContextT>, private extraContext: ExtraContextT) {
        this.ast = jsonToAst(apiConfig.astJson);
        this.httpServer = createServer(this.handleRequest.bind(this));
        this.enableCors();
        this.attachRestHandlers();

        const targetTable = [
            ["/targets/node/api.ts", generateNodeServerSource],
            ["/targets/node/client.ts", generateNodeClientSource],
            ["/targets/web/client.ts", generateBrowserClientSource],
            ["/targets/flutter/client.dart", generateDartClientSource],
        ] as const;

        for (const [path, generateFn] of targetTable) {
            this.addHttpHandler("GET", path, (req, res) => {
                if (!this.introspection) {
                    res.statusCode = 404;
                    res.end();
                    return;
                }

                try {
                    res.setHeader("Content-Type", "application/octet-stream");
                    res.write(generateFn(this.ast, {}));
                } catch (e) {
                    console.error(e);
                    res.statusCode = 500;
                    res.write(e.toString());
                }

                res.end();
            });
        }

        this.addHttpHandler("GET", "/ast.json", (req, res) => {
            if (!this.introspection) {
                res.statusCode = 404;
                res.end();
                return;
            }

            res.setHeader("Content-Type", "application/json");
            res.write(JSON.stringify(apiConfig.astJson));
            res.end();
        });

        this.addHttpHandler("GET", /^\/playground/u, (req, res) => {
            if (!this.introspection) {
                res.statusCode = 404;
                res.end();
                return;
            }

            if (req.url) {
                req.url = req.url.endsWith("/playground")
                    ? req.url.replace(/\/playground/u, "/index.html")
                    : req.url.replace(/\/playground/u, "");
            }

            staticFilesHandler(req, res, {
                cleanUrls: false,
                directoryListing: false,
                etag: true,
                public: PLAYGROUND_PUBLIC_PATH,
            }).catch(e => {
                console.error(e);
                res.statusCode = 500;
                res.write(e.toString());
                res.end();
            });
        });
    }

    ignoreUrlPrefix(urlPrefix: string) {
        this.ignoredUrlPrefix = urlPrefix;
    }

    listen(port = 8000) {
        this.httpServer.listen(port, () => {
            const addr = this.httpServer.address();
            const addrString = addr === null ? "???" : typeof addr === "string" ? addr : `${addr.address}:${addr.port}`;

            console.log(`Listening on ${addrString}`);
        });
    }

    close() {
        return new Promise((resolve, reject) => this.httpServer.close(error => (error ? reject(error) : resolve())));
    }

    private enableCors() {
        this.addHeader("Access-Control-Allow-Methods", "DELETE, HEAD, PUT, POST, PATCH, GET, OPTIONS");
        this.addHeader("Access-Control-Allow-Headers", "Content-Type");
        this.addHeader("Access-Control-Max-Age", "86400");
    }

    addHeader(header: string, value: string) {
        const cleanHeader = header.toLowerCase().trim();
        const existing = this.headers.get(cleanHeader);

        if (existing) {
            if (!existing.includes(value)) {
                this.headers.set(cleanHeader, `${existing}, ${value}`);
            }
        } else {
            this.headers.set(cleanHeader, value);
        }
    }

    addHttpHandler(
        method: string,
        matcher: string | RegExp,
        handler: (req: IncomingMessage, res: ServerResponse, body: Buffer) => void,
    ) {
        this.handlers.push({ handler, matcher, method });
    }

    private findBestHandler(path: string, req: IncomingMessage) {
        const matchingHandlers = this.handlers
            .filter(({ method }) => method === req.method)
            .filter(({ matcher }) => {
                if (typeof matcher === "string") {
                    return matcher === path;
                }

                return path.search(matcher) === 0;
            })
            .sort(({ matcher: first }, { matcher: second }) => {
                if (typeof first === "string" && typeof second === "string") {
                    return 0;
                } else if (typeof first === "string") {
                    return -1;
                } else if (typeof second === "string") {
                    return 1;
                }

                const firstMatch = path.match(first);
                const secondMatch = path.match(second);

                return (secondMatch?.[0]?.length ?? 0) - (firstMatch?.[0]?.length ?? 0);
            });

        return matchingHandlers.length ? matchingHandlers[0] : null;
    }

    private attachRestHandlers() {
        function escapeRegExp(str: string) {
            return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }

        for (const op of this.ast.operations) {
            for (const ann of op.annotations) {
                if (ann instanceof RestAnnotation) {
                    const pathFragments = ann.path.split(/\{\w+\}/u);

                    let pathRegex = "^";
                    for (let i = 0; i < pathFragments.length; ++i) {
                        if (i > 0) {
                            pathRegex += "(.+?)";
                        }
                        pathRegex += escapeRegExp(pathFragments[i]);
                    }
                    pathRegex += "/?$";

                    for (const header of ann.headers.keys()) {
                        this.addHeader("Access-Control-Allow-Headers", header);
                    }

                    this.addHttpHandler(ann.method, new RegExp(pathRegex), (req, res, body) => {
                        try {
                            const args: any = {};

                            const { pathname, query } = parseUrl(req.url || "");
                            const match = pathname?.match(pathRegex);

                            if (!match) {
                                res.statusCode = 404;
                                return;
                            }

                            const simpleArgs = new Map<string, string | null>();

                            for (let i = 0; i < ann.pathVariables.length; ++i) {
                                const argName = ann.pathVariables[i];
                                const argValue = match[i + 1];
                                simpleArgs.set(argName, argValue);
                            }

                            const parsedQuery = query ? parseQuerystring(query) : {};
                            for (const argName of ann.queryVariables) {
                                const argValue = parsedQuery[argName] ?? null;
                                simpleArgs.set(argName, Array.isArray(argValue) ? argValue.join("") : argValue);
                            }

                            for (const [headerName, argName] of ann.headers) {
                                const argValue = req.headers[headerName] ?? null;
                                simpleArgs.set(argName, Array.isArray(argValue) ? argValue.join("") : argValue);
                            }

                            if (ann.bodyVariable) {
                                const argName = ann.bodyVariable;
                                let type = op.args.find(arg => arg.name === argName)!.type;

                                if (req.headers["content-type"] === "application/json") {
                                    args[argName] = JSON.parse(body.toString());
                                } else {
                                    let solved = false;

                                    if (type instanceof OptionalType) {
                                        if (body.length === 0) {
                                            args[argName] = null;
                                            solved = true;
                                        } else {
                                            type = type.base;
                                        }
                                    }

                                    if (!solved) {
                                        if (
                                            type instanceof BoolPrimitiveType ||
                                            type instanceof IntPrimitiveType ||
                                            type instanceof UIntPrimitiveType ||
                                            type instanceof FloatPrimitiveType ||
                                            type instanceof StringPrimitiveType ||
                                            type instanceof DatePrimitiveType ||
                                            type instanceof DateTimePrimitiveType ||
                                            type instanceof MoneyPrimitiveType ||
                                            type instanceof CpfPrimitiveType ||
                                            type instanceof CnpjPrimitiveType ||
                                            type instanceof CepPrimitiveType ||
                                            type instanceof UuidPrimitiveType ||
                                            type instanceof HexPrimitiveType ||
                                            type instanceof Base64PrimitiveType
                                        ) {
                                            simpleArgs.set(argName, body.toString());
                                        } else if (type instanceof BytesPrimitiveType) {
                                            args[argName] = body.toString("base64");
                                        } else {
                                            args[argName] = JSON.parse(body.toString());
                                        }
                                    }
                                }
                            }

                            for (const [argName, argValue] of simpleArgs) {
                                let type = op.args.find(arg => arg.name === argName)!.type;

                                if (type instanceof OptionalType) {
                                    if (argValue === null) {
                                        args[argName] = null;
                                        continue;
                                    } else {
                                        type = type.base;
                                    }
                                } else if (argValue === null) {
                                    args[argName] = argValue;
                                    continue;
                                }

                                if (type instanceof BoolPrimitiveType) {
                                    if (argValue === "true") {
                                        args[argName] = true;
                                    } else if (argValue === "false") {
                                        args[argName] = false;
                                    } else {
                                        args[argName] = argValue;
                                    }
                                } else if (
                                    type instanceof UIntPrimitiveType ||
                                    type instanceof IntPrimitiveType ||
                                    type instanceof MoneyPrimitiveType
                                ) {
                                    args[argName] = parseInt(argValue, 10);
                                } else if (type instanceof FloatPrimitiveType) {
                                    args[argName] = parseFloat(argValue);
                                } else {
                                    args[argName] = argValue;
                                }
                            }

                            const ip = getClientIp(req);
                            if (!ip) {
                                throw new Error("Couldn't determine client IP");
                            }

                            const request: ContextRequest = {
                                name: op.name,
                                ip,
                                headers: req.headers,
                                id: randomBytes(16).toString("hex"),
                                version: 3,
                                deviceInfo: {
                                    id: randomBytes(16).toString("hex"),
                                    type: "rest",
                                    platform: null,
                                    language: null,
                                    timezone: null,
                                    version: null,
                                },
                                extra: {},
                                args,
                            };

                            this.executeRequest(request, (ctx, reply) => {
                                try {
                                    if (reply.error) {
                                        res.statusCode = 400;
                                        res.write(this.makeResponseError(reply.error).message);
                                        res.end();
                                        return;
                                    }

                                    if (req.headers.accept === "application/json") {
                                        res.write(JSON.stringify(reply.result));
                                        res.end();
                                    } else {
                                        let type = op.returnType;

                                        if (type instanceof OptionalType) {
                                            if (reply.result === null) {
                                                res.statusCode = 204;
                                                res.end();
                                                return;
                                            } else {
                                                type = type.base;
                                            }
                                        }

                                        if (
                                            type instanceof BoolPrimitiveType ||
                                            type instanceof IntPrimitiveType ||
                                            type instanceof UIntPrimitiveType ||
                                            type instanceof FloatPrimitiveType ||
                                            type instanceof StringPrimitiveType ||
                                            type instanceof DatePrimitiveType ||
                                            type instanceof DateTimePrimitiveType ||
                                            type instanceof MoneyPrimitiveType ||
                                            type instanceof CpfPrimitiveType ||
                                            type instanceof CnpjPrimitiveType ||
                                            type instanceof CepPrimitiveType ||
                                            type instanceof UuidPrimitiveType ||
                                            type instanceof HexPrimitiveType ||
                                            type instanceof Base64PrimitiveType
                                        ) {
                                            res.setHeader("content-type", "text/plain");
                                            res.write(`${reply.result}`);
                                            res.end();
                                        } else if (type instanceof BytesPrimitiveType) {
                                            const buffer = Buffer.from(reply.result, "base64");
                                            FileType.fromBuffer(buffer)
                                                .then(fileType => {
                                                    res.setHeader(
                                                        "content-type",
                                                        fileType?.mime ?? "application/octet-stream",
                                                    );
                                                })
                                                .catch(err => {
                                                    console.error(err);
                                                    res.setHeader("content-type", "application/octet-stream");
                                                })
                                                .then(() => {
                                                    res.write(buffer);
                                                    res.end();
                                                });
                                        } else {
                                            res.write(JSON.stringify(reply.result));
                                            res.end();
                                        }
                                    }
                                } catch (error) {
                                    console.error(error);
                                    if (!res.headersSent) {
                                        res.statusCode = 500;
                                    }
                                    res.end();
                                }
                            });
                        } catch (error) {
                            console.error(error);
                            if (!res.headersSent) {
                                res.statusCode = 500;
                            }
                            res.end();
                        }
                    });
                }
            }
        }
    }

    private handleRequest(req: IncomingMessage, res: ServerResponse) {
        const hrStart = process.hrtime();

        req.on("error", err => {
            console.error(err);
            res.end();
        });

        res.on("error", err => {
            console.error(err);
            res.end();
        });

        if (this.dynamicCorsOrigin && req.headers.origin) {
            res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
            res.setHeader("Vary", "Origin");
        }

        for (const [header, value] of this.headers) {
            if (req.method === "OPTIONS" && !header.startsWith("access-control-")) {
                continue;
            }

            res.setHeader(header, value);
        }

        if (req.method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
        }

        let body: Buffer[] = [];

        req.on("data", chunk => body.push(chunk));
        req.on("end", async () =>
            this.handleRequestWithBody(req, res, Buffer.concat(body), hrStart).catch(e =>
                this.writeReply(res, null, { error: e }, hrStart),
            ),
        );
    }

    private fatalError(message: string) {
        try {
            throw this.apiConfig.err.Fatal(message);
        } catch (fatal) {
            return fatal;
        }
    }

    private log(message: string) {
        console.log(`${new Date().toISOString()} ${message}`);
    }

    private async handleRequestWithBody(
        req: IncomingMessage,
        res: ServerResponse,
        body: Buffer,
        hrStart: [number, number],
    ) {
        const { pathname, query } = parseUrl(req.url || "");
        let path = pathname || "";

        if (path.startsWith(this.ignoredUrlPrefix)) {
            path = path.slice(this.ignoredUrlPrefix.length);
        }

        const externalHandler = this.findBestHandler(path, req);

        if (externalHandler) {
            this.log(`HTTP ${req.method} ${path}${query ? `?${query}` : ""}`);
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
            if (path !== "/") {
                res.writeHead(404);
                res.end();
                return;
            }

            let ok: boolean;

            try {
                ok = await this.apiConfig.hook.onHealthCheck();
            } catch (e) {
                ok = false;
            }

            res.statusCode = ok ? 200 : 500;
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
            this.writeReply(
                res,
                null,
                {
                    error: this.fatalError("Couldn't determine client IP"),
                },
                hrStart,
            );
            return;
        }

        const request = this.parseRequest(req, body.toString(), clientIp);

        if (!request) {
            this.writeReply(
                res,
                null,
                {
                    error: this.fatalError("Couldn't parse request"),
                },
                hrStart,
            );
            return;
        }

        this.executeRequest(request, (ctx, reply) => this.writeReply(res, ctx, reply, hrStart));
    }

    private async executeRequest(
        request: ContextRequest,
        writeReply: (ctx: Context | null, reply: ContextReply) => void,
    ) {
        const ctx: Context & ExtraContextT = {
            ...this.extraContext,
            request,
        };

        const functionDescription = this.apiConfig.astJson.functionTable[ctx.request.name] as
            | AstJson["functionTable"]["fn"]
            | undefined;
        const functionImplementation = this.apiConfig.fn[ctx.request.name];

        if (!functionDescription || !functionImplementation) {
            writeReply(ctx, {
                error: this.fatalError(`Function does not exist: ${ctx.request.name}`),
            });
            return;
        }

        let reply: ContextReply | null;

        try {
            reply = await this.apiConfig.hook.onRequestStart(ctx);
            if (!reply) {
                const args = decode(
                    this.apiConfig.astJson.typeTable,
                    `${ctx.request.name}.args`,
                    functionDescription.args,
                    ctx.request.args,
                );
                const ret = await functionImplementation(ctx, args);
                const encodedRet = encode(
                    this.apiConfig.astJson.typeTable,
                    `${ctx.request.name}.ret`,
                    functionDescription.ret,
                    ret,
                );

                reply = { result: encodedRet };
            }
        } catch (e) {
            reply = {
                error: e,
            };
        }

        reply = (await this.apiConfig.hook.onRequestEnd(ctx, reply)) || reply;

        // If errors, check if the error type is one of the @throws annotation. If it isn't, change to Fatal
        if (reply.error) {
            const functionAst = this.ast.operations.find(op => op.name === ctx.request.name);

            if (functionAst) {
                const allowedErrors = functionAst.annotations
                    .filter(ann => ann instanceof ThrowsAnnotation)
                    .map(ann => (ann as ThrowsAnnotation).error);

                if (allowedErrors.length > 0) {
                    if (!allowedErrors.includes(reply.error.type)) {
                        reply.error.type = "Fatal";
                    }
                }
            }
        }

        writeReply(ctx, reply);
    }

    private parseRequest(req: IncomingMessage, body: string, ip: string): ContextRequest | null {
        switch (this.identifyRequestVersion(req, body)) {
            case 1:
                return this.parseRequestV1(req, body, ip);
            case 2:
                return this.parseRequestV2(req, body, ip);
            case 3:
                return this.parseRequestV3(req, body, ip);
            default:
                throw new Error("Failed to understand request");
        }
    }

    private identifyRequestVersion(req: IncomingMessage, body: string): number {
        const parsed = JSON.parse(body);

        if ("version" in parsed) {
            return parsed.version;
        } else if ("requestId" in parsed) {
            return 2;
        } else if ("device" in parsed) {
            return 1;
        }

        return 3;
    }

    // Old Sdkgen format
    private parseRequestV1(req: IncomingMessage, body: string, ip: string): ContextRequest {
        const parsed = decode(
            {
                Request: {
                    args: "json",
                    device: {
                        id: "string?",
                        language: "string?",
                        platform: "json?",
                        timezone: "string?",
                        type: "string?",
                        version: "string?",
                    },
                    id: "string",
                    name: "string",
                },
            },
            "root",
            "Request",
            JSON.parse(body),
        );

        return {
            args: parsed.args,
            deviceInfo: {
                id: parsed.device.id || parsed.id,
                language: parsed.device.language,
                platform: parsed.device.platform,
                timezone: parsed.device.timezone,
                type: parsed.device.type || parsed.device.platform || "",
                version: parsed.device.version,
            },
            extra: {},
            headers: req.headers,
            id: parsed.id,
            ip,
            name: parsed.name,
            version: 1,
        };
    }

    // Maxima sdkgen format
    private parseRequestV2(req: IncomingMessage, body: string, ip: string): ContextRequest {
        const parsed = decode(
            {
                Request: {
                    args: "json",
                    deviceId: "string",
                    info: {
                        browserUserAgent: "string?",
                        language: "string",
                        type: "string",
                    },
                    name: "string",
                    partnerId: "string?",
                    requestId: "string",
                    sessionId: "string?",
                },
            },
            "root",
            "Request",
            JSON.parse(body),
        );

        return {
            args: parsed.args,
            deviceInfo: {
                id: parsed.deviceId,
                language: parsed.info.language,
                platform: {
                    browserUserAgent: parsed.info.browserUserAgent || null,
                },
                timezone: null,
                type: parsed.info.type,
                version: "",
            },
            extra: {
                partnerId: parsed.partnerId,
                sessionId: parsed.sessionId,
            },
            headers: req.headers,
            id: parsed.requestId,
            ip,
            name: parsed.name,
            version: 2,
        };
    }

    // New sdkgen format
    private parseRequestV3(req: IncomingMessage, body: string, ip: string): ContextRequest {
        const parsed = decode(
            {
                DeviceInfo: {
                    browserUserAgent: "string?",
                    id: "string?",
                    language: "string?",
                    platform: "json?",
                    timezone: "string?",
                    type: "string?",
                    version: "string?",
                },
                Request: {
                    args: "json",
                    deviceInfo: "DeviceInfo?",
                    extra: "json?",
                    name: "string",
                    requestId: "string?",
                },
            },
            "root",
            "Request",
            JSON.parse(body),
        );

        const deviceInfo = parsed.deviceInfo || {};

        return {
            args: parsed.args,
            deviceInfo: {
                id: deviceInfo.id || randomBytes(16).toString("hex"),
                language: deviceInfo.language || null,
                platform: {
                    ...(deviceInfo.platform ?? {}),
                    browserUserAgent: deviceInfo.browserUserAgent || null,
                },
                timezone: deviceInfo.timezone || null,
                type: deviceInfo.type || "api",
                version: deviceInfo.version || null,
            },
            extra: parsed.extra ? { ...parsed.extra } : {},
            headers: req.headers,
            id: parsed.requestId || randomBytes(16).toString("hex"),
            ip,
            name: parsed.name,
            version: 3,
        };
    }

    private makeResponseError(err: { message: string; type: string }) {
        return {
            message: err.message || err.toString(),
            type: err.type || "Fatal",
        };
    }

    private writeReply(res: ServerResponse, ctx: Context | null, reply: ContextReply, hrStart: [number, number]) {
        if (!ctx) {
            res.statusCode = 500;
            res.write(
                JSON.stringify({
                    error: this.makeResponseError(reply?.error ?? this.fatalError("Response without context")),
                }),
            );
            res.end();
            return;
        }

        const deltaTime = process.hrtime(hrStart);
        const duration = deltaTime[0] + deltaTime[1] * 1e-9;

        if (reply.error) {
            console.error(reply.error);
        }
        this.log(
            `${ctx.request.id} [${duration.toFixed(6)}s] ${ctx.request.name}() -> ${
                reply.error ? this.makeResponseError(reply.error).type : "OK"
            }`,
        );

        switch (ctx.request.version) {
            case 1: {
                const response = {
                    deviceId: ctx.request.deviceInfo.id,
                    duration,
                    error: reply.error ? this.makeResponseError(reply.error) : null,
                    host: hostname(),
                    id: ctx.request.id,
                    ok: !reply.error,
                    result: reply.error ? null : reply.result,
                };

                res.statusCode = response.error
                    ? this.makeResponseError(response.error).type === "Fatal"
                        ? 500
                        : 400
                    : 200;
                res.write(JSON.stringify(response));
                res.end();
                break;
            }

            case 2: {
                const response = {
                    deviceId: ctx.request.deviceInfo.id,
                    error: reply.error ? this.makeResponseError(reply.error) : null,
                    ok: !reply.error,
                    requestId: ctx.request.id,
                    result: reply.error ? null : reply.result,
                    sessionId: ctx.request.extra.sessionId,
                };

                res.statusCode = response.error
                    ? this.makeResponseError(response.error).type === "Fatal"
                        ? 500
                        : 400
                    : 200;
                res.write(JSON.stringify(response));
                res.end();
                break;
            }

            case 3: {
                const response = {
                    duration,
                    error: reply.error ? this.makeResponseError(reply.error) : null,
                    host: hostname(),
                    result: reply.error ? null : reply.result,
                };

                res.statusCode = response.error
                    ? this.makeResponseError(response.error).type === "Fatal"
                        ? 500
                        : 400
                    : 200;
                res.setHeader("x-request-id", ctx.request.id);
                res.write(JSON.stringify(response));
                res.end();
                break;
            }

            default: {
                res.statusCode = 500;
                res.write(
                    JSON.stringify({
                        error: this.makeResponseError(reply?.error ?? this.fatalError("Unknown request version")),
                    }),
                );
                res.end();
                return;
            }
        }
    }
}
