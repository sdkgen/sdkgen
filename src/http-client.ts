import { randomBytes } from "crypto";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { hostname } from "os";
import { BaseApiConfig } from "./config";
import { decode, encode } from "./encode-decode";

export class SdkgenHttpClient {
    private baseUrl: URL

    constructor(baseUrl: string, private apiConfig: BaseApiConfig) {
        this.baseUrl = new URL(baseUrl);
    }

    async makeRequest(functionName: string, args: any) {
        const func = this.apiConfig.astJson.functionTable[functionName];
        if (!func) {
            throw new Error(`Unknown function ${functionName}`);
        }
        const request = {
            version: 3,
            requestId: randomBytes(16).toString("hex"),
            name: functionName,
            args: encode(this.apiConfig.astJson.typeTable, `${functionName}.args`, func.args, args),
            extra: {},
            deviceInfo: {
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

            // write data to request body
            req.write(JSON.stringify(request));
            req.end();
        });

        return decode(this.apiConfig.astJson.typeTable, `${functionName}.ret`, func.ret, encodedRet);
    }
}
