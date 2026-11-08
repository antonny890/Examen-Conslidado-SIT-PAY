/**
 * Rutas de Tarifas (/api/v1/fares)
 */
const express = require('express');
const router = express.Router();
const faresController = require('./fares.controller');
const authenticateAccessToken = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');

// Públicas/Autenticadas
router.get('/', faresController.getFares);
router.post('/calculate', authenticateAccessToken, faresController.calculateFare);

// Solo Super Administrador
router.post('/', authenticateAccessToken, authorizeRoles('SUPER_ADMIN'), faresController.createFare);
router.put('/:id', authenticateAccessToken, authorizeRoles('SUPER_ADMIN'), faresController.updateFare);

module.exports = router;
