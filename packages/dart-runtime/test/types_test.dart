import 'dart:convert';

import 'package:equatable/equatable.dart';
import 'package:sdkgen_runtime/types.dart';
import 'package:test/test.dart';

enum TestEnum { first, second, third }

class TestStruct extends Equatable {
  final String hello;
  final int? stuff;

  TestStruct({required this.hello, this.stuff});

  @override
  List<Object?> get props => [hello, stuff];
}

void main() {
  test('Handle int', () {
    expect(encode({}, '', 'int', 23), 23);
    expect(encode({}, '', 'int', 0), 0);
    expect(encode({}, '', 'int', -266), -266);
    expect(decode({}, '', 'int', 23), 23);
    expect(decode({}, '', 'int', 0), 0);
    expect(decode({}, '', 'int', -266), -266);

    expect(() => encode({}, '', 'int', '123'),
        throwsA(isA<SdkgenTypeException>()));
    expect(() => decode({}, '', 'int', '123'),
        throwsA(isA<SdkgenTypeException>()));
  });

  test('Handle uint', () {
    expect(encode({}, '', 'uint', 0), 0);
    expect(decode({}, '', 'uint', 0), 0);
    expect(encode({}, '', 'uint', 23), 23);
    expect(decode({}, '', 'uint', 23), 23);

    expect(decode({}, '', 'uint', jsonDecode('23')), 23);

    expect(() => encode({}, '', 'uint', '123'),
        throwsA(isA<SdkgenTypeException>()));
    expect(() => decode({}, '', 'uint', '123'),
        throwsA(isA<SdkgenTypeException>()));

    expect(() => encode({}, '', 'uint', -123),
        throwsA(isA<SdkgenTypeException>()));
    expect(() => decode({}, '', 'uint', -123),
        throwsA(isA<SdkgenTypeException>()));
  });

  test('Handle float', () {
    expect(encode({}, '', 'float', 0), 0);
    expect(encode({}, '', 'float', 23), 23);
    expect(encode({}, '', 'float', -266), -266);
    expect(encode({}, '', 'float', -1.5), -1.5);
    expect(decode({}, '', 'float', 0), 0);
    expect(decode({}, '', 'float', 23), 23);
    expect(decode({}, '', 'float', -266), -266);
    expect(decode({}, '', 'float', -1.5), -1.5);

    expect(decode({}, '', 'float', jsonDecode('23.2')), 23.2);

    expect(() => encode({}, '', 'float', '123'),
        throwsA(isA<SdkgenTypeException>()));
    expect(() => decode({}, '', 'float', '123'),
        throwsA(isA<SdkgenTypeException>()));
  });

  test('Handle bigint', () {
    expect(encode({}, '', 'bigint', BigInt.from(23)), '23');
    expect(encode({}, '', 'bigint', BigInt.from(-266)), '-266');
    expect(decode({}, '', 'bigint', '23'), BigInt.from(23));
    expect(decode({}, '', 'bigint', '-266'), BigInt.from(-266));
    expect(decode({}, '', 'bigint', 23), BigInt.from(23));
    expect(decode({}, '', 'bigint', -266), BigInt.from(-266));

    expect(() => encode({}, '', 'bigint', 123),
        throwsA(isA<SdkgenTypeException>()));
    expect(() => encode({}, '', 'bigint', 'aaa'),
        throwsA(isA<SdkgenTypeException>()));
  });

  test('Handle object', () {
    var typeTable = <String, Object>{};
    typeTable['TestStruct'] = StructTypeDescription(
        TestStruct,
        {'hello': 'string', 'stuff': 'int?'},
        (Map fields) => TestStruct(
            hello: fields['hello'] as String, stuff: fields['stuff'] as int?),
        (TestStruct obj) => ({'hello': obj.hello, 'stuff': obj.stuff}));

    expect(encode(typeTable, '', 'TestStruct', TestStruct(hello: 'hi')),
        {'hello': 'hi', 'stuff': null});
    expect(
        encode(
            typeTable, '', 'TestStruct', TestStruct(hello: 'haa', stuff: 12)),
        {'hello': 'haa', 'stuff': 12});

    expect(decode(typeTable, '', 'TestStruct', {'hello': 'hi', 'stuff': null}),
        TestStruct(hello: 'hi'));
    expect(decode(typeTable, '', 'TestStruct', {'hello': 'hi'}),
        TestStruct(hello: 'hi'));
    expect(decode(typeTable, '', 'TestStruct', {'hello': 'hi', 'another': 45}),
        TestStruct(hello: 'hi'));
    expect(decode(typeTable, '', 'TestStruct', {'hello': 'haa', 'stuff': 12}),
        TestStruct(hello: 'haa', stuff: 12));

    expect(() => decode(typeTable, '', 'TestStruct', {'stuff': 12}),
        throwsA(isA<SdkgenTypeException>()));
  });

  test('Handle enum', () {
    var typeTable = <String, Object>{};
    typeTable['TestEnum'] = EnumTypeDescription(
        TestEnum, TestEnum.values, ['first', 'second', 'third']);

    expect(encode(typeTable, '', 'TestEnum', TestEnum.first), 'first');
    expect(encode(typeTable, '', 'TestEnum', TestEnum.second), 'second');
    expect(decode(typeTable, '', 'TestEnum', 'first'), TestEnum.first);
    expect(decode(typeTable, '', 'TestEnum', 'second'), TestEnum.second);

    expect(() => encode(typeTable, '', 'TestEnum', 'other'),
        throwsA(isA<SdkgenTypeException>()));

    expect(() => decode(typeTable, '', 'TestEnum', 'other'),
        throwsA(isA<SdkgenTypeException>()));

    expect(() => decode(typeTable, '', 'TestEnum', null),
        throwsA(isA<SdkgenTypeException>()));
    expect(decode(typeTable, '', 'TestEnum?', null), null);
  });

  test('Handle arrays', () {
    var typeTable = <String, Object>{};
    typeTable['TestEnum'] = EnumTypeDescription(
        TestEnum, TestEnum.values, ['first', 'second', 'third']);

    expect(
        encode(typeTable, '', 'TestEnum[]', [TestEnum.first, TestEnum.third]),
        ['first', 'third']);
    expect(decode(typeTable, '', 'TestEnum[]', ['first', 'third']),
        [TestEnum.first, TestEnum.third]);

    expect(encode(typeTable, '', 'TestEnum?[]', [null, TestEnum.third]),
        [null, 'third']);
    expect(decode(typeTable, '', 'TestEnum?[]', [null, 'third']),
        [null, TestEnum.third]);

    expect(() => encode(typeTable, '', 'TestEnum[]', 'aaa'),
        throwsA(isA<SdkgenTypeException>()));
    expect(() => decode(typeTable, '', 'TestEnum[]', 'aaa'),
        throwsA(isA<SdkgenTypeException>()));
  });
}
