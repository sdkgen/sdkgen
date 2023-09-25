import type { Token } from "./token";
import { TokenLocation } from "./token";

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

  toJSON(): unknown {
    const { name: _name, ...rest } = { ...this };

    return rest;
  }
}

export class ErrorNode extends AstNode {
  annotations: Annotation[] = [];

  constructor(
    public name: string,
    public dataType: Type,
  ) {
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
  constructor(
    public argName: string,
    public text: string,
  ) {
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

export class StatusCodeAnnotation extends Annotation {
  constructor(public statusCode: number) {
    super();
  }
}

export abstract class PrimitiveType extends Type {
  toJSON() {
    return this.name;
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
export class DecimalPrimitiveType extends PrimitiveType {
  name = "decimal";
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
}

export class ArrayType extends Type {
  constructor(public base: Type) {
    super();
  }

  get name(): string {
    return `${this.base.name}[]`;
  }
}

export class EnumValue extends AstNode {
  annotations: Annotation[] = [];

  struct: StructType | null = null;

  constructor(public value: string) {
    super();
  }
}

export class EnumType extends Type {
  name!: string;

  constructor(public values: EnumValue[]) {
    super();
  }

  get hasStructValues() {
    return this.values.some(v => v.struct !== null);
  }
}

export class Field extends AstNode {
  annotations: Annotation[] = [];

  constructor(
    public name: string,
    public type: Type,
    public secret = false,
  ) {
    super();
  }
}

export class Spread extends AstNode {
  constructor(public typeReference: TypeReference) {
    super();
  }
}

export class TypeReference extends Type {
  type!: Type;

  constructor(public name: string) {
    super();
  }
}

export class StructType extends Type {
  name!: string;

  fields: Field[] = [];

  constructor(public fieldsAndSpreads: Array<Field | Spread>) {
    super();
  }
}

export class TypeDefinition extends AstNode {
  annotations: Annotation[] = [];

  constructor(
    public name: string,
    public type: Type,
  ) {
    super();
  }
}

export class FunctionOperation extends AstNode {
  annotations: Annotation[] = [];

  args: Field[] = [];

  constructor(
    public name: string,
    public fieldsAndSpreads: Array<Field | Spread>,
    public returnType: Type,
  ) {
    super();
  }
}

export class AstRoot {
  structTypes: StructType[] = [];

  enumTypes: EnumType[] = [];

  warnings: string[] = [];

  constructor(
    public typeDefinitions: TypeDefinition[] = [],
    public operations: FunctionOperation[] = [],
    public errors: ErrorNode[] = [],
  ) {}
}
