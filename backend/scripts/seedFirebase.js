require('dotenv').config();
const { db } = require('../src/config/firebase');
const { createUserAccount, findUserByEmail } = require('../src/services/userService');

const businessUnits = [
  ['C2', 'Cono Norte - Cerro Colorado', 'Rutas troncales y alimentadoras Cono Norte hacia el Cercado', '#E53E3E'],
  ['C3', 'Cayma', 'Cuenca Cayma Alta, Enace, Francisco Bolognesi hacia el Centro', '#DD6B20'],
  ['C4', 'Selva Alegre - Miraflores', 'Cuenca Alto Selva Alegre y Miraflores histórico', '#D69E2E'],
  ['C5', 'Mariano Melgar', 'Cuenca Mariano Melgar y Generalísimo San Martín hacia el Cercado', '#38A169'],
  ['C6', 'Paucarpata - Miguel Grau', 'Zona alta de Paucarpata, Ciudad de Dios y Miguel Grau', '#319795'],
  ['C7', 'Paucarpata - Ciudad Blanca', 'Zona baja y central de Paucarpata y Ciudad Blanca', '#3182CE'],
  ['C8', 'Sabandía - Characato', 'Cuenca campiña sur: Sabandía, Characato y Mollebaya', '#00B4D8'],
  ['C9', 'Socabaya - J.L.B.R.', 'Cuenca Socabaya, 4 de Octubre, Lara y José Luis Bustamante y Rivero', '#805AD5'],
  ['C10', 'Hunter - Sachaca - Tiabaya', 'Cuenca Jacobo Hunter, Sachaca, Arancota y Tiabaya', '#D53F8C'],
  ['C11', 'Pachacútec - Cerro Colorado', 'Zona periférica Pachacútec, Ciudad Municipal y Vía de Evitamiento', '#4A5568'],
];

const requireInitialAdmin = () => {
  const required = [
    'INITIAL_SUPER_ADMIN_EMAIL',
    'INITIAL_SUPER_ADMIN_PASSWORD',
    'INITIAL_SUPER_ADMIN_NAMES',
    'INITIAL_SUPER_ADMIN_SURNAMES',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Configure estas variables antes de ejecutar el seed: ${missing.join(', ')}`);
  }
  if (process.env.INITIAL_SUPER_ADMIN_PASSWORD.length < 8) {
    throw new Error('INITIAL_SUPER_ADMIN_PASSWORD debe tener al menos 8 caracteres.');
  }
};

const seed = async () => {
  requireInitialAdmin();
  const now = new Date();
  for (const [code, name, description, color] of businessUnits) {
    const reference = db.collection('unidades_negocio').doc(code);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      await reference.create({
        codigo: code,
        nombre,
        descripcion: description,
        color_identificador: color,
        created_at: now,
        updated_at: now,
      });
    }
  }

  const fares = [
    {
      id: 'normal',
      nombre: 'Tarifa Normal',
      tipo_pasajero: 'NORMAL',
      monto: 1.00,
      porcentaje_descuento: 0,
      hora_inicio: '00:00:00',
      hora_fin: '23:59:59',
      dias_semana_aplicables: ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'],
      solo_dias_laborables: false,
      vigencia_inicio: new Date().toISOString().slice(0, 10),
      activo: true,
    },
    {
      id: 'universitaria',
      nombre: 'Medio Pasaje Universitario (Ley 26271: 5:00 a 24:00)',
      tipo_pasajero: 'UNIVERSITARIA',
      monto: 0.50,
      porcentaje_descuento: 50,
      hora_inicio: '05:00:00',
      hora_fin: '23:59:59',
      dias_semana_aplicables: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'],
      solo_dias_laborables: true,
      vigencia_inicio: new Date().toISOString().slice(0, 10),
      activo: true,
    },
  ];
  for (const { id, ...fare } of fares) {
    const reference = db.collection('tarifas').doc(id);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      await reference.create({ ...fare, created_at: now, updated_at: now });
    }
  }

  const email = process.env.INITIAL_SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.rol_codigo !== 'SUPER_ADMIN') {
      throw new Error('El correo configurado ya existe y no pertenece a SUPER_ADMIN.');
    }
    console.log('La cuenta inicial SUPER_ADMIN ya existe; no se modificó.');
    return;
  }
  await createUserAccount({
    email,
    password: process.env.INITIAL_SUPER_ADMIN_PASSWORD,
    role: 'SUPER_ADMIN',
    emailVerified: true,
    profile: {
      nombres: process.env.INITIAL_SUPER_ADMIN_NAMES.trim(),
      apellidos: process.env.INITIAL_SUPER_ADMIN_SURNAMES.trim(),
      tipo_documento: null,
      numero_documento: null,
      telefono: null,
      consentimiento_datos: true,
      fecha_consentimiento: now,
    },
  });
  console.log('Se crearon las unidades de negocio, tarifas base y la cuenta inicial SUPER_ADMIN.');
};

seed().catch((error) => {
  console.error('No se pudo completar el seed de Firebase:', error.message);
  process.exitCode = 1;
});
