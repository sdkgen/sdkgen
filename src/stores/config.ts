import { observable } from "mobx";
import { RootStore } from ".";

const endpointUrlFallback = location.host;

function randomBytesHex(len: number) {
	let hex = "";
	for (let i = 0; i < 2 * len; ++i) hex += "0123456789abcdef"[Math.floor(Math.random() * 16)];
	return hex;
}

export class ConfigStore {
	public rootStore: RootStore;

	@observable
	public deviceId: null | string = null;
	@observable
	public endpointUrl: null | string = null;
	@observable
	public canChangeEndpoint = false;

	constructor(rootStore: RootStore) {
		this.rootStore = rootStore;
		this.syncWithLocalStorage(false);
	}

	public setNewEndpoint = (newEndpoint: string) => {
		this.endpointUrl = newEndpoint;
		this.syncWithLocalStorage(true);
		this.rootStore.requestsStore.fetchAST();
	};

	public setNewDeviceId = (newDeviceId: string) => {
		this.deviceId = newDeviceId;
		this.syncWithLocalStorage(true);
	};

	private syncWithLocalStorage = (override: boolean) => {
		if (!override) {
			this.deviceId = localStorage.getItem("deviceId") || randomBytesHex(16);
			this.endpointUrl = localStorage.getItem("endpointUrl") || endpointUrlFallback;
		} else {
			if (this.deviceId) localStorage.setItem("deviceId", this.deviceId);
			if (this.endpointUrl) localStorage.setItem("endpointUrl", this.endpointUrl);
		}
	};
}
