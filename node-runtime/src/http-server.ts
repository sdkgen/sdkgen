import { randomBytes } from "crypto";
import { createReadStream, createWriteStream, unlink } from "fs";
import type { IncomingMessage, Server, ServerResponse } from "http";
import { createServer } from "http";
import type { AddressInfo } from "net";
import { hostname } from "os";
import { parse as parseQuerystring } from "querystring";
import { parse as parseUrl } from "url";
import { promisify } from "util";

import { generateCSharpServerSource } from "@sdkgen/csharp-generator";
import { generateDartClientSource } from "@sdkgen/dart-generator";
import { generateFSharpServerSource } from "@sdkgen/fsharp-generator";
import { generateAndroidClientSource } from "@sdkgen/kotlin-generator";
import type { AstRoot } from "@sdkgen/parser";
import {
  StatusCodeAnnotation,
  DecimalPrimitiveType,
  Base64PrimitiveType,
  BigIntPrimitiveType,
  BoolPrimitiveType,
  BytesPrimitiveType,
  CnpjPrimitiveType,
  CpfPrimitiveType,
  DatePrimitiveType,
  DateTimePrimitiveType,
  FloatPrimitiveType,
  HexPrimitiveType,
  HtmlPrimitiveType,
  IntPrimitiveType,
  MoneyPrimitiveType,
  OptionalType,
  RestAnnotation,
  StringPrimitiveType,
  UIntPrimitiveType,
  UuidPrimitiveType,
  VoidPrimitiveType,
  XmlPrimitiveType,
} from "@sdkgen/parser";
import { PLAYGROUND_PUBLIC_PATH } from "@sdkgen/playground";
import { generateSwiftClientSource } from "@sdkgen/swift-generator";
import { generateBrowserClientSource, generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import Busboy from "busboy";
import FileType from "file-type";
import { getClientIp } from "request-ip";
import staticFilesHandler from "serve-handler";

import type { BaseApiConfig } from "./api-config";
import type { Context, ContextReply, ContextRequest } from "./context";
import { decode, encode } from "./encode-decode";
import { Fatal } from "./error";
import { executeRequest } from "./execute";
import { setupSwagger } from "./swagger";
import { has } from "./utils";

export class SdkgenHttpServer<ExtraContextT = unknown> {
  public httpServer: Server;

  private readonly headers = new Map<string, string>();

  private readonly healthChecks: Array<() => Promise<boolean>> = [];

  private handlers: Array<{
    method: string;
    matcher: string | RegExp;
    handler(req: IncomingMessage, res: ServerResponse, body: Buffer): void;
  }> = [];

  public dynamicCorsOrigin = true;

  public introspection = true;

  public log = (message: string) => {
    console.log(`${new Date().toISOString()} ${message}`);
  };

  private hasSwagger = false;

  private ignoredUrlPrefix = "";

  private extraContext: ExtraContextT;

  constructor(
    public apiConfig: BaseApiConfig<ExtraContextT>,
    ...maybeExtraContext: {} extends ExtraContextT ? [{}?] : [ExtraContextT]
  ) {
    this.extraContext = (maybeExtraContext[0] ?? {}) as ExtraContextT;
    this.httpServer = createServer(this.handleRequest.bind(this));
    this.enableCors();
    this.attachRestHandlers();

    const targetTable = [
      ["/targets/android/client.kt", (ast: AstRoot) => generateAndroidClientSource(ast, true)],
      ["/targets/android/client_without_callbacks.kt", (ast: AstRoot) => generateAndroidClientSource(ast, false)],
      ["/targets/dotnet/api.cs", generateCSharpServerSource],
      ["/targets/dotnet/api.fs", generateFSharpServerSource],
      ["/targets/flutter/client.dart", generateDartClientSource],
      ["/targets/ios/client.swift", (ast: AstRoot) => generateSwiftClientSource(ast, false)],
      ["/targets/ios/client-rx.swift", (ast: AstRoot) => generateSwiftClientSource(ast, true)],
      ["/targets/node/api.ts", generateNodeServerSource],
      ["/targets/node/client.ts", generateNodeClientSource],
      ["/targets/web/client.ts", generateBrowserClientSource],
    ] as const;

    for (const [path, generateFn] of targetTable) {
      this.addHttpHandler("GET", path, (_req, res) => {
        if (!this.introspection) {
          res.statusCode = 404;
          res.end();
          return;
        }

        try {
          res.setHeader("Content-Type", "application/octet-stream");
          res.write(generateFn(this.apiConfig.ast));
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.write(`${e}`);
        }

        res.end();
      });
    }

    this.addHttpHandler("GET", "/ast.json", (_req, res) => {
      if (!this.introspection) {
        res.statusCode = 404;
        res.end();
        return;
      }

      res.setHeader("Content-Type", "application/json");
      res.write(JSON.stringify(apiConfig.astJson));
      res.end();
    });

    this.addHttpHandler("GET", /^\/playground.*/u, (req, res) => {
      if (!this.introspection) {
        res.statusCode = 404;
        res.end();
        return;
      }

      if (req.url) {
        req.url = req.url.endsWith("/playground") ? req.url.replace(/\/playground/u, "/index.html") : req.url.replace(/\/playground/u, "");
      }

      staticFilesHandler(req, res, {
        cleanUrls: false,
        directoryListing: false,
        etag: true,
        public: PLAYGROUND_PUBLIC_PATH,
      }).catch(e => {
        console.error(e);
        res.statusCode = 500;
        res.write(`${e}`);
        res.end();
      });
    });
  }

  registerHealthCheck(healthCheck: () => Promise<boolean>): void {
    this.healthChecks.push(healthCheck);
  }

  ignoreUrlPrefix(urlPrefix: string): void {
    this.ignoredUrlPrefix = urlPrefix;
  }

  async listen(port = 8000): Promise<void> {
    return new Promise(resolve => {
      this.httpServer.listen(port, () => {
        const addr = this.httpServer.address() as AddressInfo;
        let urlHost: string;

        if (addr.address === "::") {
          urlHost = `localhost:${addr.port}`;
        } else if (addr.family === "ipv6") {
          urlHost = `[${addr.address}]:${addr.port}`;
        } else {
          urlHost = `${addr.address}:${addr.port}`;
        }

        if (addr.address === "::" || addr.address === "0.0.0.0") {
          console.log(`\nListening on port ${addr.port}`);
        } else {
          console.log(`\nListening on port ${addr.port} (${addr.address})`);
        }

        if (this.introspection) {
          console.log(`Playground: http://${urlHost}/playground`);
        }

        if (this.hasSwagger) {
          console.log(`Swagger UI: http://${urlHost}/swagger`);
        }

        console.log("");

        resolve();
      });
    });
  }

  async close(): Promise<void> {
    return promisify(this.httpServer.close.bind(this.httpServer))();
  }

  private enableCors() {
    this.addHeader("Access-Control-Allow-Methods", "DELETE, HEAD, PUT, POST, PATCH, GET, OPTIONS");
    this.addHeader("Access-Control-Allow-Headers", "Content-Type");
    this.addHeader("Access-Control-Max-Age", "86400");
  }

  addHeader(header: string, value: string): void {
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

  addHttpHandler(method: string, matcher: string | RegExp, handler: (req: IncomingMessage, res: ServerResponse, body: Buffer) => void): void {
    this.handlers.push({ handler, matcher, method });
  }

  private findBestHandler(path: string, req: IncomingMessage) {
    const matchingHandlers = this.handlers
      .filter(({ method }) => method === req.method)
      .filter(({ matcher }) => {
        if (typeof matcher === "string") {
          return matcher === path;
        }

        return matcher.exec(path)?.[0] === path;
      })
      .sort(({ matcher: first }, { matcher: second }) => {
        // Prefer string matches instead of Regexp matches
        if (typeof first === "string" && typeof second === "string") {
          return 0;
        } else if (typeof first === "string") {
          return -1;
        } else if (typeof second === "string") {
          return 1;
        }

        const firstMatch = first.exec(path);
        const secondMatch = second.exec(path);

        if (!firstMatch) {
          return -1;
        }

        if (!secondMatch) {
          return 1;
        }

        // Compute how many characters were NOT part of a capture group
        const firstLength = firstMatch[0].length - firstMatch.slice(1).reduce((acc, cur) => acc + cur.length, 0);
        const secondLength = secondMatch[0].length - secondMatch.slice(1).reduce((acc, cur) => acc + cur.length, 0);

        // Prefer the maximum number of non-captured characters
        return secondLength - firstLength;
      });

    return matchingHandlers.length ? matchingHandlers[0] : null;
  }

  private attachRestHandlers() {
    function escapeRegExp(str: string) {
      return str.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    }

    for (const op of this.apiConfig.ast.operations) {
      for (const ann of op.annotations) {
        if (!(ann instanceof RestAnnotation)) {
          continue;
        }

        if (!this.hasSwagger) {
          setupSwagger(this);
          this.hasSwagger = true;
        }

        const pathFragments = ann.path.split(/\{\w+\}/u);

        let pathRegex = "^";

        for (let i = 0; i < pathFragments.length; ++i) {
          if (i > 0) {
            pathRegex += "([^/]+?)";
          }

          pathRegex += escapeRegExp(pathFragments[i]);
        }

        pathRegex += "/?$";

        for (const header of ann.headers.keys()) {
          this.addHeader("Access-Control-Allow-Headers", header.toLowerCase());
        }

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.addHttpHandler(ann.method, new RegExp(pathRegex, "u"), async (req, res, body) => {
          try {
            const args: Record<string, unknown> = {};
            const files: ContextRequest["files"] = [];

            const { pathname, query } = parseUrl(req.url ?? "");
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

              if (argValue === null) {
                continue;
              }

              simpleArgs.set(argName, Array.isArray(argValue) ? argValue.join("") : argValue);
            }

            for (const [headerName, argName] of ann.headers) {
              const argValue = req.headers[headerName.toLowerCase()] ?? null;

              if (argValue === null) {
                continue;
              }

              simpleArgs.set(argName, Array.isArray(argValue) ? argValue.join("") : argValue);
            }

            if (!ann.bodyVariable && req.headers["content-type"]?.match(/^application\/x-www-form-urlencoded/iu)) {
              const parsedBody = parseQuerystring(body.toString());

              for (const argName of ann.queryVariables) {
                const argValue = parsedBody[argName] ?? null;

                if (argValue === null) {
                  continue;
                }

                simpleArgs.set(argName, Array.isArray(argValue) ? argValue.join("") : argValue);
              }
            } else if (!ann.bodyVariable && req.headers["content-type"]?.match(/^multipart\/form-data/iu)) {
              const busboy = Busboy({ headers: req.headers });
              const filePromises: Array<Promise<void>> = [];

              busboy.on("field", (field, value) => {
                if (ann.queryVariables.includes(field)) {
                  simpleArgs.set(field, `${value}`);
                }
              });

              busboy.on("file", (_field, stream, info) => {
                const tempName = randomBytes(32).toString("hex");
                const writeStream = createWriteStream(tempName);

                filePromises.push(
                  new Promise((resolve, reject) => {
                    writeStream.on("error", reject);

                    writeStream.on("close", () => {
                      const contents = createReadStream(tempName);

                      files.push({ contents, name: info.filename });

                      contents.on("open", () => {
                        unlink(tempName, err => {
                          if (err) {
                            reject(err);
                          } else {
                            resolve();
                          }
                        });
                      });
                    });

                    writeStream.on("open", () => {
                      stream.pipe(writeStream);
                    });
                  }),
                );
              });

              await new Promise((resolve, reject) => {
                busboy.on("finish", resolve);
                busboy.on("error", reject);
                busboy.write(body);
              });

              await Promise.all(filePromises);
            } else if (ann.bodyVariable) {
              const argName = ann.bodyVariable;
              const arg = op.args.find(x => x.name === argName);

              if (/application\/json/iu.test(req.headers["content-type"] ?? "")) {
                args[argName] = JSON.parse(body.toString());
              } else if (arg) {
                let { type } = arg;
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
                    type instanceof DecimalPrimitiveType ||
                    type instanceof BigIntPrimitiveType ||
                    type instanceof CpfPrimitiveType ||
                    type instanceof CnpjPrimitiveType ||
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
              const arg = op.args.find(x => x.name === argName);

              if (!arg) {
                continue;
              }

              let { type } = arg;

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
              } else if (type instanceof UIntPrimitiveType || type instanceof IntPrimitiveType || type instanceof MoneyPrimitiveType) {
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
              args,
              deviceInfo: {
                fingerprint: null,
                id: randomBytes(16).toString("hex"),
                language: null,
                platform: null,
                timezone: null,
                type: "rest",
                version: null,
              },
              extra: {},
              files,
              headers: req.headers,
              id: randomBytes(16).toString("hex"),
              ip,
              name: op.name,
              version: 3,
            };

            await this.executeRequest(request, (ctx, reply) => {
              try {
                if (ctx) {
                  for (const [headerKey, headerValue] of ctx.response.headers.entries()) {
                    res.setHeader(headerKey, headerValue);
                  }
                }

                if (ctx?.response.statusCode) {
                  res.statusCode = ctx.response.statusCode;
                }

                if (reply.error) {
                  const error = this.makeResponseError(reply.error);

                  if (!ctx?.response.statusCode) {
                    const errorNode = this.apiConfig.ast.errors.find(node => node.name === error.type);
                    const statusAnnotation = errorNode?.annotations.find(x => x instanceof StatusCodeAnnotation) as StatusCodeAnnotation | undefined;

                    res.statusCode = statusAnnotation ? statusAnnotation.statusCode : error.type === "Fatal" ? 500 : 400;
                  }

                  res.setHeader("content-type", "application/json");
                  res.write(JSON.stringify(error));
                  res.end();
                  return;
                }

                if (req.headers.accept === "application/json") {
                  res.setHeader("content-type", "application/json");
                  res.write(JSON.stringify(reply.result));
                  res.end();
                } else {
                  let type = op.returnType;

                  if (type instanceof OptionalType) {
                    if (reply.result === null) {
                      if (!ctx?.response.statusCode) {
                        res.statusCode = ann.method === "GET" ? 404 : 204;
                      }

                      res.end();
                      return;
                    }

                    type = type.base;
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
                    type instanceof DecimalPrimitiveType ||
                    type instanceof BigIntPrimitiveType ||
                    type instanceof CpfPrimitiveType ||
                    type instanceof CnpjPrimitiveType ||
                    type instanceof UuidPrimitiveType ||
                    type instanceof HexPrimitiveType ||
                    type instanceof Base64PrimitiveType
                  ) {
                    res.setHeader("content-type", "text/plain");
                    res.write(`${reply.result}`);
                    res.end();
                  } else if (type instanceof HtmlPrimitiveType) {
                    res.setHeader("content-type", "text/html");
                    res.write(`${reply.result}`);
                    res.end();
                  } else if (type instanceof XmlPrimitiveType) {
                    res.setHeader("content-type", "text/xml");
                    res.write(`${reply.result}`);
                    res.end();
                  } else if (type instanceof BytesPrimitiveType) {
                    const buffer = Buffer.from(reply.result as string, "base64");

                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    FileType.fromBuffer(buffer)
                      .then(fileType => {
                        res.setHeader("content-type", fileType?.mime ?? "application/octet-stream");
                      })
                      .catch(err => {
                        console.error(err);
                        res.setHeader("content-type", "application/octet-stream");
                      })
                      .then(() => {
                        res.write(buffer);
                        res.end();
                      })
                      .catch(() => {});
                  } else {
                    res.setHeader("content-type", "application/json");
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

  public handleRequest = (req: IncomingMessage, res: ServerResponse) => {
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

    const handleBody = (body: Buffer) => {
      this.handleRequestWithBody(req, res, body, hrStart).catch((e: unknown) => this.writeReply(res, null, { error: e }, hrStart));
    };

    // Google Cloud Functions add a rawBody property to the request object
    if (has(req, "rawBody") && req.rawBody instanceof Buffer) {
      handleBody(req.rawBody);
    } else {
      const body: Buffer[] = [];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      req.on("data", chunk => body.push(chunk));

      req.on("end", () => {
        handleBody(Buffer.concat(body));
      });
    }
  };

  private async handleRequestWithBody(req: IncomingMessage, res: ServerResponse, body: Buffer, hrStart: [number, number]) {
    const { pathname, query } = parseUrl(req.url ?? "");
    let path = pathname ?? "";

    if (path.startsWith(this.ignoredUrlPrefix)) {
      path = path.slice(this.ignoredUrlPrefix.length);
    }

    if (!req.headers["content-type"]?.match(/application\/sdkgen/iu)) {
      const externalHandler = this.findBestHandler(path, req);

      if (externalHandler) {
        this.log(`HTTP ${req.method} ${path}${query ? `?${query}` : ""}`);
        externalHandler.handler(req, res, body);
        return;
      }
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

      let ok = true;

      try {
        for (const healthCheck of this.healthChecks) {
          if (!ok) {
            break;
          }

          ok = await healthCheck();
        }
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
          error: new Fatal("Couldn't determine client IP"),
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
          error: new Fatal("Couldn't parse request"),
        },
        hrStart,
      );
      return;
    }

    await this.executeRequest(request, (ctx, reply) => this.writeReply(res, ctx, reply, hrStart));
  }

  private async executeRequest(request: ContextRequest, writeReply: (ctx: Context | null, reply: ContextReply) => void) {
    const ctx: Context & ExtraContextT = {
      ...this.extraContext,
      request,
      response: {
        headers: new Map(),
      },
    };

    writeReply(ctx, await executeRequest(ctx, this.apiConfig));
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

  private identifyRequestVersion(_req: IncomingMessage, body: string): number {
    const parsed = JSON.parse(body) as unknown;

    if (typeof parsed === "object" && parsed && has(parsed, "version") && typeof parsed.version === "number") {
      return parsed.version;
    } else if (typeof parsed === "object" && parsed && has(parsed, "requestId")) {
      return 2;
    } else if (typeof parsed === "object" && parsed && has(parsed, "device")) {
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
          device: "RequestDevice",
          id: "string",
          name: "string",
        },
        RequestDevice: {
          fingerprint: "string?",
          id: "string?",
          language: "string?",
          platform: "json?",
          timezone: "string?",
          type: "string?",
          version: "string?",
        },
      } as const,
      "root",
      "Request",
      JSON.parse(body),
    );

    const deviceId = parsed.device.id ?? randomBytes(20).toString("hex");

    if (!parsed.args || Array.isArray(parsed.args) || typeof parsed.args !== "object") {
      throw new Error("Expected 'args' to be an object");
    }

    return {
      args: parsed.args,
      deviceInfo: {
        fingerprint: parsed.device.fingerprint,
        id: deviceId,
        language: parsed.device.language,
        platform: parsed.device.platform,
        timezone: parsed.device.timezone,
        type: parsed.device.type ?? (typeof parsed.device.platform === "string" ? parsed.device.platform : ""),
        version: parsed.device.version,
      },
      extra: {},
      files: [],
      headers: req.headers,
      id: `${deviceId}-${parsed.id}`,
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
          deviceFingerprint: "string?",
          deviceId: "string",
          info: "RequestInfo",
          name: "string",
          partnerId: "string?",
          requestId: "string?",
          sessionId: "string?",
        },
        RequestInfo: {
          browserUserAgent: "string?",
          language: "string",
          type: "string",
        },
      } as const,
      "root",
      "Request",
      JSON.parse(body),
    );

    if (!parsed.args || Array.isArray(parsed.args) || typeof parsed.args !== "object") {
      throw new Error("Expected 'args' to be an object");
    }

    return {
      args: parsed.args,
      deviceInfo: {
        fingerprint: parsed.deviceFingerprint,
        id: parsed.deviceId,
        language: parsed.info.language,
        platform: {
          browserUserAgent: parsed.info.browserUserAgent ?? null,
        },
        timezone: null,
        type: parsed.info.type,
        version: "",
      },
      extra: {
        partnerId: parsed.partnerId,
        sessionId: parsed.sessionId,
      },
      files: [],
      headers: req.headers,
      id: `${parsed.deviceId}-${parsed.requestId ?? randomBytes(16).toString("hex")}`,
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
          fingerprint: "string?",
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
      } as const,
      "root",
      "Request",
      JSON.parse(body),
    );

    const deviceInfo = parsed.deviceInfo ?? {
      fingerprint: null,
      id: null,
      language: null,
      platform: null,
      timezone: null,
      type: null,
      version: null,
    };
    const deviceId = deviceInfo.id ?? randomBytes(16).toString("hex");

    if (!parsed.args || Array.isArray(parsed.args) || typeof parsed.args !== "object") {
      throw new Error("Expected 'args' to be an object");
    }

    return {
      args: parsed.args,
      deviceInfo: {
        fingerprint: deviceInfo.fingerprint,
        id: deviceId,
        language: deviceInfo.language,
        platform: typeof deviceInfo.platform === "object" ? { ...deviceInfo.platform } : {},
        timezone: deviceInfo.timezone,
        type: deviceInfo.type ?? "api",
        version: deviceInfo.version,
      },
      extra: typeof parsed.extra === "object" ? { ...parsed.extra } : {},
      files: [],
      headers: req.headers,
      id: `${deviceId}-${parsed.requestId ?? randomBytes(16).toString("hex")}`,
      ip,
      name: parsed.name,
      version: 3,
    };
  }

  private makeResponseError(err: unknown): { message: string; type: string; data: unknown } {
    let type = "Fatal";

    if (typeof err === "object" && err !== null && has(err, "type") && typeof err.type === "string") {
      ({ type } = err);
    }

    let message: string;

    if (typeof err === "object" && err !== null && has(err, "message") && typeof err.message === "string") {
      ({ message } = err);
    } else if (err instanceof Error) {
      message = err.toString();
    } else if (typeof err === "object") {
      message = JSON.stringify(err);
    } else {
      message = `${err}`;
    }

    let data: unknown;

    if (typeof err === "object" && err !== null && has(err, "data")) {
      ({ data } = err);
    }

    const error = this.apiConfig.ast.errors.find(x => x.name === type);

    if (error) {
      if (!(error.dataType instanceof VoidPrimitiveType)) {
        try {
          data = encode(this.apiConfig.astJson.typeTable, `error.${type}`, error.dataType.name, data);
        } catch (encodeError) {
          message = `Failed to encode error ${type} because: ${encodeError}. Original message: ${message}`;
          type = "Fatal";
        }
      }
    } else {
      type = "Fatal";
    }

    return { data, message, type };
  }

  private writeReply(res: ServerResponse, ctx: Context | null, reply: ContextReply, hrStart: [number, number]) {
    if (!ctx) {
      res.statusCode = 500;
      res.write(
        JSON.stringify({
          error: this.makeResponseError(reply.error ?? new Fatal("Response without context")),
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

    this.log(`${ctx.request.id} [${duration.toFixed(6)}s] ${ctx.request.name}() -> ${reply.error ? this.makeResponseError(reply.error).type : "OK"}`);

    if (ctx.response.statusCode) {
      res.statusCode = ctx.response.statusCode;
    }

    for (const [headerKey, headerValue] of ctx.response.headers.entries()) {
      res.setHeader(headerKey, headerValue);
    }

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

        if (response.error && !ctx.response.statusCode) {
          res.statusCode = this.makeResponseError(response.error).type === "Fatal" ? 500 : 400;
        }

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

        if (response.error && !ctx.response.statusCode) {
          res.statusCode = this.makeResponseError(response.error).type === "Fatal" ? 500 : 400;
        }

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

        if (response.error && !ctx.response.statusCode) {
          res.statusCode = this.makeResponseError(response.error).type === "Fatal" ? 500 : 400;
        }

        res.setHeader("x-request-id", ctx.request.id);
        res.write(JSON.stringify(response));
        res.end();
        break;
      }

      default: {
        res.statusCode = 500;
        res.write(
          JSON.stringify({
            error: this.makeResponseError(reply.error ?? new Fatal("Unknown request version")),
          }),
        );
        res.end();
        return;
      }
    }
  }
}
