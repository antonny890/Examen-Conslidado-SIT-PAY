const crypto = require('node:crypto');
const {
  createDocument,
  db,
  getDocument,
  listCollection,
  queryCollection,
  timestampToDate,
} = require('../../services/postgresData');

const companyIncidentTypes = new Set([
  'COBRO_INDEBIDO',
  'NEGATIVA_MEDIO_PASAJE',
  'MALTRATO_CHOFER',
  'CONDICIONES_UNIDAD',
  'LIMPIEZA_UNIDAD',
  'OTRO',
]);
const authorityIncidentTypes = new Set([
  'RUTA_TRANSPORTE',
  'FRECUENCIA_SERVICIO',
  'SEGURIDAD_TRANSPORTE',
  'FALLA_SISTEMA',
  'OTRO',
]);
const allIncidentTypes = new Set([...companyIncidentTypes, ...authorityIncidentTypes]);

const expandClaim = async (claim, includePassenger = false) => {
  const [transaction, company, vehicle, passenger] = await Promise.all([
    claim.transaccion_id ? getDocument('transacciones', claim.transaccion_id) : null,
    claim.empresa_id ? getDocument('empresas', claim.empresa_id) : null,
    claim.vehiculo_id ? getDocument('vehiculos', claim.vehiculo_id) : null,
    includePassenger ? getDocument('usuarios', claim.usuario_id) : null,
  ]);
  const profile = includePassenger ? await getDocument('perfiles', claim.usuario_id) : null;
  return {
    ...claim,
    codigo_boleta: transaction?.codigo_boleta || null,
    monto: transaction?.monto ?? null,
    empresa_nombre: company?.nombre_comercial || null,
    vehiculo_placa: vehicle?.placa || null,
    ...(includePassenger ? {
      pasajero_email: passenger?.email || '',
      pasajero_nombres: profile?.nombres || '',
      pasajero_apellidos: profile?.apellidos || '',
      pasajero_telefono: profile?.telefono || '',
    } : {}),
  };
};

const newestFirst = (left, right) =>
  (timestampToDate(right.created_at)?.getTime() || 0) -
  (timestampToDate(left.created_at)?.getTime() || 0);

const getCompanyForAdmin = async (userId) => {
  const companies = await queryCollection('empresas', 'admin_usuario_id', '==', userId);
  return companies.find((company) => company.activo === true) || null;
};

