import type { AstNode, AstRoot } from "../ast.js";
import { EnumValue, EnumType, Spread, FunctionOperation, ArrayType, ErrorNode, Field, OptionalType, StructType, TypeDefinition } from "../ast.js";

export class SemanticError extends Error {}

export abstract class Visitor {
  constructor(protected root: AstRoot) {}

  process(): void {
    for (const error of this.root.errors) {
      this.visit(error);
    }

    for (const typeDefinition of this.root.typeDefinitions) {
      this.visit(typeDefinition);
    }

    for (const operation of this.root.operations) {
      this.visit(operation);
    }
  }

  visit(node: AstNode): void {
    if (node instanceof FunctionOperation) {
      for (const arg of node.args) {
        this.visit(arg);
      }

      for (const arg of node.fieldsAndSpreads) {
        this.visit(arg);
      }

      this.visit(node.returnType);
    } else if (node instanceof Field || node instanceof TypeDefinition) {
      this.visit(node.type);
    } else if (node instanceof StructType) {
      for (const field of node.fields) {
        this.visit(field);
      }

      for (const field of node.fieldsAndSpreads) {
        this.visit(field);
      }
    } else if (node instanceof EnumType) {
      for (const enumValue of node.values) {
        this.visit(enumValue);
      }
    } else if (node instanceof EnumValue) {
      if (node.struct) {
        this.visit(node.struct);
      }
    } else if (node instanceof ArrayType || node instanceof OptionalType) {
      this.visit(node.base);
    } else if (node instanceof ErrorNode) {
      this.visit(node.dataType);
    } else if (node instanceof Spread) {
      this.visit(node.typeReference);
    }
  }
}
