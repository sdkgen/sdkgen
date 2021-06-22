import { safeLocalStorage } from "helpers/localStorage/safeLocalStorage";
import { observable } from "mobx";

import type { RootStore } from ".";

const endpointUrlFallback = process.env.NODE_ENV === "development" ? `http://localhost:${process.env.SERVER_PORT}` : window.location.origin;

function randomBytesHex(len: number) {
  let hex = "";

  for (let i = 0; i < 2 * len; ++i) {
    hex += "0123456789abcdef"[Math.floor(Math.random() * 16)];
  }

  return hex;
}

export class ConfigStore {
  public rootStore: RootStore;

  @observable
  public deviceId!: string;

  @observable
  public endpointUrl!: string;

  @observable
  public canChangeEndpoint = false;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    this.syncWithLocalStorage(false);
  }

  public setNewEndpoint(newEndpoint: string): void {
    this.endpointUrl = newEndpoint;
    this.syncWithLocalStorage(true);
    this.rootStore.requestsStore.fetchAST();
  }

  public setNewDeviceId(newDeviceId: string): void {
    this.deviceId = newDeviceId;
    this.syncWithLocalStorage(true);
  }

  private syncWithLocalStorage(override: boolean) {
    if (override) {
      if (this.deviceId) {
        safeLocalStorage.setItem("deviceId", this.deviceId);
      }

      if (this.endpointUrl) {
        safeLocalStorage.setItem("endpointUrl", this.endpointUrl);
      }
    } else {
      this.deviceId = safeLocalStorage.getItem("deviceId") ?? randomBytesHex(16);
      this.endpointUrl = (this.canChangeEndpoint && safeLocalStorage.getItem("endpointUrl")) || endpointUrlFallback;
    }
  }
}
