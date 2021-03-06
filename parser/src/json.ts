/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { AnnotationJson, Operation, Type } from "./ast";
import {
  annotationFromJson,
  annotationToJson,
  ComplexType,
  UnionType,
  ArrayType,
  AstRoot,
  DescriptionAnnotation,
  EnumType,
  EnumValue,
  ErrorNode,
  Field,
  FunctionOperation,
  OptionalType,
  StructType,
  TypeDefinition,
  TypeReference,
  VoidPrimitiveType,
} from "./ast";
import { analyse } from "./semantic/analyser";
import type { DeepReadonly } from "./utils";
import { primitiveToAstClass } from "./utils";

export type TypeDescription = string | ["enum", ...string[]] | ["union", ...string[]] | { [name: string]: string };

type TypeTable = Record<string, TypeDescription | undefined>;

type FunctionTable = Record<
  string,
  | {
      args: Record<string, string>;
      ret: TypeDescription;
    }
  | undefined
>;

export interface AstJson {
  typeTable: TypeTable;
  functionTable: FunctionTable;
  errors: Array<string | string[]>;
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
    } else if (type instanceof ComplexType) {
      throw new Error(`BUG: unexpected complex type ${type.constructor.name}: ${JSON.stringify(type)}`);
    }

    return type.name;
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
          annotations[target].push(annotationToJson(ann));
        }
      }
    }
  }

  for (const { name, values } of ast.enumTypes) {
    typeTable[name] = ["enum", ...values.map(v => v.value)];
  }

  for (const type of ast.unionTypes) {
    typeTable[type.name] = ["union", ...type.types.map(t => processType(t))];
  }

  for (const { name, type } of ast.typeDefinitions) {
    if (!(type instanceof ComplexType)) {
      typeTable[name] = processType(type);
    }
  }

  const functionTable: FunctionTable = {};

  for (const op of ast.operations) {
    const args: Record<string, string> = {};

    for (const arg of op.args) {
      args[arg.name] = processType(arg.type);
      for (const ann of arg.annotations) {
        if (ann instanceof DescriptionAnnotation) {
          const target = `fn.${op.prettyName}.${arg.name}`;

          annotations[target] ||= [];
          annotations[target].push(annotationToJson(ann));
        }
      }
    }

    functionTable[op.prettyName] = {
      args,
      ret: processType(op.returnType),
    };

    for (const ann of op.annotations) {
      const target = `fn.${op.prettyName}`;

      annotations[target] ??= [];
      annotations[target].push(annotationToJson(ann));
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
      switch (description[0] as "enum" | "union") {
        case "enum":
          return new EnumType(description.slice(1).map(v => new EnumValue(v as string)));
        case "union":
          return new UnionType(description.slice(1).map(t => processType(t)));
      }
    }

    const fields: Field[] = [];

    for (const fieldName of Object.keys(description)) {
      const field = new Field(fieldName, processType((description as { [name: string]: TypeDescription })[fieldName]));

      if (typeName) {
        const target = `type.${typeName}.${fieldName}`;

        for (const annotationJson of json.annotations[target] ?? []) {
          field.annotations.push(annotationFromJson(annotationJson));
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
