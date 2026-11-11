import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

/// Cliente HTTP Dio con interceptor para adjuntar tokens Bearer JWT
/// y manejo centralizado de errores
class ApiClient {
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
          // Si el token expiró (401), intentar refresh token
          if (error.response?.statusCode == 401 &&
              error.requestOptions.extra['skipAuthRefresh'] != true) {
            final refreshToken = await SecureStorageService.getRefreshToken();
            if (refreshToken != null) {
              try {
                final refreshResponse = await Dio().post(
                  '${dio.options.baseUrl}${ApiConstants.refresh}',
                  data: {'refreshToken': refreshToken},
                );

                if (refreshResponse.statusCode == 200) {
                  final newAccessToken =
                      refreshResponse.data['data']['tokens']['accessToken'];
                  final newRefreshToken =
                      refreshResponse.data['data']['tokens']['refreshToken'];

                  await SecureStorageService.saveTokens(
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                  );

                  // Reintentar la petición original con el nuevo token
                  final originalRequest = error.requestOptions;
                  originalRequest.headers['Authorization'] =
                      'Bearer $newAccessToken';
                  final response = await dio.fetch(originalRequest);
                  return handler.resolve(response);
                }
              } catch (_) {
                await SecureStorageService.clearAll();
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

    final response = await Dio().post(
      '${dio.options.baseUrl}${ApiConstants.refresh}',
      data: {'refreshToken': refreshToken},
    );
    final tokens = response.data['data']['tokens'] as Map<String, dynamic>;
    final accessToken = tokens['accessToken'] as String;
    await SecureStorageService.saveTokens(
      accessToken: accessToken,
      refreshToken: tokens['refreshToken'] as String,
    );
    return accessToken;
  }
}
