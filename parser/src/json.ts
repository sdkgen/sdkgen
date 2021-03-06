/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Operation, Type } from "./ast";
import {
  PrimitiveType,
  UnionType,
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

export type TypeDescription =
  | string
  | Array<TypeDescription | string>
  // Type instantiation is excessively deep and possibly infinite:
  // | ["enum", ...string[]]
  // | ["union", ...TypeDescription[]]
  // | ["array" | "optional", TypeDescription]
  | { [name: string]: TypeDescription };

type TypeTable = Record<string, TypeDescription | undefined>;

type FunctionTable = Record<
  string,
  | {
      args: Record<string, TypeDescription>;
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

export function astToJson(ast: AstRoot): AstJson {
  const annotations: Record<string, AnnotationJson[]> = {};
  const typeTable: TypeTable = {};

  function processType(type: Type): TypeDescription {
    if (type instanceof StructType || type instanceof EnumType || type instanceof PrimitiveType || type instanceof TypeReference) {
      return type.name;
    } else if (type instanceof UnionType) {
      return ["union", ...type.types.map(t => processType(t))];
    } else if (type instanceof ArrayType) {
      const inner = processType(type.base);

      return typeof inner === "string" ? `${inner}[]` : ["array", processType(type.base)];
    } else if (type instanceof OptionalType) {
      const inner = processType(type.base);

      return typeof inner === "string" ? `${inner}?` : ["optional", processType(type.base)];
    }

    throw new Error(type.constructor.name);
  }

  for (const { name, fields } of ast.structTypes) {
    typeTable[name] = {};
    const obj = typeTable[name] as Record<string, TypeDescription>;

    for (const field of fields) {
      obj[field.name] = processType(field.type);

      for (const ann of field.annotations) {
        if (ann instanceof DescriptionAnnotation) {
          const target = `type.${name}.${field.name}`;

          annotations[target] ||= [];
          const list = annotations[target];

          list.push({ type: "description", value: ann.text });
        }
      }
    }
  }

  for (const { name, values } of ast.enumTypes) {
    typeTable[name] = ["enum", ...values.map(v => v.value)];
  }

  for (const { name, type } of ast.typeDefinitions) {
    if (!(type instanceof StructType || type instanceof EnumType)) {
      typeTable[name] = processType(type);
    }
  }

  const functionTable: FunctionTable = {};

  for (const op of ast.operations) {
    const args: Record<string, TypeDescription> = {};

    for (const arg of op.args) {
      args[arg.name] = processType(arg.type);
      for (const ann of arg.annotations) {
        if (ann instanceof DescriptionAnnotation) {
          const target = `fn.${op.prettyName}.${arg.name}`;

          annotations[target] ||= [];
          const list = annotations[target];

          list.push({ type: "description", value: ann.text });
        }
      }
    }

    functionTable[op.prettyName] = {
      args,
      ret: processType(op.returnType),
    };

    for (const ann of op.annotations) {
      const target = `fn.${op.prettyName}`;

      annotations[target] ||= [];
      const list: Array<DeepReadonly<AnnotationJson>> = annotations[target];

      if (ann instanceof DescriptionAnnotation) {
        list.push({ type: "description", value: ann.text });
      }

      if (ann instanceof ThrowsAnnotation) {
        list.push({ type: "throws", value: ann.error });
      }

      if (ann instanceof RestAnnotation) {
        list.push({
          type: "rest",
          value: {
            bodyVariable: ann.bodyVariable,
            headers: [...ann.headers.entries()],
            method: ann.method,
            path: ann.path,
            pathVariables: ann.pathVariables,
            queryVariables: ann.queryVariables,
          },
        });
      }

      if (ann instanceof HiddenAnnotation) {
        list.push({ type: "hidden", value: null });
      }
    }
  }

  const errors = ast.errors.map(error => (error.dataType instanceof VoidPrimitiveType ? error.name : [error.name, error.dataType.name]));

  return {
    annotations,
    errors,
    functionTable,
    typeTable,
  };
}

export function jsonToAst(json: DeepReadonly<AstJson>): AstRoot {
  const operations: Operation[] = [];
  const typeDefinition: TypeDefinition[] = [];

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
      switch (description[0] as "enum" | "union" | "array" | "optional") {
        case "enum":
          return new EnumType(description.slice(1).map(v => new EnumValue(v as string)));
        case "union":
          return new UnionType(description.slice(1).map(t => processType(t)));
        case "array":
          return new ArrayType(processType(description[1]));
        case "optional":
          return new OptionalType(processType(description[1]));
      }
    }

    const fields: Field[] = [];

    for (const fieldName of Object.keys(description)) {
      const field = new Field(fieldName, processType((description as { [name: string]: TypeDescription })[fieldName]));

      if (typeName) {
        const target = `type.${typeName}.${fieldName}`;

        for (const annotationJson of json.annotations[target] ?? []) {
          if (annotationJson.type === "description") {
            field.annotations.push(new DescriptionAnnotation(annotationJson.value));
          }
        }
      }

      fields.push(field);
    }

    return new StructType(fields, []);
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
        if (annotationJson.type === "description") {
          field.annotations.push(new DescriptionAnnotation(annotationJson.value));
        }
      }

      return field;
    });

    const op = new FunctionOperation(functionName, args, processType(func!.ret));
    const target = `fn.${functionName}`;

    for (const annotationJson of json.annotations[target] ?? []) {
      if (annotationJson.type === "description") {
        op.annotations.push(new DescriptionAnnotation(annotationJson.value));
      } else if (annotationJson.type === "throws") {
        op.annotations.push(new ThrowsAnnotation(annotationJson.value));
      } else if (annotationJson.type === "rest" && typeof annotationJson.value === "object") {
        const { method, path, pathVariables, queryVariables, headers, bodyVariable } = annotationJson.value;

        op.annotations.push(new RestAnnotation(method, path, pathVariables, queryVariables, new Map(headers), bodyVariable));
      } else if (annotationJson.type === "hidden") {
        op.annotations.push(new HiddenAnnotation());
      }
    }

    operations.push(op);
  }

  const errors = json.errors.map(error => {
    if (Array.isArray(error)) {
      return new ErrorNode(error[0], processType(error[1]));
    }

    return new ErrorNode(error as string, new VoidPrimitiveType());
  });

  const ast = new AstRoot(typeDefinition, operations, errors);

  analyse(ast);
  return ast;
}
