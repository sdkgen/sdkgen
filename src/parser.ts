import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { ArrayType, AstRoot, Base64PrimitiveType, BoolPrimitiveType, BytesPrimitiveType, CepPrimitiveType, CnpjPrimitiveType, CpfPrimitiveType, DatePrimitiveType, DateTimePrimitiveType, EmailPrimitiveType, EnumType, Field, FloatPrimitiveType, FunctionOperation, GetOperation, HexPrimitiveType, IntPrimitiveType, LatLngPrimitiveType, MoneyPrimitiveType, Operation, OptionalType, Options, PhonePrimitiveType, SafeHtmlPrimitiveType, StringPrimitiveType, StructType, Type, TypeDefinition, TypeReference, UIntPrimitiveType, UrlPrimitiveType, UuidPrimitiveType, VoidPrimitiveType, XmlPrimitiveType, PrimitiveType, AnyPrimitiveType } from "./ast";
import { Lexer } from "./lexer";
import { ArraySymbolToken, ColonSymbolToken, CommaSymbolToken, CurlyCloseSymbolToken, CurlyOpenSymbolToken, EnumKeywordToken, EqualSymbolToken, ErrorKeywordToken, ExclamationMarkSymbolToken, FalseKeywordToken, FunctionKeywordToken, GetKeywordToken, GlobalOptionToken, IdentifierToken, ImportKeywordToken, OptionalSymbolToken, ParensCloseSymbolToken, ParensOpenSymbolToken, PrimitiveTypeToken, SpreadSymbolToken, StringLiteralToken, Token, TrueKeywordToken, TypeKeywordToken } from "./token";
import { analyse } from "./semantic/analyser";
import { astToJson } from "./json";

export class ParserError extends Error {}

interface MultiExpectMatcher {
    ImportKeywordToken?: (token: ImportKeywordToken) => any
    TypeKeywordToken?: (token: TypeKeywordToken) => any
    GetKeywordToken?: (token: GetKeywordToken) => any
    FunctionKeywordToken?: (token: FunctionKeywordToken) => any
    GlobalOptionToken?: (token: GlobalOptionToken) => any
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

export const primitiveToAstClass = new Map<string, any>();
primitiveToAstClass.set("string", StringPrimitiveType);
primitiveToAstClass.set("int", IntPrimitiveType);
primitiveToAstClass.set("uint", UIntPrimitiveType);
primitiveToAstClass.set("date", DatePrimitiveType);
primitiveToAstClass.set("datetime", DateTimePrimitiveType);
primitiveToAstClass.set("float", FloatPrimitiveType);
primitiveToAstClass.set("bool", BoolPrimitiveType);
primitiveToAstClass.set("bytes", BytesPrimitiveType);
primitiveToAstClass.set("money", MoneyPrimitiveType);
primitiveToAstClass.set("cpf", CpfPrimitiveType);
primitiveToAstClass.set("cnpj", CnpjPrimitiveType);
primitiveToAstClass.set("email", EmailPrimitiveType);
primitiveToAstClass.set("phone", PhonePrimitiveType);
primitiveToAstClass.set("cep", CepPrimitiveType);
primitiveToAstClass.set("latlng", LatLngPrimitiveType);
primitiveToAstClass.set("url", UrlPrimitiveType);
primitiveToAstClass.set("uuid", UuidPrimitiveType);
primitiveToAstClass.set("hex", HexPrimitiveType);
primitiveToAstClass.set("base64", Base64PrimitiveType);
primitiveToAstClass.set("safehtml", SafeHtmlPrimitiveType);
primitiveToAstClass.set("xml", XmlPrimitiveType);
primitiveToAstClass.set("any", AnyPrimitiveType);
primitiveToAstClass.set("void", VoidPrimitiveType);

export class Parser {
    private readonly lexers: Lexer[];
    private token: Token | null = null;

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
        const options = new Options;

