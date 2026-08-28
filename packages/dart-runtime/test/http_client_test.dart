import 'package:sdkgen_runtime/http_client.dart';
import 'package:test/test.dart';

void main() {
  group('buildRequestUrl', () {
    test('appends function name to base URL without trailing slash', () {
      expect(
        buildRequestUrl(Uri.parse('https://api.example.com'), 'getUser')
            .toString(),
        'https://api.example.com/getUser',
      );
    });

    test('appends function name to base URL with trailing slash', () {
      expect(
        buildRequestUrl(Uri.parse('https://api.example.com/'), 'getUser')
            .toString(),
        'https://api.example.com/getUser',
      );
    });

    test('appends function name preserving a base path', () {
      expect(
        buildRequestUrl(Uri.parse('https://api.example.com/api'), 'getUser')
            .toString(),
        'https://api.example.com/api/getUser',
      );
    });

    test('appends function name preserving a base path with trailing slash',
        () {
      expect(
        buildRequestUrl(Uri.parse('https://api.example.com/api/'), 'getUser')
            .toString(),
        'https://api.example.com/api/getUser',
      );
    });

    test('preserves port', () {
      expect(
        buildRequestUrl(Uri.parse('http://localhost:8000'), 'getUser')
            .toString(),
        'http://localhost:8000/getUser',
      );
    });
  });
}
