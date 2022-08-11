import 'dart:convert';
import 'dart:math';

import 'package:convert/convert.dart';
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

class SdkgenInterceptors {
  Future Function(Map<String, dynamic> body)? onRequest;
  Future Function(dynamic error)? onError;
  Future Function(dynamic response)? onResponse;
}

class SdkgenHttpClient {
  Uri baseUrl;
  Map<String, dynamic> extra = <String, dynamic>{};
  Map<String, String> headers = <String, String>{
    'Content-Type': 'application/sdkgen',
  };
  Map<String, Object> typeTable;
  Map<String, FunctionDescription> fnTable;
  Map<String, SdkgenErrorDescription> errTable;
  String? deviceId;
  Random random = Random.secure();
  final SdkgenInterceptors interceptors = SdkgenInterceptors();

  SdkgenHttpClient(baseUrl, this.typeTable, this.fnTable, this.errTable)
      : baseUrl = Uri.parse(baseUrl);

  String _randomBytesHex(int bytes) {
    return hex.encode(List<int>.generate(bytes, (i) => random.nextInt(256)));
  }

  dynamic _createError(String type, String message, dynamic data) {
    var description = errTable[type] ?? errTable['Fatal']!;
    var decodedData =
        decode(typeTable, '$type.data', description.dataType, data);
    return Function.apply(description.create, [message, decodedData]);
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

  Future<Object?> makeRequest(
    String functionName,
    Map<String, Object?> args,
  ) async {
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
        'deviceInfo': await getDeviceInfo(await _deviceId())
      };

      await interceptors.onRequest?.call(body);

      var response = await http.post(
        baseUrl,
        headers: headers,
        body: jsonEncode(body),
      );

      var responseBody = jsonDecode(utf8.decode(response.bodyBytes));

      if (responseBody['error'] != null) {
        throw _createError(responseBody['error']['type'],
            responseBody['error']['message'], responseBody['error']['data']);
      } else {
        final response = decode(
            typeTable, '$functionName.ret', func.ret, responseBody['result']);

        await interceptors.onResponse?.call(response);

        return response;
      }
    } catch (e) {
      if (e is SdkgenError || e is SdkgenErrorWithData) {
        await interceptors.onError?.call(e);
        rethrow;
      } else {
        final error = _createError('Fatal', e.toString(), null);
        await interceptors.onError?.call(error);

        throw error;
      }
    }
  }
}
