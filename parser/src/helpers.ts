import type { AstRoot, Type, AstNode } from "./ast.js";
import { Visitor } from "./semantic/visitor.js";

class HasTypeVisitor extends Visitor {
  found = false;

  constructor(root: AstRoot, private type: typeof Type) {
    super(root);
  }

  visit(node: AstNode): void {
    if (node.constructor === this.type) {
      this.found = true;
    }

    super.visit(node);
  }
}

export function hasType(root: AstRoot, type: typeof Type) {
  const visitor = new HasTypeVisitor(root, type);

  visitor.process();
  return visitor.found;
}
