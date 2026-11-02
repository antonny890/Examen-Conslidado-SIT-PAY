import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../auth/providers/auth_provider.dart';
import 'payment_screen.dart';
import 'preferential_screen.dart';
import 'ticket_history_screen.dart';
import 'claims_screen.dart';
import '../../profile/screens/profile_screen.dart';

/// Pantalla Principal del Pasajero (SIT-Pay Arequipa)
/// Interfaz limpia, accesible, con botones grandes y pago directo por proveedor externo
class PassengerHomeScreen extends StatefulWidget {
  const PassengerHomeScreen({super.key});

  @override
  State<PassengerHomeScreen> createState() => _PassengerHomeScreenState();
}

class _PassengerHomeScreenState extends State<PassengerHomeScreen> {
  final ApiClient _apiClient = ApiClient();
  List<MapEntry<String, int>> _frequentCompanies = [];
  bool _isLoadingFrequentCompanies = true;
  bool _frequentCompaniesUnavailable = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadFrequentCompanies();
    });
  }

  Future<void> _loadFrequentCompanies() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.isDemoMode) {
      if (!mounted) return;
      setState(() {
        _isLoadingFrequentCompanies = false;
        _frequentCompaniesUnavailable = true;
      });
      return;
    }

    try {
      final response = await _apiClient.dio.get(ApiConstants.myTickets);
      final tickets =
          response.data['data']?['tickets'] as List<dynamic>? ?? const [];
      final counts = <String, int>{};
      for (final ticket in tickets) {
        if (ticket is! Map) continue;
        final company = ticket['empresa_nombre']?.toString().trim() ?? '';
        if (company.isNotEmpty) {
          counts.update(company, (count) => count + 1, ifAbsent: () => 1);
        }
      }

      if (!mounted) return;
      setState(() {
        _frequentCompanies = counts.entries.toList()
          ..sort((a, b) => b.value.compareTo(a.value));
        _isLoadingFrequentCompanies = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoadingFrequentCompanies = false;
        _frequentCompaniesUnavailable = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('SIT-Pay'),
        leading: IconButton(
          icon: const Icon(Icons.person_outline_rounded),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            );
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long_rounded),
            tooltip: 'Mis Boletas',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const TicketHistoryScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.report_problem_outlined),
            tooltip: 'Reclamos',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ClaimsScreen()),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Saludo
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '¡Hola, ${user?.primerNombre ?? "Pasajero"}!',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Transporte Urbano de Arequipa',
                      style: TextStyle(fontSize: 13, color: Colors.grey),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            if (auth.isDemoMode) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.amber.withValues(alpha: 0.4),
                  ),
                ),
                child: const Text(
                  'Vista previa sin servidor. Los pagos y cambios no se procesan.',
                  style: TextStyle(fontSize: 12, color: Colors.amber),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // SIT-Pay does not hold passenger funds or maintain a stored balance.
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F3B60), Color(0xFF09253E)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F3B60).withValues(alpha: 0.3),
                    blurRadius: 15,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pago directo desde tu entidad financiera',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Cuando se integre el banco, el importe se procesará y abonará directamente a la empresa. SIT-Pay no guarda saldo; el pago aún no está disponible.',
                    style: TextStyle(color: Color(0xFFBFDBFE), fontSize: 13),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            _buildFrequentCompaniesCard(isDark),
            const SizedBox(height: 20),

            // BOTÓN GIGANTE: PAGAR PASAJE (Llamado a la acción principal)
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(72), // Muy grande y visible
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                elevation: 4,
              ),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const PaymentScreen()),
                );
              },
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.qr_code_scanner_rounded, size: 30),
                  SizedBox(width: 12),
                  Text(
                    'PAGAR PASAJE',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Estado de Tarifa Preferencial (Ley 26271)
            InkWell(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const PreferentialScreen()),
                );
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF131B2E) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark
                        ? const Color(0xFF1E293B)
                        : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.school_outlined,
                        color: Color(0xFF10B981),
                        size: 26,
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Medio Pasaje (Ley 26271)',
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Universitario y Escolar al 50 % (S/ 0.50)',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded,
                        size: 16, color: Colors.grey),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Información de Transparencia de Tarifas
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color:
                    isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tarifas del SIT Arequipa:',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                  SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('• Pasaje Regular Adulto:',
                          style: TextStyle(fontSize: 12)),
                      Text('S/ 1.00',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                  SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('• Medio Pasaje Acreditado (05:00 - 24:00):',
                          style: TextStyle(fontSize: 12)),
                      Text('S/ 0.50',
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              color: Color(0xFF10B981))),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFrequentCompaniesCard(bool isDark) {
    final companies = _frequentCompanies.take(3).toList();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF131B2E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.route_outlined, color: Color(0xFF0F3B60)),
              SizedBox(width: 8),
              Text(
                'Tus empresas frecuentes',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_isLoadingFrequentCompanies)
            const LinearProgressIndicator(minHeight: 2)
          else if (companies.isNotEmpty)
            ...companies.map(
              (company) => Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    const Icon(
                      Icons.directions_bus_outlined,
                      size: 18,
                      color: Color(0xFF10B981),
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(company.key)),
                    Text(
                      '${company.value} ${company.value == 1 ? 'viaje' : 'viajes'}',
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Text(
              _frequentCompaniesUnavailable
                  ? 'El resumen estará disponible al iniciar sesión y tener viajes confirmados.'
                  : 'Aún no tienes viajes confirmados. Aquí aparecerán las empresas que más utilizas.',
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
        ],
      ),
    );
  }
}
