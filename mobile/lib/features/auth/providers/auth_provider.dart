import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/storage/local_profile_store.dart';
import '../models/google_sign_in_result.dart';
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
        await _saveAuthenticatedSession(data);

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

  Future<GoogleSignInOutcome?> beginGooglePassengerSignIn(
    GoogleSignInResult googleAccount,
  ) async {
    _isLoading = true;
    _isDemoMode = false;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.googlePassenger,
        data: {'credential': googleAccount.idToken},
      );
      if (response.data is! Map || response.data['success'] != true) {
        _errorMessage = response.data is Map
            ? response.data['message'] as String? ??
                'No se pudo validar la cuenta de Google.'
            : 'No se pudo validar la cuenta de Google.';
        return null;
      }
      final data = response.data['data'] as Map<String, dynamic>;
      if (data['registrationRequired'] == true) {
        return GoogleSignInOutcome.registrationRequired;
      }

      await _saveAuthenticatedSession(data);
      return GoogleSignInOutcome.signedIn;
    } on DioException catch (error) {
      final responseData = error.response?.data;
      _errorMessage = responseData is Map && responseData['message'] is String
          ? responseData['message'] as String
          : 'No se pudo validar la cuenta de Google. Comprueba tu conexión e inténtalo nuevamente.';
      return null;
    } catch (_) {
      _errorMessage = 'Ocurrió un error al iniciar sesión con Google.';
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> completeGooglePassengerRegistration({
    required GooglePassengerRegistration registration,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.googlePassenger,
        data: {
          'credential': registration.googleAccount.idToken,
          'numeroDocumento': registration.numeroDocumento,
          'nombres': registration.nombres,
          'apellidos': registration.apellidos,
          'telefono': registration.telefono,
          'alias': registration.alias,
          'consentimientoDatos': registration.consentimientoDatos,
          'consentimientoConsultaDni': registration.consentimientoConsultaDni,
        },
      );
      if (response.data is! Map || response.data['success'] != true) {
        _errorMessage = response.data is Map
            ? response.data['message'] as String? ??
                'No se pudo completar el registro con Google.'
            : 'No se pudo completar el registro con Google.';
        return false;
      }
      final data = response.data['data'] as Map<String, dynamic>;
      await _saveAuthenticatedSession(data, alias: registration.alias);
      return true;
    } on DioException catch (error) {
      final responseData = error.response?.data;
      _errorMessage = responseData is Map && responseData['message'] is String
          ? responseData['message'] as String
          : 'No se pudo completar el registro con Google. Comprueba tu conexión e inténtalo nuevamente.';
      return false;
    } catch (_) {
      _errorMessage = 'Ocurrió un error al completar el registro con Google.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _saveAuthenticatedSession(
    Map<String, dynamic> data, {
    String alias = '',
  }) async {
    final tokens = data['tokens'] as Map<String, dynamic>;
    final userJson = data['usuario'] as Map<String, dynamic>;
    final user = UserModel.fromJson(userJson);
    final registeredUser = alias.isEmpty
        ? user
        : user.copyWith(alias: alias, aliasUpdatedAt: DateTime.now());
    _currentUser = await LocalProfileStore.applyTo(registeredUser);

    await SecureStorageService.saveTokens(
      accessToken: tokens['accessToken'] as String,
      refreshToken: tokens['refreshToken'] as String,
    );
    await SecureStorageService.saveUserRole(_currentUser!.rol);
    await SecureStorageService.saveUserData(jsonEncode(_currentUser!.toJson()));
    if (alias.isNotEmpty) await LocalProfileStore.save(_currentUser!);
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
    required bool consentimientoConsultaDni,
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
          'consentimientoConsultaDni': consentimientoConsultaDni,
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
    String? fotoUrl,
  }) async {
    final currentUser = _currentUser;
    if (currentUser == null) {
      throw StateError('No hay una sesión activa para editar el perfil.');
    }

    final updatedUser = currentUser.copyWith(
      alias: alias,
      aliasUpdatedAt: aliasUpdatedAt,
      profileImagePath: profileImagePath,
      fotoUrl: fotoUrl,
    );
    await LocalProfileStore.save(updatedUser);
    await SecureStorageService.saveUserData(jsonEncode(updatedUser.toJson()));
    _currentUser = updatedUser;
    notifyListeners();
  }

  Future<void> uploadProfilePhoto(String imagePath) async {
    final imageFile = File(imagePath);
    final extension = imagePath.split('.').last.toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
    };
    final mimeType = mimeTypes[extension];
    if (mimeType == null) {
      throw const FormatException('El formato de imagen no es compatible.');
    }

    final response = await _apiClient.dio.put(
      '${ApiConstants.profile}/photo',
      data: {
        'imageBase64': base64Encode(await imageFile.readAsBytes()),
        'mimeType': mimeType,
      },
    );
    if (response.data is! Map ||
        response.data['success'] != true ||
        response.data['data'] is! Map ||
        response.data['data']['fotoUrl'] is! String) {
      throw StateError(
        response.data is Map && response.data['message'] is String
            ? response.data['message'] as String
            : 'No se pudo guardar la foto en el servidor.',
      );
    }
    await updateLocalProfile(fotoUrl: response.data['data']['fotoUrl'] as String);
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