const createClaim = async (req, res, next) => {
  try {
    const {
      transaccionId,
      tipoIncidencia,
      descripcion,
      evidenciaUrl,
      destinatario: requestedRecipient,
      vehiculoId,
    } = req.body || {};
    const incidentType = String(tipoIncidencia || '').trim().toUpperCase();
    const detail = typeof descripcion === 'string' ? descripcion.trim() : '';
    if (!allIncidentTypes.has(incidentType) || detail.length < 10 || detail.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Selecciona un tipo válido y describe el inconveniente (10 a 2000 caracteres).',
      });
    }

    const recipient = requestedRecipient == null
      ? (transaccionId ? 'EMPRESA' : 'SUPER_ADMIN')
      : String(requestedRecipient).trim().toUpperCase();
    if (!['EMPRESA', 'SUPER_ADMIN'].includes(recipient)) {
      return res.status(400).json({ success: false, message: 'El destinatario del reclamo no es válido.' });
    }
    if (requestedRecipient != null &&
        !(recipient === 'EMPRESA'
          ? companyIncidentTypes.has(incidentType)
          : authorityIncidentTypes.has(incidentType))) {
      return res.status(400).json({
        success: false,
        message: 'El tipo de inconveniente no corresponde al destinatario seleccionado.',
      });
    }
    if (requestedRecipient != null && !vehiculoId) {
      return res.status(400).json({ success: false, message: 'Selecciona el transporte involucrado.' });
    }

    let companyId = null;
    let vehicle = null;
    if (vehiculoId) {
      vehicle = await getDocument('vehiculos', vehiculoId);
      if (!vehicle || vehicle.activo !== true) {
        return res.status(404).json({ success: false, message: 'El transporte seleccionado no está disponible.' });
      }
      companyId = vehicle.empresa_id;
    }
    if (transaccionId) {
      const transaction = await getDocument('transacciones', transaccionId);
      if (!transaction || transaction.pasajero_id !== req.user.id) {
        return res.status(404).json({ success: false, message: 'No se encontró el pago asociado a tu cuenta.' });
      }
      if (vehicle && transaction.vehiculo_id !== vehicle.id) {
        return res.status(400).json({ success: false, message: 'El transporte seleccionado no corresponde al pago indicado.' });
      }
      companyId = transaction.empresa_id;
      vehicle = vehicle || (await getDocument('vehiculos', transaction.vehiculo_id));
    }
    if (recipient === 'EMPRESA' && !companyId) {
      return res.status(400).json({ success: false, message: 'No se pudo identificar la empresa del transporte seleccionado.' });
    }

    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const code = `REC-${datePart}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const claim = await createDocument('incidencias_reclamos', {
      codigo_reclamo: code,
      usuario_id: req.user.id,
      transaccion_id: transaccionId || null,
      empresa_id: companyId,
      vehiculo_id: vehicle?.id || null,
      destinatario: recipient,
      tipo_incidencia: incidentType,
      descripcion: detail,
      evidencia_url: evidenciaUrl || null,
      estado: 'REGISTRADO',
    });
    return res.status(201).json({
      success: true,
      message: 'Reclamo registrado conforme al Código de Protección al Consumidor (Ley 29571).',
      data: claim,
    });
  } catch (error) {
    return next(error);
  }
};

const getMyClaims = async (req, res, next) => {
  try {
    const claims = (await queryCollection('incidencias_reclamos', 'usuario_id', '==', req.user.id))
      .sort(newestFirst);
    return res.json({
      success: true,
      data: await Promise.all(claims.map((claim) => expandClaim(claim))),
    });
  } catch (error) {
    return next(error);
  }
};

const listAllClaims = async (req, res, next) => {
  try {
    const { estado, empresaId } = req.query;
    let claims = await listCollection('incidencias_reclamos');
    if (req.user.rol === 'ADMIN_EMPRESA') {
      const company = await getCompanyForAdmin(req.user.id);
      if (!company) {
        return res.status(404).json({ success: false, message: 'No se encontró una empresa activa para este administrador.' });
      }
      claims = claims.filter((claim) => claim.empresa_id === company.id && claim.destinatario === 'EMPRESA');
    } else if (req.user.rol === 'SUPER_ADMIN') {
      claims = claims.filter((claim) => claim.destinatario === 'SUPER_ADMIN');
    }
    if (estado) claims = claims.filter((claim) => claim.estado === String(estado).toUpperCase());
    if (empresaId && req.user.rol === 'SUPER_ADMIN') {
      claims = claims.filter((claim) => claim.empresa_id === empresaId);
    }
    claims.sort(newestFirst);
    return res.json({
      success: true,
      data: await Promise.all(claims.map((claim) => expandClaim(claim, true))),
    });
  } catch (error) {
    return next(error);
  }
};

const resolveClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = typeof req.body?.estado === 'string' ? req.body.estado.trim().toUpperCase() : '';
    const response = typeof req.body?.respuesta === 'string' ? req.body.respuesta.trim() : '';
    if (!['RESUELTO', 'RECHAZADO', 'EN_REVISION'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Selecciona un estado válido para el reclamo.' });
    }
    if (response.length < 1 || response.length > 2000) {
      return res.status(400).json({ success: false, message: 'La respuesta debe tener entre 1 y 2000 caracteres.' });
    }
    const claim = await getDocument('incidencias_reclamos', id);
    if (!claim) return res.status(404).json({ success: false, message: 'Reclamo no encontrado.' });
    if (req.user.rol === 'ADMIN_EMPRESA') {
      const company = await getCompanyForAdmin(req.user.id);
      if (!company || claim.empresa_id !== company.id || claim.destinatario !== 'EMPRESA') {
        return res.status(404).json({ success: false, message: 'Reclamo no encontrado.' });
      }
    } else if (req.user.rol === 'SUPER_ADMIN' && claim.destinatario !== 'SUPER_ADMIN') {
      return res.status(404).json({ success: false, message: 'Reclamo no encontrado.' });
    }

    const now = new Date();
    const batch = db.batch();
    batch.update(db.collection('incidencias_reclamos').doc(id), {
      estado: status,
      respuesta_resolucion: response,
      respondido_por_usuario_id: req.user.id,
      fecha_resolucion_at: now,
      updated_at: now,
    });
    const notificationRef = db.collection('notificaciones').doc();
    batch.create(notificationRef, {
      usuario_id: claim.usuario_id,
      titulo: 'Respuesta a tu Reclamo',
      mensaje: `Tu reclamo ${claim.codigo_reclamo} ha sido atendido: Estado ${status}.`,
      tipo: 'RECLAMO',
      payload: { codigoReclamo: claim.codigo_reclamo, estado: status },
      leida: false,
      created_at: now,
      updated_at: now,
    });
    await batch.commit();
    return res.json({ success: true, message: 'Reclamo atendido y resolución registrada.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createClaim, getMyClaims, listAllClaims, resolveClaim };
