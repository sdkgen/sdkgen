import 'dart:io';
import 'package:device_info/device_info.dart';
import 'package:flutter/widgets.dart';
import 'package:package_info/package_info.dart';

Future<Map<String, Object?>> getDeviceInfo(
    BuildContext? context, String deviceId) async {
  var locale = context == null ? null : Localizations.localeOf(context);

  PackageInfo? packageInfo;
  try {
    packageInfo = await PackageInfo.fromPlatform();
  } catch (e) {}

  final platform = {
    "os": Platform.operatingSystem,
    "osVersion": Platform.operatingSystemVersion,
    "dartVersion": Platform.version,
    "appId": packageInfo?.packageName,
    "screenWidth": context == null ? 0 : MediaQuery.of(context).size.width,
    "screenHeight": context == null ? 0 : MediaQuery.of(context).size.height
  };

  final deviceInfo = DeviceInfoPlugin();

  if (Platform.isAndroid) {
    final androidInfo = await deviceInfo.androidInfo;
    platform["model"] = androidInfo.model; // Ex: SM-1234
    platform["brand"] = androidInfo.brand; // Ex: Samsung
    platform["version"] = androidInfo.version.release; // 10
    platform["sdkVersion"] = androidInfo.version.sdkInt; // 29
  } else if (Platform.isIOS) {
    final iosInfo = await deviceInfo.iosInfo;
    platform["model"] = iosInfo.name; // Ex: iPhone 11 Pro Max
    platform["brand"] = "Apple";
    platform["version"] = iosInfo.systemVersion; // 13.1
  }

  return {
    "id": deviceId,
    "language":
        locale == null ? null : "${locale.languageCode}-${locale.countryCode}",
    "platform": platform,
    "timezone": DateTime.now().timeZoneName,
    "type": Platform.isAndroid
        ? "android"
        : Platform.isIOS
            ? "ios"
            : "flutter",
    "version": packageInfo?.version
  };
}
