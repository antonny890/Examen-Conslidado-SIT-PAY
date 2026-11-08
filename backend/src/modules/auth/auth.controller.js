const crypto = require('node:crypto');
const { OAuth2Client } = require('google-auth-library');
const { FieldValue } = require('firebase-admin/firestore');
const { auth, db } = require('../../config/firebase');
const firebaseAuth = require('../../services/firebaseAuthService');
const {
  createUserAccount,
  deleteUserAccount,
  findUserByEmail,
} = require('../../services/userService');
const {
  DniProviderError,
  lookupDniName,
  parseDniName,
} = require('../../services/dniService');
const {
  sendPasswordResetCode,
  sendRegistrationVerificationCode,
} = require('../../services/emailService');

const googleOAuthClient = new OAuth2Client();
const COLLECTION = 'usuarios';
const PROFILES = 'perfiles';

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const getUserByEmail = findUserByEmail;

const getProfile = async (uid) => {
  const snapshot = await db.collection(PROFILES).doc(uid).get();
  return snapshot.exists ? snapshot.data() : null;
};

const saveDniLookup = async ({ dni, fullName, identity, userProvided = null, uid = null }) => {
  const dniHash = crypto.createHash('sha256').update(dni).digest('hex');
  const now = new Date();
  const providerData = {
    dni,
    nombre: fullName,
    nombres: identity.nombres,
    apellidos: identity.apellidos,
  };
  await db.collection('consultas_dni').doc(dniHash).set({
    numero_documento: dni,
    datos_proveedor: providerData,
    fuente: 'MIGO',
    estado_consulta: 'CONSULTADA',
    verificacion_oficial: false,
    consultado_at: now,
    ...(userProvided ? { datos_proporcionados: userProvided } : {}),
    ...(uid ? { usuario_id: uid } : {}),
    updated_at: now,
  }, { merge: true });

  return {
    fuente: 'MIGO',
    estado: 'CONSULTADA',
    verificacionOficial: false,
    consultadoAt: now,
    datosProveedor: providerData,
  };
};

const lookupIdentity = async (dni, userProvided, uid = null) => {
  const fullName = await lookupDniName(dni);
  const identity = parseDniName(fullName);
  const record = await saveDniLookup({ dni, fullName, identity, userProvided, uid });
  return { ...identity, fullName, record };
};

const namesMatch = (left, right) =>
  left.replaceAll('_', ' ').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-PE') ===
  right.replaceAll('_', ' ').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-PE');

const createAccount = createUserAccount;

const reserveDni = async (dni) => {
  const dniHash = crypto.createHash('sha256').update(dni).digest('hex');
  const reference = db.collection('consultas_dni').doc(dniHash);
  const reservationId = crypto.randomUUID();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists ? snapshot.data() : {};
    const reservationExpiresAt = current.reservation_expires_at?.toDate
      ? current.reservation_expires_at.toDate()
      : new Date(current.reservation_expires_at || 0);
    if (current.usuario_id ||
        (current.reservation_id && reservationExpiresAt.getTime() > Date.now())) {
      const conflict = new Error('DNI_ALREADY_REGISTERED');
      conflict.code = 'DNI_ALREADY_REGISTERED';
      throw conflict;
    }
    transaction.set(reference, {
      reservation_id: reservationId,
      reservation_expires_at: new Date(Date.now() + 30 * 60 * 1000),
      updated_at: new Date(),
    }, { merge: true });
  });
  return { reference, reservationId };
};

const releaseDniReservation = async ({ reference, reservationId }) => {
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists && snapshot.data().reservation_id === reservationId) {
      transaction.update(reference, {
        reservation_id: FieldValue.delete(),
        reservation_expires_at: FieldValue.delete(),
        updated_at: new Date(),
      });
    }
  });
};

