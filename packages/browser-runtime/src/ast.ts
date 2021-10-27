export type TypeDescription = string | string[] | { [name: string]: TypeDescription };

export interface TypeTable {
  [name: string]: TypeDescription | undefined;
}

export interface FunctionTable {
  [name: string]:
    | {
        args: {
          [arg: string]: TypeDescription;
        };
        ret: TypeDescription;
      }
    | undefined;
}

export interface AstJson {
  typeTable: TypeTable;
  functionTable: FunctionTable;
  errors: Array<string | string[]>;
}
