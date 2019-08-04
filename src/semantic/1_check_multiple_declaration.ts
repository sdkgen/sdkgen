import { AstNode, TypeDefinition } from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

export class CheckMultipleDeclarationVisitor extends Visitor {
    names = new Set<string>();

    visit(node: AstNode) {
        if (node instanceof TypeDefinition) {
            if (this.names.has(node.name)) {
                throw new SemanticError(`Type '${node.name}' at ${node.location} is defined multiple times`);
            }
            this.names.add(node.name);
        }

        super.visit(node);
    }
}
