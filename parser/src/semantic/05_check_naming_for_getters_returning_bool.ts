import type { AstNode } from "../ast";
import { BoolPrimitiveType, GetOperation } from "../ast";
import { SemanticError, Visitor } from "./visitor";

export class CheckNamingForGettersReturningBoolVisitor extends Visitor {
  visit(node: AstNode): void {
    super.visit(node);

    if (node instanceof GetOperation) {
      const returnsBool = node.returnType instanceof BoolPrimitiveType;
      const hasBoolNaming = /^(?:is|has|can|may|should)/u.test(node.name) !== null;

      if (returnsBool && !hasBoolNaming) {
        throw new SemanticError(`Get operation '${node.name}' at ${node.location} returns bool but isn't named accordingly`);
      } else if (!returnsBool && hasBoolNaming) {
        throw new SemanticError(`Get operation '${node.name}' at ${node.location} doesn't return bool but its name suggest it does`);
      }
    }
  }
}
