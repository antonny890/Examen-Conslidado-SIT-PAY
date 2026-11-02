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
  final _apiClient = ApiClient();
  bool _isLoading = false;
  bool _hasError = false;
  String? _infoMessage;

  @override
  void dispose() {
    _emailController.dispose();
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
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Correo Electrónico',
                prefixIcon: Icon(Icons.email_outlined),
              ),
            ),
            const SizedBox(height: 20),
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
