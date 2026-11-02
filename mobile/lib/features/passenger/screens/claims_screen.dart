import 'package:flutter/material.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';

/// Pantalla de Reclamos e Incidencias del Consumidor (Ley 29571)
class ClaimsScreen extends StatefulWidget {
  const ClaimsScreen({super.key});

  @override
  State<ClaimsScreen> createState() => _ClaimsScreenState();
}

class _ClaimsScreenState extends State<ClaimsScreen> {
  final ApiClient _apiClient = ApiClient();
  List<dynamic> _claims = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchClaims();
  }

  Future<void> _fetchClaims() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiClient.dio.get(ApiConstants.myClaims);
      if (response.statusCode == 200) {
        setState(() {
          _claims = response.data['data'] ?? [];
        });
      }
    } catch (_) {
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showNewClaimDialog() {
    String tipo = 'NEGATIVA_MEDIO_PASAJE';
    final descController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Libro de Reclamaciones (Ley 29571)',
                  style: TextStyle(fontSize: 16)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Tipo de Incidencia:',
                        style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: tipo,
                      items: const [
                        DropdownMenuItem(
                            value: 'NEGATIVA_MEDIO_PASAJE',
                            child: Text('Negativa de Medio Pasaje')),
                        DropdownMenuItem(
                            value: 'COBRO_INDEBIDO',
                            child: Text('Cobro Indebido')),
                        DropdownMenuItem(
                            value: 'MALTRATO_CHOFER',
                            child: Text('Maltrato por el Conductor')),
                        DropdownMenuItem(
                            value: 'OTRO', child: Text('Otra Incidencia')),
                      ],
                      onChanged: (v) => setDialogState(() => tipo = v!),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: descController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Descripción de los Hechos',
                        hintText:
                            'Detalla lo ocurrido, número de placa o ruta...',
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Cancelar')),
                ElevatedButton(
                  onPressed: () async {
                    if (descController.text.trim().isEmpty) return;
                    Navigator.pop(ctx);
                    try {
                      await _apiClient.dio.post(
                        ApiConstants.claims,
                        data: {
                          'tipoIncidencia': tipo,
                          'descripcion': descController.text.trim(),
                        },
                      );
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text(
                                'Reclamo registrado formalmente con código único.')),
                      );
                      _fetchClaims();
                    } catch (_) {}
                  },
                  child: const Text('Registrar Reclamo'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reclamos e Incidencias')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF0F3B60),
        icon: const Icon(Icons.add, color: Colors.white),
        label:
            const Text('Nuevo Reclamo', style: TextStyle(color: Colors.white)),
        onPressed: _showNewClaimDialog,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _claims.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'No tienes reclamos registrados en el sistema SIT-Pay.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _claims.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, idx) {
                    final c = _claims[idx];
                    final codigo = c['codigo_reclamo'] ?? 'REC-...';
                    final estado = c['estado'] ?? 'REGISTRADO';
                    final tipo =
                        (c['tipo_incidencia'] ?? '').replaceAll('_', ' ');

                    return Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                        side: BorderSide(
                            color: Colors.grey.withValues(alpha: 0.2)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(codigo,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontFamily: 'monospace')),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: estado == 'RESUELTO'
                                        ? Colors.green.withValues(alpha: 0.15)
                                        : Colors.amber.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    estado,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: estado == 'RESUELTO'
                                          ? Colors.green
                                          : Colors.amber.shade900,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(tipo,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 13)),
                            const SizedBox(height: 4),
                            Text(c['descripcion'] ?? '',
                                style: const TextStyle(
                                    fontSize: 12, color: Colors.grey)),
                            if (c['respuesta_resolucion'] != null) ...[
                              const Divider(height: 16),
                              Text(
                                'Respuesta de la Concesionaria: ${c['respuesta_resolucion']}',
                                style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF10B981)),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
