import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
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
      'paymentAvailable': false,
    };
    notifyListeners();
    return true;
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
  Future<bool> payWithQR(String qrCode) async {
    _isProcessing = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.payQR,
        data: {
          'qrCode': qrCode.trim(),
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
  Future<bool> payWithPlate(String plate) async {
    _isProcessing = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        ApiConstants.payPlate,
        data: {
          'plate': plate.trim().toUpperCase(),
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
}
