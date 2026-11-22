class AliasRules {
  static const minLength = 5;
  static const maxLength = 16;
  static const changeInterval = Duration(days: 15);

  static final _allowedCharacters = RegExp(r'^[A-Za-z][A-Za-z0-9]*$');
  static const _prohibitedTerms = [
    'puta',
    'puto',
    'putas',
    'putos',
    'putita',
    'putito',
    'putazo',
    'putazos',
    'putamadre',
    'putear',
    'puteria',
    'mierda',
    'mierdas',
    'pendejo',
    'pendeja',
    'pendejos',
    'pendejas',
    'cabron',
    'cabrona',
    'cabrones',
    'maricon',
    'marica',
    'verga',
    'vergas',
    'cono',
    'concha',
    'chucha',
    'joder',
    'jodido',
    'jodida',
    'chingar',
    'chingada',
    'chingado',
    'huevon',
    'huevona',
    'webon',
    'weon',
    'culero',
    'culera',
    'culiao',
    'estupido',
    'estupida',
    'imbecil',
    'idiota',
    'idiotas',
    'carajo',
    'carajos',
    'malparido',
    'malparida',
    'hijodeputa',
    'hijadeputa',
    'conchatumadre',
    'conchatumare',
    'pichula',
    'pichulon',
    'chupaverga',
    'chupapinga',
  ];

  static String? validate(String? value) {
    final alias = value ?? '';
    if (alias.isEmpty) return null;
    if (alias.length < minLength) {
      return 'El alias debe tener al menos $minLength caracteres.';
    }
    if (alias.length > maxLength) {
      return 'El alias no puede superar $maxLength caracteres.';
    }
    if (!_allowedCharacters.hasMatch(alias)) {
      return 'Inicia con una letra y usa solo letras A-Z y números, sin tildes, espacios ni símbolos.';
    }
    if (_containsProhibitedTerm(alias)) {
      return 'Ese alias no está permitido.';
    }
    return null;
  }

  static bool _containsProhibitedTerm(String value) {
    final candidates = [
      _normalizeForModeration(value),
      _normalizeForModeration(value.replaceFirst(RegExp(r'\d+$'), '')),
    ];
    return candidates.any(
      (normalized) => _prohibitedTerms.any((term) {
        if (term.length >= 5) return normalized.contains(term);
        return normalized == term ||
            normalized.startsWith(term) ||
            normalized.endsWith(term) ||
            RegExp('^$term\\d+\$').hasMatch(normalized);
      }),
    );
  }

  static String _normalizeForModeration(String value) {
    var normalized = value.toLowerCase();
    const accentReplacements = {
      'á': 'a',
      'à': 'a',
      'ä': 'a',
      'â': 'a',
      'ã': 'a',
      'é': 'e',
      'è': 'e',
      'ë': 'e',
      'ê': 'e',
      'í': 'i',
      'ì': 'i',
      'ï': 'i',
      'î': 'i',
      'ó': 'o',
      'ò': 'o',
      'ö': 'o',
      'ô': 'o',
      'õ': 'o',
      'ú': 'u',
      'ù': 'u',
      'ü': 'u',
      'û': 'u',
    };
    accentReplacements.forEach((character, replacement) {
      normalized = normalized.replaceAll(character, replacement);
    });
    const leetReplacements = {
      '0': 'o',
      '1': 'i',
      '2': 'z',
      '3': 'e',
      '4': 'a',
      '5': 's',
      '6': 'g',
      '7': 't',
      '8': 'b',
      '9': 'g',
      '@': 'a',
      r'$': 's',
      '!': 'i',
      '|': 'i',
    };
    leetReplacements.forEach((character, replacement) {
      normalized = normalized.replaceAll(character, replacement);
    });
    return normalized.replaceAll(RegExp(r'[^a-z0-9]'), '');
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
