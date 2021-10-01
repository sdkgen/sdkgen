import { GenericType, Operation, TypeDefinition } from "..";
import type { AstNode } from "../ast";
import { TypeReference } from "../ast";
import { SemanticError, Visitor } from "./visitor";

export class MatchTypeDefinitionsVisitor extends Visitor {
  genericScope: Set<string> = new Set<string>();

  visit(node: AstNode): void {
    if (node instanceof TypeReference) {
      const definition = this.root.typeDefinitions.find(t => t.name === node.name);

      if (this.genericScope.has(node.name)) {
        node.type = new GenericType(node.name);
      } else if (definition === undefined) {
        throw new SemanticError(`Could not find type '${node.name}' at ${node.location}`);
      } else {
        node.type = definition.type;
      }
    }

    const original = this.genericScope;

    if (node instanceof TypeDefinition || node instanceof Operation) {
      this.genericScope = node.generics;
    }

    super.visit(node);
    this.genericScope = original;
  }
}
