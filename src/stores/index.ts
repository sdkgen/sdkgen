import { createContext } from "react";
import { RouterStore } from "mobx-react-router";
import { ConfigStore } from "./config";

export class RootStore {
	public routerStore = new RouterStore();
	public configStore = new ConfigStore(this);
}

export const rootStore = new RootStore();

export default createContext(rootStore);
