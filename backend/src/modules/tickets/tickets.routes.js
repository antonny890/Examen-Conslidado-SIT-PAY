/**
 * Rutas de Boletas Digitales e Historial (/api/v1/tickets)
 */
const express = require('express');
const router = express.Router();
const ticketsController = require('./tickets.controller');
const authenticateJWT = require('../../middlewares/auth');

router.use(authenticateJWT);

router.get('/', ticketsController.getMyTickets);
router.get('/:code', ticketsController.getTicketByCode);

module.exports = router;
