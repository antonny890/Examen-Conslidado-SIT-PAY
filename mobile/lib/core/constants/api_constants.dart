/// Constantes de red y endpoints de SIT-Pay Arequipa
class ApiConstants {
  // Override with SITPAY_API_URL when running a local backend.
  static const String defaultBaseUrl = String.fromEnvironment(
    'SITPAY_API_URL',
    defaultValue: 'https://sit-pay-backend.onrender.com/api/v1',
  );
  static const String socketUrl = String.fromEnvironment(
    'SITPAY_SOCKET_URL',
    defaultValue: 'https://sit-pay-backend.onrender.com',
  );

  // Autenticación
  static const String login = '/auth/login';
  static const String googlePassenger = '/auth/google/passenger';
  static const String register = '/auth/register';
  static const String lookupDni = '/auth/lookup-dni';
  static const String registrationEmailRequest =
      '/auth/registration-email/request';
  static const String registrationEmailSimulate =
      '/auth/registration-email/simulate';
  static const String registrationEmailConfirmLink =
      '/auth/registration-email/confirm-link';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';

  // Perfil
  static const String profile = '/profile';
  static const String changePassword = '/profile/change-password';
  static const String consent = '/profile/consent';

  // Pagos y Boletas
  static const String payQR = '/payments/pay/qr';
  static const String payPlate = '/payments/pay/plate';
  static const String previewPayment = '/payments/preview';
  static const String paymentMethods = '/payment-methods';
  static const String myTickets = '/tickets';
  static const String fares = '/fares';

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
