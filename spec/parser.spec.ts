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
                },
                annotations: {}
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
                typeTable: {},
                annotations: {}
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
                },
                annotations: {}
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
            },
            annotations: {}
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
            },
            annotations: {}
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
            typeTable: {},
            annotations: {}
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
            },
            annotations: {}
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
            },
            annotations: {}
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
            },
            annotations: {}
        });
    });

    test("handles functions with annotations", () => {
        expectParses(`
            @description does it
            @description and does another \\
                         thing too
            @arg bar Represents the number of things
            fn doIt(foo: int, bar: float): string
        `, {
            errors: ["Fatal"],
            functionTable: {
                doIt: {
                    args: {
                        foo: "int",
                        bar: "float"
                    },
                    ret: "string"
                }
            },
            typeTable: {},
            annotations: {
                "fn.doIt": [
                    {type: "description", value: "does it"},
                    {type: "description", value: "and does another thing too"}
                ],
                "fn.doIt.bar": [
                    {type: "description", value: "Represents the number of things"}
                ]
            }
        });

        expectParses(`
            error NotFound
            error InvalidArgument

            @throws NotFound
            @throws InvalidArgument
            fn doIt(): string
            fn doIt2(): int
        `, {
            errors: ["NotFound", "InvalidArgument", "Fatal"],
            functionTable: {
                doIt: {
                    args: {},
                    ret: "string"
                },
                doIt2: {
                    args: {},
                    ret: "int"
                }
            },
            typeTable: {},
            annotations: {
                "fn.doIt": [
                    {type: "throws", value: "NotFound"},
                    {type: "throws", value: "InvalidArgument"}
                ]
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
