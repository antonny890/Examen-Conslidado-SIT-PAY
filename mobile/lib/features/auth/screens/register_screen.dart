import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/alias_rules.dart';
import '../providers/auth_provider.dart';
import '../../passenger/screens/passenger_home_screen.dart';
import '../../../services/migo_service.dart';

/// Pantalla de Registro de Pasajeros
/// Cumplimiento Ley 29733: Consentimiento expreso e informado de tratamiento de datos personales
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nombresController = TextEditingController();
  final _apellidosController = TextEditingController();
  final _aliasController = TextEditingController();
  final _dniController = TextEditingController();
  final _telefonoController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _consentimientoDatos = false;
  bool _consentimientoConsultaDni = false;
  bool _obscurePassword = true;
  bool _isLookingUpDni = false;
  String? _lastLookedUpDni;
  int _dniLookupSequence = 0;

  @override
  void dispose() {
    _nombresController.dispose();
    _apellidosController.dispose();
    _aliasController.dispose();
    _dniController.dispose();
    _telefonoController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_consentimientoDatos) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Debe autorizar el consentimiento de datos personales (Ley 29733).'),
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }

    if (!_consentimientoConsultaDni) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content:
              Text('Debe autorizar la consulta de identidad para registrarse.'),
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.registerPassenger(
      email: _emailController.text,
      password: _passwordController.text,
      nombres: _nombresController.text,
      apellidos: _apellidosController.text,
      alias: _aliasController.text.trim(),
      numeroDocumento: _dniController.text,
      telefono: _telefonoController.text,
      consentimientoDatos: _consentimientoDatos,
    );

    if (!mounted) return;

    if (success) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const PassengerHomeScreen()),
        (route) => false,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'Error al registrarse.'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  void _onDniChanged(String value) {
    final dni = value.trim();
    final sequence = ++_dniLookupSequence;
    setState(() {
      _lastLookedUpDni = null;
      _isLookingUpDni = false;
      _nombresController.clear();
      _apellidosController.clear();
    });

    if (_consentimientoConsultaDni && RegExp(r'^\d{8}$').hasMatch(dni)) {
      _lookupDni(dni, sequence);
    }
  }

  Future<void> _lookupDni(String dni, int sequence) async {
    if (!_consentimientoConsultaDni || _lastLookedUpDni == dni) return;
    _lastLookedUpDni = dni;
    setState(() => _isLookingUpDni = true);

    try {
      final identity = await MigoService.consultarDni(dni);
      if (!mounted || sequence != _dniLookupSequence) return;

      _nombresController.text = identity.nombres;
      _apellidosController.text = identity.apellidos;
    } catch (error) {
      if (!mounted || sequence != _dniLookupSequence) return;
      _lastLookedUpDni = null;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red.shade700,
        ),
      );
    } finally {
      if (mounted && sequence == _dniLookupSequence) {
        setState(() => _isLookingUpDni = false);
      }
    }
  }

  void _onDniLookupConsentChanged(bool? value) {
    final consent = value ?? false;
    setState(() {
      _consentimientoConsultaDni = consent;
      if (!consent) {
        _dniLookupSequence++;
        _lastLookedUpDni = null;
        _isLookingUpDni = false;
        _nombresController.clear();
        _apellidosController.clear();
      }
    });

    final dni = _dniController.text.trim();
    if (consent && RegExp(r'^\d{8}$').hasMatch(dni)) {
      _lookupDni(dni, _dniLookupSequence);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Registro de Pasajero'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Crea tu cuenta de Pasajero',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Paga tu pasaje urbano con QR sin llevar efectivo.',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 20),

                // DNI: consulta automática cuando se completan los 8 dígitos.
                TextFormField(
                  controller: _dniController,
                  keyboardType: TextInputType.number,
                  maxLength: 8,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChanged: _onDniChanged,
                  decoration: const InputDecoration(
                    labelText: 'Número de DNI *',
                    prefixIcon: Icon(Icons.badge_outlined),
                    counterText: '',
                  ),
                  validator: (value) => value == null ||
                          !RegExp(r'^\d{8}$').hasMatch(value.trim())
                      ? 'El DNI debe tener 8 dígitos.'
                      : null,
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: _isLookingUpDni ||
                            !_consentimientoConsultaDni ||
                            !RegExp(r'^\d{8}$')
                                .hasMatch(_dniController.text.trim())
                        ? null
                        : () {
                            final dni = _dniController.text.trim();
                            _lastLookedUpDni = null;
                            _lookupDni(dni, _dniLookupSequence);
                          },
                    icon: _isLookingUpDni
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.search),
                    label: Text(
                      _isLookingUpDni ? 'Consultando DNI...' : 'Consultar DNI',
                    ),
                  ),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  value: _consentimientoConsultaDni,
                  onChanged: _onDniLookupConsentChanged,
                  title: const Text(
                    'Autorizo enviar mi DNI al proveedor Migo para consultar y completar mis nombres y apellidos.',
                    style: TextStyle(fontSize: 12),
                  ),
                ),

                // Nombres devueltos por la consulta del documento.
                TextFormField(
                  controller: _nombresController,
                  textCapitalization: TextCapitalization.words,
                  readOnly: true,
                  decoration: const InputDecoration(
                    labelText: 'Nombres *',
                    prefixIcon: Icon(Icons.person_outline),
                    helperText: 'Se completan al verificar el DNI.',
                  ),
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Consulte un DNI válido para completar sus nombres.'
                      : null,
                ),
                const SizedBox(height: 14),

                // Apellidos devueltos por la consulta del documento.
                TextFormField(
                  controller: _apellidosController,
                  textCapitalization: TextCapitalization.words,
                  readOnly: true,
                  decoration: const InputDecoration(
                    labelText: 'Apellidos *',
                    prefixIcon: Icon(Icons.person_outline),
                    helperText: 'Se completan al verificar el DNI.',
                  ),
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Consulte un DNI válido para completar sus apellidos.'
                      : null,
                ),
                const SizedBox(height: 14),

                TextFormField(
                  controller: _aliasController,
                  textCapitalization: TextCapitalization.none,
                  maxLength: 20,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(
                      RegExp(r'[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]'),
                    ),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'Alias (opcional)',
                    prefixIcon: Icon(Icons.alternate_email),
                    helperText:
                        '3 a 20 letras o números, sin espacios ni símbolos.',
                    counterText: '',
                  ),
                  validator: AliasRules.validate,
                ),
                const SizedBox(height: 14),

                // Teléfono
                TextFormField(
                  controller: _telefonoController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                      labelText: 'Celular (Opcional)',
                      prefixIcon: Icon(Icons.phone_outlined)),
                ),
                const SizedBox(height: 14),

                // Correo
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                      labelText: 'Correo Electrónico *',
                      prefixIcon: Icon(Icons.email_outlined)),
                  validator: (v) => v == null || !v.contains('@')
                      ? 'Correo no válido.'
                      : null,
                ),
                const SizedBox(height: 14),

                // Contraseña
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'Contraseña *',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword
                          ? Icons.visibility_off
                          : Icons.visibility),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (v) =>
                      v == null || v.length < 6 ? 'Mínimo 6 caracteres.' : null,
                ),
                const SizedBox(height: 16),

                // Consentimiento Ley 29733 (Datos Personales)
                CheckboxListTile(
                  value: _consentimientoDatos,
                  onChanged: (val) =>
                      setState(() => _consentimientoDatos = val ?? false),
                  title: const Text(
                    'Acepto los términos de tratamiento y protección de datos personales (Ley N° 29733 de la República del Perú).',
                    style: TextStyle(fontSize: 12),
                  ),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 20),

                // Botón Registrarse
                ElevatedButton(
                  onPressed: auth.isLoading ? null : _handleRegister,
                  child: auth.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Completar Registro'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
