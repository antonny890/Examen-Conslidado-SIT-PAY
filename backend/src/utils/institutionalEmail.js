const ALLOWED_DOMAINS = (process.env.ALLOWED_EDU_DOMAINS ||
  'continental.edu.pe,unsa.edu.pe,ucsm.edu.pe,utp.edu.pe')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

const isInstitutionalEmailAddress = (email) => {
  if (typeof email !== 'string') return false;
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split('@')[1] || '';

  return normalizedEmail.length <= 150 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) &&
    (domain.endsWith('.edu.pe') || ALLOWED_DOMAINS.includes(domain));
};

const getVerifiedInstitutionalEmail = (user) => {
  if (
    user?.rol_codigo !== 'PASAJERO' ||
    user.email_verificado !== true ||
    !isInstitutionalEmailAddress(user.email)
  ) {
    return null;
  }

  const email = user.email.trim().toLowerCase();
  const domain = email.split('@')[1];
  return {
    email,
    domain,
    institution: {
      'continental.edu.pe': 'Universidad Continental',
      'unsa.edu.pe': 'Universidad Nacional de San Agustín',
      'ucsm.edu.pe': 'Universidad Católica de Santa María',
      'utp.edu.pe': 'Universidad Tecnológica del Perú',
      'sanpablo.edu.pe': 'Universidad Católica San Pablo',
    }[domain] || domain,
  };
};

module.exports = {
  getVerifiedInstitutionalEmail,
  isInstitutionalEmailAddress,
};
