import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Gestor de almacenamiento seguro para tokens JWT y credenciales locales
class SecureStorageService {
  static const _storage = FlutterSecureStorage();

  static const String _keyAccessToken = 'sit_pay_access_token';
  static const String _keyRefreshToken = 'sit_pay_refresh_token';
  static const String _keyUserRole = 'sit_pay_user_role';
  static const String _keyUserData = 'sit_pay_user_data';

  // Guardar tokens de sesión
  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
  }

  // Obtener access token
  static Future<String?> getAccessToken() async {
    return await _storage.read(key: _keyAccessToken);
  }

  // Obtener refresh token
  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: _keyRefreshToken);
  }

  // Guardar rol del usuario (CHOFER o PASAJERO)
  static Future<void> saveUserRole(String role) async {
    await _storage.write(key: _keyUserRole, value: role);
  }

  static Future<String?> getUserRole() async {
    return await _storage.read(key: _keyUserRole);
  }

  // Guardar datos JSON del usuario
  static Future<void> saveUserData(String userDataJson) async {
    await _storage.write(key: _keyUserData, value: userDataJson);
  }

  static Future<String?> getUserData() async {
    return await _storage.read(key: _keyUserData);
  }

  // Limpiar almacenamiento al cerrar sesión
  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
