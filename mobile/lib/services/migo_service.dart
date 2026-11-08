import 'package:dio/dio.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';

class DniIdentity {
  const DniIdentity({required this.nombres, required this.apellidos});

  final String nombres;
  final String apellidos;
}

class MigoService {
  static final ApiClient _apiClient = ApiClient();

  static Future<DniIdentity> consultarDni(
    String dni, {
    required bool consentimientoConsultaDni,
  }) async {
    final normalizedDni = dni.trim();
    if (!RegExp(r'^\d{8}$').hasMatch(normalizedDni)) {
      throw const FormatException('El DNI debe tener exactamente 8 dígitos.');
    }
    if (!consentimientoConsultaDni) {
      throw const FormatException(
        'Debes autorizar la consulta de identidad antes de consultar el DNI.',
      );
    }

    late final Response<dynamic> response;
    try {
      response = await _apiClient.dio.post(
        ApiConstants.lookupDni,
        data: {
          'dni': normalizedDni,
          'consentimientoConsultaDni': consentimientoConsultaDni,
        },
      );
    } on DioException catch (error) {
      final body = error.response?.data;
      final message = body is Map && body['message'] is String
          ? body['message'] as String
          : 'No se pudo consultar el DNI. Verifica tu conexión e inténtalo nuevamente.';
      throw Exception(message);
    }

    if (response.data is! Map ||
        response.data['success'] != true ||
        response.data['data'] is! Map ||
        response.data['data']['nombre'] is! String) {
      throw Exception('El proveedor devolvió datos de DNI inválidos.');
    }

    return parseNombreCompleto(response.data['data']['nombre'] as String);
  }

  static DniIdentity parseNombreCompleto(String fullName) {
    final parts = fullName
        .replaceAll('_', ' ')
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();

    if (parts.length < 3) {
      throw const FormatException(
        'Migo debe devolver dos apellidos y al menos un nombre.',
      );
    }

    return DniIdentity(
      apellidos: parts.take(2).join(' '),
      nombres: parts.skip(2).join(' '),
    );
  }
}
