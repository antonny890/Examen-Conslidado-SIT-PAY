import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_mode_provider.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/passenger/providers/payment_provider.dart';
import 'features/driver/providers/driver_socket_provider.dart';
import 'features/auth/screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SitPayMobileApp());
}

/// Aplicación Principal Móvil SIT-Pay Arequipa
/// Soporta tanto Pasajeros como Choferes con enrutamiento automático post-login
class SitPayMobileApp extends StatelessWidget {
  const SitPayMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => PaymentProvider()),
        ChangeNotifierProvider(create: (_) => DriverSocketProvider()),
        ChangeNotifierProvider(create: (_) => ThemeModeProvider()),
      ],
      child: Consumer<ThemeModeProvider>(
        builder: (context, themeModeProvider, _) => MaterialApp(
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
