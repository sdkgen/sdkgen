typedef OnRequestInterceptor = Future Function(Map<String, dynamic> body);
typedef OnResponseInterceptor = Future Function(dynamic response);
typedef OnErrorInterceptor = Future Function(dynamic error);

abstract class SdkgenInterceptors {
  OnRequestInterceptor? get onRequest;
  OnResponseInterceptor? get onResponse;
  OnErrorInterceptor? get onError;
}

extension SdkgenInterceptorsExtension on List<SdkgenInterceptors> {
  Future onRequest(Map<String, dynamic> body) async {
    for (final interceptors in this) {
      await interceptors.onRequest?.call(body);
    }
  }

  Future onResponse(dynamic response) async {
    for (final interceptors in this) {
      await interceptors.onResponse?.call(response);
    }
  }

  Future onError(dynamic error) async {
    for (final interceptors in this) {
      await interceptors.onError?.call(error);
    }
  }
}
