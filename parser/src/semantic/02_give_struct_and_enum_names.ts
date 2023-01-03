import type { AstNode } from "../ast.js";
import { EnumValue, FunctionOperation, EnumType, ErrorNode, Field, StructType, TypeDefinition } from "../ast.js";
import { Transformer } from "./transformer.js";
import { SemanticError } from "./visitor.js";

export class GiveStructAndEnumNamesTransformer extends Transformer {
  path: string[] = [];

  names = new Map<string, { type: StructType | EnumType; path: string[] }>();

  transform<T extends AstNode>(node: T): T {
    if (node instanceof TypeDefinition) {
      this.path = [node.name];
      return super.transform(node);
    } else if (node instanceof ErrorNode) {
      this.path = [`${node.name}Data`];
      return super.transform(node);
    } else if (node instanceof FunctionOperation) {
      this.path = [node.name];
      return super.transform(node);
    } else if (node instanceof Field) {
      try {
        this.path.push(node.name);
        return super.transform(node);
      } finally {
        this.path.pop();
      }
    } else if (node instanceof EnumValue) {
      try {
        this.path.push(node.value);
        return super.transform(node);
      } finally {
        this.path.pop();
      }
    } else if (node instanceof StructType || node instanceof EnumType) {
      node.name = this.path.map(s => s[0].toUpperCase() + s.slice(1)).join("");
      const previous = this.names.get(node.name);

      if (previous) {
        if (previous.type.constructor !== node.constructor || JSON.stringify(previous.type) !== JSON.stringify(node)) {
          throw new SemanticError(
            `The name of the type '${this.path.join(".")}' at ${node.location} will conflict with '${previous.path.join(".")}' at ${
              previous.type.location
            }`,
          );
        }

        return previous.type as unknown as T;
      }

      this.names.set(node.name, { path: [...this.path], type: node });
      return super.transform(node);
    } else {
      return super.transform(node);
    }
  }
}
