import { AstJson } from "./ast";
import { decode, encode } from "./encode-decode";

function randomBytesHex(len: number) {
    let hex = "";
    for (let i = 0; i < 2 * len; ++i)
        hex += "0123456789abcdef"[Math.floor(Math.random() * 16)];
    return hex;
}

let fallbackDeviceId = randomBytesHex(20);

function getDeviceId() {
    try {
        let deviceId = localStorage.getItem("deviceId");
        if (!deviceId) {
            deviceId = fallbackDeviceId;
            localStorage.setItem("deviceId", deviceId);
        }
        return deviceId;
    } catch (e) { }
    return fallbackDeviceId;
}

export class SdkgenHttpClient {
    private baseUrl: string
    extra = new Map<string, any>();

    successHook: (result: any, name: string, args: any) => void = () => {};
    errorHook: (result: any, name: string, args: any) => void = () => {};

    constructor(baseUrl: string, private astJson: AstJson) {
        this.baseUrl = baseUrl;
    }

    async makeRequest(functionName: string, args: any) {
        const func = this.astJson.functionTable[functionName];
        if (!func) {
            throw new Error(`Unknown function ${functionName}`);
        }
        const thisScript = document.currentScript as HTMLScriptElement;

        const request = {
            version: 3,
            requestId: randomBytesHex(16),
            name: functionName,
            args: encode(this.astJson.typeTable, `${functionName}.args`, func.args, args),
            extra: {
                ...this.extra,
            },
            deviceInfo: {
                id: getDeviceId(),
                version: thisScript ? thisScript.src : "",
                language: navigator.language,
                browserUserAgent: navigator.userAgent,
                timezone: typeof Intl === "object" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null
            },
        };

        const encodedRet = new Promise<any>((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open("POST", this.baseUrl + "/" + name);

            req.onreadystatechange = () => {
                if (req.readyState !== 4) return;
                try {
                    const response = JSON.parse(req.responseText);
                    try {
                        if (response.ok) {
                            resolve(response.result);
                        } else {
                            reject(response.error);
                            this.errorHook(response.error, name, args);
                        }
                    } catch (e) {
                        console.error(e);
                        const err = { type: "Fatal", message: e.toString() };
                        reject(err);
                        this.errorHook(err, name, args);
                    }
                } catch (e) {
                    console.error(e);
                    const err = { type: "Fatal", message: `Falha de conexão com o servidor` };
                    reject(err);
                    this.errorHook(err, name, args);
                }
            };
            req.send(JSON.stringify(request));
        });

        const ret = decode(this.astJson.typeTable, `${functionName}.ret`, func.ret, encodedRet);
        this.successHook(ret, name, args);
        return ret;
    }
}
