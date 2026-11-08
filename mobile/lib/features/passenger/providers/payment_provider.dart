import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/data/demo_vehicle_catalog.dart';

/// Gestor del Flujo de Pago de Pasaje y Boletas Digitales
class PaymentProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  bool _isProcessing = false;
  String? _errorMessage;
  Map<String, dynamic>? _lastTicket;
  Map<String, dynamic>? _previewData;

  bool get isProcessing => _isProcessing;
  String? get errorMessage => _errorMessage;
  Map<String, dynamic>? get lastTicket => _lastTicket;
  Map<String, dynamic>? get previewData => _previewData;

  bool previewDemoVehicle({String? plate, String? qrCode}) {
    final vehicle = DemoVehicleCatalog.find(plate: plate, qrCode: qrCode);
    _errorMessage = null;
    if (vehicle == null) {
      _previewData = null;
      _errorMessage = 'Vehículo no registrado en esta vista de demostración.';
      notifyListeners();
      return false;
    }

    _previewData = {
      'vehiculo': {
        'placa': vehicle['plate'],
        'empresa': vehicle['company'],
        'cuenca': vehicle['unit'],
      },
      'tarifa': {
        'monto': 1.00,
        'tipoTarifaAplicada': 'NORMAL',
      },
      'paymentAvailable': true,
      'paymentMode': 'SIMULATED',
    };
    notifyListeners();
    return true;
  }

  static const _demoPaymentMethodsKey = 'sitpay_demo_payment_methods';

  Future<List<Map<String, dynamic>>> loadPaymentMethods({
    bool demoMode = false,
  }) async {
    if (demoMode) return _loadDemoPaymentMethods();
    final response = await _apiClient.dio.get(ApiConstants.paymentMethods);
    final methods = response.data['data'] as List<dynamic>? ?? const [];
    return methods
        .whereType<Map>()
        .map((method) => Map<String, dynamic>.from(method))
        .toList();
  }

  Future<bool> addPaymentMethod({
    required String cardholder,
    required String cardNumber,
    required int expiryMonth,
    required int expiryYear,
    required String cvv,
    bool demoMode = false,
  }) async {
    _isProcessing = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final digits = cardNumber.replaceAll(RegExp(r'\D'), '');
      if (!RegExp(r'^9999\d{12}$').hasMatch(digits)) {
        _errorMessage =
            'Usa una tarjeta ficticia de 16 dígitos que comience con 9999.';
        return false;
      }
      if (demoMode) {
        final methods = await _loadDemoPaymentMethods();
        methods.insert(0, {
          'id':
              'demo-${DateTime.now().microsecondsSinceEpoch}-${Random.secure().nextInt(1 << 20)}',
          'tipo': 'TARJETA_SIMULADA',
          'marca': 'SIMULADA',
          'titular': cardholder.trim(),
          'ultimos_digitos': digits.substring(12),
          'mes_vencimiento': expiryMonth,
          'anio_vencimiento': expiryYear,
          'simulada': true,
        });
        await _saveDemoPaymentMethods(methods);
        return true;
      }
      await _apiClient.dio.post(
        ApiConstants.paymentMethods,
        data: {
          'cardholder': cardholder,
          'cardNumber': cardNumber,
          'expiryMonth': expiryMonth,
          'expiryYear': expiryYear,
          'cvv': cvv,
        },
      );
      return true;
    } on DioException catch (error) {
      _errorMessage = _getApiErrorMessage(
        error,
        'No se pudo agregar la tarjeta de prueba.',
      );
      return false;
    } catch (error) {
      _errorMessage = 'No se pudo guardar la tarjeta de prueba.';
      debugPrint('Payment method save failed: $error');
      return false;
    } finally {
      _isProcessing = false;
      notifyListeners();
    }
  }

  Future<bool> removePaymentMethod(
    String methodId, {
    bool demoMode = false,
  }) async {
    _isProcessing = true;
    _errorMessage = null;
    notifyListeners();
    try {
      if (demoMode) {
        final methods = await _loadDemoPaymentMethods();
        methods.removeWhere((method) => method['id'] == methodId);
        await _saveDemoPaymentMethods(methods);
        return true;
      }
      await _apiClient.dio.delete('${ApiConstants.paymentMethods}/$methodId');
      return true;
    } on DioException catch (error) {
      _errorMessage = _getApiErrorMessage(
        error,
        'No se pudo eliminar la tarjeta de prueba.',
      );
      return false;
    } catch (error) {
      _errorMessage = 'No se pudo eliminar la tarjeta de prueba.';
      debugPrint('Payment method removal failed: $error');
      return false;
    } finally {
      _isProcessing = false;
      notifyListeners();
    }
  }

  // 1. Previsualizar tarifa antes del pago
  Future<bool> previewPayment({String? qrCode, String? plate}) async {
    _isProcessing = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.previewPayment,
        data: {
          if (qrCode != null) 'qrCode': qrCode,
          if (plate != null) 'plate': plate,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        _previewData = response.data['data'];
        _isProcessing = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _errorMessage = _getApiErrorMessage(
          e, 'No se pudo consultar la tarifa del vehículo.');
    }

    _isProcessing = false;
    notifyListeners();
    return false;
  }

  // 2. Ejecutar pago por QR
  Future<bool> payWithQR(
    String qrCode, {
    required String paymentMethodId,
    required String idempotencyKey,
    bool demoMode = false,
  }) async {
    if (demoMode) return _completeDemoPayment(paymentMethodId);
    _isProcessing = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.payQR,
        data: {
          'qrCode': qrCode.trim(),
          'paymentMethodId': paymentMethodId,
          'idempotencyKey': idempotencyKey,
        },
      );

      if ((response.statusCode == 201 || response.statusCode == 200) &&
          response.data['success'] == true) {
        _lastTicket = response.data['data']['boleta'];
        _isProcessing = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _errorMessage = _getApiErrorMessage(e, 'No se pudo iniciar el pago.');
    }

    _isProcessing = false;
    notifyListeners();
    return false;
  }

  // 3. Ejecutar pago por Placa digitada
  Future<bool> payWithPlate(
    String plate, {
    required String paymentMethodId,
    required String idempotencyKey,
    bool demoMode = false,
  }) async {
    if (demoMode) return _completeDemoPayment(paymentMethodId);
    _isProcessing = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.payPlate,
        data: {
          'plate': plate.trim().toUpperCase(),
          'paymentMethodId': paymentMethodId,
          'idempotencyKey': idempotencyKey,
        },
      );

      if ((response.statusCode == 201 || response.statusCode == 200) &&
          response.data['success'] == true) {
        _lastTicket = response.data['data']['boleta'];
        _isProcessing = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _errorMessage = _getApiErrorMessage(e, 'No se pudo iniciar el pago.');
    }

    _isProcessing = false;
    notifyListeners();
    return false;
  }

  String _getApiErrorMessage(Object error, String fallback) {
    if (error is DioException) {
      final responseBody = error.response?.data;
      final responseMessage =
          responseBody is Map && responseBody['message'] is String
              ? responseBody['message'] as String
              : null;
      if (responseMessage != null && responseMessage.isNotEmpty) {
        if (error.response?.statusCode == 401) {
          return 'Tu sesión no está activa. Inicia sesión nuevamente para consultar el vehículo.';
        }
        return responseMessage;
      }
      if (error.response?.statusCode == 401) {
        return 'Tu sesión no está activa. Inicia sesión nuevamente para consultar el vehículo.';
      }
    }
    return fallback;
  }

  Future<List<Map<String, dynamic>>> _loadDemoPaymentMethods() async {
    final preferences = await SharedPreferences.getInstance();
    final encoded = preferences.getString(_demoPaymentMethodsKey);
    if (encoded == null) return [];
    final decoded = jsonDecode(encoded);
    if (decoded is! List) return [];
    return decoded
        .whereType<Map>()
        .map((method) => Map<String, dynamic>.from(method))
        .toList();
  }

  Future<void> _saveDemoPaymentMethods(
    List<Map<String, dynamic>> methods,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_demoPaymentMethodsKey, jsonEncode(methods));
  }

  Future<bool> _completeDemoPayment(String paymentMethodId) async {
    _isProcessing = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final methods = await _loadDemoPaymentMethods();
      final method = methods.where((item) => item['id'] == paymentMethodId);
      if (method.isEmpty) {
        _errorMessage = 'Agrega una tarjeta de prueba antes de pagar.';
        return false;
      }
      final vehicle = _previewData?['vehiculo'] as Map<String, dynamic>? ?? {};
      final fare = _previewData?['tarifa'] as Map<String, dynamic>? ?? {};
      final ticketNumber = Random.secure().nextInt(1 << 32).toRadixString(16);
      _lastTicket = {
        'codigo_boleta':
            'DEMO-${DateTime.now().millisecondsSinceEpoch}-$ticketNumber',
        'fecha_pago': DateTime.now().toIso8601String(),
        'placa': vehicle['placa'] ?? 'DEMO',
        'empresa_nombre': vehicle['empresa'] ?? 'SIT-Pay (demostración)',
        'cuenca': vehicle['cuenca'] ?? 'Unidad de prueba',
        'monto': fare['monto'] ?? 1.0,
        'tipo_tarifa_aplicada': fare['tipoTarifaAplicada'] ?? 'NORMAL',
        'metodo_pago': 'TARJETA_SIMULADA',
        'tarjeta_ultimos_digitos': method.first['ultimos_digitos'],
        'pago_simulado': true,
      };
      return true;
    } catch (error) {
      _errorMessage = 'No se pudo completar la simulación local.';
      debugPrint('Demo payment failed: $error');
      return false;
    } finally {
      _isProcessing = false;
      notifyListeners();
    }
  }
}
