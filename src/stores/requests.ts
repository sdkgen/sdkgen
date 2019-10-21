import { RootStore } from ".";
import { observable } from "mobx";
import { AstJson, ArgsType, TypeTable, TypeDescription } from "resources/types/ast";
import { requestModel } from "helpers/requestModel";

export const simpleStringTypes = [
	"string",
	"cep",
	"cnpj",
	"cpf",
	"email",
	"phone",
	"safehtml",
	"url",
	"xml",
];
export const simpleTypes = [
	"any",
	"bool",
	"hex",
	"uuid",
	"base64",
	"int",
	"uint",
	"float",
	"money",
	"void",
	"latlng",
	...simpleStringTypes,
];

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
				`https://${this.rootStore.configStore.endpointUrl}/ast.json`,
			);
			const ast = await response.json();
			this.AST = ast;
			if (ast) this.createModels(ast);
		} catch (err) {
			console.log(err);
		}
	};

	private createMockBasedOnTypes = (args: ArgsType, typeTable: TypeTable) => {
		return Object.keys(args).reduce(
			(acc, curKey) => ({ ...acc, [curKey]: this.encodeTransform(typeTable, args[curKey]) }),
			{},
		);
	};

	private simpleTypeMock = (type: string) => {
		const types: Record<string, any> = {
			any: null,
			bool: true,
			hex: null,
			uuid: null,
			base64: null,
			int: 200,
			uint: 3294967295,
			float: 5.3,
			money: null,
			void: null,
			latlng: null,
			string: "string",
			cep: null,
			cnpj: null,
			cpf: null,
			email: null,
			phone: null,
			safehtml: null,
			url: null,
			xml: null,
		};
		if (!types[type]) {
			throw new Error(`Unknown simple type '${type}'`);
		}
		return types[type];
	};

	private encodeTransform = (typeTable: TypeTable, type: TypeDescription): any => {
		if (Array.isArray(type)) {
			// things like "car" | "motorcycle"
			return type[0];
		} else if (typeof type === "object") {
			// resolution of complex type
			const obj: any = {};
			for (const key in type) {
				obj[key] = this.encodeTransform(typeTable, type[key]);
			}
			return obj;
		} else if (type.endsWith("?")) {
			// nullish
			return this.encodeTransform(typeTable, type.replace("?", ""));
		} else if (type.endsWith("[]")) {
			// arrayOf
			return [1, 2].map(() => this.encodeTransform(typeTable, type.replace("[]", "")));
		} else if (simpleTypes.indexOf(type) >= 0) {
			// simple types
			const index = simpleTypes.indexOf(type);
			return this.simpleTypeMock(simpleTypes[index]);
		} else if (type === "bytes") {
			return "bytes";
		} else if (type === "date") {
			return new Date().toISOString().split("T")[0];
		} else if (type === "datetime") {
			return new Date().toISOString().replace("Z", "");
		} else {
			// complex type
			const resolved = typeTable[type];
			if (resolved) {
				return this.encodeTransform(typeTable, resolved);
			} else {
				throw new Error(`Unknown type '${type}'`);
			}
			return "complex type";
		}
	};

	public createModels = (AST: AstJson) => {
		const { endpointUrl, deviceId } = this.rootStore.configStore;
		const baseUrl = `https://${endpointUrl}`;

		const FNs = Object.entries(AST.functionTable);
		this.api = FNs.reduce((acc, [fName, fStruct]) => {
			const argsMock = this.createMockBasedOnTypes(fStruct.args, AST.typeTable);

			return {
				...acc,
				[fName]: new requestModel({
					name: fName,
					defaultArgsMock: argsMock,
					baseUrl,
					deviceId: deviceId!,
				}),
			};
		}, {});
	};
}
