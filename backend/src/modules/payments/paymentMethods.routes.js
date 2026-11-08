const express = require('express');
const router = express.Router();
const authenticateFirebaseToken = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');
const { paymentLimiter } = require('../../middlewares/rateLimiter');
const controller = require('./paymentMethods.controller');

router.use(authenticateFirebaseToken, authorizeRoles('PASAJERO'));
router.get('/', controller.listPaymentMethods);
router.post('/', paymentLimiter, controller.addPaymentMethod);
router.delete('/:id', controller.removePaymentMethod);

module.exports = router;
