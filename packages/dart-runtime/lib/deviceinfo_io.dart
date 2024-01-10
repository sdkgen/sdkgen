import 'dart:io';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';

Future<Map<String, Object?>> getDeviceInfo(String deviceId) async {
  PackageInfo? packageInfo;
  try {
    packageInfo = await PackageInfo.fromPlatform();
    // ignore: empty_catches
  } catch (e) {}

  final window =
      PlatformDispatcher.instance.views.whereType<FlutterView>().first;
  final screenSize = window.physicalSize / window.devicePixelRatio;

  final platform = {
    'os': Platform.operatingSystem,
    'osVersion': Platform.operatingSystemVersion,
    'dartVersion': Platform.version,
    'appId': packageInfo?.packageName,
    'screenWidth': screenSize.width,
    'screenHeight': screenSize.height
  };

  final deviceInfo = DeviceInfoPlugin();

  if (Platform.isAndroid) {
    final androidInfo = await deviceInfo.androidInfo;
    platform['model'] = androidInfo.model; // Ex: 'SM-G973F' for Samsung S10
    platform['brand'] = androidInfo.brand; // Ex: 'Samsung'
    platform['version'] = androidInfo.version.release; // 10
    platform['sdkVersion'] = androidInfo.version.sdkInt; // 29
  } else if (Platform.isIOS) {
    final iosInfo = await deviceInfo.iosInfo;
    // Ex: 'iPhone7,1' for iPhone 6 Plus
    // List of possible hardware type strings for iOS:
    // https://gist.github.com/adamawolf/3048717
    platform['model'] = iosInfo.utsname.machine;
    platform['brand'] = 'Apple';
    platform['version'] = iosInfo.systemVersion; // 13.1
  }

  return {
    'id': deviceId,
    'language': Platform.localeName.replaceAll('_', '-'),
    'platform': platform,
    'timezone': DateTime.now().timeZoneName,
    'type': _getDeviceTypeString(),
    'version': packageInfo?.version
  };
}

String _getDeviceTypeString() {
  return kIsWeb ? 'web' : Platform.operatingSystem;
}
