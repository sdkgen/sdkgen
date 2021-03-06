import type { AstNode } from "../ast";
import { UnionType, EnumType, StructType } from "../ast";
import { Visitor } from "./visitor";

export class CollectComplexTypesVisitor extends Visitor {
  visit(node: AstNode): void {
    super.visit(node);

    if (node instanceof StructType) {
      this.root.structTypes.push(node);
    } else if (node instanceof EnumType) {
      this.root.enumTypes.push(node);
    } else if (node instanceof UnionType) {
      this.root.unionTypes.push(node);
    }
  }
}
