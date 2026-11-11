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
SIT-Pay no almacena dinero ni mantiene saldos. Los pagos de esta versión son simulaciones con tarjetas ficticias de prueba; no se conecta a un banco ni se realizan cargos reales. Solo se conserva una referencia enmascarada y nunca se guardan el número completo de tarjeta ni el CVV.
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
        bearerFormat: 'Supabase access token',
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
        required: ['email', 'password', 'nombres', 'apellidos', 'numeroDocumento', 'consentimientoDatos', 'consentimientoConsultaDni'],
        properties: {
          email: { type: 'string', format: 'email', example: 'nuevo.pasajero@gmail.com' },
          password: { type: 'string', minLength: 8, example: 'SitPay2026!' },
          nombres: { type: 'string', maxLength: 100, example: 'Carlos Alberto' },
          apellidos: { type: 'string', maxLength: 100, example: 'Mendoza Flores' },
          tipoDocumento: { type: 'string', enum: ['DNI'], example: 'DNI' },
          numeroDocumento: { type: 'string', pattern: '^\\d{8}$', example: '72891045' },
          telefono: { type: 'string', example: '958123456' },
          consentimientoDatos: { type: 'boolean', example: true },
          consentimientoConsultaDni: { type: 'boolean', example: true },
        },
      },
      PaymentQRRequest: {
        type: 'object',
        required: ['qrCode', 'paymentMethodId', 'idempotencyKey'],
        properties: {
          qrCode: { type: 'string', example: 'SIT-VEH-V7A890-7F89C1D4E2' },
          paymentMethodId: { type: 'string', description: 'Identificador de tarjeta ficticia' },
          idempotencyKey: { type: 'string', description: 'Clave única para evitar boletas duplicadas' },
        },
      },
      PaymentPlateRequest: {
        type: 'object',
        required: ['plate', 'paymentMethodId', 'idempotencyKey'],
        properties: {
          plate: { type: 'string', example: 'V7A-890' },
          paymentMethodId: { type: 'string', description: 'Identificador de tarjeta ficticia' },
          idempotencyKey: { type: 'string', description: 'Clave única para evitar boletas duplicadas' },
        },
      },
      PreferentialEmailRequest: {
        type: 'object',
        required: ['institucionEducativa', 'correoInstitucional'],
        properties: {
          institucionEducativa: { type: 'string', example: 'Universidad Continental' },
          correoInstitucional: { type: 'string', example: 'alumno@continental.edu.pe' },
          tipoPreferencial: { type: 'string', enum: ['UNIVERSITARIA'], example: 'UNIVERSITARIA' },
        },
      },
      ClaimRequest: {
        type: 'object',
        required: ['destinatario', 'vehiculoId', 'tipoIncidencia', 'descripcion'],
        properties: {
          transaccionId: { type: 'string', format: 'uuid', nullable: true },
          destinatario: { type: 'string', enum: ['EMPRESA', 'SUPER_ADMIN'], example: 'EMPRESA' },
          vehiculoId: { type: 'string', format: 'uuid' },
          tipoIncidencia: { type: 'string', enum: ['CONDICIONES_UNIDAD', 'LIMPIEZA_UNIDAD', 'COBRO_INDEBIDO', 'NEGATIVA_MEDIO_PASAJE', 'MALTRATO_CHOFER', 'RUTA_TRANSPORTE', 'FRECUENCIA_SERVICIO', 'SEGURIDAD_TRANSPORTE', 'FALLA_SISTEMA', 'OTRO'], example: 'CONDICIONES_UNIDAD' },
          descripcion: { type: 'string', minLength: 10, maxLength: 2000, example: 'Los asientos de la unidad están en mal estado.' },
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
    '/auth/registration-email/request': {
      post: {
        tags: ['Autenticación'],
        summary: 'Enviar enlace de confirmación de registro por correo',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Enlace enviado; puede reenviarse cada 60 segundos' },
          400: { description: 'No existe un registro pendiente para este correo' },
          429: { description: 'Tiempo de espera antes de reenviar el enlace' },
          503: { description: 'Supabase Auth no está disponible' },
        },
      },
    },
    '/auth/registration-email/confirm-link': {
      post: {
        tags: ['Autenticación'],
        summary: 'Confirmar registro desde el enlace enviado por correo',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  tokenHash: { type: 'string' },
                },
                oneOf: [
                  { required: ['accessToken'] },
                  { required: ['tokenHash'] },
                ],
              },
            },
          },
        },
        responses: {
          200: { description: 'Correo confirmado; devuelve el perfil y tokens de sesión' },
          400: { description: 'Enlace inválido, expirado o cuenta no pendiente' },
        },
      },
    },
    '/auth/registration-email/simulate': {
      post: {
        tags: ['Autenticación'],
        summary: 'Completar la confirmación simulada (solo desarrollo)',
        description: 'Disponible únicamente con NODE_ENV=development y REGISTRATION_EMAIL_DEMO_MODE=true.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cuenta de demostración activada; devuelve el perfil y tokens' },
          400: { description: 'No existe un registro pendiente para este correo' },
          404: { description: 'La simulación no está habilitada' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Inicio de sesión para todos los roles (Pasajero, Chofer, Admin Empresa, Super Admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Login exitoso, devuelve tokens de acceso/renovación y perfil' },
          401: { description: 'Credenciales inválidas' },
          403: { description: 'Cuenta inactiva o correo pendiente de confirmación' },
        },
      },
    },
    '/auth/google': {
        post: {
          tags: ['Autenticación'],
          summary: 'Iniciar sesión en el panel con Google para una cuenta administrativa existente',
          description: 'Verifica el ID token de Google en el backend. Solo permite cuentas ADMIN_EMPRESA o SUPER_ADMIN existentes y requiere GOOGLE_CLIENT_ID.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['credential'],
                  properties: { credential: { type: 'string', description: 'ID token devuelto por Google Identity Services' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login exitoso, devuelve tokens de acceso/renovación y perfil administrativo' },
            403: { description: 'La cuenta Google no corresponde a una cuenta administrativa activa de SIT-Pay' },
            503: { description: 'Inicio con Google no configurado' },
          },
        },
    },
    '/auth/google/passenger': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión o registrar un pasajero con Google',
        description: 'Verifica el ID token con GOOGLE_CLIENT_ID. En la primera llamada, envía solo credential para consultar si necesita completar el registro. En la segunda, envía los datos consultados por DNI y los consentimientos aceptados.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['credential'],
                properties: {
                  credential: { type: 'string', description: 'ID token de Google' },
                  numeroDocumento: { type: 'string', pattern: '^\\d{8}$' },
                  nombres: { type: 'string' },
                  apellidos: { type: 'string' },
                  telefono: { type: 'string', nullable: true },
                  consentimientoDatos: { type: 'boolean' },
                  consentimientoConsultaDni: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cuenta existente autenticada o registro pendiente de completar' },
          201: { description: 'Cuenta de pasajero creada y autenticada' },
          400: { description: 'Datos incompletos, consentimientos faltantes o nombres que no coinciden con el DNI' },
          401: { description: 'Credencial de Google inválida o correo no verificado' },
          409: { description: 'El correo o DNI ya está registrado' },
          503: { description: 'Google OAuth o consulta DNI no configurados' },
        },
      },
    },
    '/auth/forgot-password': {
        post: {
          tags: ['Autenticación'],
          summary: 'Enviar código de recuperación al correo de la cuenta',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', format: 'email' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Respuesta genérica de recuperación enviada' },
            503: { description: 'El servicio SMTP no está disponible' },
          },
        },
    },
    '/auth/reset-password': {
        post: {
          tags: ['Autenticación'],
          summary: 'Cambiar contraseña con código de recuperación de un solo uso',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'token', 'newPassword'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    token: { type: 'string', pattern: '^\\d{6}$' },
                    newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
          responses: {
            200: { description: 'Contraseña actualizada; se revocan las sesiones de refresco existentes' },
            400: { description: 'Código inválido/expirado o contraseña no válida' },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registro público de pasajeros con verificación de identidad por DNI y consentimientos',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterPassengerRequest' } } } },
        responses: {
          201: { description: 'Cuenta creada como pendiente; no devuelve sesión hasta verificar el correo' },
          400: { description: 'Datos inválidos, nombres que no coinciden con el DNI o consentimiento denegado' },
          409: { description: 'El correo electrónico o DNI ya existe' },
          503: { description: 'Consulta de DNI no configurada' },
        },
      },
    },
    '/auth/lookup-dni': {
      post: {
        tags: ['Autenticación'],
        summary: 'Consultar nombre asociado a un DNI mediante Migo',
        description: 'El backend mantiene el token Migo fuera de la aplicación móvil y persiste la respuesta del proveedor en PostgreSQL. La consulta no equivale a una verificación oficial de identidad.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dni', 'consentimientoConsultaDni'],
                properties: {
                  dni: { type: 'string', pattern: '^\\d{8}$', example: '00000000' },
                  consentimientoConsultaDni: { type: 'boolean', enum: [true] },
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
        description: 'Devuelve la tarifa estimada. El pago posterior es una simulación sin cargo bancario real.',
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
          200: { description: 'Tarifa estimada; paymentMode es SIMULATED' },
          400: { description: 'Debe proporcionar la placa o el código QR' },
          404: { description: 'Vehículo o QR no encontrado' },
        },
      },
    },
    '/payments/pay/qr': {
      post: {
        tags: ['Pagos de Pasaje'],
        summary: 'Simular el pago por QR',
        description: 'Crea una transacción de prueba y una boleta. No se conecta a un banco ni cobra dinero real.',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentQRRequest' } } } },
        responses: {
          201: { description: 'Pago simulado y boleta creados' },
          400: { description: 'Faltan datos de la operación o la tarjeta' },
          404: { description: 'Vehículo o QR no encontrado' },
        },
      },
    },
    '/payments/pay/plate': {
      post: {
        tags: ['Pagos de Pasaje'],
        summary: 'Simular el pago por placa',
        description: 'Crea una transacción de prueba y una boleta. No se conecta a un banco ni cobra dinero real.',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentPlateRequest' } } } },
        responses: {
          201: { description: 'Pago simulado y boleta creados' },
          400: { description: 'Faltan datos de la operación o la tarjeta' },
          404: { description: 'Placa no registrada en el sistema SIT' },
        },
      },
    },
    '/payment-methods': {
      get: {
        tags: ['Pagos de Pasaje'],
        summary: 'Listar tarjetas ficticias del pasajero autenticado',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Tarjetas propias con datos enmascarados' } },
      },
      post: {
        tags: ['Pagos de Pasaje'],
        summary: 'Agregar una tarjeta ficticia de prueba',
        description: 'Solo acepta números de prueba que empiezan en 9999. El backend no persiste el número completo ni el CVV.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cardholder', 'cardNumber', 'expiryMonth', 'expiryYear', 'cvv'],
                properties: {
                  cardholder: { type: 'string', example: 'USUARIO DE PRUEBA' },
                  cardNumber: { type: 'string', example: '9999999999999999' },
                  expiryMonth: { type: 'integer', example: 12 },
                  expiryYear: { type: 'integer', example: 2030 },
                  cvv: { type: 'string', example: '123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Tarjeta de prueba creada y enmascarada' },
          400: { description: 'Datos inválidos o no corresponden a una tarjeta ficticia' },
        },
      },
    },
    '/payment-methods/{id}': {
      delete: {
        tags: ['Pagos de Pasaje'],
        summary: 'Eliminar una tarjeta ficticia propia',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Tarjeta eliminada' },
          404: { description: 'Tarjeta no encontrada' },
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
    '/vehicles': {
      get: {
        tags: ['Flota y Códigos QR'],
        summary: 'Listar vehículos activos; los administradores de empresa solo ven su propia flota',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Vehículos con placa, cuenca y asignación de chofer' } },
      },
    },
    '/claims': {
      get: {
        tags: ['Reclamos e Incidencias (Ley 29571)'],
        summary: 'Listar reclamos del destinatario autenticado',
        description: 'ADMIN_EMPRESA recibe solo reclamos para su empresa; SUPER_ADMIN recibe solo incidencias dirigidas al sistema.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Lista de reclamos con pasajero, empresa, vehículo, destinatario y estado' },
          403: { description: 'Rol no autorizado' },
        },
      },
      post: {
        tags: ['Reclamos e Incidencias (Ley 29571)'],
        summary: 'Crear reclamo para una empresa o incidencia para el sistema',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ClaimRequest' } } } },
        responses: { 201: { description: 'Reclamo formalmente registrado' } },
      },
    },
    '/claims/{id}/resolve': {
      put: {
        tags: ['Reclamos e Incidencias (Ley 29571)'],
        summary: 'Responder un reclamo que corresponde al destinatario autenticado',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['estado', 'respuesta'],
                properties: {
                  estado: { type: 'string', enum: ['RESUELTO', 'RECHAZADO', 'EN_REVISION'] },
                  respuesta: { type: 'string', minLength: 1, maxLength: 2000 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Respuesta registrada y notificada al pasajero' },
          400: { description: 'Estado o respuesta inválidos' },
          404: { description: 'Reclamo no encontrado para este destinatario' },
        },
      },
    },
    '/fares': {
      get: {
        tags: ['Tarifas (Ley 26271)'],
        summary: 'Listar tarifas activas para mostrar las tarifas vigentes en la app',
        security: [],
        responses: { 200: { description: 'Tarifas con tipo, monto y fechas de vigencia' } },
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
    '/company/drivers': {
      post: {
        tags: ['Administración de Empresa'],
        summary: 'Crear chofer y asignarle obligatoriamente un vehículo activo y disponible de su empresa',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'nombres', 'apellidos', 'dni', 'numeroLicencia', 'vehiculoId'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  nombres: { type: 'string' },
                  apellidos: { type: 'string' },
                  dni: { type: 'string', example: '40192837' },
                  numeroLicencia: { type: 'string' },
                  vehiculoId: { type: 'string', format: 'uuid', description: 'ID de la placa disponible seleccionada en la flota de la empresa' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Chofer creado y vinculado a la placa seleccionada' },
          409: { description: 'La placa ya está asignada a otro chofer' },
        },
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
