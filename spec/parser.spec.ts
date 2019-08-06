import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";
import { astToJson, jsonToAst } from "../src/json";

describe(Parser, () => {
    for (const p of Lexer.PRIMITIVES) {
        test(`handles primitive type '${p}'`, () => {
            expectParses(`
                type Foo {
                    foo: ${p}
                }
            `);
        });

        test(`handles simple get operations for primitive type '${p}'`, () => {
            expectParses(`
                get ${p === "bool" ? "isFoo" : "foo"}(): ${p}
                get bar(): ${p}?
                get baz(): ${p}[]
            `);
        });
    }

    for (const kw of Lexer.KEYWORDS) {
        test(`handles '${kw}' on the name of a field`, () => {
            expectParses(`
                type Foo {
                    ${kw}: int
                }
            `);
        });
    }

    test("handles arrays and optionals", () => {
        expectParses(`
            type Foo {
                aa: string[]
                bbb: int?[]??
                cccc: int[][][]
                ddddd: uint[][][]??[]???[][]
            }
        `);
    });

    test("handles errors", () => {
        expectParses(`
            error Foo
            error Bar
            error FooBar
        `);
    });

    test("handles options on the top", () => {
        expectParses(`
            $url = "api.cubos.io/sdkgenspec"
        `);
    });

    test("handles combinations of all part", () => {
        expectParses(`
            $url = "api.cubos.io/sdkgenspec"

            error Foo
            error Bar

            type Baz {
                a: string?
                b: int
            }

            get baz(): Baz
        `);
    });

    test("fails when field happens twice", () => {
        expectDoesntParse(`
            type Baz {
                a: int
                b: bool
                a: int
            }
        `, "redeclare");

        expectDoesntParse(`
            type Baz {
                b: int
                xx: bool
                xx: int
            }
        `, "redeclare");

        expectDoesntParse(`
            function foo(a: string, a: int)
        `, "redeclare");
    });

    test("handles spreads in structs", () => {
        expectParses(`
            type Bar {
                aa: string
            }

            type Foo {
                ...Bar
                bb: int
            }
        `);
    });

    test("handles functions with arguments", () => {
        expectParses(`
            type Bar {
                aa: string
            }

            function doIt(foo: int, bar: Bar): string
        `);
    });
});

function expectParses(source: string) {
    const parser = new Parser(new Lexer(source));
    const ast = parser.parse();

    expect(ast).toMatchSnapshot();
    expect(astToJson(ast)).toEqual(astToJson(jsonToAst(astToJson(ast))));
}

function expectDoesntParse(source: string, message: string) {
    const parser = new Parser(new Lexer(source));
    expect(() => parser.parse()).toThrowError(message);
}
