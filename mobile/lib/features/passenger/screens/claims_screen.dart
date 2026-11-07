import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../auth/providers/auth_provider.dart';

const _claimBlue = Color(0xFF0F3B60);
const _claimGreen = Color(0xFF10B981);
const _claimDarkBackground = Color(0xFF090D16);
const _claimDarkPanel = Color(0xFF171717);

class ClaimsScreen extends StatefulWidget {
  const ClaimsScreen({super.key});

  @override
  State<ClaimsScreen> createState() => _ClaimsScreenState();
}

class _ClaimsScreenState extends State<ClaimsScreen> {
  final ApiClient _apiClient = ApiClient();
  List<dynamic> _claims = [];
  bool _isLoading = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _fetchClaims();
  }

  Future<void> _fetchClaims() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _loadError = null;
      });
    }

    try {
      final response = await _apiClient.dio.get(ApiConstants.myClaims);
      if (!mounted) return;
      setState(() {
        _claims = response.data['data'] as List<dynamic>? ?? [];
      });
    } on DioException catch (error) {
      if (!mounted) return;
      final data = error.response?.data;
      setState(() {
        _loadError = data is Map && data['message'] is String
            ? data['message'] as String
            : 'No se pudieron cargar tus reclamos. Comprueba tu conexión e inténtalo nuevamente.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _loadError = 'Ocurrió un error inesperado: $error');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _openNewClaim() async {
    final registered = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const _CreateClaimScreen()),
    );
    if (registered == true) _fetchClaims();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reclamos'),
        backgroundColor:
            isDark ? _claimDarkBackground : const Color(0xFFF4F5F7),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: _claimBlue,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nuevo reclamo'),
        onPressed: _openNewClaim,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
              ? _RetryMessage(message: _loadError!, onRetry: _fetchClaims)
              : _claims.isEmpty
                  ? _EmptyClaims(onCreate: _openNewClaim)
                  : RefreshIndicator(
                      onRefresh: _fetchClaims,
                      child: ListView.separated(
                        padding: EdgeInsets.fromLTRB(
                          16,
                          16,
                          16,
                          MediaQuery.viewPaddingOf(context).bottom + 96,
                        ),
                        itemCount: _claims.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) =>
                            _ClaimCard(claim: _claims[index]),
                      ),
                    ),
      backgroundColor: isDark ? _claimDarkBackground : const Color(0xFFF4F5F7),
    );
  }
}

class _ClaimCard extends StatelessWidget {
  const _ClaimCard({required this.claim});

  final dynamic claim;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final status = (claim['estado'] ?? 'REGISTRADO').toString();
    final toCompany = claim['destinatario'] == 'EMPRESA';
    final plate = claim['vehiculo_placa']?.toString();
    final company = claim['empresa_nombre']?.toString();
    final issueType =
        (claim['tipo_incidencia'] ?? 'OTRO').toString().replaceAll('_', ' ');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? _claimDarkPanel : Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  claim['codigo_reclamo']?.toString() ?? 'Reclamo',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              _StatusChip(status: status),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Dirigido a ${toCompany ? 'la empresa' : 'SIT-Pay / Super Admin'}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (plate != null && plate.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              [
                'Vehículo $plate',
                if (company != null && company.isNotEmpty) company,
              ].join(' · '),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            issueType,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            claim['descripcion']?.toString() ?? '',
            style: theme.textTheme.bodyMedium?.copyWith(height: 1.4),
          ),
          if (claim['respuesta_resolucion'] != null) ...[
            const Divider(height: 20),
            Text(
              'Respuesta: ${claim['respuesta_resolucion']}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: _claimGreen,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final resolved = status == 'RESUELTO';
    final color = resolved ? _claimGreen : Colors.orange;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: resolved
              ? color
              : (Theme.of(context).brightness == Brightness.dark
                  ? Colors.orange.shade200
                  : Colors.orange.shade900),
          fontSize: 10,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _EmptyClaims extends StatelessWidget {
  const _EmptyClaims({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.support_agent_rounded,
              size: 48,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 12),
            Text(
              'Aún no tienes reclamos',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Si tuviste un inconveniente con un transporte, puedes reportarlo aquí.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Crear reclamo'),
            ),
          ],
        ),
      ),
    );
  }
}

