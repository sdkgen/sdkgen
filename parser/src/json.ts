/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Annotation, Type } from "./ast";
import {
  StatusCodeAnnotation,
  ArrayType,
  AstRoot,
  DescriptionAnnotation,
  EnumType,
  EnumValue,
  ErrorNode,
  Field,
  FunctionOperation,
  HiddenAnnotation,
  OptionalType,
  RestAnnotation,
  StructType,
  ThrowsAnnotation,
  TypeDefinition,
  TypeReference,
  VoidPrimitiveType,
} from "./ast";
import { analyse } from "./semantic/analyser";
import type { DeepReadonly } from "./utils";
import { primitiveToAstClass } from "./utils";

export type TypeDescription = string | Array<string | [string, string]> | Record<string, string>;

type TypeTable = Record<string, TypeDescription | undefined>;

type FunctionTable = Record<
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

function annotationToJson(ann: Annotation): AnnotationJson {
  if (ann instanceof DescriptionAnnotation) {
    return { type: "description", value: ann.text };
  } else if (ann instanceof ThrowsAnnotation) {
    return { type: "throws", value: ann.error };
  } else if (ann instanceof RestAnnotation) {
    return {
      type: "rest",
      value: {
        bodyVariable: ann.bodyVariable,
        headers: [...ann.headers.entries()].sort(([a], [b]) => a.localeCompare(b)),
        method: ann.method,
        path: ann.path,
        pathVariables: ann.pathVariables,
        queryVariables: [...ann.queryVariables].sort((a, b) => a.localeCompare(b)),
      },
    };
  } else if (ann instanceof HiddenAnnotation) {
    return { type: "hidden", value: null };
  } else if (ann instanceof StatusCodeAnnotation) {
    return { type: "statusCode", value: ann.statusCode };
  }

  throw new Error(`BUG: annotationToJson with ${ann.constructor.name}`);
}

function annotationFromJson(json: AnnotationJson | DeepReadonly<AnnotationJson>): Annotation {
  switch (json.type) {
    case "description":
      return new DescriptionAnnotation(json.value);
    case "throws":
      return new ThrowsAnnotation(json.value);
    case "rest": {
      const { method, path, pathVariables, queryVariables, headers, bodyVariable } = json.value;

      return new RestAnnotation(method, path, pathVariables, queryVariables, new Map(headers), bodyVariable);
    }

    case "hidden":
      return new HiddenAnnotation();
    case "statusCode":
      return new StatusCodeAnnotation(json.value);

    default:
      throw new Error(`BUG: annotationFromJson with ${(json as { type: string }).type}`);
  }
}

export interface AstJson {
  typeTable: TypeTable;
  functionTable: FunctionTable;
  errors: Array<string | [string, string]>;
  annotations: Record<string, AnnotationJson[] | undefined>;
}

export function astToJson(ast: AstRoot): AstJson {
  const annotations: Record<string, AnnotationJson[]> = {};
  const typeTable: TypeTable = {};

  function processType(type: Type): string {
    if (type instanceof ArrayType) {
      return `${processType(type.base)}[]`;
    } else if (type instanceof OptionalType) {
      return `${processType(type.base)}?`;
    }

    return type.name;
  }

  for (const { name, fields } of ast.structTypes) {
    if (name in typeTable) {
      throw new Error(`Duplicate struct type ${name}`);
    }

    typeTable[name] = {};
    const obj = typeTable[name] as Record<string, TypeDescription>;

    for (const field of fields) {
      obj[field.name] = processType(field.type);

      for (const ann of field.annotations) {
        if (ann instanceof DescriptionAnnotation) {
          const target = `type.${name}.${field.name}`;

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          annotations[target] ??= [];
          annotations[target].push(annotationToJson(ann));
        }
      }
    }
  }

  for (const { name, values } of ast.enumTypes) {
    if (name in typeTable) {
      throw new Error(`Duplicate enum type ${name}`);
    }

    typeTable[name] = values.map(v => {
      if (!v.struct) {
        return v.value;
      }

      return [v.value, v.struct.name] as [string, string];
    });
  }

  for (const { name, type } of ast.typeDefinitions) {
    if (type instanceof StructType || type instanceof EnumType) {
      continue;
    }

    typeTable[name] = processType(type);
  }

  const functionTable: FunctionTable = {};

  for (const op of ast.operations) {
    const args: Record<string, string> = {};

    for (const arg of op.args) {
      args[arg.name] = processType(arg.type);
      for (const ann of arg.annotations) {
        if (ann instanceof DescriptionAnnotation) {
          const target = `fn.${op.name}.${arg.name}`;

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          annotations[target] ??= [];
          annotations[target].push(annotationToJson(ann));
        }
      }
    }

    functionTable[op.name] = {
      args,
      ret: processType(op.returnType),
    };

    for (const ann of op.annotations) {
      const target = `fn.${op.name}`;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      annotations[target] ??= [];
      annotations[target].push(annotationToJson(ann));
    }
  }

  const errors = ast.errors.map(error =>
    error.dataType instanceof VoidPrimitiveType ? error.name : ([error.name, error.dataType.name] as [string, string]),
  );

  for (const error of ast.errors) {
    for (const ann of error.annotations) {
      const target = `error.${error.name}`;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      annotations[target] ??= [];
      annotations[target].push(annotationToJson(ann));
    }
  }

  return {
    annotations,
    errors,
    functionTable,
    typeTable,
  };
}

