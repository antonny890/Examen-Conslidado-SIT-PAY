const prohibitedTerms = [
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
  'cabrón',
  'cabron',
  'cabrona',
  'cabrones',
  'maricón',
  'maricon',
  'marica',
  'verga',
  'vergas',
  'coño',
  'concha',
  'chucha',
  'joder',
  'jodido',
  'jodida',
  'chingar',
  'chingada',
  'chingado',
  'huevón',
  'huevon',
  'huevona',
  'webón',
  'webon',
  'weon',
  'culero',
  'culera',
  'culiao',
  'estúpido',
  'estupido',
  'estúpida',
  'estupida',
  'imbécil',
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

const leetCharacters = {
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
  '$': 's',
  '!': 'i',
  '|': 'i',
};

const normalizeAlias = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[0123456789@$!|]/g, (character) => leetCharacters[character])
  .replace(/[^a-z0-9]/g, '');

const hasProhibitedTerm = (value) => {
  const candidates = [
    normalizeAlias(value),
    normalizeAlias(String(value ?? '').replace(/\d+$/, '')),
  ];
  return candidates.some((normalized) => prohibitedTerms.some((term) => {
    const normalizedTerm = normalizeAlias(term);
    if (normalizedTerm.length >= 5) return normalized.includes(normalizedTerm);
    return normalized === normalizedTerm ||
      normalized.startsWith(normalizedTerm) ||
      normalized.endsWith(normalizedTerm) ||
      new RegExp(`^${normalizedTerm}\\d+$`).test(normalized);
  }));
};

const validateAlias = (value) => {
  const alias = typeof value === 'string' ? value : '';
  if (!alias) return null;
  if (alias.length < 5) return 'El alias debe tener entre 5 y 16 caracteres.';
  if (alias.length > 16) return 'El alias debe tener entre 5 y 16 caracteres.';
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(alias)) {
    return 'El alias debe iniciar con una letra y usar solo letras A-Z y números, sin tildes, espacios ni símbolos.';
  }
  if (hasProhibitedTerm(alias)) return 'Ese alias no está permitido.';
  return null;
};

module.exports = {
  hasProhibitedTerm,
  normalizeAlias,
  validateAlias,
};
