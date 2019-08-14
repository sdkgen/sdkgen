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

const simpleStringTypes = [
  "string",
  "cep",
  "cnpj",
  "cpf",
  "email",
  "phone",
  "safehtml",
  "url",
  "xml"
];
var simpleTypes = [
      "any",
      "bool",
      "hex",
      "uuid",
      "base64",
      "int",
      "uint",
      "float",
      "money",
      "void",
      "latlng"
    ] +
    simpleStringTypes;

simpleEncodeDecode(
    Map<String, Object> typeTable, String path, Object type, Object value) {
  // TODO: Typecheck
  return value;
}

encode(Map<String, Object> typeTable, String path, Object type, Object value) {
  if (type.runtimeType == EnumTypeDescription) {
    var enumType = type as EnumTypeDescription;
    if (!enumType.enumValues.contains(value)) {
      throw SdkgenTypeException(
          "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
    }
    return enumType.stringValues[enumType.enumValues.indexOf(value)];
  } else if (type.runtimeType == StructTypeDescription) {
    var struct = type as StructTypeDescription;
    if (value.runtimeType != struct.type) {
      throw SdkgenTypeException(
          "Invalid Type at '$path', expected ${struct.type}, got ${jsonEncode(value)}");
    }
    var map =
        Function.apply(struct.exportAsMap, [value]) as Map<String, Object>;
    var resultMap = Map();
    map.forEach((fieldName, fieldValue) {
      resultMap[fieldName] = encode(
          typeTable, "$path.$fieldName", struct.fields[fieldName], fieldValue);
    });
    return resultMap;
  } else if (type.runtimeType == String) {
    var typeString = type as String;
    if (typeString.endsWith("?")) {
      if (value == null) {
        return null;
      } else {
        return encode(typeTable, path,
            typeString.substring(0, typeString.length - 1), value);
      }
    } else if (typeString.endsWith("[]")) {
      if (value.runtimeType != List) {
        throw SdkgenTypeException(
            "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
      }
      return (value as List).asMap().entries.map((entry) => encode(
          typeTable,
          "$path[${entry.key}]",
          typeString.substring(0, typeString.length - 2),
          entry.value));
    } else {
      switch (typeString) {
        case "bytes":
          if (value.runtimeType != List) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return Base64Encoder().convert(value);
        case "date":
          if (value.runtimeType != DateTime) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return (value as DateTime).toIso8601String().split("T")[0];
        case "datetime":
          if (value.runtimeType != DateTime) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return (value as DateTime)
              .toUtc()
              .toIso8601String()
              .replaceAll("Z", "");
        default:
          if (simpleTypes.contains(typeString)) {
            return simpleEncodeDecode(typeTable, path, type, value);
          } else if (typeTable.containsKey(typeString)) {
            return encode(typeTable, path, typeTable[typeString], value);
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
  if (type.runtimeType == EnumTypeDescription) {
    var enumType = type as EnumTypeDescription;
    if (!enumType.stringValues.contains(value)) {
      throw SdkgenTypeException(
          "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
    }
    return enumType.enumValues[enumType.stringValues.indexOf(value)];
  } else if (type.runtimeType == StructTypeDescription) {
    var struct = type as StructTypeDescription;
    if (value.runtimeType != struct.type) {
      throw SdkgenTypeException(
          "Invalid Type at '$path', expected ${struct.type}, got ${jsonEncode(value)}");
    }
    var resultMap = Map();
    (value as Map).forEach((fieldName, fieldValue) {
      resultMap[fieldName] = decode(
          typeTable, "$path.$fieldName", struct.fields[fieldName], fieldValue);
    });
    return Function.apply(struct.createFromFields, [resultMap]);
  } else if (type.runtimeType == String) {
    var typeString = type as String;
    if (typeString.endsWith("?")) {
      if (value == null) {
        return null;
      } else {
        return decode(typeTable, path,
            typeString.substring(0, typeString.length - 1), value);
      }
    } else if (typeString.endsWith("[]")) {
      if (value.runtimeType != List) {
        throw SdkgenTypeException(
            "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
      }
      return (value as List).asMap().entries.map((entry) => decode(
          typeTable,
          "$path[${entry.key}]",
          typeString.substring(0, typeString.length - 2),
          entry.value));
    } else {
      switch (typeString) {
        case "bytes":
          if (value.runtimeType != String) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return Base64Decoder().convert(value);
        case "date":
          if (value.runtimeType != String ||
              !RegExp(r'^[0-9]{4}-[01][0-9]-[0123][0-9]$').hasMatch(value)) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return DateTime.parse("${value}T00:00:00Z");
        case "datetime":
          if (value.runtimeType != String ||
              !RegExp(r'^[0-9]{4}-[01][0-9]-[0123][0-9]T[012][0-9]:[0123456][0-9]:[0123456][0-9](\.[0-9]{1,6})?Z?$')
                  .hasMatch(value)) {
            throw SdkgenTypeException(
                "Invalid Type at '$path', expected ${jsonEncode(type)}, got ${jsonEncode(value)}");
          }
          return DateTime.parse("${value}Z").toLocal();
        default:
          if (simpleTypes.contains(typeString)) {
            return simpleEncodeDecode(typeTable, path, type, value);
          } else if (typeTable.containsKey(typeString)) {
            return decode(typeTable, path, typeTable[typeString], value);
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