const linkDniToUser = async ({ reference, reservationId, uid }) => {
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists || snapshot.data().reservation_id !== reservationId || snapshot.data().usuario_id) {
      const conflict = new Error('DNI_ALREADY_REGISTERED');
      conflict.code = 'DNI_ALREADY_REGISTERED';
      throw conflict;
    }
    transaction.update(reference, {
      usuario_id: uid,
      reservation_id: FieldValue.delete(),
      reservation_expires_at: FieldValue.delete(),
      updated_at: new Date(),
    });
  });
};

const issueSession = async (uid) => {
  const tokenResult = await firebaseAuth.signInWithCustomToken(uid);
  return {
    accessToken: tokenResult.idToken,
    refreshToken: tokenResult.refreshToken,
  };
};

const getSessionUser = async (user, picture = null) => {
  const profile = await getProfile(user.id);
  let company = null;
  let driverInfo = null;

  if (user.rol_codigo === 'ADMIN_EMPRESA') {
    const snapshot = await db.collection('empresas')
      .where('admin_usuario_id', '==', user.id)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      company = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
  } else if (user.rol_codigo === 'CHOFER') {
    const driverSnapshot = await db.collection('choferes')
      .where('usuario_id', '==', user.id)
      .limit(1)
      .get();
    if (!driverSnapshot.empty) {
      const driver = { id: driverSnapshot.docs[0].id, ...driverSnapshot.docs[0].data() };
      const [vehicleSnapshot, companySnapshot] = await Promise.all([
        driver.vehiculo_id
          ? db.collection('vehiculos').doc(driver.vehiculo_id).get()
          : Promise.resolve(null),
        driver.empresa_id
          ? db.collection('empresas').doc(driver.empresa_id).get()
          : Promise.resolve(null),
      ]);
      const vehicle = vehicleSnapshot?.exists
        ? { id: vehicleSnapshot.id, ...vehicleSnapshot.data() }
        : null;
      const companyData = companySnapshot?.exists ? companySnapshot.data() : null;
      let businessUnit = null;
      if (vehicle?.unidad_negocio_id) {
        const unitSnapshot = await db.collection('unidades_negocio').doc(vehicle.unidad_negocio_id).get();
        if (unitSnapshot.exists) businessUnit = unitSnapshot.data();
      }
      driverInfo = {
        chofer_id: driver.id,
        vehiculo_id: vehicle?.id || null,
        placa: vehicle?.placa || null,
        qr_codigo_seguro: vehicle?.qr_codigo_seguro || null,
        empresa_id: driver.empresa_id,
        empresa_nombre: companyData?.nombre_comercial || '',
        unidad_codigo: businessUnit?.codigo || '',
        unidad_nombre: businessUnit?.nombre || '',
      };
    }
  }

  return {
    id: user.id,
    email: user.email,
    rol: user.rol_codigo,
    rolNombre: user.rol_nombre || user.rol_codigo,
    nombres: profile?.nombres || '',
    apellidos: profile?.apellidos || '',
    fotoUrl: profile?.foto_url || picture || null,
    empresaId: company?.id || null,
    empresaNombre: company?.nombre_comercial || null,
    empresaActiva: company?.activo ?? null,
    estado: user.estado,
    emailVerificado: user.email_verificado === true,
    googleConnected: Boolean(user.google_subject),
    ...(driverInfo ? { choferInfo: driverInfo } : {}),
  };
};

const handleDniError = (error, res) => {
  if (!(error instanceof DniProviderError)) return false;
  res.status(error.status).json({
    success: false,
    ...(error.code ? { code: error.code } : {}),
    message: error.message,
  });
  return true;
};

