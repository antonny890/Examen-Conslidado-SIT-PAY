/**
 * Especificación OpenAPI 3.0 para Swagger UI (/api/docs)
 * Documenta todos los módulos, esquemas de entrada/salida y esquema de seguridad Bearer JWT
 */
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SIT-Pay Arequipa — API REST Documentación',
    version: '1.0.0',
    description: `
API REST del Sistema de Pago Digital del Pasaje de Transporte Público Urbano de Arequipa (SIT-Pay).
Enfoque en la transacción financiera con cumplimiento normativo:
- **Ley N° 26271**: Pasaje diferenciado escolar y universitario (50% de 05:00 a 24:00 hrs en días hábiles).
- **Ley N° 29571**: Código del Consumidor (Boleta digital obligatoria, código único y libro de reclamos).
- **Ley N° 29733**: Protección de Datos Personales (Consentimiento explícito, minimización hacia el chofer y trazabilidad).
SIT-Pay no almacena dinero ni mantiene saldos. Los cobros requieren una API bancaria externa; esta integración aún no está configurada.
    `,
    contact: {
      name: 'Equipo SIT-Pay Arequipa — Universidad Continental',
      email: 'soporte@sitpay.gob.pe',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Servidor API v1 (Local / Producción)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese su token JWT de autenticación Bearer (obtenido al iniciar sesión).',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          code: { type: 'string', example: 'PAYMENT_PROVIDER_NOT_CONFIGURED' },
          message: { type: 'string', example: 'Descripción del error' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'pasajero.pedro@gmail.com' },
          password: { type: 'string', example: 'SitPay2026!' },
        },
      },
      RegisterPassengerRequest: {
        type: 'object',
        required: ['email', 'password', 'nombres', 'apellidos', 'numeroDocumento', 'consentimientoDatos'],
        properties: {
          email: { type: 'string', format: 'email', example: 'nuevo.pasajero@gmail.com' },
          password: { type: 'string', example: 'SitPay2026!' },
          nombres: { type: 'string', example: 'Carlos Alberto' },
          apellidos: { type: 'string', example: 'Mendoza Flores' },
          tipoDocumento: { type: 'string', enum: ['DNI', 'CE'], example: 'DNI' },
          numeroDocumento: { type: 'string', example: '72891045' },
          telefono: { type: 'string', example: '958123456' },
          consentimientoDatos: { type: 'boolean', example: true },
        },
      },
      PaymentQRRequest: {
        type: 'object',
        required: ['qrCode'],
        properties: {
          qrCode: { type: 'string', example: 'SIT-VEH-V7A890-7F89C1D4E2' },
        },
      },
      PaymentPlateRequest: {
        type: 'object',
        required: ['plate'],
        properties: {
          plate: { type: 'string', example: 'V7A-890' },
        },
      },
      PreferentialEmailRequest: {
        type: 'object',
        required: ['institucionEducativa', 'correoInstitucional'],
        properties: {
          institucionEducativa: { type: 'string', example: 'Universidad Continental' },
          correoInstitucional: { type: 'string', example: 'alumno@continental.edu.pe' },
          tipoPreferencial: { type: 'string', enum: ['UNIVERSITARIO', 'ESCOLAR'], example: 'UNIVERSITARIO' },
        },
      },
      ClaimRequest: {
        type: 'object',
        required: ['tipoIncidencia', 'descripcion'],
        properties: {
          transaccionId: { type: 'string', format: 'uuid', nullable: true },
          tipoIncidencia: { type: 'string', enum: ['COBRO_INDEBIDO', 'NEGATIVA_MEDIO_PASAJE', 'MALTRATO_CHOFER', 'OTRO'], example: 'NEGATIVA_MEDIO_PASAJE' },
          descripcion: { type: 'string', example: 'El chofer indicó que no aceptaba pasaje escolar a pesar de estar dentro del horario de la ley.' },
          evidenciaUrl: { type: 'string', nullable: true },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Inicio de sesión para todos los roles (Pasajero, Chofer, Admin Empresa, Super Admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Login exitoso, devuelve JWT y perfil' },
          401: { description: 'Credenciales inválidas' },
          403: { description: 'Cuenta inactiva o bloqueada' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registro público de nuevos pasajeros con consentimiento Ley 29733',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterPassengerRequest' } } } },
        responses: {
          201: { description: 'Pasajero creado exitosamente' },
          400: { description: 'Faltan datos obligatorios o consentimiento denegado' },
          409: { description: 'El correo electrónico ya existe' },
        },
      },
    },
    '/auth/lookup-dni': {
      post: {
        tags: ['Autenticación'],
        summary: 'Consultar nombre asociado a un DNI mediante Migo',
        description: 'El backend mantiene el token Migo fuera de la aplicación móvil. Requiere consentimiento del usuario y MIGO_API_TOKEN configurado en el servidor. No necesita consultar PostgreSQL.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dni'],
                properties: {
                  dni: { type: 'string', pattern: '^\\d{8}$', example: '00000000' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'DNI consultado; devuelve el nombre completo del titular' },
          400: { description: 'El DNI debe contener exactamente ocho dígitos' },
          404: { description: 'El proveedor no encontró el DNI' },
          503: { description: 'Token Migo no configurado' },
          504: { description: 'Tiempo de espera agotado al consultar al proveedor' },
        },
      },
    },
    '/payments/preview': {
      post: {
        tags: ['Pagos de Pasaje'],
        summary: 'Consultar tarifa y vehículo sin iniciar un pago',
        description: 'Devuelve la tarifa estimada y paymentAvailable=false mientras la API bancaria no esté integrada.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  qrCode: { type: 'string', example: 'SIT-VEH-V7A890-7F89C1D4E2' },
                  plate: { type: 'string', example: 'V7A-890' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Tarifa estimada; paymentAvailable es false' },
          400: { description: 'Debe proporcionar la placa o el código QR' },
          404: { description: 'Vehículo o QR no encontrado' },
        },
      },
    },
    '/payments/pay/qr': {
      post: {
        tags: ['Pagos de Pasaje'],
        summary: 'Pago por QR (deshabilitado hasta integrar el banco)',
        description: 'Actualmente no inicia pagos ni crea transacciones o comprobantes. Devuelve PAYMENT_PROVIDER_NOT_CONFIGURED.',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentQRRequest' } } } },
        responses: {
          400: { description: 'Debe proporcionar el código QR del vehículo' },
          404: { description: 'Vehículo o QR no encontrado' },
          503: {
            description: 'API bancaria no configurada; no se inició el pago',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/payments/pay/plate': {
      post: {
        tags: ['Pagos de Pasaje'],
        summary: 'Pago por placa (deshabilitado hasta integrar el banco)',
        description: 'Actualmente no inicia pagos ni crea transacciones o comprobantes. Devuelve PAYMENT_PROVIDER_NOT_CONFIGURED.',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentPlateRequest' } } } },
        responses: {
          400: { description: 'Debe proporcionar la placa del vehículo' },
          404: { description: 'Placa no registrada en el sistema SIT' },
          503: {
            description: 'API bancaria no configurada; no se inició el pago',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/preferential/status': {
      get: {
        tags: ['Medio Pasaje (Ley 26271)'],
        summary: 'Consultar estado actual de acreditación preferencial del pasajero',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Estado: SIN_SOLICITUD, PENDIENTE, APROBADA o VENCIDA' } },
      },
    },
    '/preferential/request-email': {
      post: {
        tags: ['Medio Pasaje (Ley 26271)'],
        summary: 'Solicitar medio pasaje mediante correo institucional (.edu.pe)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PreferentialEmailRequest' } } } },
        responses: { 200: { description: 'Código OTP simulado enviado' } },
      },
    },
    '/tickets': {
      get: {
        tags: ['Boletas e Historial'],
        summary: 'Listar historial completo de boletas de pasajes pagados',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Lista paginada de boletas' } },
      },
    },
    '/vehicles/{id}/qr': {
      get: {
        tags: ['Flota y Códigos QR'],
        summary: 'Obtener el código QR fijo y seguro de una placa en formato SVG y PNG',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'SVG y DataURL del QR' } },
      },
    },
    '/claims': {
      post: {
        tags: ['Reclamos e Incidencias (Ley 29571)'],
        summary: 'Interponer reclamo asociado a un pasaje o cobro indebido',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ClaimRequest' } } } },
        responses: { 201: { description: 'Reclamo formalmente registrado' } },
      },
    },
    '/company/dashboard': {
      get: {
        tags: ['Administración de Empresa'],
        summary: 'Dashboard de recaudación del día, flota y choferes de la empresa',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Métricas consolidadas de la empresa concesionaria' } },
      },
    },
    '/admin/dashboard': {
      get: {
        tags: ['Super Administrador'],
        summary: 'Dashboard consolidado del sistema para fiscalización de tarifas',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Métricas macro y distribución de tarifas' } },
      },
    },
  },
};

const swaggerOptions = {
  swaggerDefinition,
  apis: [], // Ya se definieron todas las rutas en la especificación swaggerDefinition
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
