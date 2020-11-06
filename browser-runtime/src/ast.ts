export interface TypeTable {
  [name: string]: TypeDescription;
}

export interface FunctionTable {
  [name: string]: {
    args: {
      [arg: string]: TypeDescription;
    };
    ret: TypeDescription;
  };
}

export type TypeDescription = string | string[] | { [name: string]: TypeDescription };

export interface AstJson {
  typeTable: TypeTable;
  functionTable: FunctionTable;
}
