import { getLocalStorageBookmarks } from "helpers/localStorage/bookmarkedEndpoints";
import { ModelAnotations, requestModel } from "helpers/requestModel";
import { observable } from "mobx";
import { ArgsType, AstJson, TypeDescription, TypeTable } from "resources/types/ast";
import { v4 as uuidV4 } from "uuid";
import { RootStore } from ".";

export const simpleStringTypes = [
	"string",
	"cep",
	"cnpj",
	"cpf",
	"email",
	"html",
	"phone",
	"url",
	"xml",
];
export const simpleTypes = [
	"json",
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
			const response = await fetch(`${this.rootStore.configStore.endpointUrl}/ast.json`);
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
			json: { anything: [1, 2, 3] },
			bool: true,
			hex: "deadbeef",
			uuid: uuidV4(),
			base64: "c2RrZ2Vu",
			int: 123,
			uint: 123,
			float: 12.3,
			money: 123,
			void: undefined,
			latlng: undefined,
			string: "string",
			cep: undefined,
			cnpj: undefined,
			cpf: undefined,
			email: "hello@example.com",
			phone: undefined,
			safehtml: "<body>Hello</body>",
			url: location.origin,
			xml: "<aa></aa>",
		};
		if (types[type] === undefined) {
			console.log(`Unknown simple type '${type}'`);
			return null;
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
			return [1, 2, 3].map(() => this.encodeTransform(typeTable, type.replace("[]", "")));
		} else if (simpleTypes.includes(type)) {
			// simple types
			return this.simpleTypeMock(type);
		} else if (type === "bytes") {
			return "deadbeef";
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

	public getAnotations = (AST: AstJson, functionName: string): ModelAnotations => {
		const functionAnnotations = AST.annotations[`fn.${functionName}`] || [];

		const regex = RegExp(`fn.${functionName}\\.[^\.]*`);
		const argsKeys = Object.keys(AST.annotations).filter((target) => regex.test(target));

		const argsAnnotations = argsKeys.reduce((acc, argKey) => {
			// breaks 'fn.getBalance.bankCode' into ["fn", "getBalance", "bankCode"]
			// and gets the last part, that is the arguemnt name
			const argName = argKey.split(".")[2];
			return {
				...acc,
				[argName]: AST.annotations[argKey],
			};
		}, {});

		const annotations: ModelAnotations = {
			func: functionAnnotations,
			args: argsAnnotations,
		};
		return annotations;
	};

	private createBookmarkedEndpointIndex = (): Record<string, boolean | undefined> => {
		return getLocalStorageBookmarks().reduce((acc, name) => ({ ...acc, [name]: true }), {});
	};

	public createModels = (AST: AstJson) => {
		console.log("createModels");
		const { endpointUrl, deviceId } = this.rootStore.configStore;

		const FNs = Object.entries(AST.functionTable);
		const bookmarkedEndpointsIndex = this.createBookmarkedEndpointIndex();
		this.api = FNs.reduce((acc, [fName, fStruct]) => {
			const argsMock = this.createMockBasedOnTypes(fStruct.args, AST.typeTable);
			const annotations = this.getAnotations(AST, fName);
			return {
				...acc,
				[fName]: new requestModel({
					name: fName,
					defaultArgsMock: argsMock,
					baseUrl: endpointUrl,
					deviceId: deviceId!,
					annotations,
					bookmarked: Boolean(bookmarkedEndpointsIndex[fName]),
				}),
			};
		}, {});
	};
}
