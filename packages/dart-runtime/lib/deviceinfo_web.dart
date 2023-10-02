// ignore_for_file: avoid_web_libraries_in_flutter
import 'dart:html';
import 'dart:js' as js;

Future<Map<String, Object?>> getDeviceInfo(String deviceId) async {
  // Intl.DateTimeFormat().resolvedOptions().timeZone
  final timeZoneName = js.context['Intl'] == null
      ? DateTime.now().timeZoneName
      : (((js.context['Intl'] as js.JsObject).callMethod('DateTimeFormat')
              as js.JsObject)
          .callMethod('resolvedOptions') as js.JsObject)['timeZone'] as String;

  return {
    'id': deviceId,
    'language': window.navigator.language,
    'platform': {'browserUserAgent': window.navigator.userAgent},
    'timezone': timeZoneName,
    'type': 'web',
    'version': document.currentScript?.getAttribute('src') ?? ''
  };
}
