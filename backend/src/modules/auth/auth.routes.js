/**
 * Rutas de Autenticación (/api/v1/auth)
 */
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const dniController = require('./dni.controller');
const authenticateJWT = require('../../middlewares/auth');
const { authLimiter } = require('../../middlewares/rateLimiter');

router.post('/register', authLimiter, authController.registerPassenger);
router.post('/lookup-dni', authLimiter, dniController.lookupDni);
router.post('/login', authLimiter, authController.login);
router.post('/google', authLimiter, authController.loginWithGoogle);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticateJWT, authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

module.exports = router;
