import { Lexer } from "../src/lexer";
import type { Token } from "../src/token";
import {
  AnnotationToken,
  ArraySymbolToken,
  ColonSymbolToken,
  CommaSymbolToken,
  CurlyCloseSymbolToken,
  CurlyOpenSymbolToken,
  EnumKeywordToken,
  EqualSymbolToken,
  ErrorKeywordToken,
  ExclamationMarkSymbolToken,
  FnKeywordToken,
  IdentifierToken,
  ImportKeywordToken,
  OptionalSymbolToken,
  ParensCloseSymbolToken,
  ParensOpenSymbolToken,
  PrimitiveTypeToken,
  SpreadSymbolToken,
  StringLiteralToken,
  TypeKeywordToken,
} from "../src/token";

function itLexes(source: string, expectedTokens: Token[]) {
  test(`lexes ${JSON.stringify(source)} as [${expectedTokens.join(", ")}]`, () => {
    const lexer = new Lexer(source);

    let tokens: Token[] = [];

    for (;;) {
      const token = lexer.nextToken();

      if (!token) {
        break;
      }

      tokens.push(token);
    }

    tokens = tokens.map((token, i) => (expectedTokens[i] instanceof IdentifierToken ? token.maybeAsIdentifier() : token));

    expect(tokens.join(", ")).toEqual(expectedTokens.join(", "));
  });
}

function itDoesntLex(source: string, message: string) {
  test(`doesn't lex ${JSON.stringify(source)}`, () => {
    const lexer = new Lexer(source);

    expect(() => {
      while (lexer.nextToken()) {
        //
      }
    }).toThrowError(message);
  });
}

