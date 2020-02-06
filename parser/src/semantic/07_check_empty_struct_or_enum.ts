import { AstNode, EnumType, StructType } from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

export class CheckEmptyStructOrEnumVisitor extends Visitor {
    visit(node: AstNode) {
        super.visit(node);

        if (node instanceof EnumType) {
            if (node.values.length === 0)
                throw new SemanticError(`Enum '${node.name}' at ${node.location} is empty`);
        }

        if (node instanceof StructType) {
            if (node.fields.length === 0 && node.spreads.length === 0)
                throw new SemanticError(`Struct '${node.name}' at ${node.location} is empty`);
        }
    }
}
