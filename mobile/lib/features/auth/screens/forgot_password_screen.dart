import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

const Color emerald = Color(0xFF047857);

/// Pantalla de Recuperación de Contraseña
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _apiClient = ApiClient();
  bool _isLoading = false;
  bool _isCodeSent = false;
  bool _hasError = false;
  String? _infoMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleReset() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingrese un correo válido.')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.forgotPassword,
        data: {'email': email},
      );

      setState(() {
        _hasError = false;
        _infoMessage = response.data['message'] ?? 'Instrucciones enviadas.';
        _isCodeSent = true;
      });
    } on DioException catch (error) {
      setState(() {
        _hasError = true;
        _infoMessage = error.response?.data is Map
            ? error.response?.data['message'] as String? ??
                'No se pudo enviar el código. Inténtalo nuevamente.'
            : 'No se pudo enviar el código. Comprueba tu conexión e inténtalo nuevamente.';
      });
    } catch (_) {
      setState(() {
        _hasError = true;
        _infoMessage = 'Ocurrió un error inesperado al solicitar el código.';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleCompleteReset() async {
    final code = _codeController.text.trim();
    final password = _passwordController.text;
    if (!RegExp(r'^\d{6}$').hasMatch(code) || password.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Ingresa el código de 6 dígitos y una contraseña de 8 caracteres como mínimo.'),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.resetPassword,
        data: {
          'email': _emailController.text.trim(),
          'token': code,
          'newPassword': password,
        },
      );
      if (!mounted) return;
      setState(() {
        _hasError = false;
        _infoMessage = response.data['message'] ?? 'Contraseña restablecida.';
      });
      await Future<void>.delayed(const Duration(milliseconds: 400));
      if (mounted) Navigator.of(context).pop();
    } on DioException catch (error) {
      if (!mounted) return;
      final data = error.response?.data;
      setState(() {
        _hasError = true;
        _infoMessage = data is Map && data['message'] is String
            ? data['message'] as String
            : 'No se pudo restablecer la contraseña.';
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recuperar Acceso')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Recuperación de Contraseña',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Ingresa tu correo electrónico registrado. Te enviaremos un código de seguridad para restablecer tu contraseña.',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _emailController,
              enabled: !_isCodeSent,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Correo Electrónico',
                prefixIcon: Icon(Icons.email_outlined),
              ),
            ),
            const SizedBox(height: 20),
            if (_isCodeSent) ...[
              TextField(
                controller: _codeController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: const InputDecoration(
                  labelText: 'Código de recuperación',
                  prefixIcon: Icon(Icons.pin_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Nueva contraseña',
                  prefixIcon: Icon(Icons.lock_outline),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleCompleteReset,
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Restablecer contraseña'),
              ),
            ] else
              ElevatedButton(
                onPressed: _isLoading ? null : _handleReset,
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Enviar Código de Recuperación'),
              ),
            if (_infoMessage != null) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (_hasError ? Colors.red : emerald)
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _hasError ? Colors.red : emerald),
                ),
                child: Text(
                  _infoMessage!,
                  style: TextStyle(
                    fontSize: 13,
                    color: _hasError ? Colors.red.shade200 : emerald,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
