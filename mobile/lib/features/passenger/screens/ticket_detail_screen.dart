import 'package:flutter/material.dart';

/// Pantalla de Detalle de Boleta Digital de Pasaje (Ley 29571)
class TicketDetailScreen extends StatelessWidget {
  final Map<String, dynamic> ticket;

  const TicketDetailScreen({super.key, required this.ticket});

  @override
  Widget build(BuildContext context) {
    final codigoBoleta = ticket['codigoBoleta'] ??
        ticket['codigo_boleta'] ??
        'BOL-20261030-000000';
    final fecha =
        ticket['fecha'] ?? ticket['fecha_pago'] ?? DateTime.now().toString();
    final placa = ticket['placa'] ?? 'V7A-890';
    final empresa = ticket['empresa'] ??
        ticket['empresa_nombre'] ??
        'Transcayma Operadora S.A.';
    final cuenca = ticket['cuenca'] ?? 'C3 Cayma';
    final monto = (ticket['monto'] as num?)?.toDouble() ?? 1.0;
    final tipoTarifa =
        ticket['tipoTarifa'] ?? ticket['tipo_tarifa_aplicada'] ?? 'NORMAL';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Comprobante de Viaje'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Icono de Pago Exitoso
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_rounded,
                    color: Color(0xFF10B981),
                    size: 48,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Center(
                child: Text(
                  '¡Pago Realizado con Éxito!',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),
              const Center(
                child: Text(
                  'El chofer ha sido notificado en su pantalla.',
                  style: TextStyle(fontSize: 13, color: Colors.grey),
                ),
              ),
              const SizedBox(height: 24),

              // Boleta Digital con diseño de Ticket
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'BOLETA DIGITAL',
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              letterSpacing: 1),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color:
                                const Color(0xFF10B981).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Ley N° 29571',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF10B981)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      codigoBoleta,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          fontFamily: 'monospace'),
                    ),
                    const Divider(height: 24),
                    _buildRow('Fecha y Hora:', fecha.toString().split('.')[0]),
                    const SizedBox(height: 10),
                    _buildRow('Placa del Vehículo:', placa),
                    const SizedBox(height: 10),
                    _buildRow('Empresa Concesionaria:', empresa),
                    const SizedBox(height: 10),
                    _buildRow('Zona / Cuenca SIT:', cuenca),
                    const SizedBox(height: 10),
                    _buildRow('Tipo de Tarifa:', tipoTarifa),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'TOTAL PAGADO:',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        Text(
                          'S/ ${monto.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF10B981),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),

              // Botones de acción
              OutlinedButton.icon(
                icon: const Icon(Icons.share_outlined),
                label: const Text('Compartir Comprobante'),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content:
                            Text('Comprobante digital listo para compartir.')),
                  );
                },
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Volver al Inicio'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          ),
        ),
      ],
    );
  }
}
