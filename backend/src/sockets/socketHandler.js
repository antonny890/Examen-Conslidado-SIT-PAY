/**
 * Manejador de WebSockets con Socket.IO para SIT-Pay Arequipa
 * 
 * Cumplimiento Ley 29733 y Requerimiento de "Cero Distracción":
 * - Autenticación estricta con JWT en el handshake.
 * - Chofer solo se une a la sala de su vehículo asignado.
 * - Al chofer solo se envía un alias opcional y una confirmación genérica.
 * - NUNCA se envía monto, ni saldo, ni tarifa, ni DNI.
 */
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const db = require('../config/db');

let ioInstance = null;

const initializeSocket = (io) => {
  ioInstance = io;

  // Middleware de autenticación JWT para sockets
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Autenticación de socket requerida. Token ausente.'));
      }

      const decoded = jwt.verify(token, jwtConfig.secret);
      socket.user = decoded; // { id, email, rol }

      // Si es chofer, obtener su vehículo asignado para vincularlo a su sala exclusiva
      if (decoded.rol === 'CHOFER') {
        const choferRecord = await db('choferes')
          .where({ usuario_id: decoded.id })
          .first();

        if (choferRecord && choferRecord.vehiculo_id) {
          socket.vehiculoId = choferRecord.vehiculo_id;
        }
      }

      next();
    } catch (error) {
      next(new Error('Token de socket inválido o expirado.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Socket Conectado] Usuario: ${user.email} (${user.rol}) - ID: ${socket.id}`);

    // Si es chofer y tiene vehículo asignado, unirse a la sala de su vehículo
    if (user.rol === 'CHOFER' && socket.vehiculoId) {
      const room = `vehicle_${socket.vehiculoId}`;
      socket.join(room);
      console.log(`[Socket Chofer] Chofer ${user.email} unido a la sala: ${room}`);

      socket.emit('driver_ready', {
        status: 'CONECTADO',
        vehiculoId: socket.vehiculoId,
        mensaje: 'Monitoreo de pagos activo en segundo plano.',
      });
    }

    socket.on('disconnect', () => {
      console.log(`[Socket Desconectado] ID: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Emite notificación en vivo al chofer en la sala de su vehículo
 * CUMPLE: Solo alias opcional y confirmación, SIN nombre legal, monto ni saldo.
 * 
 * @param {string} vehiculoId 
 * @param {string|null} pasajeroAlias
 * @param {string} codigoBoleta 
 */
const emitPaymentConfirmationToDriver = (vehiculoId, pasajeroAlias, codigoBoleta) => {
  if (!ioInstance) {
    console.warn('[Socket Warning] Instancia ioInstance no inicializada.');
    return;
  }

  const room = `vehicle_${vehiculoId}`;
  const now = new Date();
  const horaFormateada = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const payload = {
    evento: 'PAGO_CONFIRMADO',
    mensaje: 'Se confirmó un pago',
    pasajeroAlias: typeof pasajeroAlias === 'string' ? pasajeroAlias : null,
    hora: horaFormateada,
    codigoBoleta: codigoBoleta,
    timestamp: now.toISOString(),
  };

  ioInstance.to(room).emit('payment_received', payload);
  console.log(`[Socket Emit] Notificación emitida a ${room}: "${payload.mensaje}"`);
};

module.exports = {
  initializeSocket,
  emitPaymentConfirmationToDriver,
  getIO: () => ioInstance,
};
