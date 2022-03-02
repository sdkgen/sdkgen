import type { AstNode, Type } from "../ast";
import {
  FunctionOperation,
  Base64PrimitiveType,
  BigIntPrimitiveType,
  BoolPrimitiveType,
  CnpjPrimitiveType,
  CpfPrimitiveType,
  DatePrimitiveType,
  DateTimePrimitiveType,
  DescriptionAnnotation,
  EnumType,
  EnumValue,
  Field,
  FloatPrimitiveType,
  HexPrimitiveType,
  HiddenAnnotation,
  IntPrimitiveType,
  MoneyPrimitiveType,
  OptionalType,
  RestAnnotation,
  StringPrimitiveType,
  ThrowsAnnotation,
  TypeDefinition,
  TypeReference,
  UIntPrimitiveType,
  UuidPrimitiveType,
  VoidPrimitiveType,
} from "../ast";
import { SemanticError, Visitor } from "./visitor";

function isRestEncodable(type: Type) {
  return (
    type instanceof BoolPrimitiveType ||
    type instanceof IntPrimitiveType ||
    type instanceof UIntPrimitiveType ||
    type instanceof BigIntPrimitiveType ||
    type instanceof FloatPrimitiveType ||
    type instanceof StringPrimitiveType ||
    type instanceof DatePrimitiveType ||
    type instanceof DateTimePrimitiveType ||
    type instanceof MoneyPrimitiveType ||
    type instanceof CpfPrimitiveType ||
    type instanceof CnpjPrimitiveType ||
    type instanceof UuidPrimitiveType ||
    type instanceof HexPrimitiveType ||
    type instanceof Base64PrimitiveType ||
    type instanceof EnumType
  );
}

function extractRealType(type: Type): Type {
  return type instanceof TypeReference ? extractRealType(type.type) : type;
}

export class ValidateAnnotationsVisitor extends Visitor {
  visit(node: AstNode): void {
    if (node instanceof EnumValue) {
      for (const annotation of node.annotations) {
        if (annotation instanceof DescriptionAnnotation) {
          // Ok
        } else {
          throw new SemanticError(`Cannot have @${annotation.constructor.name.replace("Annotation", "").toLowerCase()} at ${annotation.location}`);
        }
      }
    } else if (node instanceof TypeDefinition) {
      for (const annotation of node.annotations) {
        if (annotation instanceof DescriptionAnnotation) {
          // Ok
        } else {
          throw new SemanticError(`Cannot have @${annotation.constructor.name.replace("Annotation", "").toLowerCase()} at ${annotation.location}`);
        }
      }
    } else if (node instanceof Field) {
      for (const annotation of node.annotations) {
        if (annotation instanceof DescriptionAnnotation) {
          // Ok
        } else {
          throw new SemanticError(`Cannot have @${annotation.constructor.name.replace("Annotation", "").toLowerCase()} at ${annotation.location}`);
        }
      }
    } else if (node instanceof FunctionOperation) {
      for (const annotation of node.annotations) {
        if (annotation instanceof DescriptionAnnotation) {
          // Ok
        } else if (annotation instanceof ThrowsAnnotation) {
          if (!this.root.errors.some(error => error.name === annotation.error)) {
            throw new SemanticError(`Unknown error type '${annotation.error}' at ${annotation.location}`);
          }
        } else if (annotation instanceof RestAnnotation) {
          const allVariables = [...annotation.pathVariables, ...annotation.queryVariables, ...annotation.headers.values()];

          if (allVariables.length !== new Set(allVariables).size) {
            throw new SemanticError(`Arguments must appear only once for rest annotation at ${annotation.location}`);
          }

          for (const name of allVariables) {
            const arg = node.args.find(x => x.name === name);

            if (!arg) {
              throw new SemanticError(`Argument '${name}' not found at ${annotation.location}`);
            }

            if (annotation.pathVariables.includes(name) && arg.type instanceof OptionalType) {
              throw new SemanticError(`The path argument '${name}' can't be nullable at ${annotation.location}`);
            }

            const baseType = arg.type instanceof OptionalType ? arg.type.base : arg.type;

            if (!isRestEncodable(extractRealType(baseType))) {
              throw new SemanticError(`Argument '${name}' can't have type '${arg.type.name}' for rest annotation at ${annotation.location}`);
            }
          }

          for (const arg of node.args) {
            if (!allVariables.includes(arg.name) && annotation.bodyVariable !== arg.name) {
              throw new SemanticError(`Argument '${arg.name}' is missing from the rest annotation at ${annotation.location}`);
            }

            const queryAndPathVariables = [...annotation.pathVariables, ...annotation.queryVariables];

            if (annotation.method === "GET" && queryAndPathVariables.includes(arg.name) && arg.secret) {
              throw new SemanticError(
                `Argument marked as secret cannot be used in the path or query parts of a GET endpoint at ${annotation.location}`,
              );
            }
          }

          if (annotation.method === "GET" && node.returnType instanceof VoidPrimitiveType) {
            throw new SemanticError(`A GET rest endpoint must return something at ${annotation.location}`);
          }
        } else if (annotation instanceof HiddenAnnotation) {
          // Ok
        } else {
          throw new SemanticError(`Cannot have @${annotation.constructor.name.replace("Annotation", "").toLowerCase()} at ${annotation.location}`);
        }
      }
    }
  }
}
