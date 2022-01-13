import { _, assert } from "spec.ts";

import { decode, encode } from "../src";

{
  const typeTable = {} as const;
  const encoded = encode(typeTable, "", "string", "");
  const decoded = decode(typeTable, "", "string", "");

  assert(encoded, _ as string);
  assert(decoded, _ as string);
}

{
  const typeTable = {} as const;
  const encoded = encode(typeTable, "", "bigint", "");
  const decoded = decode(typeTable, "", "bigint", "");

  assert(encoded, _ as string);
  assert(decoded, _ as bigint);
}

{
  const typeTable = {
    Foo: "string?",
  } as const;
  const encoded = encode(typeTable, "", "Foo", "");
  const decoded = decode(typeTable, "", "Foo", "");

  assert(encoded, _ as string | null);
  assert(decoded, _ as string | null);
}

{
  const typeTable = {
    Foo: "string?",
    Bar: {
      a: "string",
      b: "Foo[]",
    },
  } as const;
  const encoded = encode(typeTable, "", "Bar", "");
  const decoded = decode(typeTable, "", "Bar", "");

  assert(encoded, _ as { a: string; b: Array<string | null> });
  assert(decoded, _ as { a: string; b: Array<string | null> });
}

{
  const typeTable = {
    Foo: "string?",
    Bar: ["a", "b"],
  } as const;
  const encoded = encode(typeTable, "", "Bar", "");
  const decoded = decode(typeTable, "", "Bar", "");

  assert(encoded, _ as "a" | "b");
  assert(decoded, _ as "a" | "b");
}

{
  const typeTable = {
    Foo: { x: "string?" },
    Bar: ["a", ["b", "Foo"]],
  } as const;

  const encoded = encode(typeTable, "", "Bar", "");
  const decoded = decode(typeTable, "", "Bar", "");

  assert(encoded, _ as "a" | ["b", { x: string | null }]);
  assert(decoded, _ as { tag: "a" } | { tag: "b"; x: string | null });
}
