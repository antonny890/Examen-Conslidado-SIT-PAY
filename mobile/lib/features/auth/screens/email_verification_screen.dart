import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../../passenger/screens/passenger_home_screen.dart';

class EmailVerificationScreen extends StatefulWidget {
  const EmailVerificationScreen({
    super.key,
    this.email = '',
    this.initialErrorMessage,
  });

  final String email;
  final String? initialErrorMessage;

  @override
  State<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  late final TextEditingController _emailController;
  static const _simulationEnabled =
      kDebugMode && bool.fromEnvironment('SITPAY_SIMULATE_EMAIL_CONFIRMATION');
  Timer? _countdownTimer;
  int _remainingSeconds = 10;
  bool _isSending = false;
  bool _isSimulating = false;
  bool _initialRequestStarted = false;
  String? _errorMessage;
  String? _infoMessage;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.email);
    _errorMessage = widget.initialErrorMessage;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _simulationEnabled && widget.email.isNotEmpty) {
        _startSimulationCountdown();
        return;
      }
      if (mounted &&
          widget.email.isNotEmpty &&
          widget.initialErrorMessage == null &&
          !_initialRequestStarted) {
        _initialRequestStarted = true;
        _sendLink();
      }
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _emailController.dispose();
    super.dispose();
  }

  void _startSimulationCountdown() {
    if (_countdownTimer != null || _isSimulating) return;
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_remainingSeconds <= 1) {
        timer.cancel();
        _countdownTimer = null;
        setState(() => _remainingSeconds = 0);
        _completeSimulation();
      } else {
        setState(() => _remainingSeconds--);
      }
    });
  }

  Future<void> _completeSimulation() async {
    if (_isSimulating) return;
    setState(() {
      _isSimulating = true;
      _errorMessage = null;
    });

    final auth = context.read<AuthProvider>();
    final completed = await auth.simulateRegistrationEmailConfirmation(
      _emailController.text,
    );
    if (!mounted) return;

    if (completed) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const PassengerHomeScreen()),
        (_) => false,
      );
      return;
    }

    setState(() {
      _isSimulating = false;
      _errorMessage = auth.errorMessage ??
          'La simulación no está habilitada en el backend de desarrollo.';
    });
  }

  String get _maskedEmail {
    final email = _emailController.text.trim();
    final parts = email.split('@');
    if (parts.length != 2 || parts.first.isEmpty) return email;
    final name = parts.first;
    final visiblePrefix = name.length <= 2 ? name[0] : name.substring(0, 2);
    return '$visiblePrefix${'*' * (name.length - visiblePrefix.length)}@${parts[1]}';
  }

  Future<void> _sendLink() async {
    final email = _emailController.text.trim();
    if (_isSending) return;
    if (email.isEmpty || !email.contains('@')) {
      setState(() {
        _errorMessage = 'Ingresa el correo que usaste al registrarte.';
        _infoMessage = null;
      });
      return;
    }

    setState(() {
      _isSending = true;
      _errorMessage = null;
      _infoMessage = null;
    });

    final auth = context.read<AuthProvider>();
    final sent = await auth.requestRegistrationEmailLink(email);
    if (!mounted) return;

    setState(() {
      _isSending = false;
      if (sent) {
        _infoMessage = 'Enviamos un enlace de confirmación a $_maskedEmail.';
      } else {
        _errorMessage = auth.errorMessage ??
            'No se pudo enviar el enlace. Inténtalo nuevamente.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Confirma tu correo')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
          children: [
            Center(
              child: Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(
                  Icons.mark_email_read_outlined,
                  size: 38,
                  color: Color(0xFF10B981),
                ),
              ),
            ),
            const SizedBox(height: 22),
            Text(
              'Revisa tu correo',
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            if (_simulationEnabled) ...[
              Text(
                'Modo de demostración: no se enviará ningún correo. '
                'La cuenta se activará automáticamente cuando termine el contador.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              Text(
                _maskedEmail,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: SizedBox(
                  width: 64,
                  height: 64,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: _remainingSeconds / 10,
                        strokeWidth: 5,
                      ),
                      Text(
                        '$_remainingSeconds',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                _isSimulating
                    ? 'Activando la cuenta de demostración...'
                    : _remainingSeconds > 0
                        ? 'Confirmación simulada en $_remainingSeconds segundos'
                        : 'No se pudo completar la simulación.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium,
              ),
              if (_remainingSeconds == 0 && !_isSimulating) ...[
                const SizedBox(height: 14),
                OutlinedButton(
                  onPressed: _completeSimulation,
                  child: const Text('Reintentar simulación'),
                ),
              ],
            ] else ...[
              Text(
                'Te enviaremos un enlace. Ábrelo para confirmar tu cuenta; '
                'no necesitas ingresar ningún código.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.done,
                readOnly: widget.email.isNotEmpty,
                decoration: const InputDecoration(
                  labelText: 'Correo electrónico',
                  prefixIcon: Icon(Icons.email_outlined),
                  border: OutlineInputBorder(),
                ),
                onSubmitted: (_) => _sendLink(),
              ),
              const SizedBox(height: 18),
              SizedBox(
                height: 52,
                child: FilledButton(
                  onPressed: _isSending ? null : _sendLink,
                  child: _isSending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Enviar o reenviar enlace'),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Cuando abras el enlace, SIT-PAY confirmará tu cuenta y te '
                'devolverá a la aplicación. Si expiró o ya fue utilizado, '
                'solicita un enlace nuevo.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              _MessageBox(
                message: _errorMessage!,
                color: theme.colorScheme.error,
              ),
            ],
            if (_infoMessage != null) ...[
              const SizedBox(height: 16),
              _MessageBox(
                message: _infoMessage!,
                color: const Color(0xFF10B981),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MessageBox extends StatelessWidget {
  const _MessageBox({required this.message, required this.color});

  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: TextStyle(color: color, fontSize: 13),
      ),
    );
  }
}
