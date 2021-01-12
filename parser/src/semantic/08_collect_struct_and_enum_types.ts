import type { AstNode } from "../ast";
import { EnumType, StructType } from "../ast";
import { Visitor } from "./visitor";

export class CollectStructAndEnumTypesVisitor extends Visitor {
  visit(node: AstNode): void {
    super.visit(node);

    if (node instanceof StructType) {
      this.root.structTypes.push(node);
    } else if (node instanceof EnumType) {
      this.root.enumTypes.push(node);
    }
  }
}
