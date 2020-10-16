import { ArrayType, AstNode, AstRoot, Field, Operation, OptionalType, StructType, TypeDefinition } from "../ast";

export abstract class Visitor {
  constructor(protected root: AstRoot) {}

  // TODO: Use this dependency graph to avoid relying on explicit order

  // dependencies: Visitor[] = [];
  // processed = false;

  // dependOn(otherVisitor: Visitor) {
  //     if (otherVisitor.hasDependencyOn(this)) {
  //         throw new Error("Cyclic dependency between visitors.");
  //     }

  //     if (this.processed) {
  //         throw new Error("Visitor already executed. Can't add dependency.")
  //     }

  //     this.dependencies.push(otherVisitor);
  // }

  // hasDependencyOn(otherVisitor: Visitor): boolean {
  //     return this.dependencies.includes(otherVisitor) || this.dependencies.some(v => v.hasDependencyOn(otherVisitor));
  // }

  process() {
    // if (this.processed) return;
    // for (const dependency of this.dependencies)
    //     dependency.process(root);
    // this.processed = true;

    for (const typeDefinition of this.root.typeDefinitions) {
      this.visit(typeDefinition);
    }

    for (const operation of this.root.operations) {
      this.visit(operation);
    }
  }

  visit(node: AstNode) {
    if (node instanceof Operation) {
      for (const arg of node.args) {
        this.visit(arg);
      }
      this.visit(node.returnType);
    } else if (node instanceof Field || node instanceof TypeDefinition) {
      this.visit(node.type);
    } else if (node instanceof StructType) {
      for (const field of node.fields) {
        this.visit(field);
      }

      for (const spread of node.spreads) {
        this.visit(spread);
      }
    } else if (node instanceof ArrayType || node instanceof OptionalType) {
      this.visit(node.base);
    }
  }
}
