import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Base URL of the existing 1percent backend. Override with
/// --dart-define=API_BASE=https://... for local development.
const kApiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'https://learn.1percent.rw/api',
);

/// Secure token storage (access + refresh).
class TokenStore {
  final _s = const FlutterSecureStorage();
  static const _kAccess = 'op_access_token';
  static const _kRefresh = 'op_refresh_token';
  static const _kUser = 'op_user_json';

  Future<String?> access() => _s.read(key: _kAccess);
  Future<String?> refresh() => _s.read(key: _kRefresh);
  Future<String?> userJson() => _s.read(key: _kUser);

  Future<void> save({String? access, String? refresh, String? userJson}) async {
    if (access != null) await _s.write(key: _kAccess, value: access);
    if (refresh != null) await _s.write(key: _kRefresh, value: refresh);
    if (userJson != null) await _s.write(key: _kUser, value: userJson);
  }

  Future<void> clear() async {
    await _s.delete(key: _kAccess);
    await _s.delete(key: _kRefresh);
    await _s.delete(key: _kUser);
  }

  Future<bool> hasSession() async => (await access()) != null;
}

/// Single-flight refresh guard shared by all concurrent 401s.
class _RefreshLock {
  Future<bool>? _running;

  Future<bool> run(Future<bool> Function() attempt) {
    final running = _running;
    if (running != null) return running;
    final f = attempt().whenComplete(() => _running = null);
    _running = f;
    return f;
  }
}

class ApiClient {
  ApiClient(this.tokens) {
    dio = Dio(BaseOptions(
      baseUrl: kApiBase,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Accept': 'application/json', 'X-Client': 'onepercent-learn/1.0'},
    ));
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final t = await tokens.access();
        if (t != null && !options.path.contains('/auth/login')) {
          options.headers['Authorization'] = 'Bearer $t';
        }
        handler.next(options);
      },
      onError: (e, handler) async {
        final status = e.response?.statusCode;
        final path = e.requestOptions.path;
        final refreshOnly =
            path.contains('/auth/login') || path.contains('/auth/refresh');
        if (status == 401 && !refreshOnly && !e.requestOptions.extra['_retried']) {
          final ok = await _lock.run(() => _tryRefresh());
          if (ok) {
            final t = await tokens.access();
            final req = e.requestOptions;
            req.extra['_retried'] = true;
            req.headers['Authorization'] = 'Bearer $t';
            try {
              final res = await dio.fetch(req);
              return handler.resolve(res);
            } on DioException catch (ex) {
              return handler.reject(ex);
            }
          }
        }
        handler.next(e);
      },
    ));
  }

  late final Dio dio;
  final TokenStore tokens;
  final _lock = _RefreshLock();

  Future<bool> _tryRefresh() async {
    final rt = await tokens.refresh();
    if (rt == null) return false;
    try {
      final res = await dio.post('/auth/refresh', data: {'refresh_token': rt});
      final session = res.data['session'] as Map<String, dynamic>?;
      final access = session?['access_token'] as String?;
      final refresh = session?['refresh_token'] as String?;
      if (access == null) return false;
      await tokens.save(access: access, refresh: refresh);
      return true;
    } catch (_) {
      await tokens.clear();
      return false;
    }
  }

  /// Human-readable message for snackbars.
  static String friendly(Object? e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['error'] is String) return data['error'] as String;
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return 'Connection timed out. Check your internet.';
        case DioExceptionType.connectionError:
          return 'No internet connection.';
        default:
          return 'Something went wrong. Please try again.';
      }
    }
    return 'Something went wrong. Please try again.';
  }
}
