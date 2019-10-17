import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { Annotation, ArgDescriptionAnnotation, ArrayType, AstRoot, DescriptionAnnotation, EnumType, EnumValue, Field, FunctionOperation, GetOperation, Operation, OptionalType, StructType, Type, TypeDefinition, TypeReference, VoidPrimitiveType } from "./ast";
import { Lexer } from "./lexer";
import { analyse } from "./semantic/analyser";
import { AnnotationToken, ArraySymbolToken, ColonSymbolToken, CommaSymbolToken, CurlyCloseSymbolToken, CurlyOpenSymbolToken, EnumKeywordToken, ErrorKeywordToken, ExclamationMarkSymbolToken, FalseKeywordToken, FunctionKeywordToken, GetKeywordToken, IdentifierToken, ImportKeywordToken, OptionalSymbolToken, ParensCloseSymbolToken, ParensOpenSymbolToken, PrimitiveTypeToken, SpreadSymbolToken, StringLiteralToken, Token, TrueKeywordToken, TypeKeywordToken } from "./token";
import { primitiveToAstClass } from "./utils";

export class ParserError extends Error {}

interface MultiExpectMatcher {
    ImportKeywordToken?: (token: ImportKeywordToken) => any
    TypeKeywordToken?: (token: TypeKeywordToken) => any
    GetKeywordToken?: (token: GetKeywordToken) => any
    FunctionKeywordToken?: (token: FunctionKeywordToken) => any
    ErrorKeywordToken?: (token: ErrorKeywordToken) => any
    IdentifierToken?: (token: IdentifierToken) => any
    CurlyOpenSymbolToken?: (token: CurlyOpenSymbolToken) => any
    EnumKeywordToken?: (token: EnumKeywordToken) => any
    PrimitiveTypeToken?: (token: PrimitiveTypeToken) => any
    ArraySymbolToken?: (token: ArraySymbolToken) => any
    OptionalSymbolToken?: (token: OptionalSymbolToken) => any
    CurlyCloseSymbolToken?: (token: CurlyCloseSymbolToken) => any
    SpreadSymbolToken?: (token: SpreadSymbolToken) => any
    TrueKeywordToken?: (token: TrueKeywordToken) => any
    FalseKeywordToken?: (token: FalseKeywordToken) => any
}

export class Parser {
    private readonly lexers: Lexer[];
    private token: Token | null = null;
    private annotations: Annotation[] = [];

    constructor(source: Lexer | string) {
        if (!(source instanceof Lexer)) {
            source = new Lexer(readFileSync(source).toString(), source);
        }
        this.lexers = [source];
        this.nextToken();
    }

    private nextToken() {
        while (this.lexers.length > 0) {
            this.token = this.lexers[this.lexers.length - 1].nextToken();
            if (this.token) {
                return;
            } else {
                this.lexers.pop();
            }
        }
    }

    private get currentFileName() {
        return this.token === null ? null : this.token.location.filename;
    }

    private multiExpect(matcher: MultiExpectMatcher) {
        if (!this.token) {
            throw new ParserError(`Expected ${Object.keys(matcher).map(x => x.replace("Token", "")).join(" or ")}, but found end of file`);
        }

        const tokenName = (this.token.constructor as any).name;

        if (tokenName in matcher) {
            return (matcher as any)[tokenName](this.token);
        } else if ("IdentifierToken" in matcher) {
            const tokenAsIdent = this.token.maybeAsIdentifier();
            if (tokenAsIdent instanceof IdentifierToken) {
                return matcher["IdentifierToken"]!(tokenAsIdent);
            }
        }

        throw new ParserError(`Expected ${Object.keys(matcher).map(x => x.replace("Token", "")).join(" or ")} at ${this.token.location}, but found ${this.token}`);
    }

    private expect(x: typeof IdentifierToken): IdentifierToken;
    private expect(x: typeof StringLiteralToken): StringLiteralToken;
    private expect(type: any): Token {
        if (this.token === null) {
            throw new ParserError(`Expected ${(type as any).name.replace("Token", "")}, but found end of file`);
        } else if (this.token instanceof type) {
            return this.token;
        } else {
            if (type === IdentifierToken) {
                const tokenAsIdent = this.token.maybeAsIdentifier();
                if (tokenAsIdent instanceof IdentifierToken) {
                    return tokenAsIdent;
                }
            }
            throw new ParserError(`Expected ${(type as any).name.replace("Token", "")} at ${this.token.location}, but found ${this.token}`);
        }
    }

