import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/sit_plate_input_formatter.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/payment_provider.dart';
import 'ticket_detail_screen.dart';

/// Pantalla de Pago de Pasaje (QR y Placa Manual)
/// Muestra la tarifa estimada; el pago y la boleta requieren una confirmación bancaria.
class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  int _tabIndex = 0; // 0: Escaneo QR, 1: Digitar Placa
  final _plateController = TextEditingController();
  final MobileScannerController _scannerController = MobileScannerController();
  bool _hasScanned = false;

  @override
  void dispose() {
    _plateController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  // Al escanear código QR de vehículo
  void _onDetect(BarcodeCapture capture) {
    if (_hasScanned) return;
    final barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      if (barcode.rawValue != null) {
        setState(() => _hasScanned = true);
        _processPaymentByQR(barcode.rawValue!);
        break;
      }
    }
  }

  Future<void> _processPaymentByQR(String qrCode) async {
    final payment = Provider.of<PaymentProvider>(context, listen: false);
    final isDemoMode =
        Provider.of<AuthProvider>(context, listen: false).isDemoMode;

    // 1. Previsualizar tarifa
    final okPreview = isDemoMode
        ? payment.previewDemoVehicle(qrCode: qrCode)
        : await payment.previewPayment(qrCode: qrCode);
    if (!mounted) return;

    if (!okPreview) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Código QR inválido o bus no registrado en el SIT.')),
      );
      setState(() => _hasScanned = false);
      return;
    }

    _showConfirmationBottomSheet(isQR: true, identifier: qrCode);
  }

  Future<void> _processPaymentByPlate() async {
    final plate = _plateController.text.trim().toUpperCase();
    if (!SitPlateInputFormatter.isValid(plate)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ingresa una placa con el formato ABC-123.'),
        ),
      );
      return;
    }

    final payment = Provider.of<PaymentProvider>(context, listen: false);
    final isDemoMode =
        Provider.of<AuthProvider>(context, listen: false).isDemoMode;
    final okPreview = isDemoMode
        ? payment.previewDemoVehicle(plate: plate)
        : await payment.previewPayment(plate: plate);
    if (!mounted) return;

    if (!okPreview) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(payment.errorMessage ?? 'Placa no encontrada.')),
      );
      return;
    }

    _showConfirmationBottomSheet(isQR: false, identifier: plate);
  }

  // Vista previa de tarifa (Ley 26271); no inicia un cobro.
  void _showConfirmationBottomSheet(
      {required bool isQR, required String identifier}) {
    final payment = Provider.of<PaymentProvider>(context, listen: false);
    final preview = payment.previewData;
    final vehiculo = preview?['vehiculo'];
    final tarifa = preview?['tarifa'];
    final paymentAvailable = preview?['paymentAvailable'] ?? false;
    final monto = (tarifa?['monto'] as num?)?.toDouble() ?? 1.0;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 48,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade400,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Vista previa de tarifa',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 18),

              // Detalles del Vehículo
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Placa del Vehículo:',
                            style: TextStyle(color: Colors.grey)),
                        Text(
                          vehiculo?['placa'] ?? identifier,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Empresa:',
                            style: TextStyle(color: Colors.grey)),
                        Text(
                          vehiculo?['empresa'] ?? 'SIT Arequipa',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Unidad / Cuenca SIT:',
                            style: TextStyle(color: Colors.grey)),
                        Text(
                          vehiculo?['cuenca'] ?? 'No disponible',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    if (vehiculo?['numeroUnidad'] != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Unidad:',
                            style: TextStyle(color: Colors.grey),
                          ),
                          Text(
                            vehiculo['numeroUnidad'],
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                    if (vehiculo?['choferAlias'] is String &&
                        (vehiculo['choferAlias'] as String).isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Alias del conductor:',
                            style: TextStyle(color: Colors.grey),
                          ),
                          Text(
                            vehiculo['choferAlias'],
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Tarifa estimada (Ley 26271)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tarifa?['tipoTarifaAplicada'] == 'ADULTO'
                              ? 'Tarifa Regular Adulto'
                              : 'Medio Pasaje Acreditado (50%)',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 2),
                        const Text('Tarifa estimada; aún no cobrada',
                            style: TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                    Text(
                      'S/ ${monto.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF10B981),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              if (paymentAvailable) ...[
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    minimumSize: const Size.fromHeight(56),
                  ),
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final success = isQR
                        ? await payment.payWithQR(identifier)
                        : await payment.payWithPlate(identifier);

                    if (!mounted) return;

                    if (success && payment.lastTicket != null) {
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(
                          builder: (_) =>
                              TicketDetailScreen(ticket: payment.lastTicket!),
                        ),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text(payment.errorMessage ??
                                'Error al procesar el pago.')),
                      );
                      setState(() => _hasScanned = false);
                    }
                  },
                  child: const Text('Confirmar y Pagar Pasaje'),
                ),
              ] else ...[
                const Column(
                  children: [
                    Text(
                      'El pago directo todavía no está disponible.',
                      style: TextStyle(
                          color: Colors.amber, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Falta integrar la API bancaria. No se realizará ningún cobro ni se guardará saldo en SIT-Pay.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    ).whenComplete(() {
      setState(() => _hasScanned = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pagar Pasaje'),
      ),
      body: Column(
        children: [
          // Pestañas: Escanear QR vs Digitar Placa
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('Escanear QR del Bus')),
                    selected: _tabIndex == 0,
                    onSelected: (val) => setState(() => _tabIndex = 0),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('Digitar Placa')),
                    selected: _tabIndex == 1,
                    onSelected: (val) => setState(() => _tabIndex = 1),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: _tabIndex == 0
                ? Stack(
                    alignment: Alignment.center,
                    children: [
                      MobileScanner(
                        controller: _scannerController,
                        onDetect: _onDetect,
                      ),
                      // Visor de escaneo
                      Container(
                        width: 260,
                        height: 260,
                        decoration: BoxDecoration(
                          border: Border.all(
                              color: const Color(0xFF10B981), width: 3),
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                      Positioned(
                        bottom: 30,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            'Apunta al código QR dentro del bus',
                            style: TextStyle(color: Colors.white, fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  )
                : Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Digita el número de placa',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Ubicado en la parte frontal, trasera o lateral del vehículo.',
                          style: TextStyle(fontSize: 13, color: Colors.grey),
                        ),
                        const SizedBox(height: 24),
                        TextFormField(
                          controller: _plateController,
                          textCapitalization: TextCapitalization.characters,
                          keyboardType: TextInputType.text,
                          maxLength: 7,
                          inputFormatters: [
                            const SitPlateInputFormatter(),
                            LengthLimitingTextInputFormatter(7),
                          ],
                          style: const TextStyle(
                            fontSize: 24,
                            letterSpacing: 4,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                          decoration: InputDecoration(
                            hintText: 'ABC-123',
                            hintStyle: TextStyle(
                              color: Theme.of(context)
                                  .hintColor
                                  .withValues(alpha: 0.45),
                            ),
                            prefixIcon:
                                const Icon(Icons.directions_bus_rounded),
                            counterText: '',
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Ejemplo de formato: ABC-123',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Theme.of(context)
                                .hintColor
                                .withValues(alpha: 0.65),
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: _processPaymentByPlate,
                          child: const Text('Continuar con el Pago'),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
