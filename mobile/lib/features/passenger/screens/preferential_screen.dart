import 'package:flutter/material.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

/// Pantalla de Solicitud y Acreditación de Medio Pasaje (Ley 26271)
/// Dos métodos: (a) Correo institucional .edu.pe con OTP o (b) Foto del carné
class PreferentialScreen extends StatefulWidget {
  const PreferentialScreen({super.key});

  @override
  State<PreferentialScreen> createState() => _PreferentialScreenState();
}

class _PreferentialScreenState extends State<PreferentialScreen> {
  final ApiClient _apiClient = ApiClient();
  Map<String, dynamic>? _statusData;
  bool _isLoading = true;

  int _selectedMethod = 0; // 0: Correo .edu.pe, 1: Foto del carné
  final _institucionController = TextEditingController();
  final _emailEduController = TextEditingController();
  final _otpController = TextEditingController();

  String _tipoPreferencial = 'UNIVERSITARIO';
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
      if (response.statusCode == 200) {
        setState(() {
          _statusData = response.data['data'];
        });
      }
    } catch (_) {
    } finally {
      setState(() => _isLoading = false);
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
          'tipoPreferencial': _tipoPreferencial,
        },
      );

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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
                Text('Error al enviar el código. Verifique que sea .edu.pe.')),
      );
    } finally {
      setState(() => _isSubmitting = false);
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Código incorrecto o expirado.')),
      );
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  // Método B: Enviar foto de carné
  Future<void> _handleSubmitCard() async {
    final institucion = _institucionController.text.trim();
    if (institucion.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingrese la institución educativa.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.preferentialRequestCard,
        data: {
          'institucionEducativa': institucion,
          'tipoPreferencial': _tipoPreferencial,
          'fotoCarneUrl':
              'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
        },
      );

      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content:
                  Text('Solicitud registrada. En revisión por la empresa.')),
        );
        _fetchStatus();
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error al enviar la solicitud.')),
      );
    } finally {
      setState(() => _isSubmitting = false);
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
                            ? 'ESTADO: APROBADO (50 % ACTIVO)'
                            : estado == 'PENDIENTE'
                                ? 'ESTADO: EN REVISIÓN'
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
                            ? 'Tu solicitud está siendo revisada por los administradores de la concesionaria. Mientras tanto, pagas tarifa regular S/ 1.00.'
                            : 'Acredítate con tu carné universitario o escolar para pagar solo el 50 %.',
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

              // Selector Tipo: Universitario vs Escolar
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                      value: 'UNIVERSITARIO', label: Text('Universitario')),
                  ButtonSegment(value: 'ESCOLAR', label: Text('Escolar')),
                ],
                selected: {_tipoPreferencial},
                onSelectionChanged: (set) =>
                    setState(() => _tipoPreferencial = set.first),
              ),
              const SizedBox(height: 16),

              // Pestañas Método: Correo vs Carné
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Correo .edu.pe (Rápido)'),
                      selected: _selectedMethod == 0,
                      onSelected: (_) => setState(() => _selectedMethod = 0),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Foto del Carné'),
                      selected: _selectedMethod == 1,
                      onSelected: (_) => setState(() => _selectedMethod = 1),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              TextField(
                controller: _institucionController,
                decoration: const InputDecoration(
                  labelText: 'Institución Educativa',
                  hintText: 'Ej. Universidad Continental, UNSA, etc.',
                  prefixIcon: Icon(Icons.school_outlined),
                ),
              ),
              const SizedBox(height: 14),

              if (_selectedMethod == 0) ...[
                // Método Correo
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
              ] else ...[
                // Método Foto Carné
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    border:
                        Border.all(color: Colors.grey.withValues(alpha: 0.3)),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.credit_card_rounded,
                          size: 48, color: Colors.grey),
                      const SizedBox(height: 8),
                      const Text(
                        'Foto del Carné Vigente (Frente)',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Asegúrate de que los nombres y fecha de caducidad sean legibles.',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 14),
                      OutlinedButton.icon(
                        icon: const Icon(Icons.camera_alt_outlined),
                        label: const Text('Tomar Foto o Subir'),
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text(
                                    'Foto del carné adjuntada para revisión.')),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmitCard,
                  child: _isSubmitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Enviar Carné para Revisión'),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
