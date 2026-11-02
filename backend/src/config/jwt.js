/**
 * Configuración de tokens JWT para autenticación stateless
 */
module.exports = {
  secret: process.env.JWT_SECRET || 'sit_pay_jwt_secret_aqp_2026_dev',
  expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'sit_pay_refresh_secret_aqp_2026_dev',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};