const registerPassenger = async (req, res, next) => {
  try {
    const {
      email,
      password,
      nombres,
      apellidos,
      tipoDocumento,
      numeroDocumento,
      telefono,
      consentimientoDatos,
      consentimientoConsultaDni,
    } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const dni = typeof numeroDocumento === 'string' ? numeroDocumento.trim() : '';
    const submittedNames = typeof nombres === 'string' ? nombres.trim() : '';
    const submittedSurnames = typeof apellidos === 'string' ? apellidos.trim() : '';
    const phone = typeof telefono === 'string' ? telefono.trim() : '';

    if (!normalizedEmail || typeof password !== 'string' || !submittedNames || !submittedSurnames || !dni) {
      return res.status(400).json({ success: false, message: 'Todos los campos obligatorios deben ser completados.' });
    }
    if (normalizedEmail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Ingresa un correo electrónico válido.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (String(tipoDocumento || 'DNI').toUpperCase() !== 'DNI' || !/^\d{8}$/.test(dni) ||
        submittedNames.length > 100 || submittedSurnames.length > 100) {
      return res.status(400).json({ success: false, message: 'Ingresa un DNI válido y nombres completos.' });
    }
    if (phone && (!/^\+?[0-9\s()-]{6,20}$/.test(phone) || phone.length > 20)) {
      return res.status(400).json({ success: false, message: 'Ingresa un número de celular válido.' });
    }
    if (consentimientoDatos !== true || consentimientoConsultaDni !== true) {
      return res.status(400).json({ success: false, message: 'Debes aceptar el tratamiento de datos y autorizar la consulta DNI.' });
    }

    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      if (existing.rol_codigo === 'PASAJERO' && existing.email_verificado !== true) {
        try {
          await firebaseAuth.signInWithPassword(normalizedEmail, password);
          return res.status(201).json({
            success: true,
            message: 'Hay un registro pendiente. Continúa con la verificación.',
            data: { usuario: { id: existing.id, email: normalizedEmail, rol: 'PASAJERO', emailVerificado: false } },
          });
        } catch {
          return res.status(409).json({
            success: false,
            message: 'El correo electrónico ya se encuentra registrado o los datos no coinciden.',
          });
        }
      }
      return res.status(409).json({ success: false, message: 'El correo electrónico ya se encuentra registrado.' });
    }

    const identityHash = crypto.createHash('sha256').update(dni).digest('hex');
    const existingIdentity = await db.collection('consultas_dni').doc(identityHash).get();
    if (existingIdentity.exists && existingIdentity.data().usuario_id) {
      return res.status(409).json({ success: false, message: 'Este DNI ya está registrado en SIT-PAY.' });
    }

    let identity;
    try {
      identity = await lookupIdentity(dni, {
        nombres: submittedNames,
        apellidos: submittedSurnames,
      });
    } catch (error) {
      if (handleDniError(error, res)) return;
      throw error;
    }
    if (!namesMatch(submittedNames, identity.nombres) ||
        !namesMatch(submittedSurnames, identity.apellidos)) {
      return res.status(400).json({
        success: false,
        message: 'Los nombres no coinciden con los datos devueltos por el proveedor de DNI.',
      });
    }

    const reservation = await reserveDni(dni);
    let user;
    try {
      user = await createAccount({
        email: normalizedEmail,
        password,
        role: 'PASAJERO',
        emailVerified: false,
        profile: {
          nombres: identity.nombres,
          apellidos: identity.apellidos,
          tipo_documento: 'DNI',
          numero_documento: dni,
          telefono: phone || null,
          consentimiento_datos: true,
          fecha_consentimiento: new Date(),
          consentimiento_consulta_dni: true,
          fecha_consentimiento_consulta_dni: new Date(),
          identidad: {
            datos_proporcionados: { nombres: submittedNames, apellidos: submittedSurnames },
            datos_proveedor: identity.record.datosProveedor,
            fuente: identity.record.fuente,
            estado_consulta: identity.record.estado,
            verificacion_oficial: false,
            consultado_at: identity.record.consultadoAt,
          },
        },
      });
      await linkDniToUser({ ...reservation, uid: user.id });
    } catch (error) {
      if (user) await deleteUserAccount(user.id);
      await releaseDniReservation(reservation);
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'Registro creado. Confirma tu correo para activar la cuenta.',
      data: { usuario: { id: user.id, email: user.email, rol: 'PASAJERO', emailVerificado: false } },
    });
  } catch (error) {
    if (error.code === 'DNI_ALREADY_REGISTERED') {
      return res.status(409).json({ success: false, message: 'Este DNI ya está registrado en SIT-PAY.' });
    }
    if (error.code === 'auth/email-already-exists' || error.code === 'EMAIL_ALREADY_REGISTERED') {
      return res.status(409).json({ success: false, message: 'El correo electrónico ya se encuentra registrado.' });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, message: 'Debe ingresar correo y contraseña.' });
    }

    let tokenResult;
    try {
      tokenResult = await firebaseAuth.signInWithPassword(email, password);
    } catch (error) {
      if (error.firebaseCode === 'EMAIL_NOT_FOUND' || error.firebaseCode === 'INVALID_PASSWORD' ||
          error.firebaseCode === 'INVALID_LOGIN_CREDENTIALS') {
        return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
      }
      throw error;
    }

    const userSnapshot = await db.collection(COLLECTION).doc(tokenResult.localId).get();
    if (!userSnapshot.exists) {
      return res.status(403).json({ success: false, message: 'La cuenta no tiene un perfil activo en SIT-PAY.' });
    }
    const user = { id: userSnapshot.id, ...userSnapshot.data() };
    if (user.estado !== 'ACTIVO' || user.deleted_at) {
      return res.status(403).json({ success: false, message: 'La cuenta se encuentra inactiva o suspendida.' });
    }
    if (user.email_verificado !== true || tokenResult.emailVerified !== true) {
      return res.status(403).json({ success: false, message: 'Confirma tu correo electrónico para activar la cuenta.' });
    }

    await db.collection(COLLECTION).doc(user.id).update({ ultimo_login_at: new Date() });
    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      data: {
        usuario: await getSessionUser(user),
        tokens: { accessToken: tokenResult.idToken, refreshToken: tokenResult.refreshToken },
      },
    });
  } catch (error) {
    next(error);
  }
};

