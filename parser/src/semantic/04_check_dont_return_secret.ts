import { AstNode, Field, Operation, TypeReference } from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

export class CheckDontReturnSecretVisitor extends Visitor {
  isInReturn = false;
  path: string[] = [];

  visit(node: AstNode) {
    if (node instanceof Operation) {
      this.isInReturn = true;
      this.path.push(node.name + "(...)");
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
