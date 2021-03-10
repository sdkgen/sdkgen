import 'dart:convert';
import 'dart:math';

import 'package:convert/convert.dart';
import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'types.dart';

import 'deviceinfo_generic.dart'
    if (dart.library.io) 'deviceinfo_io.dart'
    if (dart.library.html) 'deviceinfo_web.dart';

class SdkgenError implements Exception {
  String message;
  SdkgenError(this.message);
}

class SdkgenErrorWithData<T> implements Exception {
  String message;
  T data;
  SdkgenErrorWithData(this.message, this.data);
}

class SdkgenHttpClient {
  Uri baseUrl;
  Map<String, dynamic> extra = <String, dynamic>{};
  Map<String, String> headers = <String, String>{};
  Map<String, Object> typeTable;
  Map<String, FunctionDescription> fnTable;
  Map<String, SdkgenErrorDescription> errTable;
  String? deviceId;
  Random random = Random.secure();
  BuildContext? context;

  SdkgenHttpClient(
      baseUrl, this.context, this.typeTable, this.fnTable, this.errTable)
      : baseUrl = Uri.parse(baseUrl);

  String _randomBytesHex(int bytes) {
    return hex.encode(List<int>.generate(bytes, (i) => random.nextInt(256)));
  }

  dynamic _throwError(String type, String message, dynamic data) {
    var description = errTable[type] ?? errTable['Fatal']!;
    var decodedData =
        decode(typeTable, '$type.data', description.dataType, data);
    throw Function.apply(description.create, [message, decodedData]);
  }

  Future<String> _deviceId() async {
    if (deviceId == null) {
      var prefs = await SharedPreferences.getInstance();
      if (prefs.containsKey('sdkgen_deviceId')) {
        deviceId = prefs.getString('sdkgen_deviceId');
      } else {
        await prefs.setString(
            'sdkgen_deviceId', deviceId = _randomBytesHex(16));
      }
    }
    return deviceId!;
  }

  Future<Object> makeRequest(
      String functionName, Map<String, Object> args) async {
    try {
      var func = fnTable[functionName]!;
      var encodedArgs = {};
      args.forEach((argName, argValue) {
        encodedArgs[argName] = encode(typeTable, '$functionName.args.$argName',
            func.args[argName]!, argValue);
      });

      var body = {
        'version': 3,
        'requestId': _randomBytesHex(16),
        'name': functionName,
        'args': encodedArgs,
        'extra': extra,
        'deviceInfo': await getDeviceInfo(context, await _deviceId())
      };

      var response = await http.post(
        baseUrl,
        headers: headers,
        body: jsonEncode(body),
      );

      var responseBody = jsonDecode(utf8.decode(response.bodyBytes));

      if (responseBody['error'] != null) {
        throw _throwError(responseBody['error']['type'],
            responseBody['error']['message'], responseBody['error']['data']);
      } else {
        return decode(
            typeTable, '$functionName.ret', func.ret, responseBody['result']);
      }
    } catch (e) {
      if (e is SdkgenError || e is SdkgenErrorWithData) {
        rethrow;
      } else {
        throw _throwError('Fatal', e.toString(), null);
      }
    }
  }
}
