const { auth, db } = require('../config/firebase');

const authenticateFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. Se requiere un token de Firebase.',
    });
  }

  try {
    const token = authorization.slice('Bearer '.length);
    const decoded = await auth.verifyIdToken(token, true);
    const userSnapshot = await db.collection('usuarios').doc(decoded.uid).get();
    if (!userSnapshot.exists) {
      return res.status(401).json({ success: false, message: 'La cuenta asociada al token no existe.' });
    }

    const user = userSnapshot.data();
    if (user.estado !== 'ACTIVO' || user.deleted_at) {
      return res.status(403).json({ success: false, message: 'La cuenta se encuentra inactiva o suspendida.' });
    }
    if (user.email_verificado !== true || decoded.email_verified !== true) {
      return res.status(403).json({ success: false, message: 'Confirma tu correo electrónico para activar la cuenta.' });
    }

    req.user = {
      id: decoded.uid,
      email: user.email || decoded.email,
      rol: user.rol_codigo,
      rolId: user.rol_id || null,
      empresaId: user.empresa_id || null,
      ...user.customClaims,
    };
    return next();
  } catch (error) {
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ success: false, message: 'La sesión fue revocada. Inicia sesión nuevamente.' });
    }
    return res.status(401).json({ success: false, message: 'Token de Firebase inválido o expirado.' });
  }
};

module.exports = authenticateFirebaseToken;
