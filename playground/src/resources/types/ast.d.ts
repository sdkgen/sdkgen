export type TypeDescription = string | string[] | { [name: string]: TypeDescription };

export interface TypeTable {
  [name: string]: TypeDescription;
}

export interface ArgsType {
  [arg: string]: TypeDescription;
}

export interface FunctionTable {
  [name: string]: {
    args: ArgsType;
    ret: TypeDescription;
  };
}

interface AnnotationJson {
  type: string;
  value: any;
}

export interface AstJson {
  typeTable: TypeTable;
  functionTable: FunctionTable;
  errors: string[];
  annotations: { [target: string]: AnnotationJson[] };
}
