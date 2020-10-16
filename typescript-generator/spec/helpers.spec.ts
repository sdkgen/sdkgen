import { generateTypescriptInterface, generateTypescriptTypeName } from "../src/helpers";
import * as parser from "@sdkgen/parser";

describe("helpers.ts", () => {
  test("generateTypescriptInterface", () => {
    const structType = new parser.StructType(
      [
        new parser.Field("int", new parser.IntPrimitiveType()),
        new parser.Field("bigint", new parser.BigIntPrimitiveType()),
        new parser.Field("date", new parser.DatePrimitiveType()),
        new parser.Field("bool", new parser.BoolPrimitiveType()),
        new parser.Field("bytes", new parser.BytesPrimitiveType()),
        new parser.Field("uuid", new parser.UuidPrimitiveType()),
        new parser.Field("void", new parser.VoidPrimitiveType()),
        new parser.Field("json", new parser.JsonPrimitiveType()),
        new parser.Field("optionalStrArray", new parser.OptionalType(new parser.ArrayType(new parser.StringPrimitiveType()))),
      ],
      [],
    );
    structType.name = "awesomeInterface";

    expect(generateTypescriptInterface(structType)).toBe(`export interface awesomeInterface {
    int: number
    bigint: bigint
    date: Date
    bool: boolean
    bytes: Buffer
    uuid: string
    void: void
    json: any
    optionalStrArray: string[] | null
}
`);
  });

  test("generateTypescriptTypeName: IntPrimitiveType", () => {
    const type = new parser.IntPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("number");
  });

  test("generateTypescriptTypeName: UIntPrimitiveType", () => {
    const type = new parser.UIntPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("number");
  });

  test("generateTypescriptTypeName: MoneyPrimitiveType", () => {
    const type = new parser.MoneyPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("number");
  });

  test("generateTypescriptTypeName: FloatPrimitiveType", () => {
    const type = new parser.FloatPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("number");
  });

  test("generateTypescriptTypeName: DateTimePrimitiveType", () => {
    const type = new parser.DateTimePrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("Date");
  });

  test("generateTypescriptTypeName: StringPrimitiveType", () => {
    const type = new parser.StringPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("string");
  });

  test("generateTypescriptTypeName: CpfPrimitiveType", () => {
    const type = new parser.CpfPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("string");
  });

  test("generateTypescriptTypeName: CnpjPrimitiveType", () => {
    const type = new parser.CnpjPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("string");
  });

  test("generateTypescriptTypeName: EmailPrimitiveType", () => {
    const type = new parser.EmailPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("string");
  });

  test("generateTypescriptTypeName: HtmlPrimitiveType", () => {
    const type = new parser.HtmlPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("string");
  });

  test("generateTypescriptTypeName: UrlPrimitiveType", () => {
    const type = new parser.UrlPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("string");
  });

  test("generateTypescriptTypeName: HexPrimitiveType", () => {
    const type = new parser.HexPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("string");
  });

  test("generateTypescriptTypeName: Base64PrimitiveType", () => {
    const type = new parser.Base64PrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("string");
  });

  test("generateTypescriptTypeName: XmlPrimitiveType", () => {
    const type = new parser.XmlPrimitiveType();
    expect(generateTypescriptTypeName(type)).toBe("string");
  });

  test("generateTypescriptTypeName: StructType", () => {
    const structType = new parser.StructType(
      [new parser.Field("int", new parser.IntPrimitiveType()), new parser.Field("bigint", new parser.BigIntPrimitiveType())],
      [],
    );
    structType.name = "simpleInterface";
    expect(generateTypescriptTypeName(structType)).toBe(structType.name);
  });

  test("generateTypescriptTypeName: EnumType", () => {
    const enumType = new parser.EnumType([new parser.EnumValue("value1")]);

    enumType.name = "simpleEnum";

    expect(generateTypescriptTypeName(enumType)).toBe(enumType.name);
  });

  test("generateTypescriptTypeName: TypeReference", () => {
    const enumType = new parser.TypeReference("typeRef");
    enumType.type = new parser.HexPrimitiveType();

    expect(generateTypescriptTypeName(enumType)).toBe("string");
  });

  test("generateTypescriptTypeName: unknown PrimitiveType error", () => {
    class UnknownType extends parser.Type {
      name = "UnknownType";
    }

    const newUnknownType = new UnknownType();

    expect(() => generateTypescriptTypeName(newUnknownType)).toThrowError(`BUG: generateTypescriptTypeName with ${newUnknownType.name}`);
  });
});
