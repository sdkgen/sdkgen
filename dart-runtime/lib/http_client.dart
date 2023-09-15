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
  final String message;
  final Json request;
  const SdkgenError(this.message, [this.request = const {}]);

  @override
  String toString() => '$runtimeType: $message';
}

class SdkgenErrorWithData<T> extends SdkgenError {
  final T data;
  const SdkgenErrorWithData(super.message, super.request, this.data);

  @override
  String toString() => '$runtimeType: $message';
}

class SdkgenInterceptors {
  Future Function(Map<String, dynamic> body)? onRequest;
  Future Function(dynamic error)? onError;
  Future Function(dynamic response)? onResponse;
}

class SdkgenHttpClient {
  final Uri baseUrl;
  final http.Client _client;

  final Map<String, dynamic> extra = <String, dynamic>{};
  final Map<String, String> headers = <String, String>{
    'Content-Type': 'application/sdkgen',
  };
  final Map<String, Object> typeTable;
  final Map<String, FunctionDescription> fnTable;
  final Map<String, SdkgenErrorDescription> errTable;
  final Random random = Random.secure();
  final SdkgenInterceptors interceptors = SdkgenInterceptors();

  String? deviceId;

  SdkgenHttpClient(
    String baseUrl,
    http.Client? client,
    this.typeTable,
    this.fnTable,
    this.errTable,
  )   : baseUrl = Uri.parse(baseUrl),
        _client = client ?? http.Client();

  String _randomBytesHex(int bytes) => hex.encode(List<int>.generate(
        bytes,
        (i) => random.nextInt(256),
        growable: false,
      ));

  SdkgenError _createError(
    String type,
    String message,
    dynamic data,
    Json request,
  ) {
    final description = errTable[type] ?? errTable['Fatal']!;
    final decodedData = decode(
      typeTable,
      '$type.data',
      description.dataType,
      data,
    );
    return Function.apply(
      description.create,
      [message, request, decodedData],
    );
  }

  Future<String> _deviceId() async {
    if (deviceId == null) {
      final prefs = await SharedPreferences.getInstance();
      if (prefs.containsKey('sdkgen_deviceId')) {
        deviceId = prefs.getString('sdkgen_deviceId');
      } else {
        await prefs.setString(
          'sdkgen_deviceId',
          deviceId = _randomBytesHex(16),
        );
      }
    }
    return deviceId!;
  }

  Future<Object?> makeRequest(
    String functionName,
    Map<String, Object?> args,
  ) async {
    final Json requestInfo = {
      'requestId': _randomBytesHex(16),
      'name': functionName,
    };

    try {
      final func = fnTable[functionName]!;
      final encodedArgs = args.map(
        (argName, argValue) => MapEntry(
          argName,
          encode(
            typeTable,
            '$functionName.args.$argName',
            func.args[argName]!,
            argValue,
          ),
        ),
      );

      requestInfo['args'] = encodedArgs;

      final Json body = {
        ...requestInfo,
        'version': 3,
        'extra': extra,
        'deviceInfo': await getDeviceInfo(await _deviceId())
      };

      await interceptors.onRequest?.call(body);

      final response = await _client.post(
        baseUrl,
        headers: headers,
        body: jsonEncode(body),
      );

      final responseBody = jsonDecode(utf8.decode(response.bodyBytes));

      if (responseBody['error'] != null) {
        throw _createError(
          responseBody['error']['type'],
          responseBody['error']['message'],
          responseBody['error']['data'],
          requestInfo,
        );
      } else {
        final response = decode(
            typeTable, '$functionName.ret', func.ret, responseBody['result']);

        await interceptors.onResponse?.call(response);

        return response;
      }
    } catch (e) {
      if (e is SdkgenError) {
        await interceptors.onError?.call(e);
        rethrow;
      } else {
        final error = _createError('Fatal', e.toString(), null, requestInfo);
        await interceptors.onError?.call(error);

        throw error;
      }
    }
  }
}
