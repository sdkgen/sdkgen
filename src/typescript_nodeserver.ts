import { AstRoot } from "../ast";
import { clearForLogging, generateTypescriptEnum, generateTypescriptInterface, generateTypescriptTypeName } from "./helpers/typescript_base";

export function generate(ast: AstRoot) {
    let code = "";

    code += `
import * as http from "http";
import * as crypto from "crypto";
import * as os from "os";
import * as url from "url";

`;

    const typeTable: any = {};

    for (const {name, fields} of ast.structTypes) {
        const obj: any = typeTable[name] = {};
        for (const field of fields) {
            obj[field.name] = field.type.name;
        }
    }

    for (const {name, values} of ast.enumTypes) {
        typeTable[name] = values;
    }

    for (const type of ast.enumTypes) {
        code += generateTypescriptEnum(type);
    }
    code += "\n";

    for (const type of ast.structTypes) {
        code += generateTypescriptInterface(type);
        code += "\n";
    }

    code += `const typeTable: any = ${JSON.stringify(typeTable, null, 4)};\n\n`;

    code += `export const fn: {\n`;
    for (const op of ast.operations) {
        code += `    ${op.prettyName}: (${["ctx: Context", ...op.args.map(arg => `${arg.name}: ${generateTypescriptTypeName(arg.type)}`)].join(", ")}) => Promise<${generateTypescriptTypeName(op.returnType)}>\n`;
    }
    code += `} = {\n`;
    for (const op of ast.operations) {
        code += `    ${op.prettyName}: () => { throw new Error("not implemented"); },\n`;
    }
    code += `};\n\n`;

    code += `const fnExec: { [name: string]: (ctx: Context, args: any) => Promise<any> } = {\n`;
    for (const op of ast.operations) {
        code += `    ${op.prettyName}: async (ctx, args) => {
        return encode("${op.prettyName}.ret", "${op.returnType.name}", fn.${op.prettyName}(${["ctx", ...op.args.map(arg => `decode("${op.prettyName}.args.${arg.name}", "${arg.type.name}", args.${arg.name})`)].join(", ")}));
    },\n`;
    }
    code += `};\n\n`;

    code += `const clearForLogging: { [name: string]: (args: any) => void } = {\n`;
    for (const op of ast.operations) {
        const clearCode = op.args.map(arg => clearForLogging(`args.${arg.name}`, arg.type)).filter(x => x).join(" ");
        if (clearCode) {
            code += `    ${op.prettyName}: args => { ${clearCode} },\n`;
        }
    }
    code += `};\n`;

    code += `
interface DBDevice {
    id: string
    ip: string
    type: "android" | "ios" | "web"
    platform: any
    fingerprint: string
    screen: { width: number, height: number }
    version: string
    language: string
    lastActiveAt?: Date
    push?: string
}

interface DBApiCall {
    id: string
    name: string
    args: any
    executionId: string
    running: boolean
    device: DBDevice
    date: Date
    duration: number
    host: string
    ok: boolean
    result: any
    error: { type: string, message: string } | null
}

export interface Context {
    call: DBApiCall;
    device: DBDevice;
    req: http.IncomingMessage;
    startTime: Date;
    staging: boolean;
}

export let server: http.Server;

export const hook: {
    onHealthCheck: () => Promise<boolean>
    onDevice: (id: string, deviceInfo: any) => Promise<void>
    onReceiveCall: (call: DBApiCall) => Promise<DBApiCall | void>
    afterProcessCall: (call: DBApiCall) => Promise<void>
    setCache: (cacheKey: string, expirationDate: Date | null, version: number, decodedKey: string, fnName: string, ret: any) => Promise<void>
    getCache: (cacheKey: string, version: number) => Promise<{ expirationDate: Date | null, ret: any } | null>
} = {
    onHealthCheck: async () => true,
    onDevice: async () => { },
    onReceiveCall: async () => { },
    afterProcessCall: async () => { },
    setCache: async () => { },
    getCache: async () => null
};

let captureError: (e: Error, req?: http.IncomingMessage, extra?: any) => void = () => { };

export function setCaptureError(func: (e: Error, req?: http.IncomingMessage, extra?: any) => void) {
    captureError = func;
}

function padNumber(value: number, length: number) {
    return value.toString().padStart(length, "0");
}

function toDateTimeString(date: Date) {
    return date.toISOString().replace("T", "").replace("Z", "");
}

const simpleStringTypes = ["string", "cep", "cnpj", "cpf", "email", "phone", "safehtml", "url", "xml"];
const simpleTypes = ["bool", "hex", "uuid", "base64", "int", "uint", "float", "money", "void", "latlng", ...simpleStringTypes];

function simpleEncodeDecode(path: string, type: string, value: any) {
    if (type === "bool") {
        if (typeof value !== "boolean") {
            throw new Error(\`Invalid Type at '\${path}', expected bool, got \${JSON.stringify(value)}\`);
        }
        return value;
    } else if (simpleStringTypes.includes(type)) {
        if (typeof value !== "string") {
            throw new Error(\`Invalid Type at '\${path}', expected \${type}, got \${JSON.stringify(value)}\`);
        }
        return value;
    } else if (type === "hex") {
        if (typeof value !== "string" || !value.match(/^(?:[A-Fa-f0-9]{2})*$/)) {
            throw new Error(\`Invalid Type at '\${path}', expected hex, got \${JSON.stringify(value)}\`);
        }
        return value.toLowerCase();
    } else if (type === "uuid") {
        if (typeof value !== "string" || !value.match(/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$/)) {
            throw new Error(\`Invalid Type at '\${path}', expected uuid, got \${JSON.stringify(value)}\`);
        }
        return value.toLowerCase();
    } else if (type === "base64") {
        if (typeof value !== "string"/* || !value.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)*/) {
            throw new Error(\`Invalid Type at '\${path}', expected base64, got \${JSON.stringify(value)}\`);
        }
        return value;
    } else if (type === "int") {
        if (typeof value !== "number" || (value | 0) !== value) {
            throw new Error(\`Invalid Type at '\${path}', expected int, got \${JSON.stringify(value)}\`);
        }
        return value;
    } else if (type === "uint") {
        if (typeof value !== "number" || (value | 0) !== value || value < 0) {
            throw new Error(\`Invalid Type at '\${path}', expected uint, got \${JSON.stringify(value)}\`);
        }
        return value;
    } else if (type === "float") {
        if (typeof value !== "number") {
            throw new Error(\`Invalid Type at '\${path}', expected float, got \${JSON.stringify(value)}\`);
        }
        return value;
    } else if (type === "money") {
        if (typeof value !== "number" || !Number.isInteger(value)) {
            throw new Error(\`Invalid Type at '\${path}', expected money, got \${JSON.stringify(value)}\`);
        }
        return value;
    } else if (type === "void") {
        return null;
    } else if (type === "latlng") {
        if (typeof value !== "object" || typeof value.lat !== "number" || typeof value.lng !== "number") {
            throw new Error(\`Invalid Type at '\${path}', expected latlng, got \${JSON.stringify(value)}\`);
        }
        return value;
    } else {
        throw new Error(\`Unknown type '\${type}' at '\${path}'\`);
    }
}

function encode(path: string, type: string, value: any): any {
    if (type.endsWith("?")) {
        if (value === null || value === undefined)
            return null;
        else
            return encode(path, type.slice(0, type.length-1), value);
    } else if (type.endsWith("[]")) {
        if (!Array.isArray(value)) {
            throw new Error(\`Invalid Type at '\${path}', expected array, got \${JSON.stringify(value)}\`);
        }
        return value.map((entry, index) => encode(\`\${path}[\${index}]\`, type.slice(0, type.length - 2), entry));
    } else if (simpleTypes.includes(type)) {
        return simpleEncodeDecode(path, type, value);
    } else if (type === "bytes") {
        if (!(value instanceof Buffer)) {
            throw new Error(\`Invalid Type at '\${path}', expected bytes, got \${JSON.stringify(value)}\`);
        }
        return value.toString("base64");
    } else if (type === "date") {
        if (!(value instanceof Date)) {
            throw new Error(\`Invalid Type at '\${path}', expected date, got \${JSON.stringify(value)}\`);
        }
        return value.toISOString().split("T")[0];
    } else if (type === "datetime") {
        if (!(value instanceof Date)) {
            throw new Error(\`Invalid Type at '\${path}', expected datetime, got \${JSON.stringify(value)}\`);
        }
        return value.toISOString().replace("Z", "");
    } else {
        const resolved = typeTable[type];
        if (Array.isArray(resolved)) {
            if (!resolved.includes(value)) {
                throw new Error(\`Invalid Type at '\${path}', expected \${type}, got \${JSON.stringify(value)}\`);
            }
            return value;
        } else if (resolved !== undefined) {
            const obj: any = {};
            for (const key in resolved) {
                obj[key] = encode(\`\${path}.\${key}\`, resolved[key], value[key]);
            }
            return obj;
        } else {
            throw new Error(\`Unknown type '\${type}' at '\${path}'\`);
        }
    }
}

function decode(path: string, type: string, value: any): any {
    if (type.endsWith("?")) {
        if (value === null || value === undefined)
            return null;
        else
            return decode(path, type.slice(0, type.length - 1), value);
    } else if (type.endsWith("[]")) {
        if (!Array.isArray(value)) {
            throw new Error(\`Invalid Type at '\${path}', expected array, got \${JSON.stringify(value)}\`);
        }
        return value.map((entry, index) => decode(\`\${path}[\${index}]\`, type.slice(0, type.length - 2), entry));
    } else if (simpleTypes.includes(type)) {
        return simpleEncodeDecode(path, type, value);
    } else if (type === "bytes") {
        if (typeof value !== "string"/* || !value.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)*/) {
            throw new Error(\`Invalid Type at '\${path}', expected bytes, got \${JSON.stringify(value)}\`);
        }
        return Buffer.from(value, "base64");
    } else if (type === "date") {
        if (typeof value !== "string" || !value.match(/^[0-9]{4}-[01][0-9]-[0123][0-9]/)) {
            throw new Error(\`Invalid Type at '\${path}', expected date, got \${JSON.stringify(value)}\`);
        }
        return new Date(parseInt(value.split("-")[0], 10), parseInt(value.split("-")[1], 10) - 1, parseInt(value.split("-")[2], 10));
    } else if (type === "datetime") {
        if (typeof value !== "string" || !value.match(/^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](\.[0-9]{1,6})?Z?$/)) {
            throw new Error(\`Invalid Type at '\${path}', expected datetime, got \${JSON.stringify(value)}\`);
        }
        return new Date(value + "Z");
    } else {
        const resolved = typeTable[type];
        if (Array.isArray(resolved)) {
            if (!resolved.includes(value)) {
                throw new Error(\`Invalid Type at '\${path}', expected \${type}, got \${JSON.stringify(value)}\`);
            }
            return value;
        } else if (resolved !== undefined) {
            const obj: any = {};
            for (const key in resolved) {
                obj[key] = decode(\`\${path}.\${key}\`, resolved[key], value[key]);
            }
            return obj;
        } else {
            throw new Error(\`Unknown type '\${type}' at '\${path}'\`);
        }
    }
}

const httpHandlers: {
    [signature: string]: (body: string, res: http.ServerResponse, req: http.IncomingMessage) => void
} = {};

export function handleHttp(method: "GET" | "POST" | "PUT" | "DELETE", path: string, func: (body: string, res: http.ServerResponse, req: http.IncomingMessage) => void) {
    httpHandlers[method + path] = func;
}

export function handleHttpPrefix(method: "GET" | "POST" | "PUT" | "DELETE", path: string, func: (body: string, res: http.ServerResponse, req: http.IncomingMessage) => void) {
    httpHandlers["prefix " + method + path] = func;
}

export function start(port: number = 8000) {
    if (server) return;
    server = http.createServer((req, res) => {
        req.on("error", (err) => {
            console.error(err);
        });

        res.on("error", (err) => {
            console.error(err);
        });

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "PUT, POST, GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Access-Control-Max-Age", "86400");
        res.setHeader("Content-Type", "application/json");

        let body = "";
        req.on("data", (chunk: any) => body += chunk.toString());
        req.on("end", () => {
            if (req.method === "OPTIONS") {
                res.writeHead(200);
                res.end();
                return;
            }
            const ip = req.headers["x-real-ip"] as string || "";
            const signature = req.method! + url.parse(req.url || "").pathname;
            if (httpHandlers[signature]) {
                console.log(\`\${toDateTimeString(new Date())} http \${signature}\`);
                httpHandlers[signature](body, res, req);
                return;
            }
            for (let target in httpHandlers) {
                if (("prefix " + signature).startsWith(target)) {
                    console.log(\`\${toDateTimeString(new Date())} http \${target}\`);
                    httpHandlers[target](body, res, req);
                    return;
                }
            }

            switch (req.method) {
                case "HEAD": {
                    res.writeHead(200);
                    res.end();
                    break;
                }
                case "GET": {
                    hook.onHealthCheck().then(ok => {
                        res.writeHead(ok ? 200 : 500);
                        res.write(JSON.stringify({ ok }));
                        res.end();
                    }, error => {
                        console.error(error);
                        res.writeHead(500);
                        res.write(JSON.stringify({ ok: false }));
                        res.end();
                    });
                    break;
                }
                case "POST": {
                    (async () => {
                        const request = JSON.parse(body);
                        request.device.ip = ip;
                        request.device.lastActiveAt = new Date();
                        const context: Context = {
                            call: null as any,
                            req: req,
                            device: request.device,
                            startTime: new Date,
                            staging: request.staging || false
                        };
                        const startTime = process.hrtime();

                        const { id, ...deviceInfo } = context.device;

                        if (!context.device.id)
                            context.device.id = crypto.randomBytes(20).toString("hex");

                        await hook.onDevice(context.device.id, deviceInfo);

                        const executionId = crypto.randomBytes(20).toString("hex");

                        let call: DBApiCall = {
                            id: \`\${request.id}-\${context.device.id}\`,
                            name: request.name,
                            args: JSON.parse(JSON.stringify(request.args)),
                            executionId: executionId,
                            running: true,
                            device: context.device,
                            date: context.startTime,
                            duration: 0,
                            host: os.hostname(),
                            ok: true,
                            result: null as any,
                            error: null as { type: string, message: string } | null
                        };

                        context.call = call;

                        if (clearForLogging[call.name])
                            clearForLogging[call.name](call);

                        try {
                            call = await hook.onReceiveCall(call) || call;
                        } catch (e) {
                            call.ok = false;
                            call.error = {
                                type: "Fatal",
                                message: e.toString()
                            };
                            call.running = false;
                        }

                        if (call.running) {
                            try {
                                const func = fnExec[request.name];
                                if (func) {
                                    call.result = await func(context, request.args);
                                } else {
                                    console.error(JSON.stringify(Object.keys(fnExec)));
                                    throw "Function does not exist: " + request.name;
                                }
                            } catch (err) {
                                console.error(err);
                                call.ok = false;
                                if (["NotLoggedIn", "LacksPermission", "InvalidArgument", "WrongLogin", "DoesntExist", "NoCreditCardAttached", "NotAuthorized", "Fatal", "Connection"].includes(err._type)) {
                                    call.error = {
                                        type: err._type,
                                        message: err._msg
                                    };
                                } else {
                                    call.error = {
                                        type: "Fatal",
                                        message: err.toString()
                                    };
                                    setTimeout(() => captureError(err, req, {
                                        call
                                    }), 1);
                                }
                            }
                            call.running = false;
                            const deltaTime = process.hrtime(startTime);
                            call.duration = deltaTime[0] + deltaTime[1] * 1e-9;

                            await hook.afterProcessCall(call);
                        }

                        const response = {
                            id: call.id,
                            ok: call.ok,
                            executed: call.executionId === executionId,
                            deviceId: call.device.id,
                            startTime: call.date,
                            duration: call.duration,
                            host: call.host,
                            result: call.result,
                            error: call.error
                        };

                        res.writeHead(!response.error ? 200 : response.error.type === "Fatal" ? 500 : 400);
                        res.writeHead(200);
                        res.write(JSON.stringify(response));
                        res.end();

                        console.log(
                            \`\${toDateTimeString(new Date())} \` +
                            \`\${call.id} [\${call.duration.toFixed(6)}s]\` +
                            \`\${call.name}() -> \${call.ok ? "OK" : call.error ? call.error.type : "???"} \`
                        );
                    })().catch(err => {
                        console.error(err);
                        if (!res.headersSent)
                            res.writeHead(500);
                        res.end();
                    });
                    break;
                }
                default: {
                    res.writeHead(500);
                    res.end();
                }
            }
        });
    });

    if ((server as any).keepAliveTimeout)
        (server as any).keepAliveTimeout = 0;

    if (!process.env.TEST) {
        server.listen(port, () => {
            const addr = server.address();
            const addrString = addr === null ? "???" : typeof addr === "string" ? addr : \`\${addr.address}: \${addr.port} \`;
            console.log(\`Listening on \${addrString}\`);
        });
    }
}

fn.ping = async (ctx: Context) => "pong";
`;

    return code;
}
