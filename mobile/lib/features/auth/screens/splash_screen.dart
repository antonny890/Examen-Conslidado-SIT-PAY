import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'login_screen.dart';
import '../../passenger/screens/passenger_home_screen.dart';
import '../../driver/screens/driver_home_screen.dart';

/// Pantalla Splash de Bienvenida
/// Verifica sesión activa y redirige automáticamente según el rol del usuario (CHOFER o PASAJERO)
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkSessionAndNavigate();
  }

  Future<void> _checkSessionAndNavigate() async {
    await Future.delayed(
        const Duration(milliseconds: 1200)); // Tiempo para visualizar branding

    if (!mounted) return;
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final hasSession = await authProvider.checkCurrentSession();

    if (!mounted) return;

    if (hasSession && authProvider.currentUser != null) {
      if (authProvider.currentUser!.esChofer) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DriverHomeScreen()),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const PassengerHomeScreen()),
        );
      }
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F3B60),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: const Icon(
                Icons.directions_bus_rounded,
                size: 52,
                color: Color(0xFF0F3B60),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'SIT-Pay',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Arequipa • Pago Digital del Pasaje',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF93C5FD),
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 48),
            const SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                color: Color(0xFF10B981),
                strokeWidth: 3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
