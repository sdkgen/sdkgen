import 'dart:io';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:device_info/device_info.dart';
import 'package:package_info/package_info.dart';

Future<Map<String, Object?>> getDeviceInfo(String deviceId) async {
  PackageInfo? packageInfo;
  try {
    packageInfo = await PackageInfo.fromPlatform();
    // ignore: empty_catches
  } catch (e) {}

  final window =
      PlatformDispatcher.instance.views.whereType<FlutterWindow>().first;
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
    platform['model'] = androidInfo.model; // Ex: SM-1234
    platform['brand'] = androidInfo.brand; // Ex: Samsung
    platform['version'] = androidInfo.version.release; // 10
    platform['sdkVersion'] = androidInfo.version.sdkInt; // 29
  } else if (Platform.isIOS) {
    final iosInfo = await deviceInfo.iosInfo;
    platform['model'] = iosInfo.name; // Ex: iPhone 11 Pro Max
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
  if (kIsWeb) {
    return 'web';
  } else if (Platform.isAndroid) {
    return 'android';
  } else if (Platform.isFuchsia) {
    return 'fuchsia';
  } else if (Platform.isIOS) {
    return 'ios';
  } else if (Platform.isLinux) {
    return 'linux';
  } else if (Platform.isMacOS) {
    return 'macos';
  } else if (Platform.isWindows) {
    return 'windows';
  } else {
    return 'flutter';
  }
}
