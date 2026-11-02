import 'package:flutter/material.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

/// Pantalla de Solicitud y Acreditación de Medio Pasaje (Ley 26271)
/// Acreditación automática mediante código OTP enviado al correo institucional.
class PreferentialScreen extends StatefulWidget {
  const PreferentialScreen({super.key});

  @override
  State<PreferentialScreen> createState() => _PreferentialScreenState();
}

class _PreferentialScreenState extends State<PreferentialScreen> {
  final ApiClient _apiClient = ApiClient();
  Map<String, dynamic>? _statusData;
  bool _isLoading = true;

  final _institucionController = TextEditingController();
  final _emailEduController = TextEditingController();
  final _otpController = TextEditingController();

  bool _otpSent = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _fetchStatus();
  }

  @override
  void dispose() {
    _institucionController.dispose();
    _emailEduController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _fetchStatus() async {
    setState(() => _isLoading = true);
    try {
      final response =
          await _apiClient.dio.get(ApiConstants.preferentialStatus);
      if (!mounted) return;
      if (response.statusCode == 200) {
        setState(() {
          _statusData = response.data['data'];
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // Método A: Solicitar código OTP por correo institucional
  Future<void> _handleSendEmailOTP() async {
    final email = _emailEduController.text.trim();
    final institucion = _institucionController.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Ingrese un correo institucional válido.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.preferentialRequestEmail,
        data: {
          'institucionEducativa':
              institucion.isEmpty ? 'Universidad Continental' : institucion,
          'correoInstitucional': email,
        },
      );

      if (!mounted) return;
      if (response.statusCode == 200) {
        setState(() => _otpSent = true);
        final devCode = response.data['data']?['codigoOtpPruebaDev'];
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              devCode != null
                  ? 'Código OTP enviado. (Modo prueba: $devCode)'
                  : 'Código OTP enviado a tu correo institucional.',
            ),
            duration: const Duration(seconds: 6),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
                Text('Error al enviar el código. Verifique que sea .edu.pe.')),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  // Método A: Verificar OTP y activar 50%
  Future<void> _handleVerifyOTP() async {
    final code = _otpController.text.trim();
    if (code.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('El código debe tener 6 dígitos.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.preferentialVerifyCode,
        data: {'codigoOtp': code},
      );

      if (!mounted) return;
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                '¡Acreditación preferencial APROBADA! Tu 50% está activo.'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        _fetchStatus();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Código incorrecto o expirado.')),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Medio Pasaje (Ley 26271)')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final estado = _statusData?['estado'] ?? 'SIN_SOLICITUD';
    final esActivo = _statusData?['esMedioPasajeActivo'] ?? false;
    final vigencia = _statusData?['fechaVencimiento'];
    final institucion = _statusData?['institucion'];

    return Scaffold(
      appBar: AppBar(title: const Text('Medio Pasaje (Ley 26271)')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Banner de Estado Actual
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: esActivo
                    ? const Color(0xFF10B981).withValues(alpha: 0.12)
                    : estado == 'PENDIENTE'
                        ? Colors.amber.withValues(alpha: 0.12)
                        : Colors.grey.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: esActivo
                      ? const Color(0xFF10B981)
                      : estado == 'PENDIENTE'
                          ? Colors.amber
                          : Colors.grey.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        esActivo
                            ? 'ESTADO: ACTIVO (50 %)'
                            : estado == 'PENDIENTE'
                                    ? 'ESTADO: VERIFICACIÓN PENDIENTE'
                                : 'SIN MEDIO PASAJE ACTIVO',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: esActivo
                              ? const Color(0xFF10B981)
                              : estado == 'PENDIENTE'
                                  ? Colors.amber.shade800
                                  : Colors.grey.shade700,
                          fontSize: 13,
                        ),
                      ),
                      Icon(
                        esActivo
                            ? Icons.verified_rounded
                            : estado == 'PENDIENTE'
                                ? Icons.pending_actions_rounded
                                : Icons.info_outline,
                        color: esActivo
                            ? const Color(0xFF10B981)
                            : Colors.amber.shade800,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    esActivo
                        ? 'Pagas S/ 0.50 en transporte urbano de Arequipa (05:00 a 24:00 hrs).'
                        : estado == 'PENDIENTE'
                            ? 'Confirma el código de tu correo institucional para activar el beneficio automáticamente. Mientras tanto, se aplica la tarifa normal.'
                            : 'Verifica tu correo institucional para activar automáticamente la tarifa universitaria.',
                    style: const TextStyle(fontSize: 13),
                  ),
                  if (vigencia != null && esActivo) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Vigente hasta: $vigencia • $institucion',
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Formulario de Solicitud (Si no está aprobado)
            if (!esActivo) ...[
              const Text(
                'Solicitar Acreditación de Medio Pasaje',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.verified_user_outlined),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'La acreditación se activa automáticamente al verificar el código enviado a tu correo institucional. No requiere aprobación de la empresa.',
                        style: TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              TextField(
                controller: _institucionController,
                decoration: const InputDecoration(
                  labelText: 'Institución Educativa',
                  hintText: 'Ej. Universidad Continental, UNSA, etc.',
                  prefixIcon: Icon(Icons.school_outlined),
                ),
              ),
              const SizedBox(height: 14),

              TextField(
                  controller: _emailEduController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Correo Institucional (.edu.pe)',
                    hintText: 'tu.nombre@continental.edu.pe',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
              ),
              const SizedBox(height: 16),

              if (!_otpSent) ...[
                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleSendEmailOTP,
                    child: _isSubmitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Enviar Código de Verificación'),
                  ),
              ] else ...[
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    style: const TextStyle(
                        fontSize: 20,
                        letterSpacing: 4,
                        fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                    decoration: const InputDecoration(
                      labelText: 'Ingresa el código OTP de 6 dígitos',
                      counterText: '',
                    ),
                  ),
                  const SizedBox(height: 14),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981)),
                    onPressed: _isSubmitting ? null : _handleVerifyOTP,
                    child: _isSubmitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Verificar y Activar Medio Pasaje'),
                  ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
