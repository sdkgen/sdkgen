import { AstNode, EnumType, Field, Operation, StructType, TypeDefinition } from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

export class GiveStructAndEnumNamesVisitor extends Visitor {
    path: string[] = [];
    names = new Map<string, string[]>();

    visit(node: AstNode) {
        if (node instanceof TypeDefinition) {
            this.path = [node.name];
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
            if (this.names.has(node.name)) {
                throw new SemanticError(`The name of the type '${this.path.join(".")}' at ${node.location} will conflict with '${this.names.get(node.name)!.join(".")}'`);
            }
            this.names.set(node.name, [...this.path]);
            super.visit(node);
        } else {
            super.visit(node);
        }
    }
}
