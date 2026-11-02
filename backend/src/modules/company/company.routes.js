/**
 * Rutas de Gestión de Empresa (/api/v1/company)
 */
const express = require('express');
const router = express.Router();
const companyController = require('./company.controller');
const authenticateJWT = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');

router.use(authenticateJWT);
router.use(authorizeRoles('ADMIN_EMPRESA', 'SUPER_ADMIN'));

router.get('/dashboard', companyController.getCompanyDashboard);
router.post('/drivers', companyController.createDriver);
router.get('/export-csv', companyController.exportReportCSV);

module.exports = router;
