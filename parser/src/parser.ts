/* eslint-disable no-sync */
/* eslint-disable no-loop-func */

import type { Annotation, Type } from "./ast";
import {
  ArgDescriptionAnnotation,
  ArrayType,
  AstRoot,
  DescriptionAnnotation,
  EnumType,
  EnumValue,
  ErrorNode,
  Field,
  FunctionOperation,
  HiddenAnnotation,
  OptionalType,
  StructType,
  ThrowsAnnotation,
  TypeDefinition,
  TypeReference,
  VoidPrimitiveType,
} from "./ast";
import { Lexer } from "./lexer";
import { parseRestAnnotation } from "./restparser";
import { analyse } from "./semantic/analyser";
import type { CurlyCloseSymbolToken, FalseKeywordToken, ImportKeywordToken, SpreadSymbolToken, Token, TrueKeywordToken } from "./token";
import {
  AnnotationToken,
  ArraySymbolToken,
  ColonSymbolToken,
  CommaSymbolToken,
  CurlyOpenSymbolToken,
  EnumKeywordToken,
  ErrorKeywordToken,
  ExclamationMarkSymbolToken,
  FnKeywordToken,
  IdentifierToken,
  OptionalSymbolToken,
  ParensCloseSymbolToken,
  ParensOpenSymbolToken,
  PrimitiveTypeToken,
  StringLiteralToken,
  TypeKeywordToken,
} from "./token";
import { primitiveToAstClass } from "./utils";

export class ParserError extends Error {}

interface MultiExpectMatcher<T> {
  ImportKeywordToken?(token: ImportKeywordToken): T;
  TypeKeywordToken?(token: TypeKeywordToken): T;
  FnKeywordToken?(token: FnKeywordToken): T;
  ErrorKeywordToken?(token: ErrorKeywordToken): T;
  IdentifierToken?(token: IdentifierToken): T;
  CurlyOpenSymbolToken?(token: CurlyOpenSymbolToken): T;
  EnumKeywordToken?(token: EnumKeywordToken): T;
  PrimitiveTypeToken?(token: PrimitiveTypeToken): T;
  ArraySymbolToken?(token: ArraySymbolToken): T;
  OptionalSymbolToken?(token: OptionalSymbolToken): T;
  CurlyCloseSymbolToken?(token: CurlyCloseSymbolToken): T;
  SpreadSymbolToken?(token: SpreadSymbolToken): T;
  TrueKeywordToken?(token: TrueKeywordToken): T;
  FalseKeywordToken?(token: FalseKeywordToken): T;
}

export class Parser {
  private readonly lexers: Lexer[];

  private token: Token | null = null;

  private annotations: Annotation[] = [];

  private warnings: string[] = [];

  private readFileSync: (path: string) => { toString(): string } = () => {
    throw "Not implemented";
  };

  constructor(source: Lexer | string) {
    try {
      // eslint-disable-next-line
      this.readFileSync = require("fs").readFileSync;
    } catch (e) {
      // do nothing
    }

    if (source instanceof Lexer) {
      this.lexers = [source];
    } else {
      this.lexers = [new Lexer(this.readFileSync(source).toString(), source)];
    }

    this.nextToken();
  }

  private nextToken() {
    while (this.lexers.length > 0) {
      this.token = this.lexers[this.lexers.length - 1].nextToken();
      if (this.token) {
        return;
      }

      this.lexers.pop();
    }
  }

  private multiExpect<T>(matcher: MultiExpectMatcher<T>) {
    if (!this.token) {
      throw new ParserError(
        `Expected ${Object.keys(matcher)
          .map(x => x.replace("Token", ""))
          .join(" or ")}, but found end of file`,
      );
    }

    const tokenName = this.token.constructor.name;

    if (tokenName in matcher) {
      return (matcher as Record<string, (token: Token) => T>)[tokenName](this.token);
    } else if (matcher.IdentifierToken) {
      const tokenAsIdent = this.token.maybeAsIdentifier();

      if (tokenAsIdent instanceof IdentifierToken) {
        return matcher.IdentifierToken(tokenAsIdent);
      }
    }

    throw new ParserError(
      `Expected ${Object.keys(matcher)
        .map(x => x.replace("Token", ""))
        .join(" or ")} at ${this.token.location}, but found ${this.token}`,
    );
  }

