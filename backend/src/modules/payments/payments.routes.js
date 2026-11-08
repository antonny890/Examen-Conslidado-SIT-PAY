/**
 * Rutas de Pagos de Pasaje (/api/v1/payments)
 */
const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const authenticateAccessToken = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');
const { paymentLimiter } = require('../../middlewares/rateLimiter');

router.use(authenticateAccessToken);
router.use(authorizeRoles('PASAJERO'));

router.post('/preview', paymentsController.previewPayment);
router.post('/pay/qr', paymentLimiter, paymentsController.payWithQR);
router.post('/pay/plate', paymentLimiter, paymentsController.payWithPlate);

module.exports = router;
