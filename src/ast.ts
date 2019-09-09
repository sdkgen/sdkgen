import { Token, TokenLocation } from "./token";

export class AstRoot {
    structTypes: StructType[] = [];
    enumTypes: EnumType[] = [];

    constructor(
        public typeDefinitions: TypeDefinition[] = [],
        public operations: Operation[] = [],
        public options: Options = new Options,
        public errors: string[] = []
    ) {}
}

export abstract class AstNode {
    public location = new TokenLocation;
    private kind: string;

    constructor() {
        this.kind = this.constructor.name;
        Object.defineProperty(this, "location", { enumerable: false });
        Object.defineProperty(this, "name", { enumerable: false, writable: true });
    }

    at(token: Token): this {
        this.location = token.location;
        return this;
    }
}

export abstract class Type extends AstNode {
    abstract get name(): string;
}
export abstract class PrimitiveType extends Type {}
export class StringPrimitiveType extends PrimitiveType { name = "string"; }
export class IntPrimitiveType extends PrimitiveType { name = "int"; }
export class UIntPrimitiveType extends PrimitiveType { name = "uint"; }
export class FloatPrimitiveType extends PrimitiveType { name = "float"; }
export class DatePrimitiveType extends PrimitiveType { name = "date"; }
export class DateTimePrimitiveType extends PrimitiveType { name = "datetime"; }
export class BoolPrimitiveType extends PrimitiveType { name = "bool"; }
export class BytesPrimitiveType extends PrimitiveType { name = "bytes"; }
export class VoidPrimitiveType extends PrimitiveType { name = "void"; }
export class MoneyPrimitiveType extends PrimitiveType { name = "money"; }
export class CpfPrimitiveType extends PrimitiveType { name = "cpf"; }
export class CnpjPrimitiveType extends PrimitiveType { name = "cnpj"; }
export class EmailPrimitiveType extends PrimitiveType { name = "email"; }
export class PhonePrimitiveType extends PrimitiveType { name = "phone"; }
export class CepPrimitiveType extends PrimitiveType { name = "cep"; }
export class LatLngPrimitiveType extends PrimitiveType { name = "latlng"; }
export class UrlPrimitiveType extends PrimitiveType { name = "url"; }
export class UuidPrimitiveType extends PrimitiveType { name = "uuid"; }
export class HexPrimitiveType extends PrimitiveType { name = "hex"; }
export class Base64PrimitiveType extends PrimitiveType { name = "base64"; }
export class SafeHtmlPrimitiveType extends PrimitiveType { name = "safehtml"; }
export class XmlPrimitiveType extends PrimitiveType { name = "xml"; }
export class AnyPrimitiveType extends PrimitiveType { name = "any"; }

export class OptionalType extends Type {
    constructor(public base: Type) { super(); }
    get name() {
        return this.base.name + "?";
    }
}

export class ArrayType extends Type {
    constructor(public base: Type) { super(); }
    get name() {
        return this.base.name + "[]";
    }
}

export class EnumType extends Type {
    name!: string;
    constructor(public values: string[]) { super(); }
}

export class StructType extends Type {
    name!: string;
    constructor(public fields: Field[], public spreads: TypeReference[]) { super(); }
}

export class TypeDefinition extends AstNode {
    constructor(public name: string, public type: Type) { super(); }
}

export class TypeReference extends Type {
    type!: Type;
    constructor(public name: string) { super(); }
}

export class Options extends AstNode {
    constructor(
        public url = "",
        public useRethink = true,
        public strict = false,
        public syntheticDefaultImports = true,
        public retryRequest = true
    ) { super(); }
}

export class Field extends AstNode {
    constructor(
        public name: string,
        public type: Type,
        public secret = false
    ) { super(); }
}

export abstract class Operation extends AstNode {
    constructor(
        public name: string,
        public args: Field[],
        public returnType: Type
    ) { super(); }

    get prettyName() { return this.name; }
}

export class GetOperation extends Operation {
    get prettyName() { return "get" + this.name[0].toUpperCase() + this.name.slice(1); }
}

export class FunctionOperation extends Operation {}