const verifyGoogleCredential = async (credential) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    const error = new Error('El inicio con Google no está configurado en el servidor.');
    error.statusCode = 503;
    throw error;
  }
  if (typeof credential !== 'string' || !credential) {
    const error = new Error('No se recibió la credencial de Google.');
    error.statusCode = 400;
    throw error;
  }
  const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: googleClientId });
  const account = ticket.getPayload();
  if (!account?.email || account.email_verified !== true) {
    const error = new Error('Google no pudo verificar el correo de esta cuenta.');
    error.statusCode = 401;
    throw error;
  }
  return account;
};

const loginWithGoogle = async (req, res, next) => {
  try {
    let googleAccount;
    try {
      googleAccount = await verifyGoogleCredential(req.body?.credential);
    } catch (error) {
      return res.status(error.statusCode || 401).json({ success: false, message: error.message });
    }
    const user = await getUserByEmail(googleAccount.email);
    if (!user || !['ADMIN_EMPRESA', 'SUPER_ADMIN'].includes(user.rol_codigo)) {
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta Google no está vinculada a un usuario administrativo de SIT-PAY.',
      });
    }
    if (user.estado !== 'ACTIVO' || user.deleted_at) {
      return res.status(403).json({ success: false, message: 'La cuenta administrativa está inactiva.' });
    }
    await auth.updateUser(user.id, { emailVerified: true });
    await db.collection(COLLECTION).doc(user.id).set({
      google_subject: googleAccount.sub,
      email_verificado: true,
      ultimo_login_at: new Date(),
      updated_at: new Date(),
    }, { merge: true });
    return res.json({
      success: true,
      message: 'Inicio de sesión con Google exitoso.',
      data: {
        usuario: await getSessionUser({
          ...user,
          google_subject: googleAccount.sub,
          email_verificado: true,
        }, googleAccount.picture),
        tokens: await issueSession(user.id),
      },
    });
  } catch (error) {
    next(error);
  }
};

