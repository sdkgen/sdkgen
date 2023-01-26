import { SemanticError, Visitor } from "./visitor";
import type { AstNode } from "../ast";
import { EnumType } from "../ast";

export class CheckDuplicatedMembersOnEnumVisitor extends Visitor {
  visit(node: AstNode): void {
    super.visit(node);

    if (node instanceof EnumType) {
      if (node.values.length !== new Set(node.values.map(x => x.value)).size) {
        throw new SemanticError(`Enum '${node.name}' at ${node.location} has duplicated members`);
      }
    }
  }
}
