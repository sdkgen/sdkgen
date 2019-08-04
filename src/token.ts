export class TokenLocation {
    public filename = "?";
    public line = 0;
    public column = 0;

    toString() {
        return `${this.filename}:${this.line}:${this.column}`;
    }
}

export class Token {
    public location = new TokenLocation

    constructor(public value: string = "") { }

    maybeAsIdentifier(): Token {
        return this;
    }

    toString() {
        const name = (this.constructor as any).name.replace("Token", "");
        return this.value === "" ? name : `${name}(${JSON.stringify(this.value)})`;
    }

    isEqual(other: Token) {
        return this.constructor === other.constructor && this.value === other.value;
    }
}

export class IdentifierToken extends Token { }
export class GlobalOptionToken extends Token { }
export class StringLiteralToken extends Token { }
export class EqualSymbolToken extends Token { }
export class ExclamationMarkSymbolToken extends Token { }
export class CurlyOpenSymbolToken extends Token { }
export class CurlyCloseSymbolToken extends Token { }
export class ParensOpenSymbolToken extends Token { }
export class ParensCloseSymbolToken extends Token { }
export class ColonSymbolToken extends Token { }
export class OptionalSymbolToken extends Token { }
export class ArraySymbolToken extends Token { }
export class CommaSymbolToken extends Token { }
export class SpreadSymbolToken extends Token { }

export class ImportKeywordToken extends Token {
    maybeAsIdentifier() {
        return new IdentifierToken("import");
    }
}

export class TypeKeywordToken extends Token {
    maybeAsIdentifier() {
        return new IdentifierToken("type");
    }
}

export class EnumKeywordToken extends Token {
    maybeAsIdentifier() {
        return new IdentifierToken("enum");
    }
}

export class GetKeywordToken extends Token {
    maybeAsIdentifier() {
        return new IdentifierToken("get");
    }
}

export class FunctionKeywordToken extends Token {
    maybeAsIdentifier() {
        return new IdentifierToken("function");
    }
}

export class ErrorKeywordToken extends Token {
    maybeAsIdentifier() {
        return new IdentifierToken("error");
    }
}

export class TrueKeywordToken extends Token {
    maybeAsIdentifier() {
        return new IdentifierToken("true");
    }
}

export class FalseKeywordToken extends Token {
    maybeAsIdentifier() {
        return new IdentifierToken("false");
    }
}

export class PrimitiveTypeToken extends Token {
    maybeAsIdentifier() {
        return new IdentifierToken(this.value);
    }
}
