import { createContext } from "react";
import { RouterStore } from "mobx-react-router";
import { AuthStore } from "./auth";

export class RootStore {
	public routerStore = new RouterStore();
	public authStore = new AuthStore(this);
}

export const rootStore = new RootStore();

export default createContext(rootStore);
