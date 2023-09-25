/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-promise-reject-errors */
import { randomBytes } from "crypto";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import type { RequestOptions } from "https";
import { hostname } from "os";
import { URL } from "url";

import type { AstJson } from "@sdkgen/parser";
import type { PartialDeep } from "type-fest";

import type { Context } from "./context";
import { decode, encode } from "./encode-decode";
import type { SdkgenError, SdkgenErrorWithData } from "./error";
import type { DeepReadonly } from "./utils";
import { has } from "./utils";

type ErrClasses = Record<string, (new (message: string, data: any) => SdkgenErrorWithData<any>) | (new (message: string) => SdkgenError) | undefined>;

export class SdkgenHttpClient {
  private baseUrl: URL;

  extra = new Map<string, unknown>();

  constructor(
    baseUrl: string,
    private astJson: DeepReadonly<AstJson>,
    private errClasses: ErrClasses,
  ) {
    this.baseUrl = new URL(baseUrl);
  }

  async makeRequest(ctx: PartialDeep<Context> | null, functionName: string, args: unknown): Promise<any> {
    const func = this.astJson.functionTable[functionName];

    if (!func) {
      throw new Error(`Unknown function ${functionName}`);
    }

    const extra: Record<string, unknown> = {};

    for (const [key, value] of this.extra) {
      extra[key] = value;
    }

    const requestBody = JSON.stringify({
      args: encode(this.astJson.typeTable, `${functionName}.args`, func.args, args),
      deviceInfo: ctx?.request?.deviceInfo ?? { id: hostname(), type: "node" },
      extra: {
        ...extra,
        ...ctx?.request?.extra,
      },
      name: functionName,
      requestId: ctx?.request?.id ? ctx.request.id + randomBytes(6).toString("hex") : randomBytes(16).toString("hex"),
      version: 3,
    });

    const options: RequestOptions = {
      hostname: this.baseUrl.hostname,
      method: "POST",
      path: this.baseUrl.pathname,
      port: this.baseUrl.port,
      headers: {
        "content-type": "application/sdkgen",
      },
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
    }).catch((error: object) => {
      if (has(error, "type") && has(error, "message") && typeof error.type === "string" && typeof error.message === "string") {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const errClass = this.errClasses[error.type] ?? this.errClasses.Fatal!;
        const errType = errClass.name;

        const errorJson = this.astJson.errors.find(err => (Array.isArray(err) ? err[0] === errType : err === errType));

        let newError;

        if (errorJson && Array.isArray(errorJson) && has(error, "data")) {
          newError = new errClass(error.message, decode(this.astJson.typeTable, `${errClass.name}.data`, errorJson[1], error.data));
        } else {
          newError = new errClass(error.message, undefined);
        }

        if (!newError.type) {
          (newError as unknown as { type: string }).type = errType;
        }

        throw newError;
      } else {
        throw error;
      }
    });

    return decode(this.astJson.typeTable, `${functionName}.ret`, func.ret, encodedRet);
  }
}
