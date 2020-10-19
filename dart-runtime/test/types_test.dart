import 'package:sdkgen_runtime/types.dart';
import 'package:test/test.dart';

enum TestEnum { first, second, third }

void main() {
  test('Handle int', () {
    expect(encode(new Map(), "", "int", 23), 23);
    expect(encode(new Map(), "", "int", -266), -266);

    // See types.dart at simpleEncodeDecode()
    // expect(() => encode(new Map(), "", "int", "123"),
    //     throwsA(isA<SdkgenTypeException>()));
  });

  test('Handle bigint', () {
    expect(encode(new Map(), "", "bigint", BigInt.from(23)), "23");
    expect(encode(new Map(), "", "bigint", BigInt.from(-266)), "-266");
    expect(decode(new Map(), "", "bigint", "23"), BigInt.from(23));
    expect(decode(new Map(), "", "bigint", "-266"), BigInt.from(-266));
    expect(decode(new Map(), "", "bigint", 23), BigInt.from(23));
    expect(decode(new Map(), "", "bigint", -266), BigInt.from(-266));

    expect(() => encode(new Map(), "", "bigint", 123),
        throwsA(isA<SdkgenTypeException>()));
    expect(() => encode(new Map(), "", "bigint", "aaa"),
        throwsA(isA<SdkgenTypeException>()));
  });

  test('Handle enum', () {
    var typeTable = new Map<String, Object>();
    typeTable["TestEnum"] = new EnumTypeDescription(
        TestEnum, TestEnum.values, ["first", "second", "third"]);

    expect(encode(typeTable, "", "TestEnum", TestEnum.first), "first");
    expect(encode(typeTable, "", "TestEnum", TestEnum.second), "second");
    expect(decode(typeTable, "", "TestEnum", "first"), TestEnum.first);
    expect(decode(typeTable, "", "TestEnum", "second"), TestEnum.second);

    expect(() => encode(typeTable, "", "TestEnum", "other"),
        throwsA(isA<SdkgenTypeException>()));

    expect(() => decode(typeTable, "", "TestEnum", "other"),
        throwsA(isA<SdkgenTypeException>()));

    expect(() => decode(typeTable, "", "TestEnum", null),
        throwsA(isA<SdkgenTypeException>()));
    expect(decode(typeTable, "", "TestEnum?", null), null);
  });

  test('Handle arrays', () {
    var typeTable = new Map<String, Object>();
    typeTable["TestEnum"] = new EnumTypeDescription(
        TestEnum, TestEnum.values, ["first", "second", "third"]);

    expect(
        encode(typeTable, "", "TestEnum[]", [TestEnum.first, TestEnum.third]),
        ["first", "third"]);
    expect(decode(typeTable, "", "TestEnum[]", ["first", "third"]),
        [TestEnum.first, TestEnum.third]);

    expect(encode(typeTable, "", "TestEnum?[]", [null, TestEnum.third]),
        [null, "third"]);
    expect(decode(typeTable, "", "TestEnum?[]", [null, "third"]),
        [null, TestEnum.third]);

    expect(() => encode(typeTable, "", "TestEnum[]", "aaa"),
        throwsA(isA<SdkgenTypeException>()));
    expect(() => decode(typeTable, "", "TestEnum[]", "aaa"),
        throwsA(isA<SdkgenTypeException>()));
  });
}
