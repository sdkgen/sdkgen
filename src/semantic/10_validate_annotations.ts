import { AstNode, EnumValue, DescriptionAnnotation, Field, TypeDefinition, Operation, ThrowsAnnotation } from "../ast";
import { Visitor } from "./visitor";
import { SemanticError } from "./analyser";

export class ValidateAnnotationsVisitor extends Visitor {
    visit(node: AstNode) {
        if (node instanceof EnumValue) {
            for (const annotation of node.annotations) {
                if (annotation instanceof DescriptionAnnotation) {
                    // Ok
                } else {
                    throw new SemanticError(`Cannot have this type of annotation at ${annotation.location}`);
                }
            }
        } else if (node instanceof TypeDefinition) {
            for (const annotation of node.annotations) {
                if (annotation instanceof DescriptionAnnotation) {
                    // Ok
                } else {
                    throw new SemanticError(`Cannot have this type of annotation at ${annotation.location}`);
                }
            }
        } else if (node instanceof Field) {
            for (const annotation of node.annotations) {
                if (annotation instanceof DescriptionAnnotation) {
                    // Ok
                } else {
                    throw new SemanticError(`Cannot have this type of annotation at ${annotation.location}`);
                }
            }
        } else if (node instanceof Operation) {
            for (const annotation of node.annotations) {
                if (annotation instanceof DescriptionAnnotation) {
                    // Ok
                } else if (annotation instanceof ThrowsAnnotation) {
                    if (!this.root.errors.includes(annotation.error)) {
                        throw new SemanticError(`Unknown error type '${annotation.error}' at ${annotation.location}`);
                    }
                } else {
                    throw new SemanticError(`Cannot have this type of annotation at ${annotation.location}`);
                }
            }
        }
    }
}
