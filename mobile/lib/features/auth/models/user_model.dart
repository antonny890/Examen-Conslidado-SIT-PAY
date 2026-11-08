/// Modelo de Usuario Autenticado en la App Móvil SIT-Pay
class UserModel {
  final String id;
  final String email;
  final String rol; // 'CHOFER' o 'PASAJERO'
  final String nombres;
  final String apellidos;
  final String? fotoUrl;
  final String alias;
  final DateTime? aliasUpdatedAt;
  final String? profileImagePath;
  final DriverVehicleInfo? choferInfo;
  final bool googleConnected;

  UserModel({
    required this.id,
    required this.email,
    required this.rol,
    required this.nombres,
    required this.apellidos,
    this.fotoUrl,
    this.alias = '',
    this.aliasUpdatedAt,
    this.profileImagePath,
    this.choferInfo,
    this.googleConnected = false,
  });

  String get nombreCompleto => '$nombres $apellidos'.trim();
  String get nombreVisible => alias.isNotEmpty ? alias : nombreCompleto;
  String get primerNombre => nombres.split(' ').first;

  bool get esChofer => rol == 'CHOFER';
  bool get esPasajero => rol == 'PASAJERO';

  UserModel copyWith({
    String? alias,
    DateTime? aliasUpdatedAt,
    String? profileImagePath,
    String? fotoUrl,
  }) {
    return UserModel(
      id: id,
      email: email,
      rol: rol,
      nombres: nombres,
      apellidos: apellidos,
      fotoUrl: fotoUrl ?? this.fotoUrl,
      alias: alias ?? this.alias,
      aliasUpdatedAt: aliasUpdatedAt ?? this.aliasUpdatedAt,
      profileImagePath: profileImagePath ?? this.profileImagePath,
      choferInfo: choferInfo,
      googleConnected: googleConnected,
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      rol: json['rol'] ?? 'PASAJERO',
      nombres: json['nombres'] ?? '',
      apellidos: json['apellidos'] ?? '',
      fotoUrl: json['fotoUrl'],
      alias: json['alias'] ?? '',
      aliasUpdatedAt: json['aliasUpdatedAt'] == null
          ? null
          : DateTime.tryParse(json['aliasUpdatedAt']),
      profileImagePath: json['profileImagePath'],
      googleConnected: json['googleConnected'] == true,
      choferInfo: json['choferInfo'] != null
          ? DriverVehicleInfo.fromJson(json['choferInfo'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'rol': rol,
      'nombres': nombres,
      'apellidos': apellidos,
      'fotoUrl': fotoUrl,
      'alias': alias,
      'aliasUpdatedAt': aliasUpdatedAt?.toIso8601String(),
      'profileImagePath': profileImagePath,
      'googleConnected': googleConnected,
      'choferInfo': choferInfo?.toJson(),
    };
  }
}

class DriverVehicleInfo {
  final String choferId;
  final String vehiculoId;
  final String placa;
  final String qrCodigoSeguro;
  final String empresaId;
  final String empresaNombre;
  final String unidadCodigo;
  final String unidadNombre;

  DriverVehicleInfo({
    required this.choferId,
    required this.vehiculoId,
    required this.placa,
    required this.qrCodigoSeguro,
    required this.empresaId,
    required this.empresaNombre,
    this.unidadCodigo = '',
    this.unidadNombre = '',
  });

  factory DriverVehicleInfo.fromJson(Map<String, dynamic> json) {
    return DriverVehicleInfo(
      choferId: json['chofer_id'] ?? json['choferId'] ?? '',
      vehiculoId: json['vehiculo_id'] ?? json['vehiculoId'] ?? '',
      placa: json['placa'] ?? '',
      qrCodigoSeguro: json['qr_codigo_seguro'] ?? json['qrCodigoSeguro'] ?? '',
      empresaId: json['empresa_id'] ?? json['empresaId'] ?? '',
      empresaNombre: json['empresa_nombre'] ?? json['empresaNombre'] ?? '',
      unidadCodigo: json['unidad_codigo'] ?? json['unidadCodigo'] ?? '',
      unidadNombre: json['unidad_nombre'] ?? json['unidadNombre'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'choferId': choferId,
      'vehiculoId': vehiculoId,
      'placa': placa,
      'qrCodigoSeguro': qrCodigoSeguro,
      'empresaId': empresaId,
      'empresaNombre': empresaNombre,
      'unidadCodigo': unidadCodigo,
      'unidadNombre': unidadNombre,
    };
  }
}
