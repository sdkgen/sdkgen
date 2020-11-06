import * as http from "http";
import * as https from "https";
import { URL } from "url";
export interface User {
  name: string;
  age: number;
}

export type ErrorType = "Fatal" | "Connection";

export class ApiClient {
  deviceId: string | null = null;

  constructor(private baseUrl = "https://", private useStaging = false) {}

  async getUser(id: string): Promise<User> {
    const args = {
      id: id,
    };
    const ret = await this.makeRequest({ name: "getUser", args });
    return {
      name: ret.name,
      age: ret.age | 0,
    };
  }

  async ping(): Promise<string> {
    const ret = await this.makeRequest({ name: "ping", args: {} });
    return ret;
  }

  async setPushToken(token: string): Promise<void> {
    const args = {
      token: token,
    };
    await this.makeRequest({ name: "setPushToken", args });
  }

  private device() {
    const device: any = {
      type: "node",
    };
    if (this.deviceId) device.id = this.deviceId;
    return device;
  }

  private randomBytesHex(len: number) {
    let hex = "";
    for (let i = 0; i < 2 * len; ++i) hex += "0123456789abcdef"[Math.floor(Math.random() * 16)];
    return hex;
  }

  private async makeRequest({ name, args }: { name: string; args: any }) {
    const deviceData = this.device();
    const body = {
      id: this.randomBytesHex(8),
      device: deviceData,
      name: name,
      args: args,
    };

    const url = new URL(this.baseUrl + (this.useStaging ? "-staging" : "") + "/" + name);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      port: url.port,
      method: "POST",
    };

    return new Promise<any>((resolve, reject) => {
      const req = (url.protocol === "http:" ? http : https).request(options, resp => {
        let data = "";
        resp.on("data", chunk => {
          data += chunk;
        });
        resp.on("end", () => {
          try {
            const response = JSON.parse(data);

            try {
              this.deviceId = response.deviceId;
              if (response.ok) {
                resolve(response.result);
              } else {
                reject(response.error);
              }
            } catch (e) {
              console.error(e);
              reject({ type: "Fatal", message: e.toString() });
            }
          } catch (e) {
            console.error(e);
            reject({
              type: "BadFormattedResponse",
              message: `Response couldn't be parsed as JSON (${data}):\n${e.toString()}`,
            });
          }
        });
      });

      req.on("error", e => {
        console.error(`problem with request: ${e.message}`);
        reject({ type: "Fatal", message: e.toString() });
      });

      // write data to request body
      req.write(JSON.stringify(body));
      req.end();
    });
  }
}
