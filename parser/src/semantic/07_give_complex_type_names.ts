import type { AstNode, Type } from "../ast";
import {
  ArrayType,
  OptionalType,
  TypeReference,
  PrimitiveType,
  UnionType,
  EnumType,
  ErrorNode,
  Field,
  Operation,
  StructType,
  TypeDefinition,
} from "../ast";
import { SemanticError, Visitor } from "./visitor";

export class GiveComplexTypeNamesVisitor extends Visitor {
  path: string[] = [];

  names = new Map<string, { type: Type; path: string[] }>();

  isInsideUnion = false;

  private generateTypeName(type: Type): string {
    if (!this.isInsideUnion) {
      return this.path.map(s => s[0].toUpperCase() + s.slice(1)).join("");
    }

    if (type instanceof PrimitiveType || type instanceof TypeReference) {
      return type.name;
    } else if (type instanceof ArrayType) {
      if (type.base instanceof UnionType) {
        return `_${this.generateTypeName(type.base)}_Array`;
      }

      return `${this.generateTypeName(type.base)}Array`;
    } else if (type instanceof OptionalType) {
      if (type.base instanceof UnionType) {
        return `_${this.generateTypeName(type.base)}_Optional`;
      }

      return `${this.generateTypeName(type.base)}Optional`;
    } else if (type instanceof UnionType) {
      return type.types.map(t => this.generateTypeName(t)).join("Or");
    } else if (type instanceof StructType) {
      throw new SemanticError(`Can't have a literal struct type inside a union at ${type.location}. Give it a name.`);
    } else if (type instanceof EnumType) {
      throw new SemanticError(`Can't have a literal enum type inside a union at ${type.location}. Give it a name.`);
    }

    throw new Error(`BUG: generateStandaloneTypeName with ${type.constructor.name}`);
  }

  private validateUniqueName(node: Type) {
    const previous = this.names.get(node.name);

    if (previous && JSON.stringify(previous.type) !== JSON.stringify(node)) {
      throw new SemanticError(
        `The name of the type '${this.path.join(".")}' at ${node.location} will conflict with '${previous.path.join(".")}' at ${
          previous.type.location
        }`,
      );
    }
  }

  private validateUniqueNameAndInsert(node: Type) {
    this.validateUniqueName(node);
    this.names.set(node.name, { path: [...this.path], type: node });
  }

  visit(node: AstNode): void {
    if (node instanceof TypeDefinition) {
      this.path = [node.name];

      this.validateUniqueName(node.type);

      super.visit(node);

      this.names.set(node.name, { path: [...this.path], type: node.type });
    } else if (node instanceof ErrorNode) {
      this.path = [`${node.name}Data`];
      super.visit(node);
    } else if (node instanceof Operation) {
      this.path = [node.name];
      super.visit(node);
    } else if (node instanceof Field) {
      this.path.push(node.name);
      super.visit(node);
      this.path.pop();
    } else if (node instanceof StructType || node instanceof EnumType) {
      node.name = this.generateTypeName(node);
      this.validateUniqueNameAndInsert(node);
      super.visit(node);
    } else if (node instanceof UnionType) {
      node.name = this.generateTypeName(node);
      this.validateUniqueNameAndInsert(node);

      if (this.isInsideUnion) {
        super.visit(node);
      } else {
        this.isInsideUnion = true;
        super.visit(node);
        this.isInsideUnion = false;
      }
    } else {
      super.visit(node);
    }
  }
}
