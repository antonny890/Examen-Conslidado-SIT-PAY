import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../passenger/screens/passenger_home_screen.dart';
import '../providers/auth_provider.dart';

class EmailVerificationScreen extends StatefulWidget {
  const EmailVerificationScreen({super.key, required this.email});

  final String email;

  @override
  State<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  final _codeController = TextEditingController();
  final _codeFocusNode = FocusNode();
  bool _isSending = false;
  bool _isVerifying = false;
  bool _initialRequestStarted = false;
  String? _errorMessage;
  String? _infoMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_initialRequestStarted) {
        _initialRequestStarted = true;
        _sendCode();
      }
    });
  }

  @override
  void dispose() {
    _codeController.dispose();
    _codeFocusNode.dispose();
    super.dispose();
  }

  String get _maskedEmail {
    final parts = widget.email.split('@');
    if (parts.length != 2 || parts.first.isEmpty) return widget.email;
    final name = parts.first;
    final visiblePrefix = name.length <= 2 ? name[0] : name.substring(0, 2);
    return '$visiblePrefix${'*' * (name.length - visiblePrefix.length)}@${parts[1]}';
  }

  Future<void> _sendCode() async {
    if (_isSending) return;
    setState(() {
      _isSending = true;
      _errorMessage = null;
      _infoMessage = null;
    });

    final auth = context.read<AuthProvider>();
    final sent = await auth.requestRegistrationEmailCode(widget.email);
    if (!mounted) return;
    if (sent) {
      final autoCode = auth.registrationAutoCode;
      if (autoCode != null) _codeController.text = autoCode;
      setState(() {
        _infoMessage = autoCode == null
            ? 'Enviamos un código a tu correo.'
            : 'Confirmando automáticamente el correo en modo de desarrollo.';
        _isSending = false;
      });
      if (autoCode != null) await _verifyCode();
    } else {
      setState(() {
        _errorMessage = auth.errorMessage ??
            'No se pudo enviar el código. Inténtalo nuevamente.';
        _isSending = false;
      });
    }
  }

  Future<void> _verifyCode() async {
    final code = _codeController.text;
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() {
        _errorMessage = 'Ingresa los 6 dígitos del código.';
        _infoMessage = null;
      });
      return;
    }

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
      _infoMessage = null;
    });

    final verified =
        await context.read<AuthProvider>().verifyRegistrationEmailCode(
              email: widget.email,
              code: code,
            );
    if (!mounted) return;
    if (verified) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const PassengerHomeScreen()),
        (_) => false,
      );
    } else {
      setState(() {
        _errorMessage = context.read<AuthProvider>().errorMessage ??
            'No se pudo verificar el código. Revisa e inténtalo nuevamente.';
        _isVerifying = false;
      });
      _codeController.clear();
      _codeFocusNode.requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final code = _codeController.text;

    return Scaffold(
      appBar: AppBar(title: const Text('Confirmar correo')),
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
              'Confirma tu correo',
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Enviamos un código de 6 dígitos a',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 4),
            Text(
              _maskedEmail,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'El código caduca en 5 minutos. Tienes hasta 5 intentos por código.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 28),
            Semantics(
              label: 'Código de verificación de seis dígitos',
              child: GestureDetector(
                onTap: _codeFocusNode.requestFocus,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: List.generate(6, (index) {
                        final digit = index < code.length ? code[index] : '';
                        return Container(
                          width: 44,
                          height: 54,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color:
                                isDark ? const Color(0xFF171717) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: index == code.length
                                  ? theme.colorScheme.primary
                                  : theme.colorScheme.outlineVariant,
                              width: index == code.length ? 1.5 : 1,
                            ),
                          ),
                          child: Text(
                            digit,
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        );
                      }),
                    ),
                    Opacity(
                      opacity: 0,
                      child: TextField(
                        controller: _codeController,
                        focusNode: _codeFocusNode,
                        autofocus: false,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(6),
                        ],
                        onChanged: (_) => setState(() {
                          _errorMessage = null;
                          _infoMessage = null;
                        }),
                        onSubmitted: (_) => _verifyCode(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 22),
            SizedBox(
              height: 52,
              child: FilledButton(
                onPressed: _isVerifying || _isSending ? null : _verifyCode,
                child: _isVerifying
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Verificar código'),
              ),
            ),
            const SizedBox(height: 12),
            const TextButton(
              onPressed: null,
              child: Text('Reenvío deshabilitado'),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 10),
              _MessageBox(
                message: _errorMessage!,
                color: theme.colorScheme.error,
              ),
            ],
            if (_infoMessage != null) ...[
              const SizedBox(height: 10),
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
