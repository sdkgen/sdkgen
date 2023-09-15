import 'dart:convert';
import 'package:decimal/decimal.dart';

import 'http_client.dart';

typedef Json = Map<String, dynamic>;

class SdkgenTypeException implements Exception {
  String cause;
  SdkgenTypeException(this.cause);
  @override
  String toString() => 'SdkgenTypeException: $cause';
}

class StructTypeDescription {
  Type type;
  Map<String, String> fields;
  Function createFromFields;
  Function exportAsMap;

  StructTypeDescription(
      this.type, this.fields, this.createFromFields, this.exportAsMap);
}

class EnumTypeDescription {
  Type type;
  List<Object> enumValues;
  List<String> stringValues;

  EnumTypeDescription(this.type, this.enumValues, this.stringValues);
}

class FunctionDescription {
  String ret;
  Map<String, String> args;
  FunctionDescription(this.ret, this.args);
}

class SdkgenErrorDescription {
  String dataType;
  SdkgenError Function(String msg, Json req, dynamic data) create;
  SdkgenErrorDescription(this.dataType, this.create);
}

class LatLng {
  double lat;
  double lng;
  LatLng(this.lat, this.lng);
}

const simpleStringTypes = {'string', 'cnpj', 'cpf', 'email', 'html', 'xml'};
const simpleTypes = {
  'json',
  'bool',
  'url',
  'int',
  'uint',
  'float',
  'money',
  'hex',
  'uuid',
  'base64',
  'void',
  ...simpleStringTypes,
};

dynamic simpleEncodeDecode(
  Map<String, Object> typeTable,
  String path,
  String type,
  Object? value,
) {
  if (simpleStringTypes.contains(type)) {
    if (value is! String) {
      throw SdkgenTypeException(
          'Invalid Type at \'$path\', expected $type, got ${jsonEncode(value)}');
    }
    return value;
  }

  switch (type) {
    case 'json':
      return jsonDecode(jsonEncode(value, toEncodable: (Object? obj) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected $type, got ${obj.runtimeType}');
      }));
    case 'bool':
      if (value is! bool) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected $type, got ${jsonEncode(value)}');
      }
      return value;
    case 'hex':
      if (value is! String ||
          !RegExp(r'^(?:[A-Fa-f0-9]{2})*$').hasMatch(value)) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected $type, got ${jsonEncode(value)}');
      }
      return value;
    case 'uuid':
      if (value is! String ||
          !RegExp(r'^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$')
              .hasMatch(value)) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected $type, got ${jsonEncode(value)}');
      }
      return value;
    case 'base64':
      if (value is! String ||
          Base64Encoder().convert(Base64Decoder().convert(value)) != value) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected $type, got ${jsonEncode(value)}');
      }
      return value;
    case 'int':
      if (value is! int) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected $type, got ${jsonEncode(value)}');
      }
      return value;
    case 'uint':
      if (value is! int || value < 0) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected $type, got ${jsonEncode(value)}');
      }
      return value;
    case 'float':
      if (value is! double && value is! int) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected $type, got ${jsonEncode(value)}');
      }
      return value;
    case 'money':
      if (value is! int) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected $type, got ${jsonEncode(value)}');
      }
      return value;
    case 'url':
      if (value is! String || Uri.tryParse(value) == null) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected $type, got ${jsonEncode(value)}');
      }

      return Uri.parse(value).toString();
    case 'void':
      return null;
  }

  throw SdkgenTypeException('Unknown type \'$type\' at \'$path\'');
}