const googlePassengerAuth = async (req, res, next) => {
  try {
    let googleAccount;
    try {
      googleAccount = await verifyGoogleCredential(req.body?.credential);
    } catch (error) {
      return res.status(error.statusCode || 401).json({ success: false, message: error.message });
    }
    const email = normalizeEmail(googleAccount.email);
    const existing = await getUserByEmail(email);
    if (existing) {
      if (existing.rol_codigo !== 'PASAJERO' || existing.estado !== 'ACTIVO' || existing.deleted_at) {
        return res.status(403).json({ success: false, message: 'Esta cuenta Google no puede iniciar sesión como pasajero.' });
      }
      if (existing.email_verificado !== true) {
        return res.status(403).json({ success: false, message: 'La cuenta requiere confirmar el correo electrónico.' });
      }
      await auth.updateUser(existing.id, { emailVerified: true });
      const update = { google_subject: googleAccount.sub, ultimo_login_at: new Date(), updated_at: new Date() };
      const profile = await getProfile(existing.id);
      if (!profile?.foto_url && googleAccount.picture) {
        await db.collection(PROFILES).doc(existing.id).set({ foto_url: googleAccount.picture }, { merge: true });
      }
      await db.collection(COLLECTION).doc(existing.id).set(update, { merge: true });
      return res.json({
        success: true,
        message: 'Inicio de sesión con Google exitoso.',
        data: {
          usuario: await getSessionUser({ ...existing, ...update }, googleAccount.picture),
          tokens: await issueSession(existing.id),
        },
      });
    }

    const {
      numeroDocumento,
      nombres,
      apellidos,
      telefono,
      consentimientoDatos,
      consentimientoConsultaDni,
    } = req.body;
    if (!numeroDocumento && !nombres && !apellidos && !telefono &&
        consentimientoDatos === undefined && consentimientoConsultaDni === undefined) {
      return res.json({
        success: true,
        data: { registrationRequired: true, email, nombres: googleAccount.given_name || '', apellidos: googleAccount.family_name || '' },
      });
    }
    const dni = typeof numeroDocumento === 'string' ? numeroDocumento.trim() : '';
    const submittedNames = typeof nombres === 'string' ? nombres.trim() : '';
    const submittedSurnames = typeof apellidos === 'string' ? apellidos.trim() : '';
    const phone = typeof telefono === 'string' ? telefono.trim() : '';
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ success: false, message: 'Ingresa un DNI válido de 8 dígitos.' });
    }
    if (consentimientoDatos !== true || consentimientoConsultaDni !== true) {
      return res.status(400).json({ success: false, message: 'Debes aceptar el tratamiento de datos y autorizar la consulta DNI.' });
    }
    if (phone && !/^\+?[0-9\s()-]{6,20}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Ingresa un número de celular válido.' });
    }

    const identityHash = crypto.createHash('sha256').update(dni).digest('hex');
    const existingIdentity = await db.collection('consultas_dni').doc(identityHash).get();
    if (existingIdentity.exists && existingIdentity.data().usuario_id) {
      return res.status(409).json({ success: false, message: 'Este DNI ya está registrado en SIT-PAY.' });
    }
    let identity;
    try {
      identity = await lookupIdentity(dni, { nombres: submittedNames, apellidos: submittedSurnames });
    } catch (error) {
      if (handleDniError(error, res)) return;
      throw error;
    }
    if (!namesMatch(submittedNames, identity.nombres) ||
        !namesMatch(submittedSurnames, identity.apellidos)) {
      return res.status(400).json({
        success: false,
        message: 'Los nombres no coinciden con los datos devueltos por el proveedor de DNI.',
      });
    }
    const reservation = await reserveDni(dni);
    let user;
    try {
      user = await createAccount({
        email,
        role: 'PASAJERO',
        emailVerified: true,
        googleSubject: googleAccount.sub,
        profile: {
          nombres: identity.nombres,
          apellidos: identity.apellidos,
          tipo_documento: 'DNI',
          numero_documento: dni,
          telefono: phone || null,
          foto_url: googleAccount.picture || null,
          consentimiento_datos: true,
          fecha_consentimiento: new Date(),
          consentimiento_consulta_dni: true,
          fecha_consentimiento_consulta_dni: new Date(),
          identidad: {
            datos_proporcionados: { nombres: submittedNames, apellidos: submittedSurnames },
            datos_proveedor: identity.record.datosProveedor,
            fuente: identity.record.fuente,
            estado_consulta: identity.record.estado,
            verificacion_oficial: false,
            consultado_at: identity.record.consultadoAt,
          },
        },
      });
      await linkDniToUser({ ...reservation, uid: user.id });
    } catch (error) {
      if (user) await deleteUserAccount(user.id);
      await releaseDniReservation(reservation);
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'Cuenta de pasajero creada con Google.',
      data: {
        usuario: await getSessionUser(user, googleAccount.picture),
        tokens: await issueSession(user.id),
      },
    });
  } catch (error) {
    if (error.code === 'DNI_ALREADY_REGISTERED') {
      return res.status(409).json({ success: false, message: 'Este DNI ya está registrado en SIT-PAY.' });
    }
    if (error.code === 'auth/email-already-exists' || error.code === 'EMAIL_ALREADY_REGISTERED') {
      return res.status(409).json({ success: false, message: 'El correo electrónico ya se encuentra registrado.' });
    }
    next(error);
  }
};

