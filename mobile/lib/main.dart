import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_mode_provider.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/passenger/providers/payment_provider.dart';
import 'features/driver/providers/driver_socket_provider.dart';
import 'features/auth/screens/splash_screen.dart';
import 'features/auth/screens/email_verification_screen.dart';
import 'features/passenger/screens/passenger_home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SitPayMobileApp());
}

/// Aplicación Principal Móvil SIT-Pay Arequipa
/// Soporta tanto Pasajeros como Choferes con enrutamiento automático post-login
class SitPayMobileApp extends StatefulWidget {
  const SitPayMobileApp({super.key});

  @override
  State<SitPayMobileApp> createState() => _SitPayMobileAppState();
}

class _SitPayMobileAppState extends State<SitPayMobileApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  final _handledLinks = <String>{};
  late final AuthProvider _authProvider;
  late final AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    _authProvider = AuthProvider();
    WidgetsBinding.instance.addPostFrameCallback((_) => _listenForAuthLinks());
  }

  Future<void> _listenForAuthLinks() async {
    await _authProvider.restorePendingRegistrationEmail();
    _appLinks = AppLinks();
    _linkSubscription = _appLinks.uriLinkStream.listen(
      _handleAuthLink,
      onError: (Object error) {
        debugPrint('No se pudo leer el enlace de confirmación: $error');
      },
    );

    final initialLink = await _appLinks.getInitialLink();
    if (initialLink != null) await _handleAuthLink(initialLink);
  }

  Future<void> _handleAuthLink(Uri uri) async {
    if (uri.scheme != 'sitpay' || uri.host != 'auth-callback') return;
    if (!_handledLinks.add(uri.toString())) return;

    final parameters = <String, String>{...uri.queryParameters};
    if (uri.fragment.isNotEmpty) {
      try {
        parameters.addAll(Uri.splitQueryString(uri.fragment));
      } on FormatException {
        _showLinkError('El enlace de confirmación no es válido.');
        return;
      }
    }

    final errorCode = (parameters['error_code'] ?? parameters['error'] ?? '')
        .toLowerCase();
    final errorDescription =
        (parameters['error_description'] ?? '').toLowerCase();
    if (errorCode.isNotEmpty || errorDescription.isNotEmpty) {
      final expiredOrInvalid = errorCode.contains('expired') ||
          errorCode.contains('invalid') ||
          errorDescription.contains('expired') ||
          errorDescription.contains('invalid');
      _showLinkError(
        expiredOrInvalid
            ? 'El enlace expiró, ya fue utilizado o no es válido. Solicita uno nuevo.'
            : 'No se pudo confirmar el correo. Solicita un enlace nuevo.',
      );
      return;
    }

    final accessToken = parameters['access_token'];
    final tokenHash = parameters['token_hash'];
    if ((accessToken == null || accessToken.isEmpty) &&
        (tokenHash == null || tokenHash.isEmpty)) {
      _showLinkError(
        'El enlace no contiene una confirmación válida. Solicita uno nuevo.',
      );
      return;
    }

    final confirmed = await _authProvider.confirmRegistrationEmailLink(
      accessToken: accessToken,
      tokenHash: tokenHash,
    );
    if (!mounted) return;

    if (confirmed) {
      _navigatorKey.currentState?.pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const PassengerHomeScreen()),
        (_) => false,
      );
    } else {
      _showLinkError(
        _authProvider.errorMessage ??
            'No se pudo confirmar el correo. Solicita un enlace nuevo.',
      );
    }
  }

  void _showLinkError(String message) {
    if (!mounted) return;
    _navigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => EmailVerificationScreen(
          email: _authProvider.pendingRegistrationEmail ?? '',
          initialErrorMessage: message,
        ),
      ),
      (_) => false,
    );
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    _authProvider.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _authProvider),
        ChangeNotifierProvider(create: (_) => PaymentProvider()),
        ChangeNotifierProvider(create: (_) => DriverSocketProvider()),
        ChangeNotifierProvider(create: (_) => ThemeModeProvider()),
      ],
      child: Consumer<ThemeModeProvider>(
        builder: (context, themeModeProvider, _) => MaterialApp(
          navigatorKey: _navigatorKey,
          title: 'SIT-PAY',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: themeModeProvider.themeMode,
          home: const SplashScreen(),
        ),
      ),
    );
  }
}
