import 'package:flutter/widgets.dart';
import 'dart:html';

Future<Map<String, Object?>> getDeviceInfo(
    BuildContext? context, String deviceId) async {
  var locale = context == null ? null : Localizations.localeOf(context);

  return {
    "id": deviceId,
    "language":
        locale == null ? null : "${locale.languageCode}-${locale.countryCode}",
    "platform": {"browserUserAgent": window.navigator.userAgent},
    "timezone": DateTime.now().timeZoneName,
    "type": "web",
    "version": document.currentScript?.getAttribute("src") ?? ""
  };
}
