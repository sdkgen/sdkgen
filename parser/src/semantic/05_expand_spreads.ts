import { FunctionOperation, Field, StructType } from "../ast.js";
import type { AstNode, Spread } from "../ast.js";
import { SemanticError, Visitor } from "./visitor.js";

export class ExpandSpreadsVisitor extends Visitor {
  /*
   * Here we may visit the same struct multiple times
   * We must make sure we only process each one once
   */
  processed = new Set<StructType>();

  expandSpread(fields: Field[], fieldsAndSpreads: Array<Field | Spread>) {
    const fieldIndex = new Map<string, number>();

    for (const fieldOrSpread of fieldsAndSpreads) {
      let fieldsToAdd: Field[];

      if (fieldOrSpread instanceof Field) {
        fieldsToAdd = [fieldOrSpread];
      } else {
        const struct = fieldOrSpread.typeReference.type;

        if (!(struct instanceof StructType)) {
          throw new SemanticError(
            `A spread operator can't refer to something that is not a struct, in '${fieldOrSpread.typeReference.name}' at ${fieldOrSpread.location}.`,
          );
        }

        this.visit(struct); // Recursion!

        fieldsToAdd = struct.fields;
      }

      for (const field of fieldsToAdd) {
        const index = fieldIndex.get(field.name);

        if (index) {
          fields[index] = field;
        } else {
          fieldIndex.set(field.name, fields.length);
          fields.push(field);
        }
      }
    }
  }

  visit(node: AstNode): void {
    if (node instanceof StructType) {
      if (this.processed.has(node)) {
        return;
      }

      this.processed.add(node);
    }

    super.visit(node);

    if (node instanceof StructType) {
      this.expandSpread(node.fields, node.fieldsAndSpreads);
      node.fieldsAndSpreads = [];
    } else if (node instanceof FunctionOperation) {
      this.expandSpread(node.args, node.fieldsAndSpreads);
      node.fieldsAndSpreads = [];
    }
  }
}
