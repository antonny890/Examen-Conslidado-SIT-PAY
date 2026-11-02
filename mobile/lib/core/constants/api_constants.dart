/// Constantes de red y endpoints de SIT-Pay Arequipa
class ApiConstants {
  // En emulador Android usar 10.0.2.2; en dispositivo físico o emulador iOS usar IP local de la red
  static const String defaultBaseUrl = 'http://10.0.2.2:5000/api/v1';
  static const String socketUrl = 'http://10.0.2.2:5000';

  // Autenticación
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String lookupDni = '/auth/lookup-dni';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String forgotPassword = '/auth/forgot-password';

  // Perfil
  static const String profile = '/profile';
  static const String changePassword = '/profile/change-password';
  static const String consent = '/profile/consent';

  // Pagos y Boletas
  static const String payQR = '/payments/pay/qr';
  static const String payPlate = '/payments/pay/plate';
  static const String previewPayment = '/payments/preview';
  static const String myTickets = '/tickets';

  // Pase Preferencial (Ley 26271)
  static const String preferentialStatus = '/preferential/status';
  static const String preferentialRequestEmail = '/preferential/request-email';
  static const String preferentialVerifyCode = '/preferential/verify-code';

  // Vehículos y QR
  static const String vehicleQR = '/vehicles';

  // Reclamos
  static const String claims = '/claims';
  static const String myClaims = '/claims/my-claims';
}
