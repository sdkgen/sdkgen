import { observable } from "mobx";

export type RequestStatus = "notFetched" | "sucess" | "fetching" | "error";
interface ConstructorArgument {
	name: string;
	baseUrl: string;
	deviceId: string;
}

export class requestModel {
	public args: any;
	public baseUrl: string;
	public deviceId: string;
	public name: string;

	@observable
	public response?: any;

	@observable
	public loading: boolean;

	@observable
	public error: any | undefined;

	@observable
	public status: RequestStatus;

	public async call(args: any) {
		this.args = args;
		this.loading = true;
		this.status = "fetching";

		const url = `${this.baseUrl}/${this.name}`;

		const requestBody = {
			id: "sdkgen-playground",
			device: {
				type: "web",
				id: this.deviceId,
			},
			name: this.name,
			args,
		};

		try {
			const r = await fetch(url, {
				method: "POST",
				cache: "no-cache",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});
			const res = await r.json();
			if (res.ok) {
				this.response = res.result;
				this.status = "sucess";
			} else {
				this.status = "error";
				this.error = `${res.error.type}: ${res.error.message}`;
			}
		} catch (err) {
			this.status = "error";
			this.error = err;
		} finally {
			this.loading = false;
		}
	}

	public reset() {
		this.loading = false;
		this.response = undefined;
		this.error = undefined;
		this.status = "notFetched";
	}

	constructor(config: ConstructorArgument) {
		//MOCK
		this.args = {
			args1: "string",
			until: new Date().toISOString().split("T")[0],
		};

		this.name = config.name;
		this.deviceId = config.deviceId;
		this.baseUrl = config.baseUrl;
		this.loading = false;
		this.response = undefined;
		this.error = undefined;
		this.status = "notFetched";
	}
}