const refreshToken = async (req, res) => {
  const refreshTokenValue = req.body?.refreshToken;
  if (typeof refreshTokenValue !== 'string' || !refreshTokenValue) {
    return res.status(400).json({ success: false, message: 'Refresh token requerido.' });
  }
  try {
    const tokens = await firebaseAuth.refreshIdToken(refreshTokenValue);
    return res.json({
      success: true,
      message: 'Token renovado con éxito.',
      data: { tokens: { accessToken: tokens.id_token, refreshToken: tokens.refresh_token } },
    });
  } catch (error) {
    if (error.statusCode === 503) {
      return res.status(503).json({ success: false, message: error.message });
    }
    return res.status(401).json({ success: false, message: 'Refresh token inválido o expirado.' });
  }
};

const logout = async (req, res, next) => {
  try {
    await auth.revokeRefreshTokens(req.user.id);
    return res.json({ success: true, message: 'Sesión cerrada correctamente.' });
  } catch (error) {
    next(error);
  }
};

const requestRegistrationEmailCode = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Ingresa un correo electrónico válido.' });
    }
    const user = await getUserByEmail(email);
    if (!user || user.rol_codigo !== 'PASAJERO' || user.email_verificado === true) {
      return res.status(400).json({ success: false, message: 'No hay una cuenta pendiente de confirmación para este correo.' });
    }
    const now = new Date();
    const sentAt = user.email_verification_sent_at?.toDate
      ? user.email_verification_sent_at.toDate()
      : user.email_verification_sent_at
        ? new Date(user.email_verification_sent_at)
        : null;
    const elapsed = sentAt ? Math.floor((now.getTime() - sentAt.getTime()) / 1000) : 60;
    if (elapsed < 60) {
      return res.status(429).json({
        success: false,
        message: 'Espera antes de solicitar otro código.',
        retryAfterSeconds: 60 - elapsed,
      });
    }
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    await db.collection(COLLECTION).doc(user.id).update({
      email_verification_code_hash: codeHash,
      email_verification_expires_at: new Date(now.getTime() + 5 * 60 * 1000),
      email_verification_sent_at: now,
      email_verification_attempts: 0,
      updated_at: now,
    });
    try {
      await sendRegistrationVerificationCode({ to: email, code });
    } catch (error) {
      await db.collection(COLLECTION).doc(user.id).update({
        email_verification_code_hash: FieldValue.delete(),
        email_verification_expires_at: FieldValue.delete(),
        email_verification_sent_at: FieldValue.delete(),
        email_verification_attempts: 0,
      });
      throw error;
    }
    return res.json({
      success: true,
      message: 'Código de verificación enviado al correo.',
      data: { expiresInSeconds: 300, resendAfterSeconds: 60 },
    });
  } catch (error) {
    return next(error);
  }
};

