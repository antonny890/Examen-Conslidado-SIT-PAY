/**
 * Rutas de Vehículos y Códigos QR (/api/v1/vehicles)
 */
const express = require('express');
const router = express.Router();
const vehiclesController = require('./vehicles.controller');
const authenticateFirebaseToken = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');

router.use(authenticateFirebaseToken);

router.get('/', vehiclesController.getVehicles);
router.get('/:id/qr', vehiclesController.getVehicleQR);
router.get('/by-plate/:plate/qr', vehiclesController.getVehicleQRByPlate);

// Acciones Administrativas
router.post('/', authorizeRoles('ADMIN_EMPRESA', 'SUPER_ADMIN'), vehiclesController.createVehicle);
router.post('/:id/regenerate-qr', authorizeRoles('ADMIN_EMPRESA', 'SUPER_ADMIN'), vehiclesController.regenerateQR);
router.put('/:id/reassign-driver', authorizeRoles('ADMIN_EMPRESA', 'SUPER_ADMIN'), vehiclesController.reassignDriver);

module.exports = router;
