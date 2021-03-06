import type { AstNode, Type } from "../ast";
import { OptionalType, ArrayType, UnionType } from "../ast";
import { SemanticError, Visitor } from "./visitor";

export class NormalizeUnionsVisitor extends Visitor {
  unionDepth = 0;

  private keyFor(type: Type): string {
    if (type instanceof UnionType) {
      return `(${type.types.map(x => this.keyFor(x)).join("|")})`;
    } else if (type instanceof ArrayType) {
      return `${this.keyFor(type.base)}[]`;
    } else if (type instanceof OptionalType) {
      return `${this.keyFor(type.base)}?`;
    }

    return (type.name as string | null) ?? JSON.stringify(type);
  }

  visit(node: AstNode): void {
    if (node instanceof UnionType) {
      this.unionDepth += 1;
      super.visit(node);
      this.unionDepth -= 1;

      const typeMap = new Map<string, Type>(node.types.map(t => [this.keyFor(t), t]));
      const typeNames = [...typeMap.keys()].sort((a, b) => a.localeCompare(b));

      if (node.types.length !== typeMap.size) {
        throw new SemanticError(`Union can't have repeated types at ${node.location}.`);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      node.types = typeNames.map(name => typeMap.get(name)!);
    } else {
      super.visit(node);
    }
  }
}