const verifyRegistrationEmailCode = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Ingresa un correo válido y el código de 6 dígitos.' });
    }
    const user = await getUserByEmail(email);
    if (!user || user.rol_codigo !== 'PASAJERO' || user.email_verificado === true) {
      return res.status(400).json({ success: false, message: 'No hay una cuenta pendiente de confirmación para este correo.' });
    }
    if ((user.email_verification_attempts || 0) >= 5) {
      return res.status(429).json({ success: false, message: 'Se agotaron los intentos. Solicita un nuevo código.' });
    }
    const expiresAt = user.email_verification_expires_at?.toDate
      ? user.email_verification_expires_at.toDate()
      : new Date(user.email_verification_expires_at || 0);
    if (!user.email_verification_code_hash || expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'El código expiró. Solicita uno nuevo.' });
    }
    const expectedHash = Buffer.from(user.email_verification_code_hash, 'hex');
    const submittedHash = Buffer.from(crypto.createHash('sha256').update(code).digest('hex'), 'hex');
    if (expectedHash.length !== submittedHash.length || !crypto.timingSafeEqual(expectedHash, submittedHash)) {
      const attempts = (user.email_verification_attempts || 0) + 1;
      await db.collection(COLLECTION).doc(user.id).update({ email_verification_attempts: attempts });
      return res.status(attempts >= 5 ? 429 : 400).json({
        success: false,
        message: attempts >= 5
          ? 'Se agotaron los intentos. Solicita un nuevo código.'
          : `El código no es correcto. Intentos restantes: ${5 - attempts}.`,
      });
    }

    await auth.updateUser(user.id, { emailVerified: true });
    await db.collection(COLLECTION).doc(user.id).update({
      email_verificado: true,
      email_verification_code_hash: FieldValue.delete(),
      email_verification_expires_at: FieldValue.delete(),
      email_verification_sent_at: FieldValue.delete(),
      email_verification_attempts: 0,
      ultimo_login_at: new Date(),
      updated_at: new Date(),
    });
    const updatedUser = { ...user, email_verificado: true };
    return res.json({
      success: true,
      message: 'Correo confirmado. Tu cuenta está activa.',
      data: {
        usuario: await getSessionUser(updatedUser),
        tokens: await issueSession(user.id),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ success: false, message: 'Ingrese su correo electrónico.' });
    const user = await getUserByEmail(email);
    const genericMessage = 'Si el correo está registrado, se enviaron las instrucciones de recuperación.';
    if (!user) return res.json({ success: true, message: genericMessage });

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    await db.collection(COLLECTION).doc(user.id).update({
      token_recuperacion: codeHash,
      expiracion_recuperacion: new Date(Date.now() + 15 * 60 * 1000),
      updated_at: new Date(),
    });
    try {
      await sendPasswordResetCode({ to: email, code });
    } catch (error) {
      await db.collection(COLLECTION).doc(user.id).update({
        token_recuperacion: FieldValue.delete(),
        expiracion_recuperacion: FieldValue.delete(),
      });
      throw error;
    }
    return res.json({ success: true, message: genericMessage });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const token = String(req.body?.token || '');
    const newPassword = req.body?.newPassword;
    if (!email || !token || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
    }
    if (!/^\d{6}$/.test(token) || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'El código debe tener 6 dígitos y la contraseña nueva al menos 8 caracteres.' });
    }
    const user = await getUserByEmail(email);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiration = user?.expiracion_recuperacion?.toDate
      ? user.expiracion_recuperacion.toDate()
      : new Date(user?.expiracion_recuperacion || 0);
    if (!user || user.token_recuperacion !== tokenHash || expiration.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Código de recuperación inválido o expirado.' });
    }

    await auth.updateUser(user.id, { password: newPassword });
    await auth.revokeRefreshTokens(user.id);
    await db.collection(COLLECTION).doc(user.id).update({
      token_recuperacion: FieldValue.delete(),
      expiracion_recuperacion: FieldValue.delete(),
      updated_at: new Date(),
    });
    return res.json({ success: true, message: 'Contraseña restablecida exitosamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  forgotPassword,
  googlePassengerAuth,
  login,
  loginWithGoogle,
  logout,
  refreshToken,
  registerPassenger,
  requestRegistrationEmailCode,
  resetPassword,
  verifyRegistrationEmailCode,
};
