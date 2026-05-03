import 'dart:convert';

import 'package:http/http.dart' as http;

import 'auth_storage.dart';
import 'config.dart';

class ApiException implements Exception {
  ApiException(this.status, this.body);
  final int status;
  final String body;
  @override
  String toString() => 'ApiException($status): $body';
}

class ApiClient {
  ApiClient({http.Client? httpClient, AuthStorage? storage})
      : _http = httpClient ?? http.Client(),
        _storage = storage ?? AuthStorage();

  final http.Client _http;
  final AuthStorage _storage;

  Uri _u(String path, [Map<String, String>? query]) {
    final base = kApiBaseUrl.endsWith('/') ? kApiBaseUrl.substring(0, kApiBaseUrl.length - 1) : kApiBaseUrl;
    final uri = Uri.parse('$base$path');
    if (query == null || query.isEmpty) return uri;
    return uri.replace(queryParameters: {...uri.queryParameters, ...query});
  }

  Future<Map<String, String>> _headers({bool auth = false}) async {
    final h = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final t = await _storage.access();
      if (t != null) h['Authorization'] = 'Bearer $t';
    }
    return h;
  }

  Future<dynamic> get(String path, {bool auth = false, Map<String, String>? query}) async {
    final r = await _http.get(_u(path, query), headers: await _headers(auth: auth));
    return _decode(r);
  }

  Future<dynamic> post(String path, Object? body, {bool auth = false}) async {
    final r = await _http.post(
      _u(path),
      headers: await _headers(auth: auth),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(r);
  }

  Future<dynamic> patch(String path, Object? body, {bool auth = false}) async {
    final r = await _http.patch(
      _u(path),
      headers: await _headers(auth: auth),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(r);
  }

  dynamic _decode(http.Response r) {
    if (r.statusCode >= 200 && r.statusCode < 300) {
      if (r.body.isEmpty) return null;
      return jsonDecode(utf8.decode(r.bodyBytes));
    }
    throw ApiException(r.statusCode, r.body);
  }
}
