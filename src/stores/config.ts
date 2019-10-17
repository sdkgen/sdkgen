import { RootStore } from ".";
import { observable } from "mobx";

const endpointUrlFallback = `${location.host}/ast.json`;
const deviceIdFallBack = "sdkgen-playground-device-id";

export class ConfigStore {
	public rootStore: RootStore;

	@observable
	public deviceId: null | string = null;
	@observable
	public endpointUrl: null | string = null;

	constructor(rootStore: RootStore) {
		this.rootStore = rootStore;
		this.syncWithLocalStorage(false);
	}

	public setNewEndpoint = (newEndpoint: string) => {
		this.endpointUrl = newEndpoint;
		this.syncWithLocalStorage(true);
	};

	public setNewDeviceId = (newDeviceId: string) => {
		this.deviceId = newDeviceId;
		this.syncWithLocalStorage(true);
	};

	private syncWithLocalStorage = (override: boolean) => {
		if (!override) {
			this.deviceId = localStorage.getItem("deviceId") || deviceIdFallBack;
			this.endpointUrl = localStorage.getItem("endpointUrl") || endpointUrlFallback;
		} else {
			if (this.deviceId) localStorage.setItem("deviceId", this.deviceId);
			if (this.endpointUrl) localStorage.setItem("endpointUrl", this.endpointUrl);
		}
	};
}
