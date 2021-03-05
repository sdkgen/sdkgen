import type { AstNode, AstRoot } from "../ast";
import { UnionType, ArrayType, ErrorNode, Field, Operation, OptionalType, StructType, TypeDefinition } from "../ast";

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
    if (node instanceof Operation) {
      for (const arg of node.args) {
        this.visit(arg);
      }

      this.visit(node.returnType);
    } else if (node instanceof Field || node instanceof TypeDefinition) {
      this.visit(node.type);
    } else if (node instanceof StructType) {
      for (const field of node.fields) {
        this.visit(field);
      }

      for (const spread of node.spreads) {
        this.visit(spread);
      }
    } else if (node instanceof UnionType) {
      for (const type of node.types) {
        this.visit(type);
      }
    } else if (node instanceof ArrayType || node instanceof OptionalType) {
      this.visit(node.base);
    } else if (node instanceof ErrorNode) {
      this.visit(node.dataType);
    }
  }
}
