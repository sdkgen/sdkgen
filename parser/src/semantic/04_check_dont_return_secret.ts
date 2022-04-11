import type { AstNode } from "../ast";
import { TypeReference, FunctionOperation, Field } from "../ast";
import { SemanticError, Visitor } from "./visitor";

export class CheckDontReturnSecretVisitor extends Visitor {
  isInReturn = false;

  path: string[] = [];

  visited = new Set<AstNode>();

  visit(node: AstNode): void {
    if (this.visited.has(node)) {
      return;
    }

    this.visited.add(node);

    if (node instanceof FunctionOperation) {
      this.isInReturn = true;
      this.visited.clear();
      this.path.push(`${node.name}(...)`);
      this.visit(node.returnType);
      this.path.pop();
      this.isInReturn = false;
    } else if (node instanceof TypeReference) {
      this.visit(node.type);
    } else if (node instanceof Field) {
      this.path.push(node.name);
      if (this.isInReturn && node.secret) {
        throw new SemanticError(`Can't return a secret value at ${this.path.join(".")} at ${node.location}`);
      }

      super.visit(node);
      this.path.pop();
    } else {
      super.visit(node);
    }
  }
}
