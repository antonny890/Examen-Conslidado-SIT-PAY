const crypto = require('node:crypto');
const { auth, db } = require('../config/firebase');

const ROLES = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN_EMPRESA: 'Administrador de Empresa',
  CHOFER: 'Chofer',
  PASAJERO: 'Pasajero',
};

const findUserByEmail = async (email) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const snapshot = await db.collection('usuarios')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

const createUserAccount = async ({
  email,
  password,
  role,
  profile,
  emailVerified = false,
  googleSubject = null,
  status = 'ACTIVO',
}) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const now = new Date();
  const authUser = await auth.createUser({
    email: normalizedEmail,
    ...(password ? { password } : {}),
    emailVerified,
    disabled: status !== 'ACTIVO',
  });
  const userDocument = {
    email: normalizedEmail,
    rol_codigo: role,
    rol_nombre: ROLES[role],
    estado: status,
    email_verificado: emailVerified,
    google_subject: googleSubject,
    created_at: now,
    updated_at: now,
  };
  const emailRef = db.collection('indice_emails')
    .doc(crypto.createHash('sha256').update(normalizedEmail).digest('hex'));

  try {
    await db.runTransaction(async (transaction) => {
      const emailSnapshot = await transaction.get(emailRef);
      if (emailSnapshot.exists) {
        const conflict = new Error('EMAIL_ALREADY_REGISTERED');
        conflict.code = 'EMAIL_ALREADY_REGISTERED';
        throw conflict;
      }
      transaction.create(db.collection('usuarios').doc(authUser.uid), userDocument);
      transaction.create(db.collection('perfiles').doc(authUser.uid), {
        ...profile,
        usuario_id: authUser.uid,
        created_at: now,
        updated_at: now,
      });
      transaction.create(emailRef, { usuario_id: authUser.uid, email: normalizedEmail });
    });
  } catch (error) {
    await auth.deleteUser(authUser.uid);
    throw error;
  }
  return { id: authUser.uid, ...userDocument };
};

const deleteUserAccount = async (uid) => {
  const userSnapshot = await db.collection('usuarios').doc(uid).get();
  const email = userSnapshot.exists ? userSnapshot.data().email : null;
  const batch = db.batch();
  batch.delete(db.collection('usuarios').doc(uid));
  batch.delete(db.collection('perfiles').doc(uid));
  if (email) {
    batch.delete(db.collection('indice_emails')
      .doc(crypto.createHash('sha256').update(email).digest('hex')));
  }
  await batch.commit();
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }
};

module.exports = { createUserAccount, deleteUserAccount, findUserByEmail };