export function jsonToAst(json: DeepReadonly<AstJson>): AstRoot {
  const operations: FunctionOperation[] = [];
  const typeDefinition: TypeDefinition[] = [];
  const solveEnumValueStructRef: Array<[EnumValue, string]> = [];

  function processType(description: DeepReadonly<TypeDescription>, typeName?: string): Type {
    if (typeof description === "string") {
      const primitiveClass = primitiveToAstClass.get(description);

      if (primitiveClass) {
        return new primitiveClass();
      } else if (description.endsWith("?")) {
        return new OptionalType(processType(description.slice(0, description.length - 1)));
      } else if (description.endsWith("[]")) {
        return new ArrayType(processType(description.slice(0, description.length - 2)));
      }

      return new TypeReference(description);
    } else if (Array.isArray(description)) {
      return new EnumType(
        description.map(v => {
          if (Array.isArray(v)) {
            const [value, structName] = v as [string, string];
            const enumValue = new EnumValue(value);

            solveEnumValueStructRef.push([enumValue, structName]);

            return enumValue;
          }

          return new EnumValue(v as string);
        }),
      );
    }

    const fields: Field[] = [];

    for (const fieldName of Object.keys(description)) {
      const field = new Field(fieldName, processType((description as Record<string, string>)[fieldName]));

      if (typeName) {
        const target = `type.${typeName}.${fieldName}`;

        for (const annotationJson of json.annotations[target] ?? []) {
          field.annotations.push(annotationFromJson(annotationJson));
        }
      }

      fields.push(field);
    }

    return new StructType(fields);
  }

  for (const [typeName, description] of Object.entries(json.typeTable)) {
    const type = processType(description!, typeName);

    typeDefinition.push(new TypeDefinition(typeName, type));
  }

  for (const [functionName, func] of Object.entries(json.functionTable)) {
    const args = Object.keys(func!.args).map(argName => {
      const field = new Field(argName, processType(func!.args[argName]));
      const target = `fn.${functionName}.${argName}`;

      for (const annotationJson of json.annotations[target] ?? []) {
        field.annotations.push(annotationFromJson(annotationJson));
      }

      return field;
    });

    const op = new FunctionOperation(functionName, args, processType(func!.ret));
    const target = `fn.${functionName}`;

    for (const annotationJson of json.annotations[target] ?? []) {
      op.annotations.push(annotationFromJson(annotationJson));
    }

    operations.push(op);
  }

  for (const [enumValue, structName] of solveEnumValueStructRef) {
    const struct = typeDefinition.find(def => def.name === structName)?.type;

    if (struct instanceof StructType) {
      enumValue.struct = struct;
    }
  }

  const errors = json.errors.map(error => {
    let errorNode;

    if (Array.isArray(error)) {
      const [name, type] = error as [string, string];

      errorNode = new ErrorNode(name, processType(type));
    } else {
      errorNode = new ErrorNode(error as string, new VoidPrimitiveType());
    }

    const target = `error.${errorNode.name}`;

    for (const annotationJson of json.annotations[target] ?? []) {
      errorNode.annotations.push(annotationFromJson(annotationJson));
    }

    return errorNode;
  });

  const ast = new AstRoot(typeDefinition, operations, errors);

  analyse(ast);
  return ast;
}
