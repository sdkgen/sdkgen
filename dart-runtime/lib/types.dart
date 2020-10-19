import 'dart:convert';

class SdkgenTypeException implements Exception {
  String cause;
  SdkgenTypeException(this.cause);
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

class LatLng {
  double lat;
  double lng;
  LatLng(this.lat, this.lng);
}

const simpleStringTypes = [
  "string",
  "cnpj",
  "cpf",
  "email",
  "html",
  "phone",
  "url",
  "xml",
  "uuid",
  "base64",
  "hex"
];
var simpleTypes =
    ["any", "bool", "int", "uint", "float", "money"] + simpleStringTypes;

simpleEncodeDecode(
    Map<String, Object> typeTable, String path, Object type, Object value) {
  // TODO: Typecheck
  return value;
}

encode(Map<String, Object> typeTable, String path, Object type, Object value) {
  if (type is EnumTypeDescription) {
    if (!type.enumValues.contains(value)) {
      throw SdkgenTypeException(
          "Invalid Type at '$path', expected ${type.type}, got ${jsonEncode(value)}");
    }
    return type.stringValues[type.enumValues.indexOf(value)];
  } else if (type is StructTypeDescription) {
    if (value.runtimeType != type.type) {
      throw SdkgenTypeException(
          "Invalid Type at '$path', expected ${type.type}, got ${jsonEncode(value)}");
    }
    var map = Function.apply(type.exportAsMap, [value]) as Map<String, Object>;
    var resultMap = Map();
    map.forEach((fieldName, fieldValue) {
      resultMap[fieldName] = encode(
          typeTable, "$path.$fieldName", type.fields[fieldName], fieldValue);
    });
    return resultMap;
  } else if (type is String) {
    if (type.endsWith("?")) {
      if (value == null) {
        return null;
      } else {
        return encode(
            typeTable, path, type.substring(0, type.length - 1), value);
      }
    } else if (type.endsWith("[]")) {
      if (!(value is List)) {
        throw SdkgenTypeException(
            "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
      }
      return (value as List)
          .asMap()
          .entries
          .map((entry) => encode(typeTable, "$path[${entry.key}]",
              type.substring(0, type.length - 2), entry.value))
          .toList();
    } else {
      switch (type) {
        case "bytes":
          if (!(value is List)) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return Base64Encoder().convert(value);
        case "bigint":
          if (!(value is BigInt)) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return (value as BigInt).toString();
        case "date":
          if (!(value is DateTime)) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return (value as DateTime).toIso8601String().split("T")[0];
        case "datetime":
          if (!(value is DateTime)) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return (value as DateTime)
              .toUtc()
              .toIso8601String()
              .replaceAll("Z", "");
        case "void":
          return null;
        default:
          if (simpleTypes.contains(type)) {
            return simpleEncodeDecode(typeTable, path, type, value);
          } else if (typeTable.containsKey(type)) {
            return encode(typeTable, path, typeTable[type], value);
          } else {
            throw SdkgenTypeException(
                "Unknown type '${jsonEncode(type)}' at '$path'");
          }
      }
    }
  } else {
    throw SdkgenTypeException("Unknown type '${jsonEncode(type)}' at '$path'");
  }
}

decode(Map<String, Object> typeTable, String path, Object type, Object value) {
  if (type is EnumTypeDescription) {
    if (!type.stringValues.contains(value)) {
      throw SdkgenTypeException(
          "Invalid Type at '$path', expected ${type.type}, got ${jsonEncode(value)}");
    }
    return type.enumValues[type.stringValues.indexOf(value)];
  } else if (type is StructTypeDescription) {
    if (!(value is Map)) {
      throw SdkgenTypeException(
          "Invalid Type at '$path', expected ${type.type}, got ${jsonEncode(value)}");
    }
    var resultMap = Map();
    (value as Map).forEach((fieldName, fieldValue) {
      resultMap[fieldName] = decode(
          typeTable, "$path.$fieldName", type.fields[fieldName], fieldValue);
    });
    return Function.apply(type.createFromFields, [resultMap]);
  } else if (type is String) {
    if (type.endsWith("?")) {
      if (value == null) {
        return null;
      } else {
        return decode(
            typeTable, path, type.substring(0, type.length - 1), value);
      }
    } else if (type.endsWith("[]")) {
      if (!(value is List)) {
        throw SdkgenTypeException(
            "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
      }
      return (value as List)
          .asMap()
          .entries
          .map((entry) => decode(typeTable, "$path[${entry.key}]",
              type.substring(0, type.length - 2), entry.value))
          .toList();
    } else {
      switch (type) {
        case "bytes":
          if (!(value is String)) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return Base64Decoder().convert(value);
        case "bigint":
          if (!(value is num) &&
              (!(value is String) || !RegExp(r'^-?[0-9]+$').hasMatch(value))) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return value is num ? BigInt.from(value) : BigInt.parse(value);
        case "date":
          if (!(value is String) ||
              !RegExp(r'^[0-9]{4}-[01][0-9]-[0123][0-9]$').hasMatch(value)) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return DateTime.parse("${value}T00:00:00Z");
        case "datetime":
          if (!(value is String) ||
              !RegExp(r'^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](\.[0-9]{1,6})?Z?$')
                  .hasMatch(value)) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return DateTime.parse("${value}Z").toLocal();
        case "void":
          return null;
        default:
          if (simpleTypes.contains(type)) {
            return simpleEncodeDecode(typeTable, path, type, value);
          } else if (typeTable.containsKey(type)) {
            return decode(typeTable, path, typeTable[type], value);
          } else {
            throw SdkgenTypeException(
                "Unknown type '${jsonEncode(type)}' at '$path'");
          }
      }
    }
  } else {
    throw SdkgenTypeException("Unknown type '${jsonEncode(type)}' at '$path'");
  }
}