describe(Lexer, () => {
  itLexes("", []);

  itLexes("type", [new TypeKeywordToken()]);

  itDoesntLex("23", 'Unexpected character "2" at -:1:1');

  itDoesntLex("2a", 'Unexpected character "2" at -:1:1');

  itLexes("type2", [new IdentifierToken("type2")]);

  itLexes("aaa", [new IdentifierToken("aaa")]);

  itLexes("...aaa", [new SpreadSymbolToken(), new IdentifierToken("aaa")]);

  itLexes("a b c", [new IdentifierToken("a"), new IdentifierToken("b"), new IdentifierToken("c")]);

  itLexes("aa_bb", [new IdentifierToken("aa_bb")]);

  itLexes("type type", [new TypeKeywordToken(), new TypeKeywordToken()]);

  itLexes("enum", [new EnumKeywordToken()]);

  itLexes("error", [new ErrorKeywordToken()]);

  itLexes("import", [new ImportKeywordToken()]);

  itLexes("Get", [new IdentifierToken("Get")]);

  itLexes("fn", [new FnKeywordToken()]);

  itLexes("enuma", [new IdentifierToken("enuma")]);

  itLexes("errorh", [new IdentifierToken("errorh")]);

  for (const kw of ["enum", "type", "error", "import", "get", "function", "fn", "true", "false"]) {
    itLexes(kw, [new IdentifierToken(kw)]);
  }

  for (const primitive of Lexer.PRIMITIVES) {
    itLexes(primitive, [new PrimitiveTypeToken(primitive)]);

    itLexes(primitive, [new IdentifierToken(primitive)]);

    itLexes(`${primitive}a`, [new IdentifierToken(`${primitive}a`)]);
  }

  itLexes("err", [new IdentifierToken("err")]);

  itLexes("{", [new CurlyOpenSymbolToken()]);

  itLexes("{{", [new CurlyOpenSymbolToken(), new CurlyOpenSymbolToken()]);

  itLexes("}{", [new CurlyCloseSymbolToken(), new CurlyOpenSymbolToken()]);

  itLexes(" } { ", [new CurlyCloseSymbolToken(), new CurlyOpenSymbolToken()]);

  itLexes("({!:?,=})", [
    new ParensOpenSymbolToken(),
    new CurlyOpenSymbolToken(),
    new ExclamationMarkSymbolToken(),
    new ColonSymbolToken(),
    new OptionalSymbolToken(),
    new CommaSymbolToken(),
    new EqualSymbolToken(),
    new CurlyCloseSymbolToken(),
    new ParensCloseSymbolToken(),
  ]);

  itLexes(" [][] ", [new ArraySymbolToken(), new ArraySymbolToken()]);

  itLexes("nice[]", [new IdentifierToken("nice"), new ArraySymbolToken()]);

  itLexes("nice\n[]", [new IdentifierToken("nice"), new ArraySymbolToken()]);

  itDoesntLex("[", "Unexpected end of file");

  itLexes("type Str string", [new TypeKeywordToken(), new IdentifierToken("Str"), new PrimitiveTypeToken("string")]);

  itLexes('"ab"', [new StringLiteralToken("ab")]);

  itLexes('""', [new StringLiteralToken("")]);

  itLexes('"aa\\nbb"', [new StringLiteralToken("aa\nbb")]);

  itLexes('"aa\\bb"', [new StringLiteralToken("aabb")]);

  itLexes('"\'"', [new StringLiteralToken("'")]);

  itLexes('"\\n\\t\\""', [new StringLiteralToken('\n\t"')]);

  itLexes('"/* */"', [new StringLiteralToken("/* */")]);

  itLexes("//hmmm", []);

  itLexes("x//hmmm", [new IdentifierToken("x")]);

  itLexes("a//hmmm\nb", [new IdentifierToken("a"), new IdentifierToken("b")]);

  itLexes("a  //  hmmm  \n  b", [new IdentifierToken("a"), new IdentifierToken("b")]);

  itLexes("// héýça\n z", [new IdentifierToken("z")]);

  itDoesntLex("2", 'Unexpected character "2" at -:1:1');
  itDoesntLex("\n2", 'Unexpected character "2" at -:2:1');
  itDoesntLex("//\n2", 'Unexpected character "2" at -:2:1');
  itDoesntLex("//\n 2", 'Unexpected character "2" at -:2:2');
  itDoesntLex("//x\n2", 'Unexpected character "2" at -:2:1');
  itDoesntLex("//x\n 2", 'Unexpected character "2" at -:2:2');
  itDoesntLex("/*\n*/3", 'Unexpected character "3" at -:2:3');
  itDoesntLex("/*\n\n\n\n*/ 2", 'Unexpected character "2" at -:5:4');
  itDoesntLex("/*a*/\n2", 'Unexpected character "2" at -:2:1');
  itDoesntLex("/*a*/\n 2", 'Unexpected character "2" at -:2:2');

  itDoesntLex("/*\n", "Unexpected end of file");
  itDoesntLex("/* *", "Unexpected end of file");
  itDoesntLex("/* \tae\n\n", "Unexpected end of file");
  itDoesntLex("/*", "Unexpected end of file");
  itDoesntLex("/*", "Unexpected end of file");
  itDoesntLex("/* dsvibwi", "Unexpected end of file");
  itDoesntLex("/* cdibweic *", "Unexpected end of file");
  itDoesntLex("/* cdibweic *a", "Unexpected end of file");
  itDoesntLex("/* * /", "Unexpected end of file");
  itDoesntLex("/* *   /", "Unexpected end of file");
  itDoesntLex("/* *     /", "Unexpected end of file");
  itDoesntLex("/*/", "Unexpected end of file");
  itDoesntLex("/* /", "Unexpected end of file");
  itDoesntLex("/*     * /", "Unexpected end of file");
  itDoesntLex("/*     * * * /", "Unexpected end of file");
  itDoesntLex("/*    *a/", "Unexpected end of file");

  itLexes("/*\n*/", []);
  itLexes("/* * * * * */", []);
  itLexes("/* * ***_ */", []);
  itLexes("/**/", []);
  itLexes("/***/", []);
  itLexes("/****/", []);
  itLexes("/*****/", []);
  itLexes("/******/", []);
  itLexes("/*******/", []);
  itLexes("/********/", []);
  itLexes("/****aas ********/", []);
  itLexes("/*******a ********/", []);
  itLexes("/**********/", []);
  itLexes("/************/", []);
  itLexes("/*************/", []);
  itLexes("/**************/", []);
  itLexes("/***************/", []);
  itLexes("/*a */", []);
  itLexes("/*a \n*/", []);
  itLexes("/*a \n\n\n\n\n*/", []);
  itLexes("/**a*/", []);
  itLexes("/*a**/", []);
  itLexes("/* */", []);

  itLexes("/*a*/b/*c*/", [new IdentifierToken("b")]);

  itLexes("/* đðđ\n */u", [new IdentifierToken("u")]);

  itLexes("c/* a*/", [new IdentifierToken("c")]);

  itLexes("/* bce */a", [new IdentifierToken("a")]);

  itLexes("b/* baed */c", [new IdentifierToken("b"), new IdentifierToken("c")]);

  itLexes("/* \n\nb */a", [new IdentifierToken("a")]);

  itLexes("/* */a", [new IdentifierToken("a")]);

  itLexes("@aa bb cc", [new AnnotationToken("aa bb cc")]);

  itLexes("  @   ", [new AnnotationToken("")]);

  itLexes("@", [new AnnotationToken("")]);

  itLexes("  @  aa bb cc   ", [new AnnotationToken("aa bb cc")]);

  itLexes("  @  aa bb \n cc   ", [new AnnotationToken("aa bb"), new IdentifierToken("cc")]);

  itLexes("  @  aa bb \\   \n  cc   ", [new AnnotationToken("aa bb cc")]);

  itLexes("@\\\n  cc   ", [new AnnotationToken("cc")]);
});
