import type { AstNode } from "../ast";
import { TypeReference } from "../ast";
import { SemanticError, Visitor } from "./visitor";

export class MatchTypeDefinitionsVisitor extends Visitor {
  visit(node: AstNode): void {
    if (node instanceof TypeReference) {
      const definition = this.root.typeDefinitions.find(t => t.name === node.name);

      if (definition === undefined) {
        throw new SemanticError(`Could not find type '${node.name}' at ${node.location}`);
      }

      node.type = definition.type;
    }

    super.visit(node);
  }
}
