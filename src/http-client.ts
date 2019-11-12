import { AstJson } from "@sdkgen/parser";
import { randomBytes } from "crypto";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { hostname } from "os";
import { Context } from "./context";
import { decode, encode } from "./encode-decode";

interface ErrClasses {
    [className: string]: any
}

export class SdkgenHttpClient {
    private baseUrl: URL
    extra = new Map<string, any>();

    constructor(baseUrl: string, private astJson: AstJson, private errClasses: ErrClasses) {
        this.baseUrl = new URL(baseUrl);
    }

    async makeRequest(ctx: Context | null, functionName: string, args: any) {
        const func = this.astJson.functionTable[functionName];
        if (!func) {
            throw new Error(`Unknown function ${functionName}`);
        }

        const request = {
            version: 3,
            requestId: ctx && ctx.request? ctx.request.id + randomBytes(6).toString("hex") : randomBytes(16).toString("hex"),
            name: functionName,
            args: encode(this.astJson.typeTable, `${functionName}.args`, func.args, args),
            extra: {
                ...this.extra,
                ...(ctx && ctx.request ? ctx.request.extra : {})
            },
            deviceInfo: ctx && ctx.request? ctx.request.deviceInfo : {
                id: hostname(),
                type: "node"
            },
        };

        const options = {
            hostname: this.baseUrl.hostname,
            path: this.baseUrl.pathname,
            port: this.baseUrl.port,
            method: "POST",
        };

        const encodedRet = await new Promise<any>((resolve, reject) => {
            const req = (this.baseUrl.protocol === "http:" ? httpRequest : httpsRequest)(options, res => {
                let data = "";
                res.on("data", chunk => {
                    data += chunk;
                });
                res.on("end", () => {
                    try {
                        const response = JSON.parse(data);

                        if (response.error) {
                            reject(response.error);
                        } else {
                            resolve(response.result);
                        }
                    } catch (e) {
                        reject({ type: "Fatal", message: e.toString() });
                    }
                });

            });

            req.on("error", (e) => {
                console.error(`problem with request: ${e.message}`);
                reject({ type: "Fatal", message: e.toString() });
            });

            req.write(JSON.stringify(request));
            req.end();
        }).catch(err => {
            const errClass = this.errClasses[err.type];
            if (errClass)
                throw new errClass(err.message);
            else
                throw err;
        });

        return decode(this.astJson.typeTable, `${functionName}.ret`, func.ret, encodedRet);
    }
}
