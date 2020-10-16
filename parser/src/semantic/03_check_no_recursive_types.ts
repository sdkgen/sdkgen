import { AstNode, Field, Type, TypeDefinition, TypeReference } from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

export class CheckNoRecursiveTypesVisitor extends Visitor {
  path: string[] = [];
  rootType: Type | undefined;

  visit(node: AstNode) {
    if (node instanceof TypeDefinition) {
      this.path = [node.name];
      this.rootType = node.type;
      super.visit(node);
      this.path = [];
      this.rootType = undefined;
    } else if (node instanceof Field) {
      this.path.push(node.name);
      super.visit(node);
      this.path.pop();
    } else if (node instanceof TypeReference) {
      if (this.rootType === node.type) {
        throw new SemanticError(`Detected type recursion: ${this.path.join(".")} at ${node.location}`);
      }
      this.visit(node.type);
      super.visit(node);
    } else {
      super.visit(node);
    }
  }
}
