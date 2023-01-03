import type { AstNode, AstRoot } from "../ast.js";
import { EnumValue, EnumType, Spread, FunctionOperation, ArrayType, ErrorNode, Field, OptionalType, StructType, TypeDefinition } from "../ast.js";

export class SemanticError extends Error {}

export abstract class Transformer {
  constructor(protected root: AstRoot) {}

  process(): void {
    this.root.errors = this.root.errors.map(x => this.transform(x));
    this.root.typeDefinitions = this.root.typeDefinitions.map(x => this.transform(x));
    this.root.operations = this.root.operations.map(x => this.transform(x));
  }

  transform<T extends AstNode>(node: T): T {
    if (node instanceof FunctionOperation) {
      node.args = node.args.map(x => this.transform(x));
      node.fieldsAndSpreads = node.fieldsAndSpreads.map(x => this.transform(x));
      node.returnType = this.transform(node.returnType);
    } else if (node instanceof Field || node instanceof TypeDefinition) {
      node.type = this.transform(node.type);
    } else if (node instanceof StructType) {
      node.fields = node.fields.map(x => this.transform(x));
      node.fieldsAndSpreads = node.fieldsAndSpreads.map(x => this.transform(x));
    } else if (node instanceof EnumType) {
      node.values = node.values.map(x => this.transform(x));
    } else if (node instanceof EnumValue) {
      if (node.struct) {
        node.struct = this.transform(node.struct);
      }
    } else if (node instanceof ArrayType || node instanceof OptionalType) {
      node.base = this.transform(node.base);
    } else if (node instanceof ErrorNode) {
      node.dataType = this.transform(node.dataType);
    } else if (node instanceof Spread) {
      node.typeReference = this.transform(node.typeReference);
    }

    return node;
  }
}
