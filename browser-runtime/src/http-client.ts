import type { AstJson } from "./ast";
import { decode, encode } from "./encode-decode";
import type { SdkgenError, SdkgenErrorWithData } from "./error";
import type { DeepReadonly } from "./utils";

interface ErrClasses {
  [className: string]: (new (message: string, data: any) => SdkgenErrorWithData<any>) | (new (message: string) => SdkgenError) | undefined;
}

function randomBytesHex(len: number) {
  let hex = "";

  for (let i = 0; i < 2 * len; ++i) {
    hex += "0123456789abcdef"[Math.floor(Math.random() * 16)];
  }

  return hex;
}

const fallbackDeviceId = randomBytesHex(20);

function getDeviceId() {
  try {
    let deviceId = localStorage.getItem("deviceId");

    if (!deviceId) {
      deviceId = fallbackDeviceId;
      localStorage.setItem("deviceId", deviceId);
    }

    return deviceId;
  } catch (e) {
    //
  }

  return fallbackDeviceId;
}

function has<P extends PropertyKey>(target: object, property: P): target is { [K in P]: unknown } {
  return property in target;
}

export class SdkgenHttpClient {
  private baseUrl: string;

  extra = new Map<string, any>();

  successHook: (result: any, name: string, args: any) => void = () => undefined;

  errorHook: (result: any, name: string, args: any) => void = () => undefined;

  constructor(baseUrl: string, private astJson: DeepReadonly<AstJson>, private errClasses: ErrClasses) {
    this.baseUrl = baseUrl;
  }

  async makeRequest(functionName: string, args: unknown): Promise<any> {
    const func = this.astJson.functionTable[functionName];

    if (!func) {
      throw new Error(`Unknown function ${functionName}`);
    }

    const extra: Record<string, any> = {};

    this.extra.forEach((value, key) => {
      extra[key] = value;
    });

    const request = {
      args: encode(this.astJson.typeTable, `${functionName}.args`, func.args, args),
      deviceInfo: {
        id: getDeviceId(),
        language: navigator.language,
        platform: {
          browserUserAgent: navigator.userAgent,
        },
        timezone: typeof Intl === "object" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
        type: "web",
        version: document.currentScript?.getAttribute("src") ?? "",
      },
      extra,
      name: functionName,
      requestId: randomBytesHex(16),
      version: 3,
    };

    const encodedRet = await new Promise<unknown>((resolve, reject) => {
      const req = new XMLHttpRequest();

      req.open("POST", `${this.baseUrl}/${functionName}`);

      req.onreadystatechange = () => {
        if (req.readyState !== 4) {
          return;
        }

        try {
          const response = JSON.parse(req.responseText) as object;

          try {
            if (has(response, "error") && response.error) {
              reject(response.error);
              this.errorHook(response.error, functionName, args);
            } else {
              resolve(has(response, "result") ? response.result : null);
            }
          } catch (e) {
            const err = { message: `${e}`, type: "Fatal" };

            reject(err);
            this.errorHook(err, functionName, args);
          }
        } catch (e) {
          const err = { message: `Falha de conexão com o servidor`, type: "Fatal" };

          reject(err);
          this.errorHook(err, functionName, args);
        }
      };

      req.send(JSON.stringify(request));
    }).catch((error: object) => {
      console.error(error);
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

    const ret = decode(this.astJson.typeTable, `${functionName}.ret`, func.ret, encodedRet);

    this.successHook(ret, functionName, args);

    return ret;
  }
}
