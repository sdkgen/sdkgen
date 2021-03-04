import 'dart:convert';
import 'dart:math';

import 'package:convert/convert.dart';
import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'types.dart';

import 'deviceinfo_generic.dart'
    if (dart.library.io) 'deviceinfo_io.dart'
    if (dart.library.js) 'deviceinfo_web.dart';

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
  String baseUrl;
  Map<String, dynamic> extra = new Map<String, dynamic>();
  Map<String, String> headers = new Map<String, String>();
  Map<String, Object> typeTable;
  Map<String, FunctionDescription> fnTable;
  Map<String, SdkgenErrorDescription> errTable;
  String? deviceId;
  Random random = Random.secure();
  BuildContext? context;

  SdkgenHttpClient(
      this.baseUrl, this.context, this.typeTable, this.fnTable, this.errTable);

  _randomBytesHex(int bytes) {
    return hex.encode(List<int>.generate(bytes, (i) => random.nextInt(256)));
  }

  _throwError(String type, String message, dynamic data) {
    var description = errTable[type] ?? errTable["Fatal"]!;
    var decodedData =
        decode(this.typeTable, "$type.data", description.dataType, data);
    throw Function.apply(description.create, [message, decodedData]);
  }

  _deviceId() async {
    if (deviceId == null) {
      SharedPreferences prefs = await SharedPreferences.getInstance();
      if (prefs.containsKey("sdkgen_deviceId")) {
        deviceId = prefs.getString("sdkgen_deviceId");
      } else {
        prefs.setString("sdkgen_deviceId", deviceId = _randomBytesHex(16));
      }
    }
    return deviceId;
  }

  Future<Object> makeRequest(
      String functionName, Map<String, Object> args) async {
    try {
      var func = fnTable[functionName]!;
      var encodedArgs = Map();
      args.forEach((argName, argValue) {
        encodedArgs[argName] = encode(typeTable, "$functionName.args.$argName",
            func.args[argName]!, argValue);
      });

      var body = {
        "version": 3,
        "requestId": _randomBytesHex(16),
        "name": functionName,
        "args": encodedArgs,
        "extra": this.extra,
        "deviceInfo": await getDeviceInfo(context, await _deviceId())
      };

      var response = await http.post(Uri.parse(baseUrl),
          headers: this.headers, body: jsonEncode(body));
      var responseBody = jsonDecode(utf8.decode(response.bodyBytes));

      if (responseBody["error"] != null) {
        throw _throwError(responseBody["error"]["type"],
            responseBody["error"]["message"], responseBody["error"]["data"]);
      } else {
        return decode(
            typeTable, "$functionName.ret", func.ret, responseBody["result"]);
      }
    } catch (e) {
      if (e is SdkgenError || e is SdkgenErrorWithData)
        throw e;
      else
        throw _throwError("Fatal", e.toString(), null);
    }
  }
}
