/**
 * Rutas de Tarifas (/api/v1/fares)
 */
const express = require('express');
const router = express.Router();
const faresController = require('./fares.controller');
const authenticateJWT = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');

// Públicas/Autenticadas
router.get('/', faresController.getFares);
router.post('/calculate', authenticateJWT, faresController.calculateFare);

// Solo Super Administrador
router.post('/', authenticateJWT, authorizeRoles('SUPER_ADMIN'), faresController.createFare);
router.put('/:id', authenticateJWT, authorizeRoles('SUPER_ADMIN'), faresController.updateFare);

module.exports = router;
