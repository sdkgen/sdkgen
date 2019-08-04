import { AstNode, Field, TypeDefinition, TypeReference } from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

export class CheckNoRecursiveTypesVisitor extends Visitor {
    path: string[] = [];

    visit(node: AstNode) {
        if (node instanceof TypeDefinition) {
            this.path = [node.name];
            super.visit(node);
        } else if (node instanceof Field) {
            this.path.push(node.name);
            super.visit(node);
            this.path.pop();
        } else if (node instanceof TypeReference) {
            if (this.path[0] === node.name) {
                throw new SemanticError(`Detected type recursion: ${this.path.join(".")} at ${node.location}`);
            }
            this.visit(node.type);
            super.visit(node);
        } else {
            super.visit(node);
        }
    }
}