class _RetryMessage extends StatelessWidget {
  const _RetryMessage({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined, size: 42),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Transport {
  const _Transport({
    required this.id,
    required this.plate,
    required this.company,
  });

  final String id;
  final String plate;
  final String company;

  factory _Transport.fromJson(Map<String, dynamic> json) => _Transport(
        id: json['id']?.toString() ?? '',
        plate: json['placa']?.toString() ?? '',
        company: json['empresa_nombre']?.toString() ?? '',
      );
}

class _IncidentType {
  const _IncidentType(this.code, this.label);

  final String code;
  final String label;
}

const _companyIncidentTypes = [
  _IncidentType('CONDICIONES_UNIDAD', 'Estado de la unidad o asientos'),
  _IncidentType('LIMPIEZA_UNIDAD', 'Limpieza de la unidad'),
  _IncidentType('MALTRATO_CHOFER', 'Trato del conductor'),
  _IncidentType('COBRO_INDEBIDO', 'Cobro indebido'),
  _IncidentType('NEGATIVA_MEDIO_PASAJE', 'Negativa de medio pasaje'),
  _IncidentType('OTRO', 'Otro problema con la empresa'),
];

const _authorityIncidentTypes = [
  _IncidentType('RUTA_TRANSPORTE', 'Ruta o recorrido del transporte'),
  _IncidentType(
      'FRECUENCIA_SERVICIO', 'Frecuencia o disponibilidad del servicio'),
  _IncidentType('SEGURIDAD_TRANSPORTE', 'Seguridad del transporte público'),
  _IncidentType('FALLA_SISTEMA', 'Problema general del servicio de transporte'),
  _IncidentType('OTRO', 'Otro problema del sistema de transporte'),
];

class _CreateClaimScreen extends StatefulWidget {
  const _CreateClaimScreen();

  @override
  State<_CreateClaimScreen> createState() => _CreateClaimScreenState();
}

class _CreateClaimScreenState extends State<_CreateClaimScreen> {
  final ApiClient _apiClient = ApiClient();
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  List<_Transport> _transports = [];
  _Transport? _selectedTransport;
  bool _isLoadingTransports = true;
  bool _isSubmitting = false;
  String? _transportError;
  bool _isCompanyClaim = true;
  String? _incidentType;

  List<_IncidentType> get _incidentTypes =>
      _isCompanyClaim ? _companyIncidentTypes : _authorityIncidentTypes;

  @override
  void initState() {
    super.initState();
    _loadTransports();
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _loadTransports() async {
    final isDemoMode = context.read<AuthProvider>().isDemoMode;
    if (isDemoMode) {
      setState(() {
        _isLoadingTransports = false;
        _transportError =
            'La selección de transporte requiere conexión con el servidor.';
      });
      return;
    }

    try {
      final response = await _apiClient.dio.get(ApiConstants.vehicleQR);
      final vehicles = response.data['data'] as List<dynamic>? ?? [];
      if (!mounted) return;
      setState(() {
        _transports = vehicles
            .whereType<Map>()
            .map((vehicle) => _Transport.fromJson(
                  Map<String, dynamic>.from(vehicle),
                ))
            .where((transport) =>
                transport.id.isNotEmpty && transport.plate.isNotEmpty)
            .toList();
        _isLoadingTransports = false;
      });
    } on DioException catch (error) {
      if (!mounted) return;
      final data = error.response?.data;
      setState(() {
        _transportError = data is Map && data['message'] is String
            ? data['message'] as String
            : 'No se pudo cargar la lista de transportes. Comprueba tu conexión e inténtalo nuevamente.';
        _isLoadingTransports = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _transportError = 'Ocurrió un error inesperado: $error';
        _isLoadingTransports = false;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedTransport == null) return;
    setState(() => _isSubmitting = true);
    try {
      await _apiClient.dio.post(
        ApiConstants.claims,
        data: {
          'destinatario': _isCompanyClaim ? 'EMPRESA' : 'SUPER_ADMIN',
          'vehiculoId': _selectedTransport!.id,
          'tipoIncidencia': _incidentType,
          'descripcion': _description.text.trim(),
        },
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tu reclamo se registró correctamente.')),
      );
      Navigator.of(context).pop(true);
    } on DioException catch (error) {
      if (!mounted) return;
      final data = error.response?.data;
      final message = data is Map && data['message'] is String
          ? data['message'] as String
          : 'No se pudo registrar el reclamo. Comprueba tu conexión e inténtalo nuevamente.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ocurrió un error inesperado: $error'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nuevo reclamo'),
        backgroundColor:
            isDark ? _claimDarkBackground : const Color(0xFFF4F5F7),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: EdgeInsets.fromLTRB(
            16,
            12,
            16,
            MediaQuery.viewPaddingOf(context).bottom + 24,
          ),
          children: [
            Text(
              '¿A quién deseas dirigirlo?',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            _RecipientChoice(
              isSelected: _isCompanyClaim,
              icon: Icons.directions_bus_outlined,
              title: 'A la empresa de transporte',
              description:
                  'Estado de la unidad, asientos, limpieza o atención.',
              onTap: () => setState(() {
                _isCompanyClaim = true;
                _incidentType = null;
              }),
            ),
            const SizedBox(height: 8),
            _RecipientChoice(
              isSelected: !_isCompanyClaim,
              icon: Icons.account_balance_outlined,
              title: 'A SIT-Pay / Super Admin',
              description:
                  'Rutas, frecuencia o problemas generales del transporte.',
              onTap: () => setState(() {
                _isCompanyClaim = false;
                _incidentType = null;
              }),
            ),
            const SizedBox(height: 20),
            _FormSection(
              title: 'Transporte involucrado',
              icon: Icons.directions_bus_filled_outlined,
              child: _transportField(),
            ),
            const SizedBox(height: 12),
            _FormSection(
              title: 'Tipo de inconveniente',
              icon: Icons.report_problem_outlined,
              child: DropdownButtonFormField<String>(
                initialValue: _incidentType,
                isExpanded: true,
                decoration: const InputDecoration(
                  hintText: 'Selecciona el motivo',
                  border: OutlineInputBorder(),
                ),
                items: _incidentTypes
                    .map(
                      (issue) => DropdownMenuItem(
                        value: issue.code,
                        child: Text(
                          issue.label,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                validator: (value) => value == null
                    ? 'Selecciona un tipo de inconveniente.'
                    : null,
                onChanged: (value) => setState(() => _incidentType = value),
              ),
            ),
            const SizedBox(height: 12),
            _FormSection(
              title: '¿Qué ocurrió?',
              icon: Icons.description_outlined,
              child: TextFormField(
                controller: _description,
                minLines: 5,
                maxLines: 8,
                maxLength: 2000,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  hintText:
                      'Describe el inconveniente con detalles para que puedan atenderlo.',
                  alignLabelWithHint: true,
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().length < 10) {
                    return 'Describe lo ocurrido con al menos 10 caracteres.';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              height: 52,
              child: FilledButton.icon(
                onPressed: _isSubmitting ? null : _submit,
                icon: _isSubmitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send_rounded),
                label: Text(_isSubmitting ? 'Enviando...' : 'Enviar reclamo'),
              ),
            ),
          ],
        ),
      ),
      backgroundColor: isDark ? _claimDarkBackground : const Color(0xFFF4F5F7),
    );
  }

  Widget _transportField() {
    if (_isLoadingTransports) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 14),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_transportError != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_transportError!),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () {
                setState(() {
                  _isLoadingTransports = true;
                  _transportError = null;
                });
                _loadTransports();
              },
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Reintentar'),
            ),
          ),
        ],
      );
    }
    if (_transports.isEmpty) {
      return const Text(
        'No hay transportes activos disponibles. Intenta nuevamente más tarde.',
      );
    }

    return DropdownButtonFormField<_Transport>(
      initialValue: _selectedTransport,
      isExpanded: true,
      decoration: const InputDecoration(
        hintText: 'Selecciona una placa',
        border: OutlineInputBorder(),
      ),
      items: _transports
          .map(
            (transport) => DropdownMenuItem(
              value: transport,
              child: Text(
                transport.company.isEmpty
                    ? transport.plate
                    : '${transport.plate} · ${transport.company}',
                overflow: TextOverflow.ellipsis,
              ),
            ),
          )
          .toList(),
      validator: (value) =>
          value == null ? 'Selecciona el transporte involucrado.' : null,
      onChanged: (value) => setState(() => _selectedTransport = value),
    );
  }
}

class _RecipientChoice extends StatelessWidget {
  const _RecipientChoice({
    required this.isSelected,
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
  });

  final bool isSelected;
  final IconData icon;
  final String title;
  final String description;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Material(
      color: isDark ? _claimDarkPanel : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color:
                  isSelected ? _claimGreen : theme.colorScheme.outlineVariant,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 22,
                color: isSelected
                    ? _claimGreen
                    : theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(description, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                isSelected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: isSelected ? _claimGreen : theme.colorScheme.outline,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FormSection extends StatelessWidget {
  const _FormSection({
    required this.title,
    required this.icon,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? _claimDarkPanel : Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: _claimBlue),
              const SizedBox(width: 8),
              Text(
                title,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}
