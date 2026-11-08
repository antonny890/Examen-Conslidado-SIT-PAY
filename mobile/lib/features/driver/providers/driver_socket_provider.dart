import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:audioplayers/audioplayers.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';

/// Gestor de WebSockets para el Chofer (Socket.IO)
/// Cumple estricto Cero Distracción: Solo recibe alias opcional y confirmación.
class DriverSocketProvider extends ChangeNotifier {
  io.Socket? _socket;
  final AudioPlayer _audioPlayer = AudioPlayer();

  bool _isConnected = false;
  String? _currentPlate;
  String? _qrCode;
  bool _isDemoPreview = false;
  bool _isRefreshingSocket = false;
  bool _socketRefreshAttempted = false;

  // Notificación activa de pantalla verde
  Map<String, dynamic>? _activePaymentAlert;
  Timer? _alertTimer;

  // Historial del turno (solo nombre y hora)
  final List<Map<String, String>> _turnHistory = [];
  int _turnPaymentCount = 0;

  bool get isConnected => _isConnected;
  String? get currentPlate => _currentPlate;
  String? get qrCode => _qrCode;
  Map<String, dynamic>? get activePaymentAlert => _activePaymentAlert;
  List<Map<String, String>> get turnHistory => _turnHistory;
  int get turnPaymentCount => _turnPaymentCount;

  void initializeDemoDriver({
    required String placa,
    required String qrCodigoSeguro,
  }) {
    _isDemoPreview = true;
    _isConnected = false;
    _turnHistory.clear();
    _turnPaymentCount = 0;
    _currentPlate = placa;
    _qrCode = qrCodigoSeguro;
    notifyListeners();
  }

  void clearDriverAssignment() {
    _alertTimer?.cancel();
    final socket = _socket;
    _socket = null;
    socket?.disconnect();
    socket?.dispose();
    _isDemoPreview = false;
    _isConnected = false;
    _socketRefreshAttempted = false;
    _currentPlate = null;
    _qrCode = null;
    _turnHistory.clear();
    _turnPaymentCount = 0;
    notifyListeners();
  }

  // Inicializar socket al entrar a la pantalla de chofer
  Future<void> initializeDriverSocket({
    required String placa,
    required String qrCodigoSeguro,
  }) async {
    final oldSocket = _socket;
    _socket = null;
    oldSocket?.disconnect();
    oldSocket?.dispose();
    _isDemoPreview = false;
    _socketRefreshAttempted = false;
    _turnHistory.clear();
    _turnPaymentCount = 0;
    _currentPlate = placa;
    _qrCode = qrCodigoSeguro;

    // Activar Wakelock para mantener pantalla encendida en el bus
    try {
      await WakelockPlus.enable();
    } catch (_) {}

    final token = await SecureStorageService.getAccessToken();

    _connectSocket(token);
  }

  void _connectSocket(String? token) {
    _socket = io.io(
      ApiConstants.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(2000)
          .setAuth({'token': token})
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      _socketRefreshAttempted = false;
      notifyListeners();
      debugPrint('[Driver Socket] Conectado al bus $_currentPlate');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      notifyListeners();
    });
    _socket!.on('connect_error', (dynamic error) {
      _isConnected = false;
      notifyListeners();
      debugPrint('[Driver Socket] No se pudo conectar: $error');
      _refreshSocketSession();
    });

    // Escuchar evento de pago confirmado
    // CERO DISTRACCIÓN: Solo llega alias opcional y confirmación.
    _socket!.on('payment_received', (data) {
      _handlePaymentReceived(data);
    });

    _socket!.connect();
  }

  Future<void> _refreshSocketSession() async {
    if (_isRefreshingSocket || _socketRefreshAttempted) return;
    final previousSocket = _socket;
    _isRefreshingSocket = true;
    _socketRefreshAttempted = true;
    try {
      final token = await ApiClient().refreshAccessToken();
      if (!identical(_socket, previousSocket)) return;
      previousSocket?.dispose();
      _connectSocket(token);
    } catch (error) {
      debugPrint('[Driver Socket] No se pudo renovar la sesión: $error');
    } finally {
      _isRefreshingSocket = false;
    }
  }

  void _handlePaymentReceived(dynamic data) {
    final Map<String, dynamic> payload = Map<String, dynamic>.from(data);
    final alias = payload['pasajeroAlias'];
    final isSimulated = payload['simulado'] == true;
    final pasajeroNombre =
        alias is String && alias.trim().isNotEmpty ? alias.trim() : 'Pasajero';
    final String hora = payload['hora'] ??
        DateTime.now().toString().split(' ')[1].substring(0, 5);

    _activePaymentAlert = {
      'mensaje': alias is String && alias.trim().isNotEmpty
          ? '$pasajeroNombre ${isSimulated ? 'simuló' : 'realizó'} el pago correspondiente'
          : isSimulated
              ? 'Se simuló un pago de pasaje'
              : 'Se confirmó un pago',
      'simulado': isSimulated ? 'true' : 'false',
      'pasajero': pasajeroNombre,
      'hora': hora,
    };

    // Agregar a lista de histórico del turno
    _turnHistory.insert(0, {
      'nombre': pasajeroNombre,
      'hora': hora,
      'simulado': isSimulated ? 'true' : 'false',
    });
    _turnPaymentCount++;
    if (_turnHistory.length > 8) _turnHistory.removeLast();

    notifyListeners();

    // Reproducir tono sonoro de confirmación
    try {
      _audioPlayer.play(AssetSource('audio/beep.mp3'));
    } catch (_) {}

    // Desvanecer alerta de pantalla completa tras 4 segundos
    _alertTimer?.cancel();
    _alertTimer = Timer(const Duration(seconds: 4), () {
      _activePaymentAlert = null;
      notifyListeners();
    });
  }

  // Desconectar al salir de la pantalla
  void disposeSocket() {
    _alertTimer?.cancel();
    final socket = _socket;
    _socket = null;
    socket?.disconnect();
    socket?.dispose();
    if (!_isDemoPreview) {
      try {
        WakelockPlus.disable();
      } catch (_) {}
    }
  }
}
