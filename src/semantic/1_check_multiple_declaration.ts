import { AstNode, TypeDefinition, Type } from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";
import equal from "fast-deep-equal";

export class CheckMultipleDeclarationVisitor extends Visitor {
    nameToType = new Map<string, Type>();

    visit(node: AstNode) {
        if (node instanceof TypeDefinition) {
            const previousType = this.nameToType.get(node.name);
            if (previousType && !equal(previousType, node.type)) {
                throw new SemanticError(`Type '${node.name}' at ${node.location} is defined multiple times`);
            }
            this.nameToType.set(node.name, node.type);
        }

        super.visit(node);
    }
}
