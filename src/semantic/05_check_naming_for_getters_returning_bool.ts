import { AstNode, BoolPrimitiveType, GetOperation } from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

export class CheckNamingForGettersReturningBoolVisitor extends Visitor {
    visit(node: AstNode) {
        super.visit(node);

        if (node instanceof GetOperation) {
            const returnsBool = node.returnType instanceof BoolPrimitiveType;
            const hasBoolNaming = !!node.name.match(/^(is|has|can|may|should)/);
            if (returnsBool && !hasBoolNaming) {
                throw new SemanticError(`Get operation '${node.name}' at ${node.location} returns bool but isn't named accordingly`);
            } else if (!returnsBool && hasBoolNaming) {
                throw new SemanticError(`Get operation '${node.name}' at ${node.location} doesn't return bool but its name suggest it does`);
            }
        }
    }
}
