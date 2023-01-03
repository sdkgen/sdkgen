import { readFileSync } from "fs";

import type { AstJson } from "../src/json.js";
import { astToJson, jsonToAst } from "../src/json.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";

function expectParses(source: string, json: AstJson, warnings: string[] = []) {
  const parser = new Parser(new Lexer(source), readFileSync);
  const ast = parser.parse();

  expect(ast.warnings).toEqual(warnings);
  expect(astToJson(ast)).toEqual(json);
  expect(astToJson(ast)).toEqual(astToJson(jsonToAst(astToJson(ast))));
}

function expectDoesntParse(source: string, message: string) {
  const parser = new Parser(new Lexer(source), readFileSync);

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
        error Bar {
          foo: string
        }
        error FooBar int
      `,
      {
        annotations: {},
        errors: ["Foo", ["Bar", "BarData"], ["FooBar", "int"], "Fatal"],
        functionTable: {},
        typeTable: {
          BarData: {
            foo: "string",
          },
        },
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

    expectParses(
      `
        type Bar {
          aa: string
        }

        type Foo {
          ...Bar
          aa: int
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
            aa: "int",
          },
        },
      },
    );

    expectParses(
      `
        type Bar {
          aa: string
        }

        type Foo {
          ...Bar
          aa: int
          ...Bar
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
          },
        },
      },
    );

    expectParses(
      `
        type Test {
          foo: enum { bar baz }
        }

        type Test2 {
          ...Test
        }
      `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {},
        typeTable: {
          Test: {
            foo: "TestFoo",
          },
          Test2: {
            foo: "TestFoo",
          },
          TestFoo: ["bar", "baz"],
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

        fn doIt(foo: int, bar: Bar): string
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
    );
  });

  test("handles spreads in function arguments", () => {
    expectParses(
      `
        type Bar {
          aa: string
        }

        fn doIt(foo: int, ...Bar): string
      `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {
          doIt: {
            args: {
              aa: "string",
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
    );

    expectDoesntParse(
      `
        type Foo {
          a: int !secret
        }

        type Bar {
          ...Foo
        }

        fn Poo(): Bar
      `,
      "secret",
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

        @rest GET /users/{userId}/addresses/{addressId}
        fn userAddress(userId: string, addressId: string): string
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
          "fn.userAddress": [
            {
              type: "rest",
              value: {
                bodyVariable: null,
                headers: [],
                method: "GET",
                path: "/users/{userId}/addresses/{addressId}",
                pathVariables: ["userId", "addressId"],
                queryVariables: [],
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
          userAddress: {
            args: {
              userId: "string",
              addressId: "string",
            },
            ret: "string",
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
                  ["accept-language", "lang"],
                  ["user-agent", "userAgent"],
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
        @rest POST /insertCustomerLead [header api_key: {apiKey}] [header api_secret: {apiSecret}] [body {customerLead}]
        fn insertCustomerLead(customerLead: string, apiKey: bigint, apiSecret: string)
      `,
      {
        annotations: {
          "fn.insertCustomerLead": [
            {
              type: "rest",
              value: {
                bodyVariable: "customerLead",
                headers: [
                  ["api_key", "apiKey"],
                  ["api_secret", "apiSecret"],
                ],
                method: "POST",
                path: "/insertCustomerLead",
                pathVariables: [],
                queryVariables: [],
              },
            },
          ],
        },
        errors: ["Fatal"],
        functionTable: {
          insertCustomerLead: {
            args: {
              customerLead: "string",
              apiKey: "bigint",
              apiSecret: "string",
            },
            ret: "void",
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

    expectParses(
      `
        @rest POST /foo/{bar}
        fn foo(bar: string !secret): string
      `,
      {
        annotations: {
          "fn.foo": [
            {
              type: "rest",
              value: {
                bodyVariable: null,
                headers: [],
                method: "POST",
                path: "/foo/{bar}",
                pathVariables: ["bar"],
                queryVariables: [],
              },
            },
          ],
        },
        errors: ["Fatal"],
        functionTable: {
          foo: {
            args: {
              bar: "string",
            },
            ret: "string",
          },
        },
        typeTable: {},
      },
    );

    expectParses(
      `
        @rest POST /foo?{bar}
        fn foo(bar: string !secret): string
      `,
      {
        annotations: {
          "fn.foo": [
            {
              type: "rest",
              value: {
                bodyVariable: null,
                headers: [],
                method: "POST",
                path: "/foo",
                pathVariables: [],
                queryVariables: ["bar"],
              },
            },
          ],
        },
        errors: ["Fatal"],
        functionTable: {
          foo: {
            args: {
              bar: "string",
            },
            ret: "string",
          },
        },
        typeTable: {},
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

    expectDoesntParse(
      `
        @rest GET /bobobobo/{bar}
        fn foo(bar: string !secret): bool
      `,
      "marked as secret",
    );

    expectDoesntParse(
      `
        @rest GET /bobobobo?{bar}
        fn foo(bar: string !secret): bool
      `,
      "marked as secret",
    );
  });

  test("handles functions with @hidden", () => {
    expectParses(
      `
        @hidden
        fn doIt(foo: int, bar: float): string
      `,
      {
        annotations: {
          "fn.doIt": [{ type: "hidden", value: null }],
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
  });

  test("handles recursive types", () => {
    expectParses(
      `
        type Item {
          children: Item[]
        }
      `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {},
        typeTable: { Item: { children: "Item[]" } },
      },
    );

    expectParses(
      `
        type Item enum {
          first(a: Item[])
          second(b: Item)
        }
      `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {},
        typeTable: {
          Item: [
            ["first", "ItemFirst"],
            ["second", "ItemSecond"],
          ],
          ItemFirst: {
            a: "Item[]",
          },
          ItemSecond: {
            b: "Item",
          },
        },
      },
    );

    expectDoesntParse(
      `
        type Item Item[]
      `,
      "Type 'Item' at -:2:9 is recursive but is not an struct",
    );

    expectDoesntParse(
      `
        type Item Item[][]?
      `,
      "Type 'Item' at -:2:9 is recursive but is not an struct",
    );

    expectDoesntParse(
      `
        type Item Item?
      `,
      "Type 'Item' at -:2:9 is recursive but is not an struct",
    );

    expectDoesntParse(
      `
        type Item Item
      `,
      "Type 'Item' at -:2:9 is recursive but is not an struct",
    );

    expectDoesntParse(
      `
        type Item {
          value: Item
        }
      `,
      "Type 'Item' at -:2:9 is infinitely recursive",
    );

    expectDoesntParse(
      `
        type Item enum {
          first(a: Item)
          second(b: Item)
        }
      `,
      "Type 'Item' at -:2:9 is infinitely recursive",
    );
  });

  test("handles enum with fields", () => {
    expectParses(
      `
        type Shape enum {
          point
          circle(radius: float)
          box(width: float, height: float)
        }
      `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {},
        typeTable: {
          Shape: ["point", ["circle", "ShapeCircle"], ["box", "ShapeBox"]],
          ShapeBox: {
            height: "float",
            width: "float",
          },
          ShapeCircle: {
            radius: "float",
          },
        },
      },
    );
  });

  test("merges identical types with the same name", () => {
    expectParses(
      `
        type Test {
          foo: string
          bar: int
        }

        type Test {
          foo: string
          bar: int
        }
      `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {},
        typeTable: {
          Test: {
            bar: "int",
            foo: "string",
          },
        },
      },
    );

    expectDoesntParse(
      `
        type Test {
          foo: string
          bar: int
        }

        type Test {
          foo: string
          bar: uint
        }
      `,
      "Type 'Test' at -:7:9 is defined multiple times (also at -:2:19)",
    );
  });

  test("merges identical types with automatic name", () => {
    expectParses(
      `
        type Test {
          foo: {
            bar: int
          }
        }

        type TestFoo {
          bar: int
        }
      `,
      {
        annotations: {},
        errors: ["Fatal"],
        functionTable: {},
        typeTable: {
          Test: {
            foo: "TestFoo",
          },
          TestFoo: {
            bar: "int",
          },
        },
      },
    );

    expectDoesntParse(
      `
        type Test {
          foo: {
            bar: int
          }
        }

        type TestFoo {
          bar: uint
        }
      `,
      "The name of the type 'TestFoo' at -:8:22 will conflict with 'Test.foo' at -:3:16",
    );
  });
});
