import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../auth/models/user_model.dart';
import '../../auth/providers/auth_provider.dart';
import 'payment_screen.dart';
import 'ticket_history_screen.dart';
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
  final Map<String, double> _fares = {};
  bool _isLoadingFrequentCompanies = true;
  bool _frequentCompaniesUnavailable = false;
  bool _isLoadingFares = true;
  String? _fareError;
  int _selectedTab = 1;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadFrequentCompanies();
      _loadFares();
    });
  }

  Future<void> _loadFares() async {
    if (!mounted) return;
    setState(() {
      _isLoadingFares = true;
      _fareError = null;
    });

    try {
      final response = await _apiClient.dio.get(ApiConstants.fares);
      final fares = response.data['data'] as List<dynamic>? ?? const [];
      final today = DateTime.now().toIso8601String().substring(0, 10);
      final currentFares = <String, Map<String, dynamic>>{};

      for (final item in fares) {
        if (item is! Map) continue;
        final fare = Map<String, dynamic>.from(item);
        final type = fare['tipo_pasajero']?.toString();
        if (type == null || (type != 'NORMAL' && type != 'UNIVERSITARIA')) {
          continue;
        }

        final startsAt = fare['vigencia_inicio']?.toString().substring(0, 10);
        final endsAt = fare['vigencia_fin']?.toString().substring(0, 10);
        if ((startsAt != null && startsAt.compareTo(today) > 0) ||
            (endsAt != null && endsAt.compareTo(today) < 0)) {
          continue;
        }

        final current = currentFares[type];
        final fareId = int.tryParse(fare['id'].toString()) ?? 0;
        final currentId = int.tryParse(current?['id']?.toString() ?? '') ?? -1;
        if (current == null || fareId > currentId) {
          currentFares[type] = fare;
        }
      }

      if (!mounted) return;
      setState(() {
        _fares.clear();
        for (final type in ['NORMAL', 'UNIVERSITARIA']) {
          final amount = currentFares[type]?['monto'];
          if (amount is num) _fares[type] = amount.toDouble();
        }
        _isLoadingFares = false;
        if (_fares.length < 2) {
          _fareError = 'No están disponibles todas las tarifas vigentes.';
        }
      });
    } on DioException catch (error) {
      if (!mounted) return;
      final data = error.response?.data;
      setState(() {
        _isLoadingFares = false;
        _fareError = data is Map && data['message'] is String
            ? data['message'] as String
            : 'No se pudieron cargar las tarifas actuales.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoadingFares = false;
        _fareError = 'No se pudieron cargar las tarifas actuales.';
      });
    }
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
      appBar: _selectedTab == 1 ? AppBar(title: const Text('SIT-Pay')) : null,
      body: IndexedStack(
        index: _selectedTab,
        children: [
          const TicketHistoryScreen(),
          _buildHomeContent(context, auth, user, isDark),
          const ProfileScreen(showBackButton: false),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedTab,
        onDestinationSelected: (index) => setState(() => _selectedTab = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long_rounded),
            label: 'Historial',
          ),
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }

  Widget _buildHomeContent(
    BuildContext context,
    AuthProvider auth,
    UserModel? user,
    bool isDark,
  ) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.viewPaddingOf(context).bottom + 24,
      ),
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
          const SizedBox(height: 16),

          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(72),
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
          const SizedBox(height: 16),

          _buildFareCards(isDark),
          const SizedBox(height: 18),

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
        ],
      ),
    );
  }

  Widget _buildFareCards(bool isDark) {
    final borderColor =
        isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);

    Widget fareCard({
      required String title,
      required String type,
      required IconData icon,
      required Color accent,
      required String description,
    }) {
      final amount = _fares[type];
      return Expanded(
        child: Container(
          constraints: const BoxConstraints(minHeight: 116),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF131B2E) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: accent, size: 20),
              const SizedBox(height: 8),
              Text(title,
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w700)),
              const SizedBox(height: 5),
              if (_isLoadingFares)
                const SizedBox(
                  height: 22,
                  width: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Text(
                  amount == null ? '--' : 'S/ ${amount.toStringAsFixed(2)}',
                  style: TextStyle(
                    color: accent,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              const SizedBox(height: 4),
              Text(description,
                  style: const TextStyle(color: Colors.grey, fontSize: 10)),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Tarifas vigentes hoy',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            fareCard(
              title: 'Pasaje normal',
              type: 'NORMAL',
              icon: Icons.directions_bus_outlined,
              accent: const Color(0xFF0F3B60),
              description: 'Tarifa general',
            ),
            const SizedBox(width: 10),
            fareCard(
              title: 'Universitario',
              type: 'UNIVERSITARIA',
              icon: Icons.school_outlined,
              accent: const Color(0xFF10B981),
              description: 'Con acreditación vigente',
            ),
          ],
        ),
        if (_fareError != null && !_isLoadingFares) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Text(
                  _fareError!,
                  style: const TextStyle(color: Colors.grey, fontSize: 11),
                ),
              ),
              TextButton(
                onPressed: _loadFares,
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ],
      ],
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
