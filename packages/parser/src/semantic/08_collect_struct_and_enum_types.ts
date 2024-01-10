import { Visitor } from "./visitor";
import type { AstNode } from "../ast";
import { EnumType, StructType } from "../ast";

export class CollectStructAndEnumTypesVisitor extends Visitor {
  visited = new Set<AstNode>();

  visit(node: AstNode): void {
    super.visit(node);

    if (this.visited.has(node)) {
      return;
    }

    this.visited.add(node);

    if (node instanceof StructType) {
      this.root.structTypes.push(node);
    } else if (node instanceof EnumType) {
      this.root.enumTypes.push(node);
    }
  }
}
