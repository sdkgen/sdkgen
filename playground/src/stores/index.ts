import { RouterStore } from "mobx-react-router";
import { createContext } from "react";
import { ConfigStore } from "./config";
import { RequestsStore } from "./requests";

export class RootStore {
	public routerStore = new RouterStore();
	public configStore = new ConfigStore(this);
	public requestsStore = new RequestsStore(this);
}

export const rootStore = new RootStore();

export default createContext(rootStore);
