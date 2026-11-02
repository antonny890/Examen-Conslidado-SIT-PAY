/**
 * Middleware para Control de Acceso Basado en Roles (RBAC)
 * Roles permitidos: SUPER_ADMIN, ADMIN_EMPRESA, CHOFER, PASAJERO
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(401).json({
        success: false,
        message: 'Sesión no identificada. Se requiere autenticación previa.',
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
