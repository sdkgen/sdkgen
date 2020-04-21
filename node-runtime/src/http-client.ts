import { AstJson } from "@sdkgen/parser";
import { randomBytes } from "crypto";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { hostname } from "os";
import { URL } from "url";
import { Context } from "./context";
import { decode, encode } from "./encode-decode";
import { SdkgenError } from "./error";

interface ErrClasses {
    [className: string]: typeof SdkgenError;
}

export class SdkgenHttpClient {
    private baseUrl: URL;

    extra = new Map<string, unknown>();

    constructor(baseUrl: string, private astJson: AstJson, private errClasses: ErrClasses) {
        this.baseUrl = new URL(baseUrl);
    }

    async makeRequest(ctx: Context | null, functionName: string, args: unknown) {
        const func = this.astJson.functionTable[functionName];

        if (!func) {
            throw new Error(`Unknown function ${functionName}`);
        }

        const requestBody = JSON.stringify({
            args: encode(this.astJson.typeTable, `${functionName}.args`, func.args, args),
            deviceInfo: ctx && ctx.request ? ctx.request.deviceInfo : { id: hostname(), type: "node" },
            extra: {
                ...[...this.extra.entries()].reduce<{ [key: string]: unknown }>((obj, [key, value]) => (obj[key] = value, obj), {}),
                ...(ctx && ctx.request ? ctx.request.extra : {}),
            },
            name: functionName,
            requestId:
                ctx && ctx.request ? ctx.request.id + randomBytes(6).toString("hex") : randomBytes(16).toString("hex"),
            version: 3,
        });

        const options = {
            hostname: this.baseUrl.hostname,
            method: "POST",
            path: this.baseUrl.pathname,
            port: this.baseUrl.port,
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
                    } catch (error) {
                        reject({ message: `${error}`, type: "Fatal" });
                    }
                });
                res.on("error", error => {
                    reject({ message: `${error}`, type: "Fatal" });
                });
            });

            req.on("error", error => {
                reject({ message: `${error}`, type: "Fatal" });
            });

            req.write(requestBody);
            req.end();
        }).catch(error => {
            const errClass = this.errClasses[error.type];

            if (errClass) {
                throw new errClass(error.message);
            } else {
                throw new this.errClasses.Fatal(`${error.type}: ${error.message}`);
            }
        });

        return decode(this.astJson.typeTable, `${functionName}.ret`, func.ret, encodedRet);
    }
}
