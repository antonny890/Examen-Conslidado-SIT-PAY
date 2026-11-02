import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/driver_socket_provider.dart';
import '../../auth/screens/login_screen.dart';
import '../../profile/screens/profile_screen.dart';

/// Pantalla Principal del Chofer (Interfaz "Cero Distracción")
///
/// Diseñada para que el chofer NUNCA tenga que interactuar con el teléfono mientras conduce:
/// - Código QR grande y fijo listo para escanear en parabrisas/mampara.
/// - Alerta visual de pantalla completa verde con sonido al confirmarse el pago.
/// - SOLO dice "[Nombre] realizó el pago correspondiente".
/// - NUNCA muestra montos, saldos ni datos personales (Ley 29733).
class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final user = auth.currentUser;
      final choferInfo = user?.choferInfo;
      final socket = Provider.of<DriverSocketProvider>(context, listen: false);

      if (auth.isDemoMode) {
        socket.initializeDemoDriver(
          placa: choferInfo?.placa ?? 'V7A-890',
          qrCodigoSeguro: choferInfo?.qrCodigoSeguro ?? 'SIT-VEH-V7A890-DEMO',
        );
        return;
      }

      if (choferInfo == null ||
          choferInfo.placa.isEmpty ||
          choferInfo.qrCodigoSeguro.isEmpty) {
        socket.clearDriverAssignment();
        return;
      }

      // Inicializar Socket.IO vinculado a la sala de este bus
      socket.initializeDriverSocket(
        placa: choferInfo.placa,
        qrCodigoSeguro: choferInfo.qrCodigoSeguro,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final driverSocket = Provider.of<DriverSocketProvider>(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = theme.colorScheme.onSurface;
    final secondaryTextColor =
        isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final cardColor = theme.colorScheme.surface;
    final cardBorderColor = theme.colorScheme.outlineVariant;
    final alert = driverSocket.activePaymentAlert;
    final hasAssignedVehicle = auth.isDemoMode ||
        auth.currentUser?.choferInfo?.qrCodigoSeguro.isNotEmpty == true;

    final placa = driverSocket.currentPlate ??
        auth.currentUser?.choferInfo?.placa ??
        (auth.isDemoMode ? 'V7A-890' : 'SIN UNIDAD');
    final qrData = driverSocket.qrCode ??
        auth.currentUser?.choferInfo?.qrCodigoSeguro ??
        '';
    final driverAlias = auth.currentUser?.alias.trim() ?? '';

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.appBarTheme.backgroundColor,
        foregroundColor: theme.appBarTheme.foregroundColor,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: driverSocket.isConnected
                    ? const Color(0xFF10B981)
                    : auth.isDemoMode || hasAssignedVehicle
                        ? Colors.amber
                        : Colors.red,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'BUS $placa',
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline_rounded),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () async {
              driverSocket.disposeSocket();
              await auth.logout();
              if (!context.mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (route) => false,
              );
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          // Pantalla Base Normal
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Estado de Conexión y Pantalla Activa
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            driverAlias.isEmpty
                                ? 'CONDUCTOR'
                                : 'CONDUCTOR · $driverAlias',
                            style: TextStyle(
                              color: primaryTextColor,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            auth.isDemoMode
                                ? 'VISTA PREVIA · SIN SERVIDOR'
                                : driverSocket.isConnected
                                    ? 'SISTEMA CONECTADO EN VIVO'
                                    : hasAssignedVehicle
                                        ? 'CONECTANDO AL BUS...'
                                        : 'SIN UNIDAD ASIGNADA',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: auth.isDemoMode
                                  ? Colors.amber
                                  : driverSocket.isConnected
                                      ? const Color(0xFF10B981)
                                      : hasAssignedVehicle
                                          ? Colors.amber
                                          : Colors.redAccent,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Icon(Icons.lock_clock_rounded,
                              size: 14, color: secondaryTextColor),
                          const SizedBox(width: 4),
                          Text(
                            'Pantalla Encendida',
                            style: TextStyle(
                              fontSize: 11,
                              color: secondaryTextColor,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: cardColor,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: cardBorderColor),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.verified_outlined,
                          color: Color(0xFF10B981),
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Pagos confirmados en este turno',
                            style: TextStyle(
                              color: primaryTextColor,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        Text(
                          '${driverSocket.turnPaymentCount}',
                          style: TextStyle(
                            color: primaryTextColor,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),

                  // CÓDIGO QR FIJO Y GRANDE PARA LOS PASAJEROS
                  Expanded(
                    flex: 3,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 15,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            'CÓDIGO QR FIJO DEL BUS',
                            style: TextStyle(
                              color: Color(0xFF0F172A),
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Expanded(
                            child: hasAssignedVehicle
                                ? LayoutBuilder(
                                    builder: (context, constraints) {
                                      final side = constraints.maxWidth <
                                              constraints.maxHeight
                                          ? constraints.maxWidth
                                          : constraints.maxHeight;
                                      return Center(
                                        child: QrImageView(
                                          data: qrData,
                                          version: QrVersions.auto,
                                          size: side,
                                          gapless: true,
                                          errorCorrectionLevel:
                                              QrErrorCorrectLevel.H,
                                          backgroundColor: Colors.white,
                                          eyeStyle: const QrEyeStyle(
                                            eyeShape: QrEyeShape.square,
                                            color: Color(0xFF0F172A),
                                          ),
                                          dataModuleStyle:
                                              const QrDataModuleStyle(
                                            dataModuleShape:
                                                QrDataModuleShape.square,
                                            color: Color(0xFF0F172A),
                                          ),
                                        ),
                                      );
                                    },
                                  )
                                : const Center(
                                    child: Padding(
                                      padding: EdgeInsets.all(24),
                                      child: Text(
                                        'Aún no tienes un vehículo asignado por la empresa.',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(color: Colors.grey),
                                      ),
                                    ),
                                  ),
                          ),
                          const SizedBox(height: 8),
                          if (hasAssignedVehicle)
                            Text(
                              'PLACA: $placa',
                              style: const TextStyle(
                                color: Color(0xFF0F172A),
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 2,
                              ),
                            ),
                          if (auth.currentUser?.choferInfo?.empresaNombre
                                      .isNotEmpty ==
                                  true ||
                              auth.currentUser?.choferInfo?.unidadCodigo
                                      .isNotEmpty ==
                                  true)
                            Text(
                              [
                                if (auth.currentUser?.choferInfo?.empresaNombre
                                        .isNotEmpty ==
                                    true)
                                  auth.currentUser!.choferInfo!.empresaNombre,
                                if (auth.currentUser?.choferInfo?.unidadCodigo
                                        .isNotEmpty ==
                                    true)
                                  '${auth.currentUser!.choferInfo!.unidadCodigo} · ${auth.currentUser!.choferInfo!.unidadNombre}',
                              ].join('  •  '),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Color(0xFF475569),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          Text(
                            'Listo para ser escaneado por los pasajeros',
                            style: TextStyle(
                              color: secondaryTextColor,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Historial Corto del Turno (Últimos avisos)
                  Expanded(
                    flex: 2,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: cardBorderColor),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'ÚLTIMOS PAGOS DEL TURNO',
                                style: TextStyle(
                                  color: secondaryTextColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1,
                                ),
                              ),
                              Text(
                                'Alias opcional y hora',
                                style: TextStyle(
                                  color: secondaryTextColor,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Expanded(
                            child: driverSocket.turnHistory.isEmpty
                                ? Center(
                                    child: Text(
                                      'Esperando pagos de pasajeros...',
                                      style: TextStyle(
                                        color: secondaryTextColor,
                                        fontSize: 13,
                                      ),
                                    ),
                                  )
                                : ListView.separated(
                                    itemCount: driverSocket.turnHistory.length,
                                    separatorBuilder: (_, __) => Divider(
                                      height: 8,
                                      color: cardBorderColor,
                                    ),
                                    itemBuilder: (context, index) {
                                      final item =
                                          driverSocket.turnHistory[index];
                                      return Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              const Icon(
                                                  Icons.check_circle_rounded,
                                                  color: Color(0xFF10B981),
                                                  size: 18),
                                              const SizedBox(width: 8),
                                              Text(
                                                '${item['nombre']} realizó el pago',
                                                style: TextStyle(
                                                  color: primaryTextColor,
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 14,
                                                ),
                                              ),
                                            ],
                                          ),
                                          Text(
                                            item['hora'] ?? '',
                                            style: TextStyle(
                                              color: secondaryTextColor,
                                              fontSize: 12,
                                              fontFamily: 'monospace',
                                            ),
                                          ),
                                        ],
                                      );
                                    },
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // OVERLAY EN VIVO DE PANTALLA COMPLETA VERDE ("CERO DISTRACCIÓN")
          if (alert != null)
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              color:
                  const Color(0xFF059669), // Verde esmeralda de alto contraste
              width: double.infinity,
              height: double.infinity,
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 110,
                    height: 110,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      size: 80,
                      color: Color(0xFF059669),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    alert['mensaje'] ?? 'Pago realizado',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 34,
                      fontWeight: FontWeight.w900,
                      height: 1.15,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Text(
                      'Hora: ${alert['hora']}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
