const { auth } = require('../../services/supabaseAuthService');
const { db } = require('../../services/postgresData');
const {
  createDocument,
  getDocument,
  listCollection,
  queryCollection,
  timestampToDate,
  writeAuditLog,
} = require('../../services/postgresData');
const { createUserAccount, deleteUserAccount, findUserByEmail } = require('../../services/userService');

const amount = (value) => Number(value || 0);
const usersCollection = 'usuarios';
const companiesCollection = 'empresas';
const byNewest = (left, right) =>
  (timestampToDate(right.created_at)?.getTime() || 0) -
  (timestampToDate(left.created_at)?.getTime() || 0);

const getGlobalDashboard = async (req, res, next) => {
  try {
    const [transactions, users, companies, vehicles, preferences] = await Promise.all([
      listCollection('transacciones'),
      listCollection(usersCollection),
      listCollection(companiesCollection),
      listCollection('vehiculos'),
      listCollection('solicitudes_preferenciales'),
    ]);
    const successful = transactions.filter((record) =>
      record.estado === 'EXITOSA' && record.pago_simulado !== true);
    const today = new Date().toISOString().slice(0, 10);
    const todayTransactions = successful.filter((record) =>
      timestampToDate(record.fecha_pago)?.toISOString().slice(0, 10) === today,
    );
    const grouped = new Map();
    successful.forEach((record) => {
      const type = record.tipo_tarifa_aplicada || 'SIN_TIPO';
      const group = grouped.get(type) || { tipo_tarifa_aplicada: type, cantidad: 0, total: 0 };
      group.cantidad += 1;
      group.total += amount(record.monto);
      grouped.set(type, group);
    });
    return res.json({
      success: true,
      data: {
        recaudacionHoy: {
          monto: todayTransactions.reduce((sum, record) => sum + amount(record.monto), 0),
          pasajes: todayTransactions.length,
        },
        recaudacionHistorica: {
          monto: successful.reduce((sum, record) => sum + amount(record.monto), 0),
          pasajes: successful.length,
        },
        distribucionFiscalizacion: [...grouped.values()],
        metricas: {
          totalUsuarios: users.length,
          totalEmpresas: companies.length,
          totalVehiculos: vehicles.filter((vehicle) => vehicle.activo === true).length,
          totalSolicitudesPendientes: preferences.filter((request) => request.estado === 'PENDIENTE').length,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getCompanies = async (req, res, next) => {
  try {
    const companies = (await listCollection(companiesCollection))
      .sort((left, right) => String(left.nombre_comercial).localeCompare(String(right.nombre_comercial)));
    const data = await Promise.all(companies.map(async (company) => {
      const [administrator, profile] = company.admin_usuario_id
        ? await Promise.all([
          getDocument(usersCollection, company.admin_usuario_id),
          getDocument('perfiles', company.admin_usuario_id),
        ])
        : [null, null];
      return {
        ...company,
        admin_email: administrator?.email || null,
        admin_nombres: profile?.nombres || null,
        admin_apellidos: profile?.apellidos || null,
      };
    }));
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const { ruc, razonSocial, nombreComercial, direccion, telefono, emailContacto } = req.body || {};
    if (!ruc || !razonSocial || !nombreComercial || !emailContacto) {
      return res.status(400).json({ success: false, message: 'RUC, Razón Social, Nombre Comercial y Correo son obligatorios.' });
    }
    const cleanRuc = String(ruc).trim();
    const cleanEmail = String(emailContacto).trim().toLowerCase();
    if (!/^\d{11}$/.test(cleanRuc)) {
      return res.status(400).json({ success: false, message: 'El RUC debe contener exactamente 11 dígitos.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Ingrese un correo de contacto válido.' });
    }
    if ((await queryCollection(companiesCollection, 'ruc', '==', cleanRuc)).length) {
      return res.status(409).json({ success: false, message: 'El RUC ya está registrado.' });
    }
    const companyData = {
      ruc: cleanRuc,
      razon_social: String(razonSocial).trim(),
      nombre_comercial: String(nombreComercial).trim(),
      direccion: direccion ? String(direccion).trim() : null,
      telefono: telefono ? String(telefono).trim() : null,
      email_contacto: cleanEmail,
      admin_usuario_id: null,
      activo: true,
    };
    const now = new Date();
    const companyRef = db.collection(companiesCollection).doc();
    const rucIndexRef = db.collection('indice_ruc').doc(cleanRuc);
    try {
      await db.runTransaction(async (transaction) => {
        const rucIndex = await transaction.get(rucIndexRef);
        if (rucIndex.exists) {
          const conflict = new Error('RUC_ALREADY_REGISTERED');
          conflict.code = 'RUC_ALREADY_REGISTERED';
          throw conflict;
        }
        transaction.create(companyRef, {
          ...companyData,
          created_at: now,
          updated_at: now,
        });
        transaction.create(rucIndexRef, { empresa_id: companyRef.id, ruc: cleanRuc });
      });
    } catch (error) {
      if (error.code === 'RUC_ALREADY_REGISTERED') {
        return res.status(409).json({ success: false, message: 'El RUC ya está registrado.' });
      }
      throw error;
    }
    const company = { id: companyRef.id, ...companyData, created_at: now, updated_at: now };
    await writeAuditLog({
      usuarioId: req.user.id,
      accion: 'EMPRESA_CREADA',
      modulo: 'EMPRESAS',
      valoresNuevos: company,
    });
    return res.status(201).json({ success: true, message: 'Empresa registrada exitosamente.', data: company });
  } catch (error) {
    return next(error);
  }
};

const setCompanyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activo } = req.body || {};
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ success: false, message: 'El estado activo debe ser verdadero o falso.' });
    }
    const company = await getDocument(companiesCollection, id);
    if (!company) return res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
    const updated = { ...company, activo, updated_at: new Date() };
    await db.collection(companiesCollection).doc(id).update({ activo, updated_at: updated.updated_at });
    await writeAuditLog({
      usuarioId: req.user.id,
      accion: activo ? 'EMPRESA_ACTIVADA' : 'EMPRESA_DESACTIVADA',
      modulo: 'EMPRESAS',
      valoresAnteriores: { empresaId: id, activo: company.activo },
      valoresNuevos: { empresaId: id, activo },
    });
    return res.json({
      success: true,
      message: activo ? 'Empresa reactivada.' : 'Empresa desactivada sin borrar su historial.',
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
};

const getAdministrators = async (req, res, next) => {
  try {
    const users = (await listCollection(usersCollection))
      .filter((user) => ['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(user.rol_codigo) && !user.deleted_at);
    const data = await Promise.all(users.map(async (user) => {
      const [profile, companies] = await Promise.all([
        getDocument('perfiles', user.id),
        queryCollection(companiesCollection, 'admin_usuario_id', '==', user.id),
      ]);
      const company = companies[0];
      return {
        id: user.id,
        email: user.email,
        estado: user.estado,
        email_verificado: user.email_verificado,
        created_at: user.created_at,
        rol: user.rol_codigo,
        nombres: profile?.nombres || '',
        apellidos: profile?.apellidos || '',
        empresa_id: company?.id || null,
        empresa_nombre: company?.nombre_comercial || null,
      };
    }));
    data.sort((left, right) =>
      left.rol.localeCompare(right.rol) || left.apellidos.localeCompare(right.apellidos),
    );
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const createAdministrator = async (req, res, next) => {
  let createdUser = null;
  let companyLinked = false;
  try {
    const { email, password, nombres, apellidos, dni, telefono, empresaId } = req.body || {};
    if (!email || !password || !nombres || !apellidos || !dni || !empresaId) {
      return res.status(400).json({
        success: false,
        message: 'Correo, contraseña, nombres, apellidos, DNI y empresa son obligatorios.',
      });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const documentNumber = String(dni).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Ingrese un correo válido.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (!/^\d{8}$/.test(documentNumber)) {
      return res.status(400).json({ success: false, message: 'El DNI debe contener exactamente 8 dígitos.' });
    }
    if (await findUserByEmail(normalizedEmail)) {
      return res.status(409).json({ success: false, message: 'Ese correo ya está registrado.' });
    }
    const company = await getDocument(companiesCollection, empresaId);
    if (!company || company.activo !== true) {
      return res.status(404).json({ success: false, message: 'Seleccione una empresa activa.' });
    }
    if (company.admin_usuario_id) {
      const currentAdministrator = await getDocument(usersCollection, company.admin_usuario_id);
      if (currentAdministrator?.estado === 'ACTIVO') {
        return res.status(409).json({ success: false, message: 'La empresa ya tiene un administrador activo asignado.' });
      }
    }
    createdUser = await createUserAccount({
      email: normalizedEmail,
      password,
      role: 'ADMIN_EMPRESA',
      emailVerified: true,
      profile: {
        nombres: String(nombres).trim(),
        apellidos: String(apellidos).trim(),
        tipo_documento: 'DNI',
        numero_documento: documentNumber,
        telefono: telefono ? String(telefono).trim() : null,
        consentimiento_datos: true,
        fecha_consentimiento: new Date(),
      },
    });
    await db.collection(companiesCollection).doc(empresaId).update({
      admin_usuario_id: createdUser.id,
      updated_at: new Date(),
    });
    companyLinked = true;
    await writeAuditLog({
      usuarioId: req.user.id,
      accion: 'ADMIN_EMPRESA_CREADO',
      modulo: 'SEGURIDAD',
      valoresNuevos: { usuarioId: createdUser.id, email: normalizedEmail, empresaId },
    });
    return res.status(201).json({
      success: true,
      message: 'Administrador de empresa creado.',
      data: {
        id: createdUser.id,
        email: normalizedEmail,
        estado: 'ACTIVO',
        created_at: createdUser.created_at,
        nombres: String(nombres).trim(),
        apellidos: String(apellidos).trim(),
        rol: 'ADMIN_EMPRESA',
        empresa_id: company.id,
        empresa_nombre: company.nombre_comercial,
      },
    });
  } catch (error) {
    if (createdUser && !companyLinked) await deleteUserAccount(createdUser.id);
    if (error.code === 'EMAIL_ALREADY_REGISTERED' || error.code === 'auth/email-already-exists') {
      return res.status(409).json({ success: false, message: 'Ese correo ya está registrado.' });
    }
    return next(error);
  }
};

const getBusinessUnits = async (req, res, next) => {
  try {
    const units = (await listCollection('unidades_negocio'))
      .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    return res.json({ success: true, data: units });
  } catch (error) {
    return next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const rawLimit = Number.parseInt(req.query.limit, 10);
    const rawPage = Number.parseInt(req.query.page, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;
    const logs = (await listCollection('auditoria_logs')).sort(byNewest);
    const pageLogs = logs.slice((page - 1) * limit, page * limit);
    const data = await Promise.all(pageLogs.map(async (log) => {
      const user = await getDocument(usersCollection, log.usuario_id);
      return { ...log, usuario_email: user?.email || null };
    }));
    return res.json({
      success: true,
      data,
      pagination: { total: logs.length, page, limit, hasMore: page * limit < logs.length },
    });
  } catch (error) {
    return next(error);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = String(req.body?.estado || '').toUpperCase();
    if (!['ACTIVO', 'INACTIVO'].includes(status)) {
      return res.status(400).json({ success: false, message: 'El estado debe ser ACTIVO o INACTIVO.' });
    }
    if (id === req.user.id && status !== 'ACTIVO') {
      return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta.' });
    }
    const user = await getDocument(usersCollection, id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    if (user.rol_codigo !== 'ADMIN_EMPRESA') {
      return res.status(400).json({ success: false, message: 'Solo se puede cambiar el acceso a administradores de empresa.' });
    }
    await auth.updateUser(id, { disabled: status !== 'ACTIVO' });
    await db.collection(usersCollection).doc(id).update({
      estado: status,
      ...(status === 'INACTIVO' ? { token_invalid_before: new Date() } : {}),
      updated_at: new Date(),
    });
    await writeAuditLog({
      usuarioId: req.user.id,
      accion: 'ESTADO_USUARIO_MODIFICADO',
      modulo: 'SEGURIDAD',
      valoresAnteriores: { usuarioId: id, estadoPrevio: user.estado },
      valoresNuevos: { usuarioId: id, nuevoEstado: status },
    });
    return res.json({ success: true, message: `Usuario actualizado a estado ${status}.` });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getGlobalDashboard,
  getCompanies,
  createCompany,
  setCompanyStatus,
  getBusinessUnits,
  getAdministrators,
  createAdministrator,
  getAuditLogs,
  toggleUserStatus,
};
