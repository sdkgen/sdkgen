import 'package:sdkgen_runtime/interceptors.dart';
import 'package:test/test.dart';

class LogInterceptors implements SdkgenInterceptors {
  final List<String> logs = [];

  @override
  OnErrorInterceptor? get onError {
    return (error) async {
      logs.add('on_error_called');
      return print(error.toString());
    };
  }

  @override
  OnRequestInterceptor? get onRequest {
    return (body) async {
      logs.add('on_request_called');
      return print(body.toString());
    };
  }

  @override
  OnResponseInterceptor? get onResponse {
    return (response) async {
      logs.add('on_response_called');
      return print(response.toString());
    };
  }
}

void main() {
  test('onRequest interceptor is called', () async {
    final logInterceptors = LogInterceptors();
    final interceptors = [logInterceptors];

    await interceptors.onRequest({'key': 'value'});

    expect(logInterceptors.logs, contains('on_request_called'));
  });

  test('onResponse interceptor is called', () async {
    final logInterceptors = LogInterceptors();
    final interceptors = [logInterceptors];

    await interceptors.onResponse({'response': 'data'});

    expect(logInterceptors.logs, contains('on_response_called'));
  });

  test('onError interceptor is called', () async {
    final logInterceptors = LogInterceptors();
    final interceptors = [logInterceptors];

    await interceptors.onError(Exception('Test error'));

    expect(logInterceptors.logs, contains('on_error_called'));
  });
}
