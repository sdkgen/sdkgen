import { AstNode, Type, TypeDefinition } from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

export class CheckMultipleDeclarationVisitor extends Visitor {
    nameToType = new Map<string, Type>();

    visit(node: AstNode) {
        if (node instanceof TypeDefinition) {
            const previousType = this.nameToType.get(node.name);
            if (previousType && JSON.stringify(previousType) !== JSON.stringify(node)) {
                throw new SemanticError(`Type '${node.name}' at ${node.location} is defined multiple times`);
            }
            this.nameToType.set(node.name, node.type);
        }

        super.visit(node);
    }
}
