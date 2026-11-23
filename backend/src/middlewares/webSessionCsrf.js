const { isTrustedOrigin } = require('../config/origins');
const { hasWebSessionCookie } = require('../utils/webSessionCookies');

const rejectUntrustedOrigin = (req, res) =>
  res.status(403).json({
    success: false,
    message: 'El origen de la solicitud no está permitido.',
  });

const requireTrustedOrigin = (req, res, next) => {
  if (!isTrustedOrigin(req.get('origin'))) {
    return rejectUntrustedOrigin(req, res);
  }
  return next();
};

const protectWebSessionRequests = (req, res, next) => {
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (
    safeMethod ||
    !hasWebSessionCookie(req) ||
    isTrustedOrigin(req.get('origin'))
  ) {
    return next();
  }
  return rejectUntrustedOrigin(req, res);
};

module.exports = { protectWebSessionRequests, requireTrustedOrigin };
