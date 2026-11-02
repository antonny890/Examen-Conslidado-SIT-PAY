/**
 * Aplicación Principal Express + HTTP Server + Socket.IO (SIT-Pay Arequipa)
 * Backend sin estado (stateless) para consumo simultáneo de Mobile (Flutter) y Web (React)
 */
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middlewares/errorHandler');
const { initializeSocket } = require('./sockets/socketHandler');

// Rutas modulares
const authRoutes = require('./modules/auth/auth.routes');
const profileRoutes = require('./modules/profile/profile.routes');
const faresRoutes = require('./modules/fares/fares.routes');
const preferentialRoutes = require('./modules/preferential/preferential.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const ticketsRoutes = require('./modules/tickets/tickets.routes');
const vehiclesRoutes = require('./modules/vehicles/vehicles.routes');
const claimsRoutes = require('./modules/claims/claims.routes');
const companyRoutes = require('./modules/company/company.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();
const server = http.createServer(app);

// 1. Configuración de Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
initializeSocket(io);

// 2. Middlewares de Seguridad y Red
app.use(
  helmet({
    contentSecurityPolicy: false, // Permitir Swagger UI
  })
);

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Documentación Swagger UI en /api/docs
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'SIT-Pay Arequipa — Swagger API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);

// 4. Endpoint de Salud / Estado del Servicio
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    servicio: 'SIT-Pay Arequipa API REST',
    universidad: 'Universidad Continental',
    curso: 'Programación Web',
    normativa: ['Ley 26271', 'Ley 29571', 'Ley 29733'],
    timestamp: new Date().toISOString(),
  });
});

// 5. Montaje de Módulos API v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/fares', faresRoutes);
app.use('/api/v1/preferential', preferentialRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/tickets', ticketsRoutes);
app.use('/api/v1/vehicles', vehiclesRoutes);
app.use('/api/v1/claims', claimsRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/admin', adminRoutes);

// 6. Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}. Consulte /api/docs para ver los endpoints válidos.`,
  });
});

// 7. Manejador Centralizado de Errores
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`\n===============================================================`);
    console.log(`🚀 [SIT-Pay Arequipa] Backend escuchando en el puerto ${PORT}`);
    console.log(`📖 Swagger UI disponible en: http://localhost:${PORT}/api/docs`);
    console.log(`⚡ Socket.IO habilitado para notificaciones de choferes en vivo`);
    console.log(`===============================================================\n`);
  });
}

module.exports = { app, server };