    parse() {
        const operations: Operation[] = [];
        const typeDefinition: TypeDefinition[] = [];
        const errors: string[] = [];

        while (this.token) {
            this.acceptAnnotations();
            this.multiExpect({
                ImportKeywordToken: () => {
                    this.checkCannotHaveAnnotationsHere();
                    this.nextToken();
                    const path = this.expect(StringLiteralToken).value;
                    const resolvedPath = resolve(dirname(this.currentFileName!), path + ".sdkgen");
                    this.lexers.push(new Lexer(readFileSync(resolvedPath).toString(), resolvedPath));
                    this.nextToken();
                },
                TypeKeywordToken: () => {
                    typeDefinition.push(this.parseTypeDefinition());
                },
                GetKeywordToken: () => {
                    operations.push(this.parseOperation());
                },
                FunctionKeywordToken: () => {
                    operations.push(this.parseOperation());
                },
                ErrorKeywordToken: () => {
                    this.checkCannotHaveAnnotationsHere();
                    this.nextToken();
                    errors.push(this.expect(IdentifierToken).value);
                    this.nextToken();
                },
            });
        }

        const ast = new AstRoot(typeDefinition, operations, errors);
        analyse(ast);
        return ast;
    }

    private acceptAnnotations() {
        while (this.token instanceof AnnotationToken) {
            const words = this.token.value.split(" ");
            switch (words[0]) {
                case "description":
                    this.annotations.push(new DescriptionAnnotation(this.token.value.slice(words[0].length).trim()).at(this.token));
                    break;
                case "arg":
                    this.annotations.push(new ArgDescriptionAnnotation(words[1], this.token.value.slice(words[0].length + 1 + words[1].length).trim()).at(this.token));
                    break;
                default:
                    throw new ParserError(`Unknown annotation '${words[0]}' at ${this.token.location}`);
            }
            this.nextToken();
        }
    }

    private checkCannotHaveAnnotationsHere() {
        if (this.annotations.length > 0) {
            throw new ParserError(`Cannot have annotations at ${this.annotations[0].location}`);
        }
    }

    private parseTypeDefinition(): TypeDefinition {
        const typeToken = this.expect(TypeKeywordToken);
        this.nextToken();

        const name = this.expect(IdentifierToken).value;
        if (!name[0].match(/[A-Z]/)) {
            throw new ParserError(`The custom type name must start with an uppercase letter, but found '${JSON.stringify(name)}' at ${this.token!.location}`);
        }
        this.nextToken();

        const annotations = this.annotations;
        this.annotations = [];

        const type = this.parseType();
        const definitions = new TypeDefinition(name, type).at(typeToken);
        definitions.annotations = annotations;

        return definitions;
    }

    private parseOperation(): Operation {
        const annotations = this.annotations;
        this.annotations = [];

        const openingToken: GetKeywordToken | FunctionKeywordToken = this.multiExpect({
            GetKeywordToken: token => token,
            FunctionKeywordToken: token => token
        });
        this.nextToken();

        const name = this.expect(IdentifierToken).value;
        this.nextToken();

        this.expect(ParensOpenSymbolToken);
        this.nextToken();

        const argNames = new Set<string>();
        const args: Field[] = [];

        while (this.token && this.token.maybeAsIdentifier() instanceof IdentifierToken) {
            const field = this.parseField();
            if (argNames.has(field.name)) {
                throw new ParserError(`Cannot redeclare argument '${field.name}'`);
            }
            argNames.add(field.name);
            args.push(field);

            if (this.token instanceof CommaSymbolToken) {
                this.nextToken();
            } else {
                break;
            }
        }

        const parensCloseToken = this.expect(ParensCloseSymbolToken);
        this.nextToken();

        let returnType = new VoidPrimitiveType().at(parensCloseToken);
        if (this.token instanceof ColonSymbolToken) {
            this.nextToken();
            returnType = this.parseType();
        }

        const op = openingToken instanceof GetKeywordToken ?
            new GetOperation(name, args, returnType) :
            new FunctionOperation(name, args, returnType);

        op.annotations = annotations;

        return op;
    }

