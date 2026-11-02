/**
 * Semilla Inicial (Seed) para SIT-Pay Arequipa
 * Datos de prueba 100% ficticios para entorno académico (Universidad Continental).
 *
 * Contraseñas por defecto para todas las cuentas de prueba: "SitPay2026!"
 * Hash bcrypt pré-calculado: $2b$10$OI/MyxlvAqDcpnm7cWMw8.eoCe08PG6YX92i5KtJExTesC6KqWZJO
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Limpieza en cascada en orden inverso de dependencias
  await knex('auditoria_logs').del();
  await knex('notificaciones').del();
  await knex('incidencias_reclamos').del();
  await knex('solicitudes_preferenciales').del();
  await knex('transacciones').del();
  await knex('tarifas').del();
  await knex('choferes').del();
  await knex('vehiculos').del();
  await knex('empresas').del();
  await knex('unidades_negocio').del();
  await knex('perfiles').del();
  await knex('usuarios').del();
  await knex('roles').del();

  // 1. Roles del Sistema (RBAC)
  const [rolSuperAdmin, rolAdminEmpresa, rolChofer, rolPasajero] = await knex('roles')
    .insert([
      { id: 1, codigo: 'SUPER_ADMIN', nombre: 'Super Administrador del SIT', descripcion: 'Gestión global de empresas, tarifas y fiscalización' },
      { id: 2, codigo: 'ADMIN_EMPRESA', nombre: 'Administrador de Empresa', descripcion: 'Gestión de flota, choferes, recaudación y reclamos de la empresa' },
      { id: 3, codigo: 'CHOFER', nombre: 'Chofer de Transporte Urbano', descripcion: 'Recepción pasiva de confirmación de pago sin distracciones' },
      { id: 4, codigo: 'PASAJERO', nombre: 'Pasajero de Transporte Público', descripcion: 'Pago directo por QR/placa y solicitud de medio pasaje' },
    ])
    .returning('*');

  // 2. Las 10 Unidades de Negocio (Cuencas del SIT Arequipa: C2 a C11)
  const unidadesNegocioData = [
    { id: 2, codigo: 'C2', nombre: 'Cono Norte - Cerro Colorado', descripcion: 'Rutas troncales y alimentadoras Cono Norte hacia el Cercado', color_identificador: '#E53E3E' },
    { id: 3, codigo: 'C3', nombre: 'Cayma', descripcion: 'Cuenca Cayma Alta, Enace, Francisco Bolognesi hacia el Centro', color_identificador: '#DD6B20' },
    { id: 4, codigo: 'C4', nombre: 'Selva Alegre - Miraflores', descripcion: 'Cuenca Alto Selva Alegre y Miraflores histórico', color_identificador: '#D69E2E' },
    { id: 5, codigo: 'C5', nombre: 'Mariano Melgar', descripcion: 'Cuenca Mariano Melgar, Generalísimo San Martín hacia el Cercado', color_identificador: '#38A169' },
    { id: 6, codigo: 'C6', nombre: 'Paucarpata - Miguel Grau', descripcion: 'Zona alta de Paucarpata, Ciudad de Dios, Miguel Grau', color_identificador: '#319795' },
    { id: 7, codigo: 'C7', nombre: 'Paucarpata - Ciudad Blanca', descripcion: 'Zona baja y central de Paucarpata y Ciudad Blanca', color_identificador: '#3182CE' },
    { id: 8, codigo: 'C8', nombre: 'Sabandía - Characato', descripcion: 'Cuenca campiña sur: Sabandía, Characato, Mollebaya', color_identificador: '#00B4D8' },
    { id: 9, codigo: 'C9', nombre: 'Socabaya - J.L.B.R.', descripcion: 'Cuenca Socabaya, 4 de Octubre, Lara y José Luis Bustamante y Rivero', color_identificador: '#805AD5' },
    { id: 10, codigo: 'C10', nombre: 'Hunter - Sachaca - Tiabaya', descripcion: 'Cuenca Jacobo Hunter, Sachaca, Arancota y Tiabaya', color_identificador: '#D53F8C' },
    { id: 11, codigo: 'C11', nombre: 'Pachacútec - Cerro Colorado', descripcion: 'Zona periférica Pachacútec, Ciudad Municipal, Vía de Evitamiento', color_identificador: '#4A5568' },
  ];
  await knex('unidades_negocio').insert(unidadesNegocioData);

  // 3. Empresas de Ejemplo Ilustrativas (Sin marcas reales)
  const empresasData = [
    {
      id: 'e1000000-0000-0000-0000-000000000001',
      ruc: '20458912341',
      razon_social: 'Transcayma Operadora de Transporte S.A.',
      nombre_comercial: 'Transcayma',
      direccion: 'Av. Bolognesi 412, Cayma, Arequipa',
      telefono: '054-254190',
      email_contacto: 'contacto@transcayma-ficticio.pe',
      activo: true,
    },
    {
      id: 'e2000000-0000-0000-0000-000000000002',
      ruc: '20601234562',
      razon_social: 'Consorcio AQP Masivo S.A.C.',
      nombre_comercial: 'AQP Masivo',
      direccion: 'Vía de Evitamiento Km 3.5, Cerro Colorado, Arequipa',
      telefono: '054-441298',
      email_contacto: 'operaciones@aqpmasivo-ficticio.pe',
      activo: true,
    },
    {
      id: 'e3000000-0000-0000-0000-000000000003',
      ruc: '20519876543',
      razon_social: 'Empresa de Transportes Unión AQP S.A.',
      nombre_comercial: 'Unión AQP',
      direccion: 'Av. Kennedy 1105, Paucarpata, Arequipa',
      telefono: '054-329871',
      email_contacto: 'administracion@unionaquipa-ficticio.pe',
      activo: true,
    },
  ];
  await knex('empresas').insert(empresasData);

  // 4. Tarifas configurables: normal para todas las personas y universitaria acreditada
  const diasHabiles = JSON.stringify(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']);
  const todosLosDias = JSON.stringify(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']);

  await knex('tarifas').insert([
    {
      id: 1,
      nombre: 'Tarifa Normal',
      tipo_pasajero: 'NORMAL',
      monto: 1.00,
      porcentaje_descuento: 0.0,
      hora_inicio: '00:00:00',
      hora_fin: '23:59:59',
      dias_semana_aplicables: todosLosDias,
      solo_dias_laborables: false,
      vigencia_inicio: '2026-01-01',
      activo: true,
    },
    {
      id: 2,
      nombre: 'Medio Pasaje Universitario (Ley 26271: 5:00 a 24:00)',
      tipo_pasajero: 'UNIVERSITARIA',
      monto: 0.50,
      porcentaje_descuento: 50.0,
      hora_inicio: '05:00:00',
      hora_fin: '23:59:59',
      dias_semana_aplicables: diasHabiles,
      solo_dias_laborables: true,
      vigencia_inicio: '2026-01-01',
      activo: true,
    },
  ]);

  // Hash estándar para contraseña "SitPay2026!"
  const passwordHash = '$2b$10$OI/MyxlvAqDcpnm7cWMw8.eoCe08PG6YX92i5KtJExTesC6KqWZJO';

  // 5. Usuarios y Perfiles
  const usuariosData = [
    // Super Administrador (Municipalidad Provincial de Arequipa / MPA - SIT)
    { id: 'u0000000-0000-0000-0000-000000000001', email: 'superadmin@sitpay.gob.pe', password_hash: passwordHash, rol_id: 1, email_verificado: true },
    // Administrador de Empresa (Transcayma)
    { id: 'u0000000-0000-0000-0000-000000000002', email: 'admin.transcayma@sitpay.gob.pe', password_hash: passwordHash, rol_id: 2, email_verificado: true },
    // Chofer 1 (Transcayma)
    { id: 'u0000000-0000-0000-0000-000000000003', email: 'chofer.carlos@sitpay.gob.pe', password_hash: passwordHash, rol_id: 3, email_verificado: true },
    // Chofer 2 (AQP Masivo)
    { id: 'u0000000-0000-0000-0000-000000000004', email: 'chofer.manuel@sitpay.gob.pe', password_hash: passwordHash, rol_id: 3, email_verificado: true },
    // Chofer 3 (Unión AQP)
    { id: 'u0000000-0000-0000-0000-000000000005', email: 'chofer.juan@sitpay.gob.pe', password_hash: passwordHash, rol_id: 3, email_verificado: true },
    // Pasajero Regular
    { id: 'u0000000-0000-0000-0000-000000000006', email: 'pasajero.pedro@gmail.com', password_hash: passwordHash, rol_id: 4, email_verificado: true },
    // Pasajero Universitario (Universidad Continental)
    { id: 'u0000000-0000-0000-0000-000000000007', email: 'lucia.continental@continental.edu.pe', password_hash: passwordHash, rol_id: 4, email_verificado: true },
    // Pasajero regular de demostración
    { id: 'u0000000-0000-0000-0000-000000000008', email: 'rodrigo.escolar@gmail.com', password_hash: passwordHash, rol_id: 4, email_verificado: true },
  ];
  await knex('usuarios').insert(usuariosData);

  // Vincular admin de empresa en tabla empresas
  await knex('empresas')
    .where('id', 'e1000000-0000-0000-0000-000000000001')
    .update({ admin_usuario_id: 'u0000000-0000-0000-0000-000000000002' });

  // 6. Perfiles (Bajo Ley 29733 de Datos Personales con consentimiento explícito)
  const perfilesData = [
    { usuario_id: 'u0000000-0000-0000-0000-000000000001', nombres: 'Hernán', apellidos: 'Peralta Mendoza', tipo_documento: 'DNI', numero_documento: '29481920', telefono: '958123456', foto_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', consentimiento_datos: true, fecha_consentimiento: '2026-01-10 08:30:00' },
    { usuario_id: 'u0000000-0000-0000-0000-000000000002', nombres: 'Gabriela', apellidos: 'Torres Valdivia', tipo_documento: 'DNI', numero_documento: '41298451', telefono: '959987654', foto_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', consentimiento_datos: true, fecha_consentimiento: '2026-01-12 09:15:00' },
    { usuario_id: 'u0000000-0000-0000-0000-000000000003', nombres: 'Carlos', apellidos: 'Vilca Mamani', tipo_documento: 'DNI', numero_documento: '40192837', telefono: '954321678', foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', consentimiento_datos: true, fecha_consentimiento: '2026-01-15 10:00:00' },
    { usuario_id: 'u0000000-0000-0000-0000-000000000004', nombres: 'Manuel', apellidos: 'Quispe Chambi', tipo_documento: 'DNI', numero_documento: '42891045', telefono: '957123987', foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', consentimiento_datos: true, fecha_consentimiento: '2026-01-16 11:20:00' },
    { usuario_id: 'u0000000-0000-0000-0000-000000000005', nombres: 'Juan', apellidos: 'Condori Apaza', tipo_documento: 'DNI', numero_documento: '45129834', telefono: '956654321', foto_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', consentimiento_datos: true, fecha_consentimiento: '2026-01-17 14:10:00' },
    { usuario_id: 'u0000000-0000-0000-0000-000000000006', nombres: 'Pedro', apellidos: 'Arenas Begazo', tipo_documento: 'DNI', numero_documento: '72918234', telefono: '954789123', foto_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', consentimiento_datos: true, fecha_consentimiento: '2026-02-01 16:45:00' },
    { usuario_id: 'u0000000-0000-0000-0000-000000000007', nombres: 'Lucía', apellidos: 'Flores Zeballos', tipo_documento: 'DNI', numero_documento: '74129856', telefono: '952345678', foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', consentimiento_datos: true, fecha_consentimiento: '2026-02-05 18:20:00' },
    { usuario_id: 'u0000000-0000-0000-0000-000000000008', nombres: 'Rodrigo', apellidos: 'Pinto Cáceres', tipo_documento: 'DNI', numero_documento: '76541298', telefono: '951987321', foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', consentimiento_datos: true, fecha_consentimiento: '2026-02-10 12:00:00' },
  ];
  await knex('perfiles').insert(perfilesData);

  // 7. Vehículos con QR único y seguro (identificador opaco)
  const vehiculosData = [
    {
      id: 'v1000000-0000-0000-0000-000000000001',
      placa: 'V7A-890',
      empresa_id: 'e1000000-0000-0000-0000-000000000001', // Transcayma
      unidad_negocio_id: 3, // C3 Cayma
      modelo: 'Mercedes-Benz LO 915 Urbano',
      anio_fabricacion: 2022,
      capacidad_pasajeros: 32,
      qr_codigo_seguro: 'SIT-VEH-V7A890-7F89C1D4E2',
      activo: true,
    },
    {
      id: 'v2000000-0000-0000-0000-000000000002',
      placa: 'V8B-123',
      empresa_id: 'e2000000-0000-0000-0000-000000000002', // AQP Masivo
      unidad_negocio_id: 2, // C2 Cono Norte
      modelo: 'Volkswagen 9.160 OD',
      anio_fabricacion: 2023,
      capacidad_pasajeros: 36,
      qr_codigo_seguro: 'SIT-VEH-V8B123-A4B5C6D7E8',
      activo: true,
    },
    {
      id: 'v3000000-0000-0000-0000-000000000003',
      placa: 'V9C-456',
      empresa_id: 'e3000000-0000-0000-0000-000000000003', // Unión AQP
      unidad_negocio_id: 6, // C6 Paucarpata
      modelo: 'Hyundai County HD',
      anio_fabricacion: 2021,
      capacidad_pasajeros: 29,
      qr_codigo_seguro: 'SIT-VEH-V9C456-1122334455',
      activo: true,
    },
  ];
  await knex('vehiculos').insert(vehiculosData);

  // 8. Choferes vinculados a UNA placa fija
  const choferesData = [
    {
      id: 'c1000000-0000-0000-0000-000000000001',
      usuario_id: 'u0000000-0000-0000-0000-000000000003', // Carlos
      empresa_id: 'e1000000-0000-0000-0000-000000000001', // Transcayma
      vehiculo_id: 'v1000000-0000-0000-0000-000000000001', // V7A-890
      numero_licencia: 'Q40192837',
      categoria_licencia: 'A-IIIa',
      estado_operativo: 'EN_RUTA',
    },
    {
      id: 'c2000000-0000-0000-0000-000000000002',
      usuario_id: 'u0000000-0000-0000-0000-000000000004', // Manuel
      empresa_id: 'e2000000-0000-0000-0000-000000000002', // AQP Masivo
      vehiculo_id: 'v2000000-0000-0000-0000-000000000002', // V8B-123
      numero_licencia: 'Q42891045',
      categoria_licencia: 'A-IIIa',
      estado_operativo: 'EN_RUTA',
    },
    {
      id: 'c3000000-0000-0000-0000-000000000003',
      usuario_id: 'u0000000-0000-0000-0000-000000000005', // Juan
      empresa_id: 'e3000000-0000-0000-0000-000000000003', // Unión AQP
      vehiculo_id: 'v3000000-0000-0000-0000-000000000003', // V9C-456
      numero_licencia: 'Q45129834',
      categoria_licencia: 'A-IIb',
      estado_operativo: 'DISPONIBLE',
    },
  ];
  await knex('choferes').insert(choferesData);

  // 9. Solicitudes de Acreditación Preferencial (Ley 26271)
  await knex('solicitudes_preferenciales').insert([
    // Lucía: Acreditada vía correo institucional .edu.pe (APROBADA)
    {
      id: 's1000000-0000-0000-0000-000000000001',
      usuario_id: 'u0000000-0000-0000-0000-000000000007',
      tipo_preferencial: 'UNIVERSITARIA',
      institucion_educativa: 'Universidad Continental - Filial Arequipa',
      metodo_verificacion: 'CORREO_INSTITUCIONAL',
      correo_institucional: 'lucia.continental@continental.edu.pe',
      estado: 'APROBADA',
      revisor_usuario_id: null,
      observacion_revision: 'Acreditación automática validada mediante código en correo institucional.',
      fecha_vencimiento: '2026-12-31',
      fecha_revision_at: '2026-02-05 18:25:00',
    },
  ]);

  // 10. Reclamo de Ejemplo (Ley 29571), sin asociarlo a un pago simulado.
  await knex('incidencias_reclamos').insert([
    {
      id: 'rec10000-0000-0000-0000-000000000001',
      codigo_reclamo: 'REC-20261030-0001',
      usuario_id: 'u0000000-0000-0000-0000-000000000008', // Escolar Rodrigo
      transaccion_id: null,
      empresa_id: 'e2000000-0000-0000-0000-000000000002', // AQP Masivo
      tipo_incidencia: 'NEGATIVA_MEDIO_PASAJE',
      descripcion: 'La solicitud escolar está pendiente de revisión por el administrador.',
      estado: 'REGISTRADO',
    },
  ]);

  // 11. Log Inicial de Auditoría
  await knex('auditoria_logs').insert([
    {
      usuario_id: 'u0000000-0000-0000-0000-000000000001',
      accion: 'SISTEMA_INICIALIZADO',
      modulo: 'CONFIGURACION',
      ip_address: '127.0.0.1',
      user_agent: 'Knex Seeder / SIT-Pay Arequipa',
      valores_nuevos: JSON.stringify({
        unidades_negocio: 10,
        empresas: 3,
        vehiculos: 3,
        tarifas: 3,
        entorno: 'Academico - Univ Continental',
      }),
    },
  ]);
};
