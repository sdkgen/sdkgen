import { AstJson, astToJson, jsonToAst } from "../src/json";
import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";

describe(Parser, () => {
    for (const p of Lexer.PRIMITIVES) {
        test(`handles primitive type '${p}'`, () => {
            expectParses(`
                type Foo {
                    foo: ${p}
                }
            `, {
                errors: ["Fatal"],
                functionTable: {},
                typeTable: {
                    Foo: {
                        foo: p
                    }
                }
            });
        });

        test(`handles simple get operations for primitive type '${p}'`, () => {
            expectParses(`
                get ${p === "bool" ? "isFoo" : "foo"}(): ${p}
                get bar(): ${p}?
                get baz(): ${p}[]
            `, {
                errors: ["Fatal"],
                functionTable: {
                    [p === "bool" ? "isFoo" : "getFoo"]: {
                        args: {},
                        ret: p
                    },
                    getBar: {
                        args: {},
                        ret: `${p}?`
                    },
                    getBaz: {
                        args: {},
                        ret: `${p}[]`
                    }
                },
                typeTable: {}
            });
        });
    }

    for (const kw of Lexer.KEYWORDS) {
        test(`handles '${kw}' on the name of a field`, () => {
            expectParses(`
                type Foo {
                    ${kw}: int
                }
            `, {
                errors: ["Fatal"],
                functionTable: {},
                typeTable: {
                    Foo: {
                        [kw]: "int"
                    }
                }
            });
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
        `, {
            errors: ["Fatal"],
            functionTable: {},
            typeTable: {
                Foo: {
                    aa: "string[]",
                    bbb: "int?[]??",
                    cccc: "int[][][]",
                    ddddd: "uint[][][]??[]???[][]"
                }
            }
        });
    });

    test("handles enums", () => {
        expectParses(`
            type Foo {
                a: int
                status: enum {
                    c a zzz
                }
            }

            type Other enum { aa bb }
        `, {
            errors: ["Fatal"],
            functionTable: {},
            typeTable: {
                Foo: {
                    a: "int",
                    status: "FooStatus"
                },
                FooStatus: ["c", "a", "zzz"],
                Other: ["aa", "bb"]
            }
        });
    });

    test("handles errors", () => {
        expectParses(`
            error Foo
            error Bar
            error FooBar
        `, {
            errors: ["Foo", "Bar", "FooBar", "Fatal"],
            functionTable: {},
            typeTable: {}
        });
    });

    test("handles combinations of all part", () => {
        expectParses(`
            error Foo
            error Bar

            type Baz {
                a: string?
                b: int
            }

            get baz(): Baz
        `, {
            errors: ["Foo", "Bar", "Fatal"],
            functionTable: {
                getBaz: {
                    args: {},
                    ret: "Baz"
                }
            },
            typeTable: {
                Baz: {
                    a: "string?",
                    b: "int"
                }
            }
        });
    });

    test("fails when struct or enum is empty", () => {
        expectDoesntParse(`
            type Baz {
            }
        `, "empty");

        expectDoesntParse(`
            type Baaz enum {
            }
        `, "empty");
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
        `, {
            errors: ["Fatal"],
            functionTable: {},
            typeTable: {
                Bar: {
                    aa: "string"
                },
                Foo: {
                    aa: "string",
                    bb: "int"
                }
            }
        });
    });

    test("handles functions with arguments", () => {
        expectParses(`
            type Bar {
                aa: string
            }

            function doIt(foo: int, bar: Bar): string
        `, {
            errors: ["Fatal"],
            functionTable: {
                doIt: {
                    args: {
                        foo: "int",
                        bar: "Bar"
                    },
                    ret: "string"
                }
            },
            typeTable: {
                Bar: {
                    aa: "string"
                }
            }
        });
    });
});

function expectParses(source: string, json: AstJson) {
    const parser = new Parser(new Lexer(source));
    const ast = parser.parse();

    expect(astToJson(ast)).toEqual(json);
    expect(astToJson(ast)).toEqual(astToJson(jsonToAst(astToJson(ast))));
}

function expectDoesntParse(source: string, message: string) {
    const parser = new Parser(new Lexer(source));
    expect(() => parser.parse()).toThrowError(message);
}