        while (this.token) {
            this.multiExpect({
                ImportKeywordToken: token => {
                    this.nextToken();
                    const path = this.expect(StringLiteralToken).value;
                    const resolvedPath = resolve(dirname(this.currentFileName!), path + ".sdkgen");
                    this.lexers.push(new Lexer(readFileSync(resolvedPath).toString(), resolvedPath));
                    this.nextToken();
                },
                TypeKeywordToken: token => {
                    typeDefinition.push(this.parseTypeDefinition());
                },
                GetKeywordToken: token => {
                    operations.push(this.parseOperation());
                },
                FunctionKeywordToken: token => {
                    operations.push(this.parseOperation());
                },
                GlobalOptionToken: token => {
                    this.parseOption(options);
                },
                ErrorKeywordToken: token => {
                    this.nextToken();
                    errors.push(this.expect(IdentifierToken).value);
                    this.nextToken();
                },
            });
        }

        const ast = new AstRoot(typeDefinition, operations, options, errors);
        analyse(ast);
        return ast;
    }

    private parseTypeDefinition(): TypeDefinition {
        const typeToken = this.expect(TypeKeywordToken);
        this.nextToken();

        const name = this.expect(IdentifierToken).value;
        if (!name[0].match(/[A-Z]/)) {
            throw new ParserError(`The custom type name must start with an uppercase letter, but found '${JSON.stringify(name)}' at ${this.token!.location}`);
        }
        this.nextToken();

        const type = this.parseType();

        return new TypeDefinition(name, type).at(typeToken);
    }

    private parseOperation(): Operation {
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

        if (openingToken instanceof GetKeywordToken) {
            return new GetOperation(name, args, returnType);
        } else {
            return new FunctionOperation(name, args, returnType);
        }
    }

    private parseOption(options: Options) {
        const varToken = this.expect(GlobalOptionToken);
        this.nextToken();

        this.expect(EqualSymbolToken);
        this.nextToken();

        switch (varToken.value) {
            case "url":
                options.url = this.expect(StringLiteralToken).value;
                this.nextToken();
                break;
            case "useRethink":
                options.useRethink = this.multiExpect({TrueKeywordToken: () => true, FalseKeywordToken: () => false});
                this.nextToken();
                break;
            case "strict":
                options.strict = this.multiExpect({TrueKeywordToken: () => true, FalseKeywordToken: () => false});
                this.nextToken();
                break;
            case "syntheticDefaultImports":
                options.syntheticDefaultImports = this.multiExpect({TrueKeywordToken: () => true, FalseKeywordToken: () => false});
                this.nextToken();
                break;
            case "retryRequest":
                options.retryRequest = this.multiExpect({TrueKeywordToken: () => true, FalseKeywordToken: () => false});
                this.nextToken();
                break;
            default:
                throw new ParserError(`Unknown option $${varToken.value} at ${varToken.location}`);
        }
    }

    private parseEnum(): EnumType {
        const enumToken = this.expect(EnumKeywordToken);
        this.nextToken();

        this.expect(CurlyOpenSymbolToken);
        this.nextToken();

        const enumType = new EnumType([]).at(enumToken);

        let finished = false;
        while (!finished) {
            this.multiExpect({
                IdentifierToken: token => {
                    enumType.values.push(token.value);
                    this.nextToken();
                },
                CurlyCloseSymbolToken: () => {
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

        const type = this.parseType();
        const field = new Field(nameToken.value, type).at(nameToken);

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
                    this.nextToken();
                    const identToken = this.expect(IdentifierToken);
                    this.nextToken();
                    if (!identToken.value[0].match(/[A-Z]/)) {
                        throw new ParserError(`Expected a type but found '${JSON.stringify(identToken.value)}' at ${identToken.location}`);
                    }
                    spreads.push(new TypeReference(identToken.value).at(identToken));
                },
                CurlyCloseSymbolToken: () => {
                    this.nextToken();
                    finished = true;
                }
            });
        }

        return new StructType(fields, spreads).at(openingToken);
    }

    private parseType(): Type {
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
                if (primitiveToAstClass.has(token.value))
                    return (new (primitiveToAstClass.get(token.value)!)).at(token);
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
