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
		// console.log("FNs", FNs);
		this.api = FNs.reduce((acc, [fName, _fStruct]) => {
			return {
				...acc,
				[fName]: new requestModel({
					name: fName,
					baseUrl: baseUrl,
					deviceId: deviceId!,
				}),
			};
		}, {});
	};
}