    private parseEnum(): EnumType {
        this.checkCannotHaveAnnotationsHere();
        const enumToken = this.expect(EnumKeywordToken);
        this.nextToken();

        this.expect(CurlyOpenSymbolToken);
        this.nextToken();

        const enumType = new EnumType([]).at(enumToken);

        let finished = false;
        while (!finished) {
            this.acceptAnnotations();
            this.multiExpect({
                IdentifierToken: token => {
                    const enumValue = new EnumValue(token.value).at(token);
                    enumValue.annotations = this.annotations;
                    this.annotations = [];
                    enumType.values.push(enumValue);
                    this.nextToken();
                },
                CurlyCloseSymbolToken: () => {
                    this.checkCannotHaveAnnotationsHere();
                    this.nextToken();
                    finished = true;
                }
            });
        }

        return enumType;
    }

    private parseField(): Field {
        const nameToken = this.expect(IdentifierToken);
        this.nextToken();

        this.expect(ColonSymbolToken);
        this.nextToken();

        const annotations = this.annotations;
        this.annotations = [];

        const type = this.parseType();
        const field = new Field(nameToken.value, type).at(nameToken);
        field.annotations = annotations;

        while (this.token instanceof ExclamationMarkSymbolToken) {
            this.nextToken();
            switch (this.expect(IdentifierToken).value) {
                case "secret":
                    field.secret = true;
                    break;
                default:
                    throw new ParserError(`Unknown field mark !${this.token.value} at ${this.token.location}`);
            }
            this.nextToken();
        }

        return field;
    }

    private parseStruct(): StructType {
        const openingToken = this.expect(CurlyOpenSymbolToken);
        this.nextToken();

        const fields: Field[] = [];
        const spreads: TypeReference[] = [];
        const fieldNames = new Set<string>();

        let finished = false;
        while (!finished) {
            this.acceptAnnotations();
            this.multiExpect({
                IdentifierToken: () => {
                    const field = this.parseField();
                    if (fieldNames.has(field.name)) {
                        throw new ParserError(`Cannot redeclare field '${field.name}'`);
                    }
                    fieldNames.add(field.name);
                    fields.push(field);
                },
                SpreadSymbolToken: () => {
                    this.checkCannotHaveAnnotationsHere();
                    this.nextToken();
                    const identToken = this.expect(IdentifierToken);
                    this.nextToken();
                    if (!identToken.value[0].match(/[A-Z]/)) {
                        throw new ParserError(`Expected a type but found '${JSON.stringify(identToken.value)}' at ${identToken.location}`);
                    }
                    spreads.push(new TypeReference(identToken.value).at(identToken));
                },
                CurlyCloseSymbolToken: () => {
                    this.checkCannotHaveAnnotationsHere();
                    this.nextToken();
                    finished = true;
                }
            });
        }

        return new StructType(fields, spreads).at(openingToken);
    }

    private parseType(): Type {
        this.checkCannotHaveAnnotationsHere();
        let result = this.multiExpect({
            CurlyOpenSymbolToken: () => this.parseStruct(),
            EnumKeywordToken: () => this.parseEnum(),
            IdentifierToken: token => {
                this.nextToken();
                if (!token.value[0].match(/[A-Z]/)) {
                    throw new ParserError(`Expected a type but found '${JSON.stringify(token.value)}' at ${token.location}`);
                }
                return new TypeReference(token.value).at(token);
            },
            PrimitiveTypeToken: token => {
                this.nextToken();
                const primitiveClass = primitiveToAstClass.get(token.value);
                if (primitiveClass)
                    return new primitiveClass().at(token);
                else
                    throw new ParserError(`BUG! Should handle primitive ${token.value}`);
            }
        });

        while (this.token instanceof ArraySymbolToken || this.token instanceof OptionalSymbolToken) {
            this.multiExpect({
                ArraySymbolToken: token => result = new ArrayType(result).at(token),
                OptionalSymbolToken: token => result = new OptionalType(result).at(token)
            });
            this.nextToken();
        }

        return result;
    }
}