  private expect(x: typeof IdentifierToken): IdentifierToken;

  private expect(x: typeof StringLiteralToken): StringLiteralToken;

  private expect(type: Function): Token {
    if (this.token === null) {
      throw new ParserError(`Expected ${type.name.replace("Token", "")}, but found end of file`);
    } else if (this.token instanceof type) {
      return this.token;
    } else {
      if (type === IdentifierToken) {
        const tokenAsIdent = this.token.maybeAsIdentifier();

        if (tokenAsIdent instanceof IdentifierToken) {
          return tokenAsIdent;
        }
      }

      throw new ParserError(`Expected ${type.name.replace("Token", "")} at ${this.token.location}, but found ${this.token}`);
    }
  }

  parse(): AstRoot {
    const operations: FunctionOperation[] = [];
    const typeDefinition: TypeDefinition[] = [];
    const errors: ErrorNode[] = [];

    this.warnings = [];

    while (this.token) {
      this.acceptAnnotations();
      this.multiExpect({
        ErrorKeywordToken: () => {
          errors.push(this.parseError());
        },
        FnKeywordToken: () => {
          operations.push(this.parseOperation());
        },
        ImportKeywordToken: () => {
          this.checkCannotHaveAnnotationsHere();
          this.nextToken();
          const pathToken = this.expect(StringLiteralToken);
          const resolvedPath = pathToken.location.filename.replace(/[^/\\]+$/u, `${pathToken.value}.sdkgen`);

          this.lexers.push(new Lexer(this.readFileSync(resolvedPath).toString(), resolvedPath));
          this.nextToken();
        },
        TypeKeywordToken: () => {
          typeDefinition.push(this.parseTypeDefinition());
        },
      });
    }

    const ast = new AstRoot(typeDefinition, operations, errors);

    ast.warnings = this.warnings;
    analyse(ast);
    return ast;
  }

