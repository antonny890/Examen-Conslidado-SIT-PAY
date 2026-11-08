const crypto = require('node:crypto');
const db = require('../config/postgres');
const { auth } = require('./supabaseAuthService');

const ROLES = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN_EMPRESA: 'Administrador de Empresa',
  CHOFER: 'Chofer',
  PASAJERO: 'Pasajero',
};

const findUserByEmail = async (email) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  return db('usuarios')
    .where({ email: normalizedEmail })
    .whereNull('deleted_at')
    .first();
};

const createUserAccount = async ({
  email,
  password,
  role,
  profile,
  emailVerified = false,
  status = 'ACTIVO',
  googleSubject = null,
}) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const roleRow = await db('roles').where({ codigo: role }).first();
  if (!roleRow) throw new Error(`El rol ${role} no existe en PostgreSQL.`);

  const authUser = await auth.createUser({
    email: normalizedEmail,
    password,
    emailVerified,
  });
  const now = new Date();
  const userDocument = {
    id: authUser.uid,
    email: normalizedEmail,
    rol_id: roleRow.id,
    rol_codigo: role,
    rol_nombre: roleRow.nombre || ROLES[role],
    estado: status,
    email_verificado: emailVerified,
    google_connected: Boolean(googleSubject),
    created_at: now,
    updated_at: now,
  };
  const emailIndex = {
    id: crypto.createHash('sha256').update(normalizedEmail).digest('hex'),
    usuario_id: authUser.uid,
    email: normalizedEmail,
    created_at: now,
    updated_at: now,
  };

  try {
    await db.transaction(async (trx) => {
      await trx('usuarios').insert(userDocument);
      await trx('perfiles').insert({
        ...profile,
        id: authUser.uid,
        usuario_id: authUser.uid,
        created_at: now,
        updated_at: now,
      });
      await trx('indice_emails').insert(emailIndex);
    });
  } catch (error) {
    await auth.deleteUser(authUser.uid);
    if (error.code === '23505') {
      const conflict = new Error('EMAIL_ALREADY_REGISTERED');
      conflict.code = 'EMAIL_ALREADY_REGISTERED';
      throw conflict;
    }
    throw error;
  }
  return userDocument;
};

const deleteUserAccount = async (uid) => {
  await auth.deleteUser(uid);
};

module.exports = { createUserAccount, deleteUserAccount, findUserByEmail };
