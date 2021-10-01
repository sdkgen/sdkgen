import type { Token } from "./token";
import { TokenLocation } from "./token";
import type { DeepReadonly } from "./utils";

export abstract class AstNode {
  public location = new TokenLocation();

  constructor() {
    Object.defineProperty(this, "location", { enumerable: false });
  }

  at(token: Token): this {
    this.location = token.location;
    return this;
  }

  atLocation(location: TokenLocation): this {
    this.location = location;
    return this;
  }
}

export abstract class Type extends AstNode {
  abstract get name(): string;

  toJSON() {
    const { name: _name, ...rest } = { ...this };

    return rest;
  }

  abstract isEqual(other: Type): boolean;
}

export class ErrorNode extends AstNode {
  constructor(public name: string, public dataType: Type) {
    super();
  }
}
export abstract class Annotation extends AstNode {}

export class DescriptionAnnotation extends Annotation {
  constructor(public text: string) {
    super();
  }
}

export class ThrowsAnnotation extends Annotation {
  constructor(public error: string) {
    super();
  }
}

export class ArgDescriptionAnnotation extends Annotation {
  constructor(public argName: string, public text: string) {
    super();
  }
}

export class RestAnnotation extends Annotation {
  constructor(
    public readonly method: string,
    public readonly path: string,
    public readonly pathVariables: readonly string[],
    public readonly queryVariables: readonly string[],
    public readonly headers: ReadonlyMap<string, string>,
    public readonly bodyVariable: string | null,
  ) {
    super();
  }
}

export class HiddenAnnotation extends Annotation {}

export abstract class PrimitiveType extends Type {
  isEqual(other: Type) {
    return other instanceof this.constructor;
  }
}
export class StringPrimitiveType extends PrimitiveType {
  name = "string";
}
export class IntPrimitiveType extends PrimitiveType {
  name = "int";
}
export class UIntPrimitiveType extends PrimitiveType {
  name = "uint";
}
export class FloatPrimitiveType extends PrimitiveType {
  name = "float";
}
export class BigIntPrimitiveType extends PrimitiveType {
  name = "bigint";
}
export class DatePrimitiveType extends PrimitiveType {
  name = "date";
}
export class DateTimePrimitiveType extends PrimitiveType {
  name = "datetime";
}
export class BoolPrimitiveType extends PrimitiveType {
  name = "bool";
}
export class BytesPrimitiveType extends PrimitiveType {
  name = "bytes";
}
export class VoidPrimitiveType extends PrimitiveType {
  name = "void";
}
export class MoneyPrimitiveType extends PrimitiveType {
  name = "money";
}
export class CpfPrimitiveType extends PrimitiveType {
  name = "cpf";
}
export class CnpjPrimitiveType extends PrimitiveType {
  name = "cnpj";
}
export class EmailPrimitiveType extends PrimitiveType {
  name = "email";
}
export class UrlPrimitiveType extends PrimitiveType {
  name = "url";
}
export class UuidPrimitiveType extends PrimitiveType {
  name = "uuid";
}
export class HexPrimitiveType extends PrimitiveType {
  name = "hex";
}
export class HtmlPrimitiveType extends PrimitiveType {
  name = "html";
}
export class Base64PrimitiveType extends PrimitiveType {
  name = "base64";
}
export class XmlPrimitiveType extends PrimitiveType {
  name = "xml";
}
export class JsonPrimitiveType extends PrimitiveType {
  name = "json";
}

export class OptionalType extends Type {
  constructor(public base: Type) {
    super();
  }

  get name(): string {
    return `${this.base.name}?`;
  }

  isEqual(other: Type): boolean {
    return other instanceof OptionalType && this.base.isEqual(other.base);
  }
}

export class ArrayType extends Type {
  constructor(public base: Type) {
    super();
  }

  get name(): string {
    return `${this.base.name}[]`;
  }

  isEqual(other: Type): boolean {
    return other instanceof ArrayType && this.base.isEqual(other.base);
  }
}
export type AnnotationJson =
  | {
      type: "description";
      value: string;
    }
  | {
      type: "throws";
      value: string;
    }
  | {
      type: "hidden";
      value: null;
    }
  | {
      type: "rest";
      value: {
        bodyVariable: string | null;
        headers: ReadonlyArray<[string, string]>;
        method: string;
        path: string;
        pathVariables: readonly string[];
        queryVariables: readonly string[];
      };
    };

export function annotationToJson(ann: Annotation): AnnotationJson {
  if (ann instanceof DescriptionAnnotation) {
    return { type: "description", value: ann.text };
  } else if (ann instanceof ThrowsAnnotation) {
    return { type: "throws", value: ann.error };
  } else if (ann instanceof RestAnnotation) {
    return {
      type: "rest",
      value: {
        bodyVariable: ann.bodyVariable,
        headers: [...ann.headers.entries()].sort(([a], [b]) => a.localeCompare(b)),
        method: ann.method,
        path: ann.path,
        pathVariables: [...ann.pathVariables].sort((a, b) => a.localeCompare(b)),
        queryVariables: [...ann.queryVariables].sort((a, b) => a.localeCompare(b)),
      },
    };
  } else if (ann instanceof HiddenAnnotation) {
    return { type: "hidden", value: null };
  }

  throw new Error(`BUG: annotationToJson with ${ann.constructor.name}`);
}

