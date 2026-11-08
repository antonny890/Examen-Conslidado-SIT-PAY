const { verifyAccessToken } = require('../services/supabaseAuthService');
const { getDocument } = require('../services/postgresData');

const authenticateAccessToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. Se requiere un token de acceso.',
    });
  }

  const token = authorization.slice('Bearer '.length);
  let decoded;
  try {
    decoded = await verifyAccessToken(token);
  } catch (error) {
    if ([400, 401, 403].includes(error.statusCode)) {
      return res.status(401).json({ success: false, message: 'Token de acceso inválido o expirado.' });
    }
    return next(error);
  }

  try {
    const user = await getDocument('usuarios', decoded.uid);
    if (!user) {
      return res.status(401).json({ success: false, message: 'La cuenta asociada al token no existe.' });
    }

    if (user.estado !== 'ACTIVO' || user.deleted_at) {
      return res.status(403).json({ success: false, message: 'La cuenta se encuentra inactiva o suspendida.' });
    }
    if (user.email_verificado !== true || decoded.email_verified !== true) {
      return res.status(403).json({ success: false, message: 'Confirma tu correo electrónico para activar la cuenta.' });
    }
    if (user.token_invalid_before &&
        Number(decoded.auth_time) * 1000 <
          Math.floor(new Date(user.token_invalid_before).getTime() / 1000) * 1000) {
      return res.status(401).json({ success: false, message: 'La sesión fue revocada. Inicia sesión nuevamente.' });
    }

    req.authToken = token;
    req.user = {
      id: decoded.uid,
      email: user.email || decoded.email,
      rol: user.rol_codigo,
      rolId: user.rol_id || null,
      empresaId: user.empresa_id || null,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authenticateAccessToken;
