import { AstJson, astToJson, jsonToAst } from "../src/json";
import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";

function expectParses(source: string, json: AstJson, warnings: string[] = []) {
  const parser = new Parser(new Lexer(source));
  const ast = parser.parse();

  expect(ast.warnings).toEqual(warnings);
  expect(astToJson(ast)).toEqual(json);
  expect(astToJson(ast)).toEqual(astToJson(jsonToAst(astToJson(ast))));
}

function expectDoesntParse(source: string, message: string) {
  const parser = new Parser(new Lexer(source));

  expect(() => parser.parse()).toThrowError(message);
}

describe(Parser, () => {
  for (const p of Lexer.PRIMITIVES) {
    test(`handles primitive type '${p}'`, () => {
      expectParses(
        `
                    type Foo {
                        foo: ${p}
                    }
                `,
        {
          annotations: {},
          errors: ["Fatal"],
          functionTable: {},
          typeTable: {
            Foo: {
              foo: p,
            },
          },
        },
      );
    });

    test(`handles simple get operations for primitive type '${p}'`, () => {
      expectParses(
        `
                    get ${p === "bool" ? "isFoo" : "foo"}(): ${p}
                    get bar(): ${p}?
                    fn getBaz(): ${p}[]
                `,
        {
          annotations: {},
          errors: ["Fatal"],
          functionTable: {
            [p === "bool" ? "isFoo" : "getFoo"]: {
              args: {},
              ret: p,
            },
            getBar: {
              args: {},
              ret: `${p}?`,
            },
            getBaz: {
              args: {},
              ret: `${p}[]`,
            },
          },
          typeTable: {},
        },
        ["Keyword 'get' is deprecated at -:2:21. Use 'fn' instead.", "Keyword 'get' is deprecated at -:3:21. Use 'fn' instead."],
      );
    });
  }

  for (const kw of Lexer.KEYWORDS) {
    test(`handles '${kw}' on the name of a field`, () => {
      expectParses(
        `
                type Foo {
                    ${kw}: int
                }
                `,
        {
          annotations: {},
          errors: ["Fatal"],
          functionTable: {},
          typeTable: {
            Foo: {
              [kw]: "int",
            },
          },
        },
      );
    });
  }

  test("handles arrays and optionals", () => {
    expectParses(
      `
                type Foo {
                    aa: string[]
                    bbb: int?[]??
                    cccc: int[][][]
                    ddddd: uint[][][]??[]???[][]
                }
            `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {},
        typeTable: {
          Foo: {
            aa: "string[]",
            bbb: "int?[]??",
            cccc: "int[][][]",
            ddddd: "uint[][][]??[]???[][]",
          },
        },
      },
    );
  });

  test("handles enums", () => {
    expectParses(
      `
                type Foo {
                    a: int
                    status: enum {
                        c a zzz
                    }
                }

                type Other enum { aa bb }
            `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {},
        typeTable: {
          Foo: {
            a: "int",
            status: "FooStatus",
          },
          FooStatus: ["c", "a", "zzz"],
          Other: ["aa", "bb"],
        },
      },
    );
  });

  test("handles errors", () => {
    expectParses(
      `
                error Foo
                error Bar
                error FooBar
            `,
      {
        annotations: {},
        errors: ["Foo", "Bar", "FooBar", "Fatal"],
        functionTable: {},
        typeTable: {},
      },
    );
  });

  test("handles combinations of all part", () => {
    expectParses(
      `
                error Foo
                error Bar

                type Baz {
                    a: string?
                    b: int
                }

                fn getBaz(): Baz
            `,
      {
        annotations: {},
        errors: ["Foo", "Bar", "Fatal"],
        functionTable: {
          getBaz: {
            args: {},
            ret: "Baz",
          },
        },
        typeTable: {
          Baz: {
            a: "string?",
            b: "int",
          },
        },
      },
    );
  });

  test("fails when struct or enum is empty", () => {
    expectDoesntParse(
      `
                type Baz {
                }
            `,
      "empty",
    );

    expectDoesntParse(
      `
                type Baaz enum {
                }
            `,
      "empty",
    );
  });

  test("fails when field happens twice", () => {
    expectDoesntParse(
      `
                type Baz {
                    a: int
                    b: bool
                    a: int
                }
            `,
      "redeclare",
    );

    expectDoesntParse(
      `
                type Baz {
                    b: int
                    xx: bool
                    xx: int
                }
            `,
      "redeclare",
    );

    expectDoesntParse(
      `
                fn foo(a: string, a: int)
            `,
      "redeclare",
    );
  });

  test("handles spreads in structs", () => {
    expectParses(
      `
                type Bar {
                    aa: string
                }

                type Foo {
                    ...Bar
                    bb: int
                }
            `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {},
        typeTable: {
          Bar: {
            aa: "string",
          },
          Foo: {
            aa: "string",
            bb: "int",
          },
        },
      },
    );
  });

  test("handles functions with arguments", () => {
    expectParses(
      `
                type Bar {
                    aa: string
                }

                function doIt(foo: int, bar: Bar): string
            `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {
          doIt: {
            args: {
              bar: "Bar",
              foo: "int",
            },
            ret: "string",
          },
        },
        typeTable: {
          Bar: {
            aa: "string",
          },
        },
      },
      ["Keyword 'function' is deprecated at -:6:17. Use 'fn' instead."],
    );
  });

  test("handles functions with annotations", () => {
    expectParses(
      `
                @description does it
                @description and does another \\
                            thing too
                @arg bar Represents the number of things
                fn doIt(foo: int, bar: float): string
            `,
      {
        annotations: {
          "fn.doIt": [
            { type: "description", value: "does it" },
            { type: "description", value: "and does another thing too" },
          ],
          "fn.doIt.bar": [{ type: "description", value: "Represents the number of things" }],
        },
        errors: ["Fatal"],
        functionTable: {
          doIt: {
            args: {
              bar: "float",
              foo: "int",
            },
            ret: "string",
          },
        },
        typeTable: {},
      },
    );

    expectParses(
      `
                error NotFound
                error InvalidArgument

                @throws NotFound
                @throws InvalidArgument
                fn doIt(): string
                fn doIt2(): int
            `,
      {
        annotations: {
          "fn.doIt": [
            { type: "throws", value: "NotFound" },
            { type: "throws", value: "InvalidArgument" },
          ],
        },
        errors: ["NotFound", "InvalidArgument", "Fatal"],
        functionTable: {
          doIt: {
            args: {},
            ret: "string",
          },
          doIt2: {
            args: {},
            ret: "int",
          },
        },
        typeTable: {},
      },
    );
  });

  test("handles descriptions inside structs", () => {
    expectParses(
      `
                type Foo {
                    @description foobar
                    x: int
                    y: string
                }
            `,
      {
        annotations: {
          "type.Foo.x": [{ type: "description", value: "foobar" }],
        },
        errors: ["Fatal"],
        functionTable: {},
        typeTable: {
          Foo: {
            x: "int",
            y: "string",
          },
        },
      },
    );
  });

  test("handles rest annotations", () => {
    expectParses(
      `
                @rest GET /foo
                fn foo(): string

                @rest GET /users/{id}/name
                fn name(id: string): string

                @rest GET /users/count?{since}&{until}
                fn userCount(since: date?, until: date?): uint
            `,
      {
        annotations: {
          "fn.foo": [
            {
              type: "rest",
              value: {
                bodyVariable: null,
                headers: [],
                method: "GET",
                path: "/foo",
                pathVariables: [],
                queryVariables: [],
              },
            },
          ],
          "fn.name": [
            {
              type: "rest",
              value: {
                bodyVariable: null,
                headers: [],
                method: "GET",
                path: "/users/{id}/name",
                pathVariables: ["id"],
                queryVariables: [],
              },
            },
          ],
          "fn.userCount": [
            {
              type: "rest",
              value: {
                bodyVariable: null,
                headers: [],
                method: "GET",
                path: "/users/count",
                pathVariables: [],
                queryVariables: ["since", "until"],
              },
            },
          ],
        },
        errors: ["Fatal"],
        functionTable: {
          foo: {
            args: {},
            ret: "string",
          },
          name: {
            args: {
              id: "string",
            },
            ret: "string",
          },
          userCount: {
            args: {
              since: "date?",
              until: "date?",
            },
            ret: "uint",
          },
        },
        typeTable: {},
      },
    );

    expectParses(
      `
                @rest GET /chats/{chatId}/messages?{since}&{until} [header x-token: {token}]
                fn getMessages(token: base64, chatId: uuid, since: datetime?, until: datetime?): string[]
            `,
      {
        annotations: {
          "fn.getMessages": [
            {
              type: "rest",
              value: {
                bodyVariable: null,
                headers: [["x-token", "token"]],
                method: "GET",
                path: "/chats/{chatId}/messages",
                pathVariables: ["chatId"],
                queryVariables: ["since", "until"],
              },
            },
          ],
        },
        errors: ["Fatal"],
        functionTable: {
          getMessages: {
            args: {
              chatId: "uuid",
              since: "datetime?",
              token: "base64",
              until: "datetime?",
            },
            ret: "string[]",
          },
        },
        typeTable: {},
      },
    );

    expectParses(
      `
                @rest GET /posts [header user-agent: {userAgent}] [header accept-language: {lang}] [header x-token: {token}]
                fn getPosts(userAgent: string, lang: string, token: base64): uuid
            `,
      {
        annotations: {
          "fn.getPosts": [
            {
              type: "rest",
              value: {
                bodyVariable: null,
                headers: [
                  ["user-agent", "userAgent"],
                  ["accept-language", "lang"],
                  ["x-token", "token"],
                ],
                method: "GET",
                path: "/posts",
                pathVariables: [],
                queryVariables: [],
              },
            },
          ],
        },
        errors: ["Fatal"],
        functionTable: {
          getPosts: {
            args: {
              lang: "string",
              token: "base64",
              userAgent: "string",
            },
            ret: "uuid",
          },
        },
        typeTable: {},
      },
    );

    expectParses(
      `
                type NewUser {
                    name: string
                }

                type User {
                    id: uuid
                }

                @rest POST /users [body {user}]
                fn createNewUser(user: NewUser): User
            `,
      {
        annotations: {
          "fn.createNewUser": [
            {
              type: "rest",
              value: {
                bodyVariable: "user",
                headers: [],
                method: "POST",
                path: "/users",
                pathVariables: [],
                queryVariables: [],
              },
            },
          ],
        },
        errors: ["Fatal"],
        functionTable: {
          createNewUser: {
            args: {
              user: "NewUser",
            },
            ret: "User",
          },
        },
        typeTable: {
          NewUser: {
            name: "string",
          },
          User: {
            id: "uuid",
          },
        },
      },
    );

    expectParses(
      `
                type Kind enum {
                    first
                    second
                    third
                }

                @rest GET /things/{kind}
                fn countThings(kind: Kind): uint
                `,
      {
        annotations: {
          "fn.countThings": [
            {
              type: "rest",
              value: {
                bodyVariable: null,
                headers: [],
                method: "GET",
                path: "/things/{kind}",
                pathVariables: ["kind"],
                queryVariables: [],
              },
            },
          ],
        },
        errors: ["Fatal"],
        functionTable: {
          countThings: {
            args: {
              kind: "Kind",
            },
            ret: "uint",
          },
        },
        typeTable: {
          Kind: ["first", "second", "third"],
        },
      },
    );

    expectDoesntParse(
      `
                @rest HEAD /foo
                fn foo(): string
            `,
      "Unsupported method 'HEAD'",
    );

    expectDoesntParse(
      `
                @rest GET /foo/{id}
                fn foo(): string
            `,
      "Argument 'id' not found",
    );

    expectDoesntParse(
      `
                @rest GET /foo?{id}
                fn foo(): string
            `,
      "Argument 'id' not found",
    );

    expectDoesntParse(
      `
                @rest GET aaa
                fn foo(): string
            `,
      "Invalid path",
    );

    expectDoesntParse(
      `
                @rest GET /aaa?oug
                fn foo(): string
            `,
      "Invalid querystring on path",
    );

    expectDoesntParse(
      `
                @rest GET /aaa/{arg}
                fn foo(arg: string?): string
            `,
      "path argument 'arg' can't be nullable",
    );

    expectDoesntParse(
      `
                @rest GET /aaa/{arg}
                fn foo(arg: string[]): string
            `,
      "Argument 'arg' can't have type 'string[]' for rest annotation",
    );

    expectDoesntParse(
      `
                @rest GET /aaa
                fn foo(arg: string): string
            `,
      "is missing",
    );

    expectDoesntParse(
      `
                @rest GET /aaa
                fn foo(): void
            `,
      "GET rest endpoint must return something",
    );
  });
});
