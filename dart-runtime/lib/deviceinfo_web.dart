// ignore_for_file: avoid_web_libraries_in_flutter
import 'package:flutter/widgets.dart';
import 'dart:html';
import 'dart:js' as js;

Future<Map<String, Object?>> getDeviceInfo(
    BuildContext? context, String deviceId) async {
  var locale = context == null ? null : Localizations.localeOf(context);

  // Intl.DateTimeFormat().resolvedOptions().timeZone
  var timeZoneName = js.context["Intl"] == null
      ? DateTime.now().timeZoneName
      : (((js.context["Intl"] as js.JsObject).callMethod("DateTimeFormat")
              as js.JsObject)
          .callMethod("resolvedOptions") as js.JsObject)["timeZone"] as String;

  return {
    "id": deviceId,
    "language":
        locale == null ? null : "${locale.languageCode}-${locale.countryCode}",
    "platform": {"browserUserAgent": window.navigator.userAgent},
    "timezone": timeZoneName,
    "type": "web",
    "version": document.currentScript?.getAttribute("src") ?? ""
  };
}
