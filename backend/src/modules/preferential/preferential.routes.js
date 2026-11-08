/**
 * Rutas de Acreditación de Pasaje Preferencial (/api/v1/preferential)
 */
const express = require('express');
const router = express.Router();
const preferentialController = require('./preferential.controller');
const authenticateAccessToken = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');
const { preferentialOtpLimiter } = require('../../middlewares/rateLimiter');

router.use(authenticateAccessToken, authorizeRoles('PASAJERO'));

// Rutas de pasajeros
router.get('/status', preferentialController.getPassengerStatus);
router.post('/request-email', preferentialOtpLimiter, preferentialController.requestByEmail);
router.post('/verify-code', preferentialOtpLimiter, preferentialController.verifyEmailCode);

module.exports = router;
