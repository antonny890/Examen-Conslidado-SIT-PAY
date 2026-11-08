/**
 * Rutas de Reclamos e Incidencias (/api/v1/claims)
 */
const express = require('express');
const router = express.Router();
const claimsController = require('./claims.controller');
const authenticateFirebaseToken = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');

router.use(authenticateFirebaseToken);

router.post('/', claimsController.createClaim);
router.get('/my-claims', claimsController.getMyClaims);

// Rutas de administración de reclamos
router.get('/', authorizeRoles('ADMIN_EMPRESA', 'SUPER_ADMIN'), claimsController.listAllClaims);
router.put('/:id/resolve', authorizeRoles('ADMIN_EMPRESA', 'SUPER_ADMIN'), claimsController.resolveClaim);

module.exports = router;