dynamic encode(
  Map<String, Object> typeTable,
  String path,
  Object type,
  Object? value,
) {
  if (type is EnumTypeDescription) {
    if (!type.enumValues.contains(value) || value == null) {
      throw SdkgenTypeException(
          'Invalid Type at \'$path\', expected ${type.type}, got ${jsonEncode(value)}');
    }
    return type.stringValues[type.enumValues.indexOf(value)];
  } else if (type is StructTypeDescription) {
    if (value.runtimeType != type.type) {
      throw SdkgenTypeException(
          'Invalid Type at \'$path\', expected ${type.type}, got ${jsonEncode(value)}');
    }
    final map =
        Function.apply(type.exportAsMap, [value]) as Map<String, Object?>;
    final resultMap = {};
    map.forEach((fieldName, fieldValue) {
      resultMap[fieldName] = encode(
        typeTable,
        '$path.$fieldName',
        type.fields[fieldName]!,
        fieldValue,
      );
    });
    return resultMap;
  } else if (type is String) {
    if (type.endsWith('?')) {
      if (value == null) {
        return null;
      } else {
        return encode(
          typeTable,
          path,
          type.substring(0, type.length - 1),
          value,
        );
      }
    } else if (type.endsWith('[]')) {
      if (value is! List) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
      }
      return value
          .asMap()
          .entries
          .map((entry) => encode(
                typeTable,
                '$path[${entry.key}]',
                type.substring(0, type.length - 2),
                entry.value,
              ))
          .toList();
    } else {
      switch (type) {
        case 'bytes':
          if (value is! List<int>) {
            throw SdkgenTypeException(
                'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
          }
          return Base64Encoder().convert(value);
        case 'bigint':
          if (value is! BigInt) {
            throw SdkgenTypeException(
                'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
          }
          return value.toString();
        case 'date':
          if (value is! DateTime) {
            throw SdkgenTypeException(
                'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
          }
          return value.toIso8601String().split('T')[0];
        case 'datetime':
          if (value is! DateTime) {
            throw SdkgenTypeException(
                'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
          }
          return value.toUtc().toIso8601String().replaceAll('Z', '');
        case 'decimal':
          if (value is Decimal) {
            return value.toString();
          }
          if (value is! num &&
              (value is! String ||
                  !RegExp(r'^-?[0-9]+(?:\.[0-9]+)?$').hasMatch(value))) {
            throw SdkgenTypeException(
                'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
          }
          return Decimal.parse("$value").toString();
        default:
          if (simpleTypes.contains(type)) {
            return simpleEncodeDecode(typeTable, path, type, value);
          } else if (typeTable.containsKey(type)) {
            return encode(typeTable, path, typeTable[type]!, value);
          } else {
            throw SdkgenTypeException(
                'Unknown type \'${jsonEncode(type)}\' at \'$path\'');
          }
      }
    }
  } else {
    throw SdkgenTypeException(
        'Unknown type \'${jsonEncode(type)}\' at \'$path\'');
  }
}

dynamic decode(
    Map<String, Object> typeTable, String path, Object type, Object? value) {
  if (type is EnumTypeDescription) {
    if (value is! String || !type.stringValues.contains(value)) {
      throw SdkgenTypeException(
          'Invalid Type at \'$path\', expected ${type.type}, got ${jsonEncode(value)}');
    }
    return type.enumValues[type.stringValues.indexOf(value)];
  } else if (type is StructTypeDescription) {
    if (value is! Map) {
      throw SdkgenTypeException(
          'Invalid Type at \'$path\', expected ${type.type}, got ${jsonEncode(value)}');
    }
    final resultMap = {};
    for (var fieldName in type.fields.keys) {
      resultMap[fieldName] = decode(
        typeTable,
        '$path.$fieldName',
        type.fields[fieldName]!,
        value[fieldName],
      );
    }
    return Function.apply(type.createFromFields, [resultMap]);
  } else if (type is String) {
    if (type.endsWith('?')) {
      if (value == null) {
        return null;
      } else {
        return decode(
          typeTable,
          path,
          type.substring(0, type.length - 1),
          value,
        );
      }
    } else if (type.endsWith('[]')) {
      if (value is! List) {
        throw SdkgenTypeException(
            'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
      }
      return value
          .asMap()
          .entries
          .map((entry) => decode(
                typeTable,
                '$path[${entry.key}]',
                type.substring(0, type.length - 2),
                entry.value,
              ))
          .toList();
    } else {
      switch (type) {
        case 'bytes':
          if (value is! String) {
            throw SdkgenTypeException(
                'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
          }
          return Base64Decoder().convert(value);
        case 'bigint':
          if (value is num) {
            return BigInt.from(value);
          } else {
            if ((value is! String || !RegExp(r'^-?[0-9]+$').hasMatch(value))) {
              throw SdkgenTypeException(
                  'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
            }
            return BigInt.parse(value);
          }
        case 'date':
          if (value is! String ||
              !RegExp(r'^[0-9]{4}-[01][0-9]-[0123][0-9]$').hasMatch(value)) {
            throw SdkgenTypeException(
                'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
          }
          return DateTime.parse('${value}T00:00:00Z');
        case 'datetime':
          if (value is! String ||
              !RegExp(r'^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](\.[0-9]{1,6})?Z?$')
                  .hasMatch(value)) {
            throw SdkgenTypeException(
                'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
          }
          return DateTime.parse('${value}Z').toLocal();
        case 'decimal':
          if (value is! num &&
              (value is! String ||
                  !RegExp(r'^-?[0-9]+(?:\.[0-9]+)?$').hasMatch(value))) {
            throw SdkgenTypeException(
                'Invalid Type at \'$path\', expected ${jsonEncode(type)}, got ${jsonEncode(value)}');
          }
          return Decimal.parse("$value");
        default:
          if (simpleTypes.contains(type)) {
            return simpleEncodeDecode(typeTable, path, type, value);
          } else if (typeTable.containsKey(type)) {
            return decode(typeTable, path, typeTable[type]!, value);
          } else {
            throw SdkgenTypeException(
                'Unknown type \'${jsonEncode(type)}\' at \'$path\'');
          }
      }
    }
  } else {
    throw SdkgenTypeException(
        'Unknown type \'${jsonEncode(type)}\' at \'$path\'');
  }
}
