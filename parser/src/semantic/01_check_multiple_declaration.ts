import { Operation } from "..";
import type { AstNode, Type } from "../ast";
import { TypeDefinition } from "../ast";
import { SemanticError, Visitor } from "./visitor";

export class CheckMultipleDeclarationVisitor extends Visitor {
  nameToType = new Map<string, Type>();

  visit(node: AstNode): void {
    if (node instanceof TypeDefinition) {
      const previousType = this.nameToType.get(node.name);

      if (previousType && JSON.stringify(previousType) !== JSON.stringify(node.type)) {
        throw new SemanticError(`Type '${node.name}' at ${node.location} is defined multiple times (also at ${previousType.location})`);
      }

      this.nameToType.set(node.name, node.type);
    }

    super.visit(node);
    if (node instanceof TypeDefinition || node instanceof Operation) {
      // eslint-disable-next-line no-foreach/no-foreach
      node.generics.forEach(generic => {
        const previouslyDeclared = this.nameToType.get(generic);

        if (previouslyDeclared !== undefined) {
          throw new SemanticError(
            `Generic type '${generic}' used in '${node.name}' at ${node.location} can't have same name as declared type '${generic}' at '${previouslyDeclared.location}'`,
          );
        }
      });
    }
  }
}
