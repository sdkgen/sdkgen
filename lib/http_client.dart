import 'package:http/http.dart' as http;
import 'package:convert/convert.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:math';

import 'types.dart';

class SdkgenError implements Exception {
  String message;
  SdkgenError(this.message);
}

class SdkgenHttpClient {
  String baseUrl;
  Map<String, Object> typeTable;
  Map<String, FunctionDescription> fnTable;
  Map<String, Function> errTable;
  String deviceId;
  Random random = Random.secure();

  SdkgenHttpClient(this.baseUrl, this.typeTable, this.fnTable, this.errTable);

  _randomBytesHex(int bytes) {
    return hex.encode(List<int>.generate(bytes, (i) => random.nextInt(256)));
  }

  _throwError(String type, String message) {
    var factory = errTable[type] == null ? errTable["Fatal"] : errTable[type];
    throw Function.apply(factory, [message]);
  }

  _deviceId() async {
    if (deviceId == null) {
      SharedPreferences prefs = await SharedPreferences.getInstance();
      if (prefs.containsKey("sdkgen_deviceId")) {
        deviceId = prefs.getString("sdkgen_deviceId");
      } else {
        deviceId = _randomBytesHex(16);
        prefs.setString("sdkgen_deviceId", deviceId);
      }
    }
    return deviceId;
  }

  Future<Object> makeRequest(
      String functionName, Map<String, Object> args) async {
    try {
      var func = fnTable[functionName];
      var encodedArgs = Map();
      args.forEach((argName, argValue) {
        encodedArgs[argName] = encode(typeTable, "$functionName.args.$argName",
            func.args[argName], argValue);
      });

      var body = {
        "version": 3,
        "requestId": _randomBytesHex(16),
        "name": functionName,
        "args": encodedArgs,
        "extra": {},
        "deviceInfo": {
          "id": await _deviceId(),
          "type": "dart"
        }
      };

      var response = await http.post(baseUrl, body: jsonEncode(body));
      var responseBody = jsonDecode(utf8.decode(response.bodyBytes));

      if (responseBody["error"] != null) {
        throw _throwError(
            responseBody["error"]["type"], responseBody["error"]["message"]);
      } else {
        return decode(
            typeTable, "$functionName.ret", func.ret, responseBody["result"]);
      }
    } catch (e) {
      if (e is SdkgenError)
        throw e;
      else
        throw _throwError("Fatal", e.toString());
    }
  }
}
