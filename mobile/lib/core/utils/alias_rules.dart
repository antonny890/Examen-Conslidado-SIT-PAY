class AliasRules {
  static const minLength = 3;
  static const maxLength = 20;
  static const changeInterval = Duration(days: 15);

  static final _allowedCharacters = RegExp(r'^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+$');

  static String? validate(String? value) {
    final alias = value?.trim() ?? '';
    if (alias.isEmpty) return null;
    if (alias.length < minLength) {
      return 'El alias debe tener al menos $minLength caracteres.';
    }
    if (alias.length > maxLength) {
      return 'El alias no puede superar $maxLength caracteres.';
    }
    if (!_allowedCharacters.hasMatch(alias)) {
      return 'Usa solo letras y números, sin espacios ni símbolos.';
    }
    return null;
  }

  static DateTime? nextChangeAt(DateTime? lastChangedAt) {
    return lastChangedAt?.add(changeInterval);
  }

  static bool canChange({
    required DateTime? lastChangedAt,
    required DateTime now,
  }) {
    final nextChange = nextChangeAt(lastChangedAt);
    return nextChange == null || !now.isBefore(nextChange);
  }
}
