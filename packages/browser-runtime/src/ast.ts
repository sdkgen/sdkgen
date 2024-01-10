export type TypeDescription = string | Array<string | [string, string]> | Record<string, string>;

export type TypeTable = Record<string, TypeDescription | undefined>;
export type FunctionTable = Record<
  string,
  | {
      args: Record<string, string>;
      ret: TypeDescription;
    }
  | undefined
>;

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
      type: "statusCode";
      value: number;
    }
  | {
      type: "rest";
      value: {
        bodyVariable: string | null;
        headers: ReadonlyArray<[string, string]>;
        method: string;
        path: string;
        pathVariables: readonly string[];
        queryVariables: readonly string[];
      };
    };

export interface AstJson {
  typeTable: TypeTable;
  functionTable: FunctionTable;
  errors: Array<string | string[]>;
  annotations: Record<string, AnnotationJson[] | undefined>;
}
