import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/sit_plate_input_formatter.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/payment_provider.dart';
import 'ticket_detail_screen.dart';
import 'payment_methods_screen.dart';

/// Pantalla de Pago de Pasaje (QR y Placa Manual)
/// Muestra la tarifa estimada y permite probar el flujo con tarjetas ficticias.
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
  bool _isSubmittingPayment = false;

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
                    if (vehiculo?['modelo'] is String &&
                        (vehiculo['modelo'] as String).isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _PaymentDetailRow(
                        label: 'Modelo:',
                        value: vehiculo['modelo'] as String,
                      ),
                    ],
                    if (vehiculo?['anioFabricacion'] != null) ...[
                      const SizedBox(height: 8),
                      _PaymentDetailRow(
                        label: 'Año:',
                        value: vehiculo['anioFabricacion'].toString(),
                      ),
                    ],
                    if (vehiculo?['capacidadPasajeros'] != null) ...[
                      const SizedBox(height: 8),
                      _PaymentDetailRow(
                        label: 'Capacidad:',
                        value:
                            '${vehiculo['capacidadPasajeros']} pasajeros',
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
                          tarifa?['tipoTarifaAplicada'] == 'NORMAL'
                              ? 'Tarifa Normal'
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
              if (tarifa?['motivo'] is String &&
                  (tarifa['motivo'] as String).isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  tarifa['motivo'] as String,
                  style: Theme.of(ctx).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: 24),

              if (paymentAvailable) ...[
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    minimumSize: const Size.fromHeight(56),
                  ),
                  onPressed: _isSubmittingPayment
                      ? null
                      : () => _continueWithPayment(
                            sheetContext: ctx,
                            isQR: isQR,
                            identifier: identifier,
                            amount: monto,
                          ),
                  child: _isSubmittingPayment
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Continuar con pago simulado'),
                ),
              ] else ...[
                const Column(
                  children: [
                    Text(
                      'La simulación de pago no está disponible.',
                      style: TextStyle(
                          color: Colors.amber, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'No se realizará ningún cobro real.',
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

  Future<void> _continueWithPayment({
    required BuildContext sheetContext,
    required bool isQR,
    required String identifier,
    required double amount,
  }) async {
    if (_isSubmittingPayment) return;
    setState(() => _isSubmittingPayment = true);
    final payment = Provider.of<PaymentProvider>(context, listen: false);
    final isDemoMode =
        Provider.of<AuthProvider>(context, listen: false).isDemoMode;
    List<Map<String, dynamic>> methods;
    try {
      methods = await payment.loadPaymentMethods(demoMode: isDemoMode);
    } on DioException catch (error) {
      if (!mounted) return;
      final data = error.response?.data;
      final message = data is Map && data['message'] is String
          ? data['message'] as String
          : 'No se pudieron cargar las tarjetas de prueba.';
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
      setState(() => _isSubmittingPayment = false);
      return;
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudieron cargar las tarjetas de prueba.'),
        ),
      );
      setState(() => _isSubmittingPayment = false);
      return;
    }

    if (!mounted) return;
    if (methods.isEmpty) {
      setState(() => _isSubmittingPayment = false);
      if (!sheetContext.mounted) return;
      Navigator.pop(sheetContext);
      final added = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => const PaymentMethodsScreen(returnAfterAdd: true),
        ),
      );
      if (added == true && mounted) {
        _showConfirmationBottomSheet(isQR: isQR, identifier: identifier);
      }
      return;
    }

    String? methodId;
    if (methods.length == 1) {
      methodId = methods.single['id']?.toString();
    } else {
      String? selectedMethodId = methods.first['id']?.toString();
      methodId = await showModalBottomSheet<String>(
        context: context,
        isScrollControlled: true,
        builder: (selectionContext) => StatefulBuilder(
          builder: (context, setSelectionState) => SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Elige una tarjeta de prueba',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Simulación únicamente. No se realizará un cargo real.',
                  ),
                  const SizedBox(height: 12),
                  RadioGroup<String>(
                    groupValue: selectedMethodId,
                    onChanged: (value) =>
                        setSelectionState(() => selectedMethodId = value),
                    child: Column(
                      children: methods.map((method) {
                        final id = method['id'].toString();
                        return RadioListTile<String>(
                          value: id,
                          title:
                              Text('Tarjeta •••• ${method['ultimos_digitos']}'),
                          subtitle: Text(
                            '${method['titular']} · ${method['mes_vencimiento']}/${method['anio_vencimiento']}',
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 8),
                  FilledButton(
                    onPressed: selectedMethodId == null
                        ? null
                        : () =>
                            Navigator.pop(selectionContext, selectedMethodId),
                    child: Text(
                      'Pagar S/ ${amount.toStringAsFixed(2)} (simulado)',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }
    if (methodId == null || !mounted) {
      if (mounted) setState(() => _isSubmittingPayment = false);
      return;
    }
    if (!sheetContext.mounted) {
      setState(() => _isSubmittingPayment = false);
      return;
    }
    Navigator.pop(sheetContext);
    final randomPart = Random.secure().nextInt(1 << 32).toRadixString(16);
    final idempotencyKey =
        '${DateTime.now().microsecondsSinceEpoch}-$randomPart';
    final success = isQR
        ? await payment.payWithQR(
            identifier,
            paymentMethodId: methodId,
            idempotencyKey: idempotencyKey,
            demoMode: isDemoMode,
          )
        : await payment.payWithPlate(
            identifier,
            paymentMethodId: methodId,
            idempotencyKey: idempotencyKey,
            demoMode: isDemoMode,
          );
    if (!mounted) return;
    setState(() {
      _isSubmittingPayment = false;
      _hasScanned = false;
    });
    if (success && payment.lastTicket != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => TicketDetailScreen(ticket: payment.lastTicket!),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              payment.errorMessage ?? 'No se pudo completar la simulación.'),
        ),
      );
    }
  }
}

class _PaymentDetailRow extends StatelessWidget {
  const _PaymentDetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
