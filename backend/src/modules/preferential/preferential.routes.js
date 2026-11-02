/**
 * Rutas de Acreditación de Pasaje Preferencial (/api/v1/preferential)
 */
const express = require('express');
const router = express.Router();
const preferentialController = require('./preferential.controller');
const authenticateJWT = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');

router.use(authenticateJWT);

// Rutas de pasajeros
router.get('/status', preferentialController.getPassengerStatus);
router.post('/request-email', preferentialController.requestByEmail);
router.post('/verify-code', preferentialController.verifyEmailCode);
router.post('/request-card', preferentialController.requestByCard);

// Rutas de revisión administrativa (ADMIN_EMPRESA y SUPER_ADMIN)
router.get(
  '/admin/all',
  authorizeRoles('ADMIN_EMPRESA', 'SUPER_ADMIN'),
  preferentialController.listAllRequests
);
router.put(
  '/admin/:id/review',
  authorizeRoles('ADMIN_EMPRESA', 'SUPER_ADMIN'),
  preferentialController.reviewRequest
);

module.exports = router;
