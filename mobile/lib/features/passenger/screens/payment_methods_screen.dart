import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/payment_provider.dart';

class PaymentMethodsScreen extends StatefulWidget {
  const PaymentMethodsScreen({super.key, this.returnAfterAdd = false});

  final bool returnAfterAdd;

  @override
  State<PaymentMethodsScreen> createState() => _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState extends State<PaymentMethodsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _cardholder = TextEditingController();
  final _cardNumber = TextEditingController();
  final _month = TextEditingController();
  final _year = TextEditingController();
  final _cvv = TextEditingController();

  List<Map<String, dynamic>> _methods = [];
  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadMethods();
  }

  @override
  void dispose() {
    _cardholder.dispose();
    _cardNumber.dispose();
    _month.dispose();
    _year.dispose();
    _cvv.dispose();
    super.dispose();
  }

  Future<void> _loadMethods() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final methods = await context.read<PaymentProvider>().loadPaymentMethods(
            demoMode: context.read<AuthProvider>().isDemoMode,
          );
      if (!mounted) return;
      setState(() {
        _methods = methods;
        _isLoading = false;
      });
    } on DioException catch (error) {
      if (!mounted) return;
      final data = error.response?.data;
      setState(() {
        _errorMessage = data is Map && data['message'] is String
            ? data['message'] as String
            : 'No se pudieron cargar tus tarjetas de prueba.';
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'No se pudieron cargar tus tarjetas de prueba.';
        _isLoading = false;
      });
    }
  }

  Future<void> _addMethod() async {
    if (!_formKey.currentState!.validate()) return;
    final month = int.parse(_month.text);
    final year = int.parse(_year.text);
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });
    final added = await context.read<PaymentProvider>().addPaymentMethod(
          cardholder: _cardholder.text.trim(),
          cardNumber: _cardNumber.text,
          expiryMonth: month,
          expiryYear: year,
          cvv: _cvv.text,
          demoMode: context.read<AuthProvider>().isDemoMode,
        );
    if (!mounted) return;
    if (!added) {
      setState(() {
        _errorMessage = context.read<PaymentProvider>().errorMessage ??
            'No se pudo agregar la tarjeta de prueba.';
        _isSaving = false;
      });
      return;
    }
    _cardNumber.clear();
    _cvv.clear();
    _month.clear();
    _year.clear();
    _cardholder.clear();
    if (widget.returnAfterAdd) {
      Navigator.of(context).pop(true);
      return;
    }
    setState(() => _isSaving = false);
    await _loadMethods();
  }

  Future<void> _removeMethod(Map<String, dynamic> method) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar tarjeta de prueba'),
        content: Text(
          '¿Quieres eliminar la tarjeta terminada en ${method['ultimos_digitos']}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    final removed = await context.read<PaymentProvider>().removePaymentMethod(
          method['id'].toString(),
          demoMode: context.read<AuthProvider>().isDemoMode,
        );
    if (!mounted) return;
    if (!removed) {
      setState(() => _errorMessage =
          context.read<PaymentProvider>().errorMessage ??
              'No se pudo eliminar la tarjeta.');
      return;
    }
    await _loadMethods();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Métodos de pago')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.tertiaryContainer,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Prototipo: solo acepta tarjetas ficticias que comiencen con 9999. No ingreses datos de una tarjeta real. El número completo y el CVV no se guardan y no se realizan cargos.',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text('Mis tarjetas de prueba', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_methods.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Text('Todavía no agregaste una tarjeta de prueba.'),
            )
          else
            ..._methods.map((method) => Card(
                  child: ListTile(
                    leading: const CircleAvatar(
                      child: Icon(Icons.credit_card_rounded),
                    ),
                    title: Text('•••• ${method['ultimos_digitos']}'),
                    subtitle: Text(
                      '${method['titular']} · ${method['mes_vencimiento']}/${method['anio_vencimiento']} · SIMULADA',
                    ),
                    trailing: IconButton(
                      tooltip: 'Eliminar tarjeta',
                      onPressed: () => _removeMethod(method),
                      icon: const Icon(Icons.delete_outline),
                    ),
                  ),
                )),
          const SizedBox(height: 24),
          Text('Agregar tarjeta ficticia', style: theme.textTheme.titleMedium),
          const SizedBox(height: 12),
          Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _cardholder,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Nombre del titular',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: (value) => (value?.trim().length ?? 0) < 3
                      ? 'Ingresa el nombre del titular.'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _cardNumber,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(16),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'Número de tarjeta de prueba',
                    hintText: '9999999999999999',
                    prefixIcon: Icon(Icons.credit_card_outlined),
                  ),
                  validator: (value) =>
                      value != null && RegExp(r'^9999\d{12}$').hasMatch(value)
                          ? null
                          : 'Usa 16 dígitos que comiencen con 9999.',
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _month,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(2),
                        ],
                        decoration: const InputDecoration(
                          labelText: 'Mes (MM)',
                        ),
                        validator: (value) {
                          final month = int.tryParse(value ?? '');
                          return month != null && month >= 1 && month <= 12
                              ? null
                              : 'Mes inválido';
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _year,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(4),
                        ],
                        decoration: const InputDecoration(
                          labelText: 'Año (AAAA)',
                        ),
                        validator: (value) {
                          final year = int.tryParse(value ?? '');
                          return year != null &&
                                  value?.length == 4 &&
                                  year >= DateTime.now().year
                              ? null
                              : 'Año inválido';
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _cvv,
                        keyboardType: TextInputType.number,
                        obscureText: true,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(4),
                        ],
                        decoration: const InputDecoration(labelText: 'CVV'),
                        validator: (value) => value != null &&
                                RegExp(r'^\d{3,4}$').hasMatch(value)
                            ? null
                            : '3 o 4 dígitos',
                      ),
                    ),
                  ],
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _errorMessage!,
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _isSaving ? null : _addMethod,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.add_card_rounded),
                    label: Text(
                      _isSaving ? 'Guardando...' : 'Agregar tarjeta de prueba',
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
