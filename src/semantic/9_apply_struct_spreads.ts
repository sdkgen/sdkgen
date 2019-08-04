import { AstNode, StructType } from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

export class ApplyStructSpreadsVisitor extends Visitor {
    // Here we may visit the same struct multiple times
    // We must make sure we only process each one once
    processed = new Set<StructType>();

    visit(node: AstNode) {
        if (node instanceof StructType) {
            if (this.processed.has(node))
                return;
            this.processed.add(node);
        }

        super.visit(node);

        if (node instanceof StructType) {
            for (const other of node.spreads.map(t => t.type)) {
                if (!(other instanceof StructType)) {
                    throw new SemanticError(`A spread operator in a struct can't refer to something that is not a struct, in '${node.name}' at ${node.location}.`);
                }

                this.visit(other); // recursion!

                for (const otherField of other.fields) {
                    if (node.fields.find(f => f.name === otherField.name)) {
                        throw new SemanticError(`The field '${otherField.name}' happens on both '${node.name}' at ${node.location} and '${other.name}' at ${other.location}.`);
                    }

                    node.fields.push(otherField);
                }
            }
        }
    }
}
