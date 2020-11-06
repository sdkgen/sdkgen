import { RouterStore } from "mobx-react-router";
import { createContext } from "react";
import { ConfigStore } from "./config";
import { RequestsStore } from "./requests";

export class RootStore {
  public routerStore = new RouterStore();

  public configStore: ConfigStore;

  public requestsStore: RequestsStore;

  constructor() {
    this.configStore = new ConfigStore(this);
    this.requestsStore = new RequestsStore(this);
  }
}

export const rootStore = new RootStore();

export default createContext(rootStore);
