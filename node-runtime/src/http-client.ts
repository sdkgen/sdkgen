/* eslint-disable prefer-promise-reject-errors */
import { randomBytes } from "crypto";
import { request as httpRequest } from "http";
import { request as httpsRequest, RequestOptions } from "https";
import { hostname } from "os";
import { URL } from "url";

import type { AstJson } from "@sdkgen/parser";

import type { Context } from "./context";
import { decode, encode } from "./encode-decode";
import type { SdkgenError, SdkgenErrorWithData } from "./error";
import type { DeepReadonly } from "./utils";
import { has } from "./utils";

interface ErrClasses {
  [className: string]: (new (message: string, data: any) => SdkgenErrorWithData<any>) | (new (message: string) => SdkgenError) | undefined;
}

export class SdkgenHttpClient {
  private baseUrl: URL;

  extra = new Map<string, unknown>();

  constructor(baseUrl: string, private astJson: DeepReadonly<AstJson>, private errClasses: ErrClasses) {
    this.baseUrl = new URL(baseUrl);
  }

  async makeRequest(ctx: Context | null, functionName: string, args: unknown): Promise<any> {
    const func = this.astJson.functionTable[functionName];

    if (!func) {
      throw new Error(`Unknown function ${functionName}`);
    }

    const extra: Record<string, any> = {};

    this.extra.forEach((value, key) => {
      extra[key] = value;
    });

    const requestBody = JSON.stringify({
      args: encode(this.astJson.typeTable, `${functionName}.args`, func.args, args),
      deviceInfo: ctx?.request ? ctx.request.deviceInfo : { id: hostname(), type: "node" },
      extra: {
        ...extra,
        ...(ctx?.request ? ctx.request.extra : {}),
      },
      name: functionName,
      requestId: ctx?.request ? ctx.request.id + randomBytes(6).toString("hex") : randomBytes(16).toString("hex"),
      version: 3,
    });

    const options: RequestOptions = {
      hostname: this.baseUrl.hostname,
      method: "POST",
      path: this.baseUrl.pathname,
      port: this.baseUrl.port,
      headers: {
        "content-type": "application/sdkgen",
      }
    };

    const encodedRet = await new Promise<unknown>((resolve, reject) => {
      const req = (this.baseUrl.protocol === "http:" ? httpRequest : httpsRequest)(options, res => {
        let data = "";

        res.on("data", chunk => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const response = JSON.parse(data) as object;

            if (has(response, "error") && response.error) {
              reject(response.error);
            } else {
              resolve(has(response, "result") ? response.result : null);
            }
          } catch (error) {
            reject({ message: `${error}`, type: "Fatal" });
          }
        });
        res.on("error", error => {
          reject({ message: `${error}`, type: "Fatal" });
        });
        res.on("aborted", () => {
          reject({ message: "Request aborted", type: "Fatal" });
        });
      });

      req.on("error", error => {
        reject({ message: `${error}`, type: "Fatal" });
      });

      req.write(requestBody);
      req.end();
    }).catch(error => {
      if (has(error, "type") && has(error, "message") && typeof error.type === "string" && typeof error.message === "string") {
        const errClass = this.errClasses[error.type];

        if (errClass) {
          const errorJson = this.astJson.errors.find(err => (Array.isArray(err) ? err[0] === error.type : err === error.type));

          if (errorJson) {
            if (Array.isArray(errorJson) && has(error, "data")) {
              throw new errClass(error.message, decode(this.astJson.typeTable, `${errClass.name}.data`, errorJson[1], error.data));
            } else {
              throw new errClass(error.message, undefined);
            }
          }
        }

        throw new (this.errClasses.Fatal as new (message: string) => SdkgenError)(`${error.type}: ${error.message}`);
      } else {
        throw error;
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return decode(this.astJson.typeTable, `${functionName}.ret`, func.ret, encodedRet);
  }
}
