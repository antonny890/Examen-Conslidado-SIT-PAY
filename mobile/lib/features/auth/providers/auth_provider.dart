import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/storage/local_profile_store.dart';
import '../models/user_model.dart';

/// Gestor de Estado de Autenticación (Provider)
/// Controla el ciclo de vida de la sesión y enrutamiento según rol (CHOFER / PASAJERO)
class AuthProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  UserModel? _currentUser;
  bool _isLoading = false;
  bool _isDemoMode = false;
  String? _errorMessage;
  String? _pendingRegistrationEmail;
  String _pendingRegistrationAlias = '';
  DateTime? _registrationCodeSentAt;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isDemoMode => _isDemoMode;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _currentUser != null;
  bool get hasPendingRegistrationCode => _registrationCodeSentAt != null;
  int get registrationCodeResendSeconds {
    final sentAt = _registrationCodeSentAt;
    if (sentAt == null) return 0;
    final remaining = 60 - DateTime.now().difference(sentAt).inSeconds;
    return remaining > 0 ? remaining : 0;
  }

  // 1. Verificar sesión persistente al abrir la app
  Future<bool> checkCurrentSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await SecureStorageService.getAccessToken();
      final userDataJson = await SecureStorageService.getUserData();

      if (token != null && userDataJson != null) {
        final Map<String, dynamic> userMap = jsonDecode(userDataJson);
        _currentUser =
            await LocalProfileStore.applyTo(UserModel.fromJson(userMap));
        await SecureStorageService.saveUserData(
          jsonEncode(_currentUser!.toJson()),
        );
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (_) {
      await SecureStorageService.clearAll();
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  // 2. Inicio de Sesión Unificado (Pasajero o Chofer)
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _isDemoMode = false;
    _errorMessage = null;
    _pendingRegistrationEmail = null;
    _pendingRegistrationAlias = '';
    _registrationCodeSentAt = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.login,
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        final tokens = data['tokens'];
        final userJson = data['usuario'];

        _currentUser =
            await LocalProfileStore.applyTo(UserModel.fromJson(userJson));

        // Guardar en almacenamiento seguro
        await SecureStorageService.saveTokens(
          accessToken: tokens['accessToken'],
          refreshToken: tokens['refreshToken'],
        );
        await SecureStorageService.saveUserRole(_currentUser!.rol);
        await SecureStorageService.saveUserData(
          jsonEncode(_currentUser!.toJson()),
        );

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response.data['message'] ?? 'Credenciales incorrectas.';
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['message'] ??
          'Error de conexión con el servidor SIT-Pay.';
    } catch (e) {
      _errorMessage = 'Ocurrió un error inesperado al iniciar sesión.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  void loginDemo({required bool asDriver}) {
    _errorMessage = null;
    _pendingRegistrationEmail = null;
    _pendingRegistrationAlias = '';
    _registrationCodeSentAt = null;
    _isDemoMode = true;
    _currentUser = UserModel(
      id: asDriver ? 'demo-driver' : 'demo-passenger',
      email:
          asDriver ? 'chofer.demo@sitpay.local' : 'usuario.demo@sitpay.local',
      rol: asDriver ? 'CHOFER' : 'PASAJERO',
      nombres: asDriver ? 'Carlos' : 'Pedro',
      apellidos: asDriver ? 'Chofer (demostración)' : 'Usuario (demostración)',
      choferInfo: asDriver
          ? DriverVehicleInfo(
              choferId: 'demo-driver',
              vehiculoId: 'demo-vehicle-1',
              placa: 'V7A-890',
              qrCodigoSeguro: 'SIT-VEH-V7A890-DEMO',
              empresaId: 'demo-company-1',
              empresaNombre: 'Transcayma',
              unidadCodigo: 'C3',
              unidadNombre: 'Cayma',
            )
          : null,
    );
    notifyListeners();
  }

  // 3. Registro de Pasajero con Consentimiento Ley 29733
  Future<bool> registerPassenger({
    required String email,
    required String password,
    required String nombres,
    required String apellidos,
    String alias = '',
    required String numeroDocumento,
    String? telefono,
    required bool consentimientoDatos,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    if (_pendingRegistrationEmail != email.trim().toLowerCase()) {
      _registrationCodeSentAt = null;
    }
    _pendingRegistrationEmail = null;
    _pendingRegistrationAlias = '';
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.register,
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
          'nombres': nombres.trim(),
          'apellidos': apellidos.trim(),
          'tipoDocumento': 'DNI',
          'numeroDocumento': numeroDocumento.trim(),
          'telefono': telefono?.trim(),
          'consentimientoDatos': consentimientoDatos,
        },
      );

      if (response.statusCode == 201 && response.data['success'] == true) {
        _pendingRegistrationEmail = email.trim().toLowerCase();
        _pendingRegistrationAlias = alias.trim();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage =
            response.data['message'] ?? 'Error al registrar usuario.';
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['message'] ?? 'Error de conexión.';
    } catch (e) {
      _errorMessage = 'Ocurrió un error al procesar el registro.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> requestRegistrationEmailCode(String email) async {
    _errorMessage = null;
    final normalizedEmail = email.trim().toLowerCase();
    if (_pendingRegistrationEmail != null &&
        normalizedEmail != _pendingRegistrationEmail) {
      _errorMessage = 'El correo no coincide con el que usaste al registrarte.';
      return false;
    }
    if (registrationCodeResendSeconds > 0) return true;
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.registrationEmailRequest,
        data: {'email': normalizedEmail},
      );
      final sent =
          response.statusCode == 200 && response.data['success'] == true;
      if (sent) _registrationCodeSentAt = DateTime.now();
      return sent;
    } on DioException catch (error) {
      final responseData = error.response?.data;
      _errorMessage = responseData is Map && responseData['message'] is String
          ? responseData['message'] as String
          : 'No se pudo enviar el código. Comprueba tu conexión e inténtalo nuevamente.';
      return false;
    } catch (error) {
      _errorMessage =
          'Ocurrió un error inesperado al solicitar el código: $error';
      return false;
    }
  }

  Future<bool> verifyRegistrationEmailCode({
    required String email,
    required String code,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    if (_pendingRegistrationEmail != null &&
        normalizedEmail != _pendingRegistrationEmail) {
      _errorMessage = 'El correo no coincide con el que usaste al registrarte.';
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.registrationEmailVerify,
        data: {
          'email': normalizedEmail,
          'code': code.trim(),
        },
      );
      if (response.statusCode != 200 || response.data['success'] != true) {
        _errorMessage =
            response.data['message'] ?? 'No se pudo verificar el código.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final data = response.data['data'] as Map<String, dynamic>;
      final tokens = data['tokens'] as Map<String, dynamic>;
      final userJson = data['usuario'] as Map<String, dynamic>;
      final registeredUser = UserModel.fromJson(userJson);
      final alias = _pendingRegistrationAlias;
      _currentUser = await LocalProfileStore.applyTo(
        registeredUser.copyWith(
          alias: alias,
          aliasUpdatedAt: alias.isEmpty ? null : DateTime.now(),
        ),
      );
      if (alias.isNotEmpty) await LocalProfileStore.save(_currentUser!);

      await SecureStorageService.saveTokens(
        accessToken: tokens['accessToken'],
        refreshToken: tokens['refreshToken'],
      );
      await SecureStorageService.saveUserRole(_currentUser!.rol);
      await SecureStorageService.saveUserData(
        jsonEncode(_currentUser!.toJson()),
      );

      _pendingRegistrationEmail = null;
      _pendingRegistrationAlias = '';
      _registrationCodeSentAt = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } on DioException catch (error) {
      final responseData = error.response?.data;
      _errorMessage = responseData is Map && responseData['message'] is String
          ? responseData['message'] as String
          : 'No se pudo verificar el código. Comprueba tu conexión e inténtalo nuevamente.';
    } catch (error) {
      _errorMessage =
          'Ocurrió un error inesperado al verificar el código: $error';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> updateLocalProfile({
    String? alias,
    DateTime? aliasUpdatedAt,
    String? profileImagePath,
  }) async {
    final currentUser = _currentUser;
    if (currentUser == null) {
      throw StateError('No hay una sesión activa para editar el perfil.');
    }

    final updatedUser = currentUser.copyWith(
      alias: alias,
      aliasUpdatedAt: aliasUpdatedAt,
      profileImagePath: profileImagePath,
    );
    await LocalProfileStore.save(updatedUser);
    await SecureStorageService.saveUserData(jsonEncode(updatedUser.toJson()));
    _currentUser = updatedUser;
    notifyListeners();
  }

  // 4. Cerrar Sesión
  Future<void> logout() async {
    if (!_isDemoMode) {
      try {
        await _apiClient.dio.post(ApiConstants.logout);
      } catch (_) {}
    }

    await SecureStorageService.clearAll();
    _currentUser = null;
    _isDemoMode = false;
    _pendingRegistrationEmail = null;
    _pendingRegistrationAlias = '';
    _registrationCodeSentAt = null;
    notifyListeners();
  }
}
