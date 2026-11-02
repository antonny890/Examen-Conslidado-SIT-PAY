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

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isDemoMode => _isDemoMode;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _currentUser != null;

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
        final data = response.data['data'];
        final tokens = data['tokens'];
        final userJson = data['usuario'];

        final registeredUser = UserModel.fromJson(userJson);
        final normalizedAlias = alias.trim();
        _currentUser = registeredUser.copyWith(
          alias: normalizedAlias,
          aliasUpdatedAt: normalizedAlias.isEmpty ? null : DateTime.now(),
        );
        if (normalizedAlias.isNotEmpty) {
          await LocalProfileStore.save(_currentUser!);
        }

        await SecureStorageService.saveTokens(
          accessToken: tokens['accessToken'],
          refreshToken: tokens['refreshToken'],
        );
        await SecureStorageService.saveUserRole('PASAJERO');
        await SecureStorageService.saveUserData(
          jsonEncode(_currentUser!.toJson()),
        );

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
    notifyListeners();
  }
}
