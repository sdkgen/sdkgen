import type { AstNode, AstRoot } from "../ast";
import {
  Type,
  ComplexType,
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

  canUseNameFromPath = true;

  typeDefinitionMap = new Map<string, TypeDefinition>();

  constructor(root: AstRoot) {
    super(root);

    for (const def of root.typeDefinitions) {
      this.typeDefinitionMap.set(def.name, def);
    }
  }

  private generateTypeName(type: Type): string {
    if (this.canUseNameFromPath) {
      return this.path.map(s => s[0].toUpperCase() + s.slice(1)).join("");
    }

    return this.generateStandaloneTypeName(type);
  }

  private generateStandaloneTypeName(type: Type): string {
    if (type instanceof PrimitiveType || type instanceof TypeReference) {
      return type.name[0].toUpperCase() + type.name.slice(1);
    } else if (type instanceof ArrayType) {
      return `${this.generateStandaloneTypeName(type.base)}Array`;
    } else if (type instanceof OptionalType) {
      return `${this.generateStandaloneTypeName(type.base)}Optional`;
    } else if (type instanceof UnionType) {
      return type.types.map(t => this.generateStandaloneTypeName(t)).join("Or");
    } else if (type instanceof StructType) {
      throw new SemanticError(`Can't have a literal struct type inside a union at ${type.location}. Give it a name.`);
    } else if (type instanceof EnumType) {
      throw new SemanticError(`Can't have a literal enum type inside a union at ${type.location}. Give it a name.`);
    }

    throw new Error(`BUG: generateStandaloneTypeName with ${type.constructor.name}`);
  }

  private validateAndSaveNodeName(node: Type | TypeDefinition) {
    const type = node instanceof Type ? node : node.type;
    const existing = this.typeDefinitionMap.get(type.name);

    if (existing && existing.type !== type && !existing.type.isEqual(type)) {
      throw new SemanticError(`Name '${type.name}' will collide between two types: ${type.location} and ${existing.location}`);
    }

    if (!existing) {
      const def = node instanceof TypeDefinition ? node : new TypeDefinition(type.name, type).atLocation(type.location);

      this.typeDefinitionMap.set(type.name, def);
      this.root.typeDefinitions.push(def);
    }
  }

  private makeReference(type: Type) {
    const ref = new TypeReference(type.name);

    ref.type = type;
    return ref;
  }

  visit(node: AstNode): void {
    if (node instanceof TypeDefinition) {
      this.path = [node.name];

      if (node.type instanceof ComplexType) {
        super.visit(node);
      } else {
        this.canUseNameFromPath = false;
        super.visit(node);
        this.canUseNameFromPath = true;
      }

      this.validateAndSaveNodeName(node);
    } else if (node instanceof ErrorNode) {
      this.path = [`${node.name}Data`];
      super.visit(node);
    } else if (node instanceof Operation) {
      this.path = [node.name];
      super.visit(node);

      if (node.returnType instanceof ComplexType) {
        node.returnType = this.makeReference(node.returnType);
      }
    } else if (node instanceof Field) {
      this.path.push(node.name);
      super.visit(node);
      this.path.pop();

      if (node.type instanceof ComplexType) {
        node.type = this.makeReference(node.type);
      }
    } else if (node instanceof ArrayType) {
      this.path.push("Element");
      super.visit(node);
      this.path.pop();

      if (node.base instanceof ComplexType) {
        node.base = this.makeReference(node.base);
      }
    } else if (node instanceof OptionalType) {
      super.visit(node);

      if (node.base instanceof ComplexType) {
        node.base = this.makeReference(node.base);
      }
    } else if (node instanceof StructType || node instanceof EnumType) {
      node.name = this.generateTypeName(node);
      this.validateAndSaveNodeName(node);
      super.visit(node);
    } else if (node instanceof UnionType) {
      if (this.canUseNameFromPath) {
        this.canUseNameFromPath = false;
        super.visit(node);
        this.canUseNameFromPath = true;
      } else {
        super.visit(node);
      }

      const typeMap = new Map<string, Type>(node.types.map(t => [this.generateStandaloneTypeName(t), t]));
      const typeNames = [...typeMap.keys()].sort((a, b) => a.localeCompare(b));

      if (node.types.length !== typeMap.size) {
        throw new SemanticError(`Union can't have repeated types at ${node.location}.`);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      node.types = typeNames.map(name => typeMap.get(name)!).map(type => (type instanceof ComplexType ? this.makeReference(type) : type));
      node.name = this.generateTypeName(node);
      this.validateAndSaveNodeName(node);
    } else {
      super.visit(node);
    }
  }
}
