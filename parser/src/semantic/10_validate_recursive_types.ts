import type { AstNode } from "../ast";
import { ArrayType, OptionalType, TypeDefinition, TypeReference } from "../ast";
import { SemanticError, Visitor } from "./visitor";

export class ValidateRecursiveTypes extends Visitor {
  visit(node: AstNode): void {
    super.visit(node);

    if (
      node instanceof TypeDefinition &&
      ((node.type instanceof TypeReference && node.type.name === node.name) ||
        (node.type instanceof ArrayType && node.type.base.name === node.name) ||
        (node.type instanceof OptionalType && node.type.base.name === node.name))
    ) {
      throw new SemanticError(`Type '${node.name}' at ${node.location} is recursive but is not an struct`);
    }
  }
}
