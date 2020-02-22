import {
    AstNode,
    Base64PrimitiveType,
    BoolPrimitiveType,
    CepPrimitiveType,
    CnpjPrimitiveType,
    CpfPrimitiveType,
    DatePrimitiveType,
    DateTimePrimitiveType,
    DescriptionAnnotation,
    EnumValue,
    Field,
    FloatPrimitiveType,
    HexPrimitiveType,
    IntPrimitiveType,
    MoneyPrimitiveType,
    Operation,
    OptionalType,
    RestAnnotation,
    StringPrimitiveType,
    ThrowsAnnotation,
    TypeDefinition,
    UIntPrimitiveType,
    UuidPrimitiveType,
} from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

const REST_ENCODABLE_TYPES: Function[] = [
    BoolPrimitiveType,
    IntPrimitiveType,
    UIntPrimitiveType,
    FloatPrimitiveType,
    StringPrimitiveType,
    DatePrimitiveType,
    DateTimePrimitiveType,
    MoneyPrimitiveType,
    CpfPrimitiveType,
    CnpjPrimitiveType,
    CepPrimitiveType,
    UuidPrimitiveType,
    HexPrimitiveType,
    Base64PrimitiveType,
];

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
                } else if (annotation instanceof RestAnnotation) {
                    const allVariables = [...annotation.pathVariables, ...annotation.queryVariables, ...annotation.headers.values()];
                    if (allVariables.length !== new Set(allVariables).size) {
                        throw new SemanticError(`Arguments must appear only once for rest annotation at ${annotation.location}`);
                    }

                    for (const name of allVariables) {
                        const arg = node.args.find(arg => arg.name === name);
                        if (!arg) {
                            throw new SemanticError(`Argument '${name}' not found at ${annotation.location}`);
                        }

                        if (
                            !REST_ENCODABLE_TYPES.includes(arg.type.constructor) &&
                            !(
                                (annotation.queryVariables.includes(name) || [...annotation.headers.values()].includes(name)) &&
                                arg.type instanceof OptionalType &&
                                REST_ENCODABLE_TYPES.includes(arg.type.base.constructor)
                            )
                        ) {
                            throw new SemanticError(`Argument '${name}' can't have this type for rest annotation at ${annotation.location}`);
                        }
                    }

                    for (const arg of node.args) {
                        if (!allVariables.includes(arg.name) && annotation.bodyVariable !== arg.name) {
                            throw new SemanticError(`Argument '${name}' should be present in the rest annotation at ${annotation.location}`);
                        }
                    }
                } else {
                    throw new SemanticError(`Cannot have this type of annotation at ${annotation.location}`);
                }
            }
        }
    }
}
