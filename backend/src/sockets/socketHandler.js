const { verifyAccessToken } = require('../services/supabaseAuthService');
const { db } = require('../services/postgresData');

let ioInstance = null;

const initializeSocket = (io) => {
  ioInstance = io;
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Autenticación de socket requerida. Token ausente.'));

      const decoded = await verifyAccessToken(token);
      const userSnapshot = await db.collection('usuarios').doc(decoded.uid).get();
      if (!userSnapshot.exists) return next(new Error('La cuenta asociada al token no existe.'));
      const user = userSnapshot.data();
      if (user.estado !== 'ACTIVO' || user.deleted_at ||
          user.email_verificado !== true || decoded.email_verified !== true) {
        return next(new Error('La cuenta no está activa o el correo no está confirmado.'));
      }
      socket.user = {
        id: decoded.uid,
        email: user.email || decoded.email,
        rol: user.rol_codigo,
      };

      if (user.rol_codigo === 'CHOFER') {
        const drivers = await db.collection('choferes')
          .where('usuario_id', '==', decoded.uid)
          .limit(1)
          .get();
        if (!drivers.empty) socket.vehiculoId = drivers.docs[0].data().vehiculo_id || null;
      }
      return next();
    } catch (error) {
      if (![400, 401, 403].includes(error.statusCode)) {
        return next(new Error('No se pudo validar la sesión con Supabase Auth.'));
      }
      return next(new Error('Token de acceso inválido o expirado.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Socket Conectado] Usuario: ${user.email} (${user.rol}) - ID: ${socket.id}`);
    if (user.rol === 'CHOFER' && socket.vehiculoId) {
      const room = `vehicle_${socket.vehiculoId}`;
      socket.join(room);
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

const emitPaymentConfirmationToDriver = (
  vehicleId,
  passengerAlias,
  ticketCode,
  { simulated = false } = {},
) => {
  if (!ioInstance) {
    console.warn('[Socket Warning] Instancia ioInstance no inicializada.');
    return;
  }
  const room = `vehicle_${vehicleId}`;
  const now = new Date();
  const time = now.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const payload = {
    evento: simulated ? 'PAGO_SIMULADO' : 'PAGO_CONFIRMADO',
    mensaje: simulated ? 'Se simuló un pago de pasaje' : 'Se confirmó un pago',
    simulado: simulated,
    pasajeroAlias: typeof passengerAlias === 'string' ? passengerAlias : null,
    hora: time,
    codigoBoleta: ticketCode,
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
