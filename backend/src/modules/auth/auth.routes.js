/**
 * Rutas de Autenticación (/api/v1/auth)
 */
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const dniController = require('./dni.controller');
const authenticateAccessToken = require('../../middlewares/auth');
const { authLimiter } = require('../../middlewares/rateLimiter');
const { requireTrustedOrigin } = require('../../middlewares/webSessionCsrf');

const markWebSession = (req, res, next) => {
  req.webSession = true;
  return next();
};

router.post('/register', authLimiter, authController.registerPassenger);
router.post('/lookup-dni', authLimiter, dniController.lookupDni);
router.post('/registration-email/request', authLimiter, authController.requestRegistrationEmailLink);
router.post('/registration-email/simulate', authLimiter, authController.simulateRegistrationEmailConfirmation);
router.post('/registration-email/confirm-link', authLimiter, authController.confirmRegistrationEmailLink);
router.post('/login', authLimiter, authController.login);
router.post('/google', authLimiter, authController.loginWithGoogle);
router.post('/google/passenger', authLimiter, authController.googlePassengerAuth);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticateAccessToken, authController.logout);
router.post('/web/login', authLimiter, requireTrustedOrigin, markWebSession, authController.login);
router.post('/web/google', authLimiter, requireTrustedOrigin, markWebSession, authController.loginWithGoogle);
router.post('/web/refresh', authLimiter, requireTrustedOrigin, markWebSession, authController.refreshToken);
router.post('/web/logout', requireTrustedOrigin, markWebSession, authenticateAccessToken, authController.logout);
router.get('/web/session', authenticateAccessToken, authController.getWebSession);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

module.exports = router;
