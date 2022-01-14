import type { Type, AstNode } from "../ast";
import { EnumType, StructType, ArrayType, OptionalType, TypeDefinition, TypeReference } from "../ast";
import { SemanticError, Visitor } from "./visitor";

export class ValidateRecursiveTypes extends Visitor {
  visit(node: AstNode): void {
    super.visit(node);

    if (node instanceof TypeDefinition && this.isRecursiveType(node, node.type)) {
      if (!(node.type instanceof StructType || node.type instanceof EnumType)) {
        throw new SemanticError(`Type '${node.name}' at ${node.location} is recursive but is not an struct`);
      }

      if (this.isInfinitelyRecursiveType(node, node.type)) {
        throw new SemanticError(`Type '${node.name}' at ${node.location} is infinitely recursive`);
      }
    }
  }

  isRecursiveType(node: TypeDefinition, type: Type): boolean {
    if (type instanceof TypeReference) {
      return node.name === type.name;
    } else if (type instanceof ArrayType) {
      return this.isRecursiveType(node, type.base);
    } else if (type instanceof OptionalType) {
      return this.isRecursiveType(node, type.base);
    } else if (type instanceof StructType) {
      return type.fields.some(field => this.isRecursiveType(node, field.type));
    } else if (type instanceof EnumType) {
      return type.values.some(value => value.struct && this.isRecursiveType(node, value.struct));
    }

    return false;
  }

  isInfinitelyRecursiveType(node: TypeDefinition, type: Type): boolean {
    if (type instanceof TypeReference) {
      return type.name === node.name;
    } else if (type instanceof StructType) {
      return type.fields.some(field => this.isInfinitelyRecursiveType(node, field.type));
    } else if (type instanceof EnumType) {
      return type.values.every(value => value.struct && this.isInfinitelyRecursiveType(node, value.struct));
    }

    return false;
  }
}
