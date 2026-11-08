/**
 * Rutas de Perfil de Usuario (/api/v1/profile)
 */
const express = require('express');
const router = express.Router();
const profileController = require('./profile.controller');
const authenticateAccessToken = require('../../middlewares/auth');

router.use(authenticateAccessToken);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.put('/photo', profileController.updateProfilePhoto);
router.put('/change-password', profileController.changePassword);
router.post('/consent', profileController.registerConsent);
router.delete('/', profileController.deactivateAccount);

module.exports = router;
