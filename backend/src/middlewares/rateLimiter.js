/**
 * Limitador de tasa de peticiones para endpoints de autenticación y pagos
 */
const rateLimit = require('express-rate-limit');

// Limite estricto para inicio de sesión y recuperación de contraseña
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Máximo 20 intentos por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de acceso desde esta dirección IP. Intente nuevamente en 15 minutos.',
  },
});

const preferentialOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de verificación. Intente nuevamente en 15 minutos.',
  },
});

// Limite para endpoints transaccionales de pago (anti-abuso)
const paymentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // Máximo 30 pagos/minuto por cliente
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Límite de solicitudes de pago excedido. Espere un momento antes de reintentar.',
  },
});

module.exports = {
  authLimiter,
  preferentialOtpLimiter,
  paymentLimiter,
};
