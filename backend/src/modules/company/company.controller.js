const {
  db,
  getDocument,
  listCollection,
  queryCollection,
  timestampToDate,
} = require('../../services/postgresData');
const {
  createUserAccount,
  deleteUserAccount,
  findUserByEmail,
} = require('../../services/userService');
const { dateKeyInPeru } = require('../../utils/dateKeyInPeru');

const companyForAdmin = async (userId) => {
  const companies = await queryCollection('empresas', 'admin_usuario_id', '==', userId);
  return companies.find((company) => company.activo === true) || null;
};

const toAmount = (value) => Number(value || 0);
const successfulTransactions = (records) =>
  records.filter((record) => record.estado === 'EXITOSA');
const verifiedTransactions = (records) =>
  successfulTransactions(records).filter((record) => record.pago_simulado !== true);
const newestFirst = (left, right) =>
  (timestampToDate(right.fecha_pago)?.getTime() || 0) -
  (timestampToDate(left.fecha_pago)?.getTime() || 0);

const getCompanyDashboard = async (req, res, next) => {
  try {
    const company = req.user.rol === 'ADMIN_EMPRESA' ? await companyForAdmin(req.user.id) : null;
    if (req.user.rol === 'ADMIN_EMPRESA' && !company) {
      return res.status(404).json({ success: false, message: 'No se encontró una empresa activa para este administrador.' });
    }
    let companyId = req.user.rol === 'ADMIN_EMPRESA' ? company.id : req.query.empresaId;
    if (!companyId && req.user.rol === 'SUPER_ADMIN') {
      const activeCompanies = (await listCollection('empresas')).filter((item) => item.activo === true);
      companyId = activeCompanies[0]?.id;
    }
    if (!companyId) return res.status(404).json({ success: false, message: 'Empresa no encontrada para este administrador.' });

    const [companyData, transactions, vehicles, drivers, claims] = await Promise.all([
      company || getDocument('empresas', companyId),
      queryCollection('transacciones', 'empresa_id', '==', companyId),
      queryCollection('vehiculos', 'empresa_id', '==', companyId),
      queryCollection('choferes', 'empresa_id', '==', companyId),
      queryCollection('incidencias_reclamos', 'empresa_id', '==', companyId),
    ]);
    const successful = successfulTransactions(transactions);
    const verified = verifiedTransactions(successful);
    const today = dateKeyInPeru(new Date());
    const todayPayments = verified.filter((transaction) =>
      dateKeyInPeru(transaction.fecha_pago) === today,
    );
    const todaySimulatedPayments = successful.filter((transaction) =>
      transaction.pago_simulado === true &&
      dateKeyInPeru(transaction.fecha_pago) === today,
    );
    const recent = await Promise.all(successful.sort(newestFirst).slice(0, 10).map(async (transaction) => {
      const vehicle = await getDocument('vehiculos', transaction.vehiculo_id);
      return {
        id: transaction.id,
        codigo_boleta: transaction.codigo_boleta,
        monto: transaction.monto,
        tipo_tarifa_aplicada: transaction.tipo_tarifa_aplicada,
        fecha_pago: transaction.fecha_pago,
        placa: vehicle?.placa || '',
        pago_simulado: transaction.pago_simulado === true,
      };
    }));
    return res.json({
      success: true,
      data: {
        empresa: companyData || { id: companyId },
        recaudacionHoy: {
          monto: todayPayments.reduce((sum, item) => sum + toAmount(item.monto), 0),
          pasajesCobrados: todayPayments.length,
          montoSimulado: todaySimulatedPayments.reduce((sum, item) => sum + toAmount(item.monto), 0),
          pagosSimulados: todaySimulatedPayments.length,
        },
        recaudacionHistorica: {
          monto: verified.reduce((sum, item) => sum + toAmount(item.monto), 0),
          pasajesCobrados: verified.length,
        },
        flota: {
          totalVehiculos: vehicles.filter((vehicle) => vehicle.activo === true).length,
          totalChoferes: drivers.length,
        },
        reclamosPendientes: claims.filter((claim) =>
          claim.destinatario === 'EMPRESA' && claim.estado === 'REGISTRADO',
        ).length,
        ultimasTransacciones: recent,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const createDriver = async (req, res, next) => {
  let createdUser = null;
  try {
    const {
      email,
      password,
      nombres,
      apellidos,
      dni,
      telefono,
      numeroLicencia,
      categoriaLicencia,
      vehiculoId,
      empresaId,
    } = req.body || {};
    if (!email || !password || !nombres || !apellidos || !dni || !numeroLicencia || !vehiculoId) {
      return res.status(400).json({ success: false, message: 'Completa los datos obligatorios y selecciona una placa de la flota.' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Ingresa un correo electrónico válido.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña inicial debe tener al menos 8 caracteres.' });
    }
    if (typeof dni !== 'string' || !/^\d{8}$/.test(dni.trim())) {
      return res.status(400).json({ success: false, message: 'El DNI debe contener exactamente 8 dígitos.' });
    }
    if (typeof nombres !== 'string' || typeof apellidos !== 'string' ||
        !nombres.trim() || !apellidos.trim() || nombres.trim().length > 100 || apellidos.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Ingresa nombres y apellidos válidos (máximo 100 caracteres cada uno).' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await findUserByEmail(normalizedEmail)) {
      return res.status(409).json({ success: false, message: 'Ese correo ya está registrado.' });
    }

    const company = req.user.rol === 'ADMIN_EMPRESA'
      ? await companyForAdmin(req.user.id)
      : await getDocument('empresas', empresaId);
    if (!company || company.activo !== true) {
      return res.status(404).json({ success: false, message: 'No se encontró una empresa activa para registrar al chofer.' });
    }
    const vehicle = await getDocument('vehiculos', vehiculoId);
    if (!vehicle || vehicle.activo !== true) {
      return res.status(404).json({ success: false, message: 'La placa seleccionada no existe o está inactiva.' });
    }
    if (vehicle.empresa_id !== company.id) {
      return res.status(403).json({ success: false, message: 'La placa seleccionada no pertenece a esta empresa.' });
    }
    const assignment = await queryCollection('choferes', 'vehiculo_id', '==', vehicle.id);
    if (assignment.length) {
      return res.status(409).json({ success: false, message: `La placa ${vehicle.placa} ya está asignada a otro chofer.` });
    }

    createdUser = await createUserAccount({
      email: normalizedEmail,
      password,
      role: 'CHOFER',
      emailVerified: true,
      profile: {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        tipo_documento: 'DNI',
        numero_documento: dni.trim(),
        telefono: telefono ? String(telefono).trim() : null,
        consentimiento_datos: true,
        fecha_consentimiento: new Date(),
      },
    });
    const driverRef = db.collection('choferes').doc();
    await db.runTransaction(async (transaction) => {
      const currentVehicle = await transaction.get(db.collection('vehiculos').doc(vehicle.id));
      const currentAssignments = await transaction.get(
        db.collection('choferes').where('vehiculo_id', '==', vehicle.id),
      );
      if (!currentVehicle.exists || currentVehicle.data().activo !== true || !currentAssignments.empty) {
        const conflict = new Error('VEHICLE_ASSIGNMENT_CONFLICT');
        conflict.code = 'VEHICLE_ASSIGNMENT_CONFLICT';
        throw conflict;
      }
      await transaction.create(driverRef, {
        usuario_id: createdUser.id,
        empresa_id: company.id,
        vehiculo_id: vehicle.id,
        numero_licencia: numeroLicencia.trim(),
        categoria_licencia: categoriaLicencia || 'A-IIIa',
        estado_operativo: 'DISPONIBLE',
        created_at: new Date(),
        updated_at: new Date(),
      });
    });
    return res.status(201).json({
      success: true,
      message: 'Chofer registrado exitosamente y credenciales generadas.',
      data: {
        usuario: createdUser,
        chofer: {
          id: driverRef.id,
          usuario_id: createdUser.id,
          empresa_id: company.id,
          vehiculo_id: vehicle.id,
          numero_licencia: numeroLicencia.trim(),
          categoria_licencia: categoriaLicencia || 'A-IIIa',
          estado_operativo: 'DISPONIBLE',
        },
      },
    });
  } catch (error) {
    if (createdUser) {
      await deleteUserAccount(createdUser.id);
    }
    if (error.code === 'VEHICLE_ASSIGNMENT_CONFLICT') {
      return res.status(409).json({ success: false, message: 'La placa seleccionada ya no está disponible.' });
    }
    if (error.code === 'EMAIL_ALREADY_REGISTERED' || error.code === 'auth/email-already-exists') {
      return res.status(409).json({ success: false, message: 'Ese correo ya está registrado.' });
    }
    return next(error);
  }
};

const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const getReportTransactions = async (req, limit = 1000) => {
  const { empresaId, fechaInicio, fechaFin } = req.query;
  let targetCompanyId = empresaId;
  if (req.user.rol === 'ADMIN_EMPRESA') {
    const company = await companyForAdmin(req.user.id);
    if (!company) {
      const error = new Error('No se encontró una empresa activa para este administrador.');
      error.statusCode = 404;
      throw error;
    }
    targetCompanyId = company.id;
  }
  let transactions = (await listCollection('transacciones'))
    .filter((record) => record.estado === 'EXITOSA');
  if (targetCompanyId) transactions = transactions.filter((record) => record.empresa_id === targetCompanyId);
  if (fechaInicio) transactions = transactions.filter((record) =>
    (dateKeyInPeru(record.fecha_pago) || '') >= fechaInicio,
  );
  if (fechaFin) transactions = transactions.filter((record) =>
    (dateKeyInPeru(record.fecha_pago) || '') <= fechaFin,
  );
  transactions.sort(newestFirst);
  return Promise.all(transactions.slice(0, limit).map(async (transaction) => {
    const vehicle = await getDocument('vehiculos', transaction.vehiculo_id);
    const unit = vehicle?.unidad_negocio_id
      ? await getDocument('unidades_negocio', vehicle.unidad_negocio_id)
      : null;
    const date = timestampToDate(transaction.fecha_pago);
    return {
      codigo_boleta: transaction.codigo_boleta || '',
      fecha_pago: date?.toISOString() || null,
      placa: vehicle?.placa || '',
      cuenca: transaction.unidad_codigo_snapshot || unit?.codigo || '',
      tipo_tarifa_aplicada: transaction.tipo_tarifa_aplicada || '',
      monto: Number(transaction.monto || 0),
      metodo_pago: transaction.metodo_pago || '',
      pago_simulado: transaction.pago_simulado === true,
    };
  }));
};

const listReportTransactions = async (req, res, next) => {
  try {
    const rows = await getReportTransactions(req, 100);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

const exportReportCSV = async (req, res, next) => {
  try {
    const rows = await getReportTransactions(req);
    const csvRows = rows.map((row) => [
      row.codigo_boleta,
      row.fecha_pago || '',
      row.placa,
      row.cuenca,
      row.tipo_tarifa_aplicada,
      row.monto.toFixed(2),
      row.metodo_pago,
      row.pago_simulado ? 'SIMULADO' : 'VERIFICADO',
    ].map(csvValue).join(','));
    const csv = [
      'Codigo_Boleta,Fecha_Hora,Placa,Cuenca,Tipo_Tarifa,Monto_Soles,Metodo_Pago,Estado',
      ...csvRows,
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=recaudacion-sit-pay-${Date.now()}.csv`);
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};

const getBusinessUnits = async (req, res, next) => {
  try {
    const units = (await listCollection('unidades_negocio'))
      .sort((left, right) => String(left.codigo).localeCompare(String(right.codigo)));
    return res.json({ success: true, data: units });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getBusinessUnits,
  getCompanyDashboard,
  createDriver,
  exportReportCSV,
  listReportTransactions,
};
