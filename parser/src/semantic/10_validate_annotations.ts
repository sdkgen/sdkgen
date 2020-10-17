import {
  AstNode,
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
  IntPrimitiveType,
  MoneyPrimitiveType,
  Operation,
  OptionalType,
  RestAnnotation,
  StringPrimitiveType,
  ThrowsAnnotation,
  Type,
  TypeDefinition,
  TypeReference,
  UIntPrimitiveType,
  UuidPrimitiveType,
  VoidPrimitiveType,
} from "../ast";
import { SemanticError } from "./analyser";
import { Visitor } from "./visitor";

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
          }

          if (annotation.method === "GET" && node.returnType instanceof VoidPrimitiveType) {
            throw new SemanticError(`A GET rest endpoint must return something at ${annotation.location}`);
          }
        } else {
          throw new SemanticError(`Cannot have this type of annotation at ${annotation.location}`);
        }
      }
    }
  }
}
