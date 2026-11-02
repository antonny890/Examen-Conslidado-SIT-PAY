import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../auth/providers/auth_provider.dart';
import 'ticket_detail_screen.dart';

/// Historial de Boletas Digitales del Pasajero
class TicketHistoryScreen extends StatefulWidget {
  const TicketHistoryScreen({super.key});

  @override
  State<TicketHistoryScreen> createState() => _TicketHistoryScreenState();
}

class _TicketHistoryScreenState extends State<TicketHistoryScreen> {
  final ApiClient _apiClient = ApiClient();
  List<dynamic> _tickets = [];
  bool _isLoading = true;
  bool _isDemoMode = false;
  bool _loadFailed = false;

  @override
  void initState() {
    super.initState();
    _fetchTickets();
  }

  Future<void> _fetchTickets() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.isDemoMode) {
      if (!mounted) return;
      setState(() {
        _isDemoMode = true;
        _isLoading = false;
      });
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await _apiClient.dio.get(ApiConstants.myTickets);
      if (response.statusCode == 200) {
        setState(() {
          _tickets = response.data['data']['tickets'] ?? [];
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadFailed = true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Historial de Viajes')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _loadFailed
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'No se pudo cargar el historial. Verifica tu sesión o conexión e inténtalo nuevamente.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : _isDemoMode
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text(
                          'Vista de demostración: los pagos no se procesan y no hay viajes reales que mostrar.',
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  : _tickets.isEmpty
                      ? const Center(
                          child: Text('Aún no has realizado pagos de pasajes.'),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _tickets.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final t = _tickets[index];
                            final monto =
                                (t['monto'] as num?)?.toDouble() ?? 1.0;
                            final placa = t['placa'] ?? 'Bus SIT';
                            final codigo = t['codigo_boleta'] ?? 'BOL-...';
                            final empresa =
                                t['empresa_nombre'] ?? t['empresa'] ?? '';
                            final cuencaCodigo = t['cuenca_codigo'] ?? '';
                            final cuencaNombre = t['cuenca_nombre'] ?? '';
                            final fecha =
                                t['fecha_pago']?.toString().split('T')[0] ?? '';
                            final details = [
                              if (empresa.toString().isNotEmpty) empresa,
                              if (cuencaCodigo.toString().isNotEmpty ||
                                  cuencaNombre.toString().isNotEmpty)
                                '$cuencaCodigo $cuencaNombre'.trim(),
                              codigo,
                              fecha,
                            ].join(' • ');

                            return Card(
                              elevation: 0.5,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                                side: BorderSide(
                                    color: Colors.grey.withValues(alpha: 0.2)),
                              ),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: const Color(0xFF10B981)
                                      .withValues(alpha: 0.15),
                                  child: const Icon(
                                      Icons.directions_bus_rounded,
                                      color: Color(0xFF10B981)),
                                ),
                                title: Text(
                                  'Bus Placa $placa',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold),
                                ),
                                subtitle: Text(details),
                                trailing: Text(
                                  'S/ ${monto.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                    color: Color(0xFF10B981),
                                  ),
                                ),
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) =>
                                          TicketDetailScreen(ticket: t),
                                    ),
                                  );
                                },
                              ),
                            );
                          },
                        ),
    );
  }
}
