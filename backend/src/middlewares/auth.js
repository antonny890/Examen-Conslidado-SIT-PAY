/**
 * Middleware para verificación de tokens JWT Bearer
 */
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. Token Bearer ausente o malformado.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = decoded; // { id, email, rol, rolId, empresaId, vehiculoId }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'El token de sesión ha expirado. Por favor renueve sus credenciales.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación inválido.',
    });
  }
};

module.exports = authenticateJWT;
