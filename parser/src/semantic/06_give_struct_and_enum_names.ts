import type { AstNode, Type } from "../ast";
import { EnumType, ErrorNode, Field, Operation, StructType, TypeDefinition } from "../ast";
import { SemanticError, Visitor } from "./visitor";

export class GiveStructAndEnumNamesVisitor extends Visitor {
  path: string[] = [];

  names = new Map<string, { type: Type; path: string[] }>();

  visit(node: AstNode): void {
    if (node instanceof TypeDefinition) {
      this.path = [node.name];
      super.visit(node);
    } else if (node instanceof ErrorNode) {
      this.path = [`${node.name}Data`];
      super.visit(node);
    } else if (node instanceof Operation) {
      this.path = [node.name];
      super.visit(node);
    } else if (node instanceof Field) {
      this.path.push(node.name);
      super.visit(node);
      this.path.pop();
    } else if (node instanceof StructType || node instanceof EnumType) {
      node.name = this.path.map(s => s[0].toUpperCase() + s.slice(1)).join("");
      const previous = this.names.get(node.name);

      if (previous && JSON.stringify(previous.type) !== JSON.stringify(node)) {
        throw new SemanticError(
          `The name of the type '${this.path.join(".")}' at ${node.location} will conflict with '${previous.path.join(".")}' at ${
            previous.type.location
          }`,
        );
      }

      this.names.set(node.name, { path: [...this.path], type: node });
      super.visit(node);
    } else {
      super.visit(node);
    }
  }
}
