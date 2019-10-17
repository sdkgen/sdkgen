import { RootStore } from ".";
import { observable } from "mobx";
import { AstJson } from "resources/types/ast";
import { requestModel } from "helpers/requestModel";

export class RequestsStore {
	public rootStore: RootStore;

	@observable
	public AST: AstJson | null = null;

	public api: Record<string, requestModel> = {};

	constructor(rootStore: RootStore) {
		this.rootStore = rootStore;
		this.fetchAST();

		// this.makeCall("hello",
		// {
		// 	args1: "string",
		// 	until: new Date().toISOString().split("T")[0],
		// }
		// );

		// const test = new requestModel({
		// 	name: "hello",
		// 	baseUrl: `http://${rootStore.configStore.endpointUrl}/`,
		// 	deviceId: rootStore.configStore.deviceId!,
		// });

		// test.call({
		// 	args1: "string",
		// 	until: new Date().toISOString().split("T")[0],
		// });
		// window.model = test;
	}

	public fetchAST = async () => {
		try {
			const response = await fetch(
				`http://${this.rootStore.configStore.endpointUrl}/ast.json`,
			);
			const ast = await response.json();
			this.AST = ast;
			if (ast) this.createModels(ast);
		} catch (err) {
			console.log(err);
		}
	};

	public createModels = (AST: AstJson) => {
		const { endpointUrl, deviceId } = this.rootStore.configStore;
		const baseUrl = `http://${endpointUrl}`;

		const FNs = Object.entries(AST.functionTable);
		console.log("FNs", FNs);
		this.api = FNs.reduce((acc, [fName, fStruct]) => {
			return {
				...acc,
				[fName]: new requestModel({
					name: fName,
					baseUrl: baseUrl,
					deviceId: deviceId!,
				}),
			};
		}, {});

		console.log("nice-args", {
			args1: "string",
			until: new Date().toISOString().split("T")[0],
		});
		window.api = this.api;
	};

	// public makeCall = async (functionName: string, args: any) => {
	// 	const url = `http://${this.rootStore.configStore.endpointUrl}/`;
	// 	const body = {
	// 		id: "sdkgen-playground",
	// 		device: {
	// 			type: "web",
	// 			id: this.rootStore.configStore.deviceId,
	// 		},
	// 		name: functionName,
	// 		args: args,
	// 	};

	// 	http: try {
	// 		const response = await fetch(url, {
	// 			method: "POST",
	// 			cache: "no-cache",
	// 			headers: {
	// 				"Content-Type": "application/json",
	// 			},
	// 			body: JSON.stringify(body),
	// 		});
	// 		console.log("RETURN", await response.json());
	// 	} catch (err) {
	// 		console.log(err);
	// 	}
	// };
}
