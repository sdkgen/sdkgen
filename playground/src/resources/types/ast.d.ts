export type TypeDescription = string | readonly string[] | string[] | { [name: string]: TypeDescription };

export interface ArgsType {
  [arg: string]: TypeDescription;
}

interface TypeTable {
  [name: string]: TypeDescription | undefined;
}

interface FunctionTable {
  [name: string]:
    | {
        args: ArgsType;
        ret: TypeDescription;
      }
    | undefined;
}
type AnnotationJson =
  | {
      type: "description";
      value: string;
    }
  | {
      type: "throws";
      value: string;
    }
  | {
      type: "hidden";
      value: null;
    }
  | {
      type: "rest";
      value: {
        bodyVariable: string | null;
        headers: Array<[string, string]>;
        method: string;
        path: string;
        pathVariables: string[];
        queryVariables: string[];
      };
    };

export interface AstJson {
  typeTable: TypeTable;
  functionTable: FunctionTable;
  errors: Array<string | string[]>;
  annotations: Record<string, AnnotationJson[] | undefined>;
}
