import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:convert/convert.dart';
import 'package:device_info/device_info.dart';
import 'package:flutter/widgets.dart';
import 'package:get_version/get_version.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

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
  BuildContext context;

  SdkgenHttpClient(
      this.baseUrl, this.context, this.typeTable, this.fnTable, this.errTable);

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

      var locale = context == null ? null : Localizations.localeOf(context);

      var platform = {
        "os": Platform.operatingSystem,
        "osVersion": Platform.operatingSystemVersion,
        "dartVersion": Platform.version,
        "appId": await GetVersion.appID,
        "screenWidth": context == null ? 0 : MediaQuery.of(context).size.width,
        "screenHeight": context == null ? 0 : MediaQuery.of(context).size.height
      };

      var deviceInfo = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        var androidInfo = await deviceInfo.androidInfo;
        platform["model"] = androidInfo.model;
        platform["brand"] = androidInfo.brand;
      } else if (Platform.isIOS) {
        var iosInfo = await deviceInfo.iosInfo;
        platform["model"] = iosInfo.model;
      }

      var body = {
        "version": 3,
        "requestId": _randomBytesHex(16),
        "name": functionName,
        "args": encodedArgs,
        "extra": {},
        "deviceInfo": {
          "id": await _deviceId(),
          "language": locale == null
              ? null
              : "${locale.languageCode}-${locale.countryCode}",
          "platform": platform,
          "timezone": DateTime.now().timeZoneName,
          "type": Platform.isAndroid
              ? "android"
              : Platform.isIOS ? "ios" : "flutter",
          "version": await GetVersion.projectVersion
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
