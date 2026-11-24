import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sdkgen_runtime/http_client.dart';
import 'package:sdkgen_runtime/types.dart';
import 'package:shared_preferences/shared_preferences.dart';

class Fatal extends SdkgenError {
  Fatal(super.message, super.request);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late List<http.Request> requests;
  late MockClient mockClient;

  SdkgenHttpClient clientFor(String baseUrl) => SdkgenHttpClient(
        baseUrl,
        mockClient,
        {},
        {
          'sum': FunctionDescription('int', {'a': 'int', 'b': 'int'})
        },
        {
          'Fatal': SdkgenErrorDescription(
              'void', (msg, req, data) => Fatal(msg, req)),
        },
      );

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    requests = [];
    mockClient = MockClient((request) async {
      requests.add(request);
      return http.Response(jsonEncode({'result': 5, 'error': null}), 200);
    });
  });

  test('posts the call to the function path under the base URL', () async {
    final result = await clientFor('https://api.example.com/user')
        .makeRequest('sum', {'a': 2, 'b': 3});

    expect(result, 5);
    expect(requests.single.url.toString(), 'https://api.example.com/user/sum');
  });

  test('does not duplicate the slash when the base URL ends with one',
      () async {
    await clientFor('https://api.example.com/user/')
        .makeRequest('sum', {'a': 2, 'b': 3});

    expect(requests.single.url.toString(), 'https://api.example.com/user/sum');
  });

  test('works with a base URL without a path', () async {
    await clientFor('https://api.example.com')
        .makeRequest('sum', {'a': 2, 'b': 3});

    expect(requests.single.url.toString(), 'https://api.example.com/sum');
  });

  test('keeps sending the function name and arguments in the body', () async {
    await clientFor('https://api.example.com/user')
        .makeRequest('sum', {'a': 2, 'b': 3});

    final body = jsonDecode(requests.single.body) as Map<String, dynamic>;

    expect(requests.single.method, 'POST');
    expect(body['name'], 'sum');
    expect(body['args'], {'a': 2, 'b': 3});
    expect(body['version'], 3);
  });
}