  private acceptAnnotations() {
    while (this.token instanceof AnnotationToken) {
      const words = this.token.value.split(" ");
      const body = this.token.value.slice(words[0].length).trim();

      switch (words[0]) {
        case "description":
          this.annotations.push(new DescriptionAnnotation(body).at(this.token));
          break;
        case "arg":
          this.annotations.push(
            new ArgDescriptionAnnotation(words[1], this.token.value.slice(words[0].length + 1 + words[1].length).trim()).at(this.token),
          );
          break;
        case "throws":
          this.annotations.push(new ThrowsAnnotation(body).at(this.token));
          break;
        case "rest":
          try {
            this.annotations.push(parseRestAnnotation(body).at(this.token));
          } catch (error: unknown) {
            throw new ParserError(`${error instanceof Error ? error.message : error} at ${this.token.location}`);
          }

          break;
        case "hidden":
          if (body !== "") {
            throw new ParserError(`@hidden annotation doesn't take any argument`);
          }

          this.annotations.push(new HiddenAnnotation().at(this.token));

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

    const nameToken = this.expect(IdentifierToken);
    const name = nameToken.value;

    if (!/[A-Z]/u.test(name[0])) {
      throw new ParserError(`The custom type name must start with an uppercase letter, but found '${JSON.stringify(name)}' at ${nameToken.location}`);
    }

    this.nextToken();

    const { annotations } = this;

    this.annotations = [];

    const type = this.parseType();
    const definitions = new TypeDefinition(name, type).at(typeToken);

    definitions.annotations = annotations;

    return definitions;
  }

  private parseError(): ErrorNode {
    this.checkCannotHaveAnnotationsHere();
    const errorToken = this.expect(ErrorKeywordToken);

    this.nextToken();

    const nameToken = this.expect(IdentifierToken);
    const name = nameToken.value;

    if (!/[A-Z]/u.test(name[0])) {
      throw new ParserError(`Error name must start with an uppercase letter, but found '${JSON.stringify(name)}' at ${nameToken.location}`);
    }

    this.nextToken();

    let type = new VoidPrimitiveType();

    if (
      this.token instanceof CurlyOpenSymbolToken ||
      this.token instanceof EnumKeywordToken ||
      this.token instanceof IdentifierToken ||
      this.token instanceof PrimitiveTypeToken
    ) {
      type = this.parseType();
    }

    return new ErrorNode(name, type).at(errorToken);
  }

  private parseOperation() {
    let { annotations } = this;

    this.annotations = [];

    this.expect(FnKeywordToken);

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

    for (const annotation of annotations) {
      if (annotation instanceof ArgDescriptionAnnotation) {
        const arg = args.find(x => x.name === annotation.argName);

        if (!arg) {
          throw new ParserError(`Argument '${annotation.argName}' not found, at ${annotation.location}`);
        }

        arg.annotations.push(new DescriptionAnnotation(annotation.text).atLocation(annotation.location));
      }
    }

    annotations = annotations.filter(ann => !(ann instanceof ArgDescriptionAnnotation));

    const parensCloseToken = this.expect(ParensCloseSymbolToken);

    this.nextToken();

    let returnType = new VoidPrimitiveType().at(parensCloseToken);

    if (this.token instanceof ColonSymbolToken) {
      this.nextToken();
      returnType = this.parseType();
    }

    const op = new FunctionOperation(name, args, returnType);

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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (!finished) {
      this.acceptAnnotations();
      this.multiExpect({
        CurlyCloseSymbolToken: () => {
          this.checkCannotHaveAnnotationsHere();
          this.nextToken();
          finished = true;
        },
        IdentifierToken: token => {
          const enumValue = new EnumValue(token.value).at(token);

          enumValue.annotations = this.annotations;
          this.annotations = [];
          enumType.values.push(enumValue);
          this.nextToken();

          if (!(this.token instanceof ParensOpenSymbolToken)) {
            return;
          }

          this.nextToken();
          const fieldNames = new Set<string>();
          const fields = [];

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          while (this.token && this.token.maybeAsIdentifier() instanceof IdentifierToken) {
            const field = this.parseField();

            // "tag" is a reserved name on tagged enum fields and can't be used.
            if (field.name === "tag") {
              field.name = "_tag";
            }

            if (fieldNames.has(field.name)) {
              throw new ParserError(`Cannot redeclare argument '${field.name}'`);
            }

            fieldNames.add(field.name);
            fields.push(field);

            if (this.token instanceof CommaSymbolToken) {
              this.nextToken();
            } else {
              break;
            }
          }

          enumValue.struct = new StructType(fields, []).atLocation(enumValue.location);

          this.expect(ParensCloseSymbolToken);
          this.nextToken();
        },
      });
    }

    return enumType;
  }

  private parseField(): Field {
    const nameToken = this.expect(IdentifierToken);

    this.nextToken();

    this.expect(ColonSymbolToken);
    this.nextToken();

    const { annotations } = this;

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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (!finished) {
      this.acceptAnnotations();
      this.multiExpect({
        CurlyCloseSymbolToken: () => {
          this.checkCannotHaveAnnotationsHere();
          this.nextToken();
          finished = true;
        },
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
          if (!/[A-Z]/u.test(identToken.value[0])) {
            throw new ParserError(`Expected a type but found '${JSON.stringify(identToken.value)}' at ${identToken.location}`);
          }

          spreads.push(new TypeReference(identToken.value).at(identToken));
        },
      });
    }

    return new StructType(fields, spreads).at(openingToken);
  }

  private parseType(): Type {
    this.checkCannotHaveAnnotationsHere();
    let result = this.multiExpect<Type>({
      CurlyOpenSymbolToken: () => this.parseStruct(),
      EnumKeywordToken: () => this.parseEnum(),
      IdentifierToken: token => {
        this.nextToken();
        if (!/[A-Z]/u.test(token.value[0])) {
          throw new ParserError(`Expected a type but found '${JSON.stringify(token.value)}' at ${token.location}`);
        }

        return new TypeReference(token.value).at(token);
      },
      PrimitiveTypeToken: token => {
        this.nextToken();
        const primitiveClass = primitiveToAstClass.get(token.value);

        if (primitiveClass) {
          return new primitiveClass().at(token);
        }

        throw new ParserError(`BUG! Should handle primitive ${token.value}`);
      },
    });

    while (this.token instanceof ArraySymbolToken || this.token instanceof OptionalSymbolToken) {
      this.multiExpect({
        ArraySymbolToken: token => (result = new ArrayType(result).at(token)),
        OptionalSymbolToken: token => (result = new OptionalType(result).at(token)),
      });
      this.nextToken();
    }

    return result;
  }
}
