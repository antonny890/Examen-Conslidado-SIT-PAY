import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../models/google_sign_in_result.dart';

class GoogleAuthService {
  GoogleAuthService._();

  static const _clientId = String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');
  static final _googleSignIn = GoogleSignIn.instance;
  static Future<void>? _initialization;

  static bool get isSupportedPlatform =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  static Future<GoogleSignInResult?> signIn() async {
    if (!isSupportedPlatform) {
      throw UnsupportedError(
        'El inicio con Google está disponible en la aplicación móvil.',
      );
    }
    if (_clientId.isEmpty) {
      throw StateError(
        'Falta configurar GOOGLE_WEB_CLIENT_ID para el inicio con Google.',
      );
    }

    await (_initialization ??= _googleSignIn.initialize(
      serverClientId: _clientId,
    ));

    late final GoogleSignInAccount account;
    try {
      account = await _googleSignIn.authenticate();
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled) return null;
      rethrow;
    }
    final idToken = account.authentication.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw StateError(
        'Google no devolvió una credencial válida. Revisa la configuración OAuth.',
      );
    }

    return GoogleSignInResult(
      idToken: idToken,
      email: account.email.trim().toLowerCase(),
    );
  }
}
