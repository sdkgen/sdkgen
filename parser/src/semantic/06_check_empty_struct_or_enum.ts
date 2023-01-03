import type { AstNode } from "../ast.js";
import { EnumType, StructType } from "../ast.js";
import { SemanticError, Visitor } from "./visitor.js";

export class CheckEmptyStructOrEnumVisitor extends Visitor {
  visit(node: AstNode): void {
    super.visit(node);

    if (node instanceof EnumType) {
      if (node.values.length === 0) {
        throw new SemanticError(`Enum '${node.name}' at ${node.location} is empty`);
      }
    }

    if (node instanceof StructType) {
      if (node.fields.length === 0) {
        throw new SemanticError(`Struct '${node.name}' at ${node.location} is empty`);
      }
    }
  }
}
