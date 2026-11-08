/**
 * Rutas de Gestión de Empresa (/api/v1/company)
 */
const express = require('express');
const router = express.Router();
const companyController = require('./company.controller');
const authenticateAccessToken = require('../../middlewares/auth');
const authorizeRoles = require('../../middlewares/rbac');

router.use(authenticateAccessToken);
router.use(authorizeRoles('ADMIN_EMPRESA', 'SUPER_ADMIN'));

router.get('/dashboard', companyController.getCompanyDashboard);
router.get('/business-units', companyController.getBusinessUnits);
router.post('/drivers', companyController.createDriver);
router.get('/export-csv', companyController.exportReportCSV);

module.exports = router;
