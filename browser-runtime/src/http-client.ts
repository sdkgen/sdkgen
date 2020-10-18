import { AstJson } from "./ast";
import { decode, encode } from "./encode-decode";

interface ErrClasses {
  [className: string]: any;
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

export class SdkgenHttpClient {
  private baseUrl: string;

  extra = new Map<string, any>();

  successHook: (result: any, name: string, args: any) => void = () => undefined;

  errorHook: (result: any, name: string, args: any) => void = () => undefined;

  constructor(baseUrl: string, private astJson: AstJson, private errClasses: ErrClasses) {
    this.baseUrl = baseUrl;
  }

  async makeRequest(functionName: string, args: unknown): Promise<any> {
    const func = this.astJson.functionTable[functionName];

    if (!func) {
      throw new Error(`Unknown function ${functionName}`);
    }

    const thisScript = document.currentScript as HTMLScriptElement;

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
        version: thisScript ? thisScript.src : "",
      },
      extra: {
        ...this.extra,
      },
      name: functionName,
      requestId: randomBytesHex(16),
      version: 3,
    };

    const encodedRet = await new Promise<any>((resolve, reject) => {
      const req = new XMLHttpRequest();

      req.open("POST", `${this.baseUrl}/${functionName}`);

      req.onreadystatechange = () => {
        if (req.readyState !== 4) {
          return;
        }

        try {
          const response = JSON.parse(req.responseText);

          try {
            if (response.error) {
              reject(response.error);
              this.errorHook(response.error, functionName, args);
            } else {
              resolve(response.result);
            }
          } catch (e) {
            console.error(e);
            const err = { message: e.toString(), type: "Fatal" };

            reject(err);
            this.errorHook(err, functionName, args);
          }
        } catch (e) {
          console.error(e);
          const err = { message: `Falha de conexão com o servidor`, type: "Fatal" };

          reject(err);
          this.errorHook(err, functionName, args);
        }
      };

      req.send(JSON.stringify(request));
    }).catch(err => {
      const errClass = this.errClasses[err.type];

      if (errClass) {
        throw new errClass(err.message);
      } else {
        throw err;
      }
    });

    const ret = decode(this.astJson.typeTable, `${functionName}.ret`, func.ret, encodedRet);

    this.successHook(ret, functionName, args);
    return ret;
  }
}
