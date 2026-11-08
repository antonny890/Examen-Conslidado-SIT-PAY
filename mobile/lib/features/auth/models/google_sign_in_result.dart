class GoogleSignInResult {
  const GoogleSignInResult({
    required this.idToken,
    required this.email,
  });

  final String idToken;
  final String email;
}

class GooglePassengerRegistration {
  const GooglePassengerRegistration({
    required this.googleAccount,
    required this.numeroDocumento,
    required this.nombres,
    required this.apellidos,
    required this.telefono,
    required this.alias,
    required this.consentimientoDatos,
    required this.consentimientoConsultaDni,
  });

  final GoogleSignInResult googleAccount;
  final String numeroDocumento;
  final String nombres;
  final String apellidos;
  final String? telefono;
  final String alias;
  final bool consentimientoDatos;
  final bool consentimientoConsultaDni;
}

enum GoogleSignInOutcome {
  signedIn,
  registrationRequired,
}
