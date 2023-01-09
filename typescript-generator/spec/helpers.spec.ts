import {
  ArrayType,
  Base64PrimitiveType,
  BigIntPrimitiveType,
  BoolPrimitiveType,
  BytesPrimitiveType,
  CnpjPrimitiveType,
  CpfPrimitiveType,
  DatePrimitiveType,
  DateTimePrimitiveType,
  EmailPrimitiveType,
  EnumType,
  EnumValue,
  Field,
  FloatPrimitiveType,
  HexPrimitiveType,
  HtmlPrimitiveType,
  IntPrimitiveType,
  JsonPrimitiveType,
  MoneyPrimitiveType,
  OptionalType,
  StringPrimitiveType,
  StructType,
  Type,
  TypeReference,
  UIntPrimitiveType,
  UrlPrimitiveType,
  UuidPrimitiveType,
  VoidPrimitiveType,
  XmlPrimitiveType,
} from "@sdkgen/parser";

import { generateTypescriptInterface, generateTypescriptTypeName } from "../src/helpers.js";

describe("helpers.ts", () => {
  test("generateTypescriptInterface", () => {
    const structType = new StructType([]);

    structType.fields = [
      new Field("int", new IntPrimitiveType()),
      new Field("bigint", new BigIntPrimitiveType()),
      new Field("date", new DatePrimitiveType()),
      new Field("bool", new BoolPrimitiveType()),
      new Field("bytes", new BytesPrimitiveType()),
      new Field("uuid", new UuidPrimitiveType()),
      new Field("void", new VoidPrimitiveType()),
      new Field("json", new JsonPrimitiveType()),
      new Field("optionalStrArray", new OptionalType(new ArrayType(new StringPrimitiveType()))),
    ];

    structType.name = "awesomeInterface";

    expect(generateTypescriptInterface(structType, false)).toBe(`export interface awesomeInterface {
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
    const type = new IntPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("number");
  });

  test("generateTypescriptTypeName: UIntPrimitiveType", () => {
    const type = new UIntPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("number");
  });

  test("generateTypescriptTypeName: MoneyPrimitiveType", () => {
    const type = new MoneyPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("number");
  });

  test("generateTypescriptTypeName: FloatPrimitiveType", () => {
    const type = new FloatPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("number");
  });

  test("generateTypescriptTypeName: DateTimePrimitiveType", () => {
    const type = new DateTimePrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("Date");
  });

  test("generateTypescriptTypeName: StringPrimitiveType", () => {
    const type = new StringPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("string");
  });

  test("generateTypescriptTypeName: CpfPrimitiveType", () => {
    const type = new CpfPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("string");
  });

  test("generateTypescriptTypeName: CnpjPrimitiveType", () => {
    const type = new CnpjPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("string");
  });

  test("generateTypescriptTypeName: EmailPrimitiveType", () => {
    const type = new EmailPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("string");
  });

  test("generateTypescriptTypeName: HtmlPrimitiveType", () => {
    const type = new HtmlPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("string");
  });

  test("generateTypescriptTypeName: UrlPrimitiveType", () => {
    const type = new UrlPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("string");
  });

  test("generateTypescriptTypeName: HexPrimitiveType", () => {
    const type = new HexPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("string");
  });

  test("generateTypescriptTypeName: Base64PrimitiveType", () => {
    const type = new Base64PrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("string");
  });

  test("generateTypescriptTypeName: XmlPrimitiveType", () => {
    const type = new XmlPrimitiveType();

    expect(generateTypescriptTypeName(type, false)).toBe("string");
  });

  test("generateTypescriptTypeName: StructType", () => {
    const structType = new StructType([new Field("int", new IntPrimitiveType()), new Field("bigint", new BigIntPrimitiveType())]);

    structType.name = "simpleInterface";
    expect(generateTypescriptTypeName(structType, false)).toBe(structType.name);
  });

  test("generateTypescriptTypeName: EnumType", () => {
    const enumType = new EnumType([new EnumValue("value1")]);

    enumType.name = "simpleEnum";

    expect(generateTypescriptTypeName(enumType, false)).toBe(enumType.name);
  });

  test("generateTypescriptTypeName: TypeReference", () => {
    const enumType = new TypeReference("typeRef");

    enumType.type = new HexPrimitiveType();

    expect(generateTypescriptTypeName(enumType, false)).toBe("string");
  });

  test("generateTypescriptTypeName: unknown PrimitiveType error", () => {
    class UnknownType extends Type {
      name = "UnknownType";
    }

    const newUnknownType = new UnknownType();

    expect(() => generateTypescriptTypeName(newUnknownType, false)).toThrowError(`BUG: generateTypescriptTypeName with ${newUnknownType.name}`);
  });
});