export function annotationFromJson(json: AnnotationJson | DeepReadonly<AnnotationJson>): Annotation {
  switch (json.type) {
    case "description":
      return new DescriptionAnnotation(json.value);
    case "throws":
      return new ThrowsAnnotation(json.value);
    case "rest": {
      const { method, path, pathVariables, queryVariables, headers, bodyVariable } = json.value;

      return new RestAnnotation(method, path, pathVariables, queryVariables, new Map(headers), bodyVariable);
    }

    case "hidden":
      return new HiddenAnnotation();

    default:
      throw new Error(`BUG: annotationFromJson with ${(json as { type: string }).type}`);
  }
}

function areAnnotationsEqual(list1: Annotation[], list2: Annotation[]) {
  const json1 = JSON.stringify(list1.map(ann => JSON.stringify(annotationToJson(ann))).sort((a, b) => a.localeCompare(b)));
  const json2 = JSON.stringify(list2.map(ann => JSON.stringify(annotationToJson(ann))).sort((a, b) => a.localeCompare(b)));

  return json1 === json2;
}

export class EnumValue extends AstNode {
  annotations: Annotation[] = [];

  constructor(public value: string) {
    super();
  }

  isEqual(other: EnumValue): boolean {
    return other instanceof EnumValue && areAnnotationsEqual(this.annotations, other.annotations);
  }
}

export abstract class ComplexType extends Type {
  private _name?: string;

  get name() {
    const value = this._name;

    if (!value) {
      throw new Error(`BUG: This type didn't receive a name yet at ${this.location}`);
    }

    return value;
  }

  set name(value: string) {
    this._name = value;
  }
}

export class EnumType extends ComplexType {
  constructor(public values: EnumValue[]) {
    super();
  }

  isEqual(other: Type): boolean {
    if (!(other instanceof EnumType)) {
      return false;
    }

    const map = new Map<string, EnumValue>();

    for (const otherValue of other.values) {
      map.set(otherValue.value, otherValue);
    }

    for (const thisValue of this.values) {
      const otherValue = map.get(thisValue.value);

      if (!otherValue) {
        return false;
      }

      if (!thisValue.isEqual(otherValue)) {
        return false;
      }
    }

    return true;
  }
}

export class Field extends AstNode {
  annotations: Annotation[] = [];

  constructor(public name: string, public type: Type, public secret = false) {
    super();
  }

  isEqual(other: Field): boolean {
    return (
      other instanceof Field &&
      this.secret === other.secret &&
      this.type.isEqual(other.type) &&
      areAnnotationsEqual(this.annotations, other.annotations)
    );
  }
}

export class GenericType extends Type {
  constructor(public name: string) {
    super();
  }

  isEqual(other: Type): boolean {
    return other instanceof GenericType && this.name === other.name;
  }
}

export class TypeReference extends Type {
  private _type?: Type;

  get type() {
    const value = this._type;

    if (!value) {
      throw new Error(`BUG: This type reference wasn't resolved to a type yet at ${this.location}`);
    }

    return value;
  }

  set type(value: Type) {
    this._type = value;
  }

  constructor(public name: string) {
    super();
  }

  isEqual(other: Type): boolean {
    return other instanceof TypeReference && this.name === other.name;
  }
}

export class UnionType extends ComplexType {
  constructor(public types: Type[]) {
    super();
  }

  isEqual(other: Type): boolean {
    if (!(other instanceof UnionType)) {
      return false;
    }

    const myTypeNames = new Set(this.types.map(t => t.name));

    return other.types.length === myTypeNames.size && other.types.every(t => myTypeNames.has(t.name));
  }
}

export class StructType extends ComplexType {
  constructor(public fields: Field[], public spreads: TypeReference[]) {
    super();
  }

  isEqual(other: Type) {
    if (!(other instanceof StructType)) {
      return false;
    }

    const fieldMap1 = new Map(this.fields.map(f => [f.name, f]));
    const fieldMap2 = new Map(other.fields.map(f => [f.name, f]));

    if (fieldMap1.size !== fieldMap2.size || ![...fieldMap1.values()].every(f => fieldMap2.get(f.name)?.isEqual(f))) {
      return false;
    }

    const spreads1 = new Set(this.spreads.map(s => s.name));
    const spreads2 = new Set(other.spreads.map(s => s.name));

    if (spreads1.size !== spreads2.size || ![...spreads1.values()].every(s => spreads2.has(s))) {
      return false;
    }

    return true;
  }
}

export class TypeDefinition extends AstNode {
  annotations: Annotation[] = [];

  generics: Set<string> = new Set<string>();

  constructor(public name: string, public type: Type) {
    super();
  }
}

export abstract class Operation extends AstNode {
  annotations: Annotation[] = [];

  generics: Set<string> = new Set<string>();

  constructor(public name: string, public args: Field[], public returnType: Type) {
    super();
  }

  get prettyName(): string {
    return this.name;
  }
}

export class GetOperation extends Operation {
  get prettyName(): string {
    return this.returnType instanceof BoolPrimitiveType ? this.name : `get${this.name[0].toUpperCase()}${this.name.slice(1)}`;
  }
}

export class FunctionOperation extends Operation {}

export class AstRoot {
  structTypes: StructType[] = [];

  enumTypes: EnumType[] = [];

  unionTypes: UnionType[] = [];

  warnings: string[] = [];

  constructor(public typeDefinitions: TypeDefinition[] = [], public operations: Operation[] = [], public errors: ErrorNode[] = []) {}
}
