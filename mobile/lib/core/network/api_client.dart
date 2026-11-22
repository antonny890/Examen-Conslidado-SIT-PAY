import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

/// Cliente HTTP Dio con interceptor para adjuntar tokens Bearer JWT
/// y manejo centralizado de errores
class ApiClient {
  static final Map<String, Future<String?>> _refreshOperations = {};

  late final Dio dio;

  ApiClient({String? baseUrl}) {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl ?? ApiConstants.defaultBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Interceptor para inyectar token JWT
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorageService.getAccessToken();
          if (token != null &&
              token.isNotEmpty &&
              !options.headers.containsKey('Authorization')) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401 &&
              error.requestOptions.extra['skipAuthRefresh'] != true &&
              !error.requestOptions.path.startsWith('/auth/')) {
            final refreshToken = await SecureStorageService.getRefreshToken();
            if (refreshToken != null && refreshToken.isNotEmpty) {
              final newAccessToken = await _refreshSession(
                dio.options.baseUrl,
                refreshToken,
              );
              if (newAccessToken != null) {
                final originalRequest = error.requestOptions;
                originalRequest.headers['Authorization'] =
                    'Bearer $newAccessToken';
                originalRequest.extra['skipAuthRefresh'] = true;
                try {
                  return handler.resolve(await dio.fetch(originalRequest));
                } on DioException catch (retryError) {
                  return handler.next(retryError);
                }
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<String> refreshAccessToken() async {
    final refreshToken = await SecureStorageService.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      throw StateError('No hay un token de renovación disponible.');
    }

    final accessToken = await _refreshSession(
      dio.options.baseUrl,
      refreshToken,
    );
    if (accessToken == null) {
      throw StateError(
          'No se pudo renovar la sesión. Inicia sesión nuevamente.');
    }
    return accessToken;
  }

  static Future<String?> _refreshSession(
    String baseUrl,
    String refreshToken,
  ) {
    final ongoing = _refreshOperations[refreshToken];
    if (ongoing != null) return ongoing;

    final operation = _performRefresh(baseUrl, refreshToken);
    _refreshOperations[refreshToken] = operation;
    return operation.whenComplete(() {
      if (identical(_refreshOperations[refreshToken], operation)) {
        _refreshOperations.remove(refreshToken);
      }
    });
  }

  static Future<String?> _performRefresh(
    String baseUrl,
    String refreshToken,
  ) async {
    try {
      final response = await Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      ).post(
        '$baseUrl${ApiConstants.refresh}',
        data: {'refreshToken': refreshToken},
      );
      final responseData = response.data;
      if (responseData is! Map ||
          responseData['data'] is! Map ||
          responseData['data']['tokens'] is! Map) {
        return null;
      }

      final tokens = responseData['data']['tokens'] as Map;
      final accessToken = tokens['accessToken'];
      final newRefreshToken = tokens['refreshToken'];
      if (accessToken is! String ||
          accessToken.isEmpty ||
          newRefreshToken is! String ||
          newRefreshToken.isEmpty) {
        return null;
      }

      await SecureStorageService.saveTokens(
        accessToken: accessToken,
        refreshToken: newRefreshToken,
      );
      return accessToken;
    } on DioException catch (error) {
      if (error.response?.statusCode == 400 ||
          error.response?.statusCode == 401) {
        await SecureStorageService.clearAll();
      }
      return null;
    }
  }
}
