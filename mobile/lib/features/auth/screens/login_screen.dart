import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/google_auth_service.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import '../../passenger/screens/passenger_home_screen.dart';
import '../../driver/screens/driver_home_screen.dart';
import '../models/google_sign_in_result.dart';

/// Pantalla de Inicio de Sesión Unificada (Pasajero y Chofer)
/// Tras el login, redirige automáticamente a la vista correspondiente según el rol.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isSigningInWithGoogle = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.login(
      _emailController.text,
      _passwordController.text,
    );

    if (!mounted) return;

    if (success && auth.currentUser != null) {
      if (auth.currentUser!.esChofer) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DriverHomeScreen()),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const PassengerHomeScreen()),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'Error al iniciar sesión.'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() => _isSigningInWithGoogle = true);
    try {
      final googleAccount = await GoogleAuthService.signIn();
      if (!mounted || googleAccount == null) return;

      final auth = context.read<AuthProvider>();
      final outcome = await auth.beginGooglePassengerSignIn(googleAccount);
      if (!mounted) return;

      if (outcome == GoogleSignInOutcome.signedIn && auth.currentUser != null) {
        final destination = auth.currentUser!.esChofer
            ? const DriverHomeScreen()
            : const PassengerHomeScreen();
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => destination),
        );
      } else if (outcome == GoogleSignInOutcome.registrationRequired) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => RegisterScreen(googleSignInResult: googleAccount),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content:
                Text(auth.errorMessage ?? 'No se pudo iniciar con Google.'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    } on StateError catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.message.toString()),
          backgroundColor: Colors.red.shade700,
        ),
      );
    } on UnsupportedError catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.message ?? 'Google no está disponible aquí.'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
              'No se pudo abrir Google. Verifica la configuración de la aplicación.'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSigningInWithGoogle = false);
    }
  }

  void _openDesignPreview({required bool asDriver}) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    auth.loginDemo(asDriver: asDriver);

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) =>
            asDriver ? const DriverHomeScreen() : const PassengerHomeScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 16),
                // Logo textual e identidad
                Center(
                  child: Column(
                    children: [
                      Image.asset(
                        'assets/images/sit-pay-logo.png',
                        width: 128,
                        height: 128,
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'SIT-Pay Arequipa',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Acceso Móvil • Pasajeros y Choferes',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Accesos locales para revisar la interfaz sin servidor.
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF131B2E)
                        : const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isDark
                          ? const Color(0xFF1E293B)
                          : const Color(0xFFBFDBFE),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Vista previa del diseño (sin servidor):',
                        style: TextStyle(
                            fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Elige Usuario o Chofer. No valida credenciales ni registra pagos.',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.white70 : Colors.black54,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 6),
                                minimumSize: Size.zero,
                              ),
                              onPressed: () =>
                                  _openDesignPreview(asDriver: false),
                              child: const Text('Usuario',
                                  style: TextStyle(fontSize: 11)),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 6),
                                minimumSize: Size.zero,
                              ),
                              onPressed: () =>
                                  _openDesignPreview(asDriver: true),
                              child: const Text('Chofer',
                                  style: TextStyle(fontSize: 11)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'El acceso de usuario sirve para pasajeros regulares o universitarios; la condición universitaria se validará con el correo institucional.',
                        style: TextStyle(
                          fontSize: 10,
                          color: isDark ? Colors.white60 : Colors.black54,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Campo Correo
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Correo Electrónico',
                    prefixIcon: Icon(Icons.email_outlined),
                    hintText: 'ejemplo@correo.com',
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Ingrese su correo.';
                    }
                    if (!val.contains('@')) return 'Correo no válido.';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Campo Contraseña
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'Contraseña',
                    prefixIcon: const Icon(Icons.lock_outline_rounded),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                      ),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (val) {
                    if (val == null || val.isEmpty) {
                      return 'Ingrese su contraseña.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 10),

                // Olvidé mi contraseña
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) => const ForgotPasswordScreen()),
                      );
                    },
                    child: const Text(
                      '¿Olvidaste tu contraseña?',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Botón Iniciar Sesión
                ElevatedButton(
                  onPressed: auth.isLoading || _isSigningInWithGoogle
                      ? null
                      : _handleLogin,
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.5, color: Colors.white),
                        )
                      : const Text('Ingresar a SIT-Pay'),
                ),
                if (GoogleAuthService.isSupportedPlatform) ...[
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: auth.isLoading || _isSigningInWithGoogle
                        ? null
                        : _handleGoogleSignIn,
                    icon: _isSigningInWithGoogle
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.account_circle_outlined),
                    label: Text(
                      _isSigningInWithGoogle
                          ? 'Conectando con Google...'
                          : 'Continuar con Google',
                    ),
                  ),
                ],
                const SizedBox(height: 24),

                // Enlace a Registro (Solo para Pasajeros)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('¿Nuevo pasajero?'),
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                              builder: (_) => const RegisterScreen()),
                        );
                      },
                      child: const Text(
                        'Crear cuenta gratis',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
