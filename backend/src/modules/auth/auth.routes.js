/**
 * Rutas de Autenticación (/api/v1/auth)
 */
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const dniController = require('./dni.controller');
const authenticateAccessToken = require('../../middlewares/auth');
const { authLimiter } = require('../../middlewares/rateLimiter');

router.post('/register', authLimiter, authController.registerPassenger);
router.post('/lookup-dni', authLimiter, dniController.lookupDni);
router.post('/registration-email/request', authLimiter, authController.requestRegistrationEmailCode);
router.post('/registration-email/verify', authLimiter, authController.verifyRegistrationEmailCode);
router.post('/login', authLimiter, authController.login);
router.post('/google', authLimiter, authController.loginWithGoogle);
router.post('/google/passenger', authLimiter, authController.googlePassengerAuth);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticateAccessToken, authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

module.exports = router;
