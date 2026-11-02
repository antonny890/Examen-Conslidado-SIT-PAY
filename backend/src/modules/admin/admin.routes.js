/**
 * Rutas de Super Administrador (/api/v1/admin)
 */
const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const authenticateJWT = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');

router.use(authenticateJWT);
router.use(authorizeRoles('SUPER_ADMIN'));

router.get('/dashboard', adminController.getGlobalDashboard);
router.get('/companies', adminController.getCompanies);
router.post('/companies', adminController.createCompany);
router.get('/business-units', adminController.getBusinessUnits);
router.get('/audit-logs', adminController.getAuditLogs);
router.put('/users/:id/status', adminController.toggleUserStatus);

module.exports = router;
