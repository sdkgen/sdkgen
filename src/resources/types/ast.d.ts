export interface TypeTable {
	[name: string]: TypeDescription;
}

export type ArgsType = {
	[arg: string]: TypeDescription;
};

export interface FunctionTable {
	[name: string]: {
		args: ArgsType;
		ret: TypeDescription;
	};
}

export type TypeDescription = string | string[] | { [name: string]: TypeDescription };

export interface AstJson {
	typeTable: TypeTable;
	functionTable: FunctionTable;
}
