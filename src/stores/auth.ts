import { RootStore } from ".";

export class AuthStore {
	public rootStore: RootStore;

	constructor(rootStore: RootStore) {
		this.rootStore = rootStore;
	}
}
