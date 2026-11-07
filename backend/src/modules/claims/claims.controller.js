/**
 * Controlador de Reclamos e Incidencias del Consumidor (Ley 29571)
 */
const crypto = require('crypto');
const db = require('../../config/db');

// 1. Crear nuevo reclamo (Pasajero)
const createClaim = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    const {
      transaccionId,
      tipoIncidencia,
      descripcion,
      evidenciaUrl,
      destinatario: requestedRecipient,
      vehiculoId,
    } = req.body;

    const incidentType = String(tipoIncidencia || '').trim().toUpperCase();
    const detail = typeof descripcion === 'string' ? descripcion.trim() : '';
    const allowedIncidentTypes = new Set([
      'COBRO_INDEBIDO',
      'NEGATIVA_MEDIO_PASAJE',
      'MALTRATO_CHOFER',
      'CONDICIONES_UNIDAD',
      'LIMPIEZA_UNIDAD',
      'RUTA_TRANSPORTE',
      'FRECUENCIA_SERVICIO',
      'SEGURIDAD_TRANSPORTE',
      'FALLA_SISTEMA',
      'OTRO',
    ]);
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

    if (!allowedIncidentTypes.has(incidentType) || detail.length < 10 || detail.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Selecciona un tipo válido y describe el inconveniente (10 a 2000 caracteres).',
      });
    }

    const recipient = requestedRecipient == null
      ? (transaccionId ? 'EMPRESA' : 'SUPER_ADMIN')
      : String(requestedRecipient).trim().toUpperCase();
    if (!['EMPRESA', 'SUPER_ADMIN'].includes(recipient)) {
      return res.status(400).json({
        success: false,
        message: 'El destinatario del reclamo no es válido.',
      });
    }
    if (
      requestedRecipient != null &&
      !(recipient === 'EMPRESA'
        ? companyIncidentTypes.has(incidentType)
        : authorityIncidentTypes.has(incidentType))
    ) {
      return res.status(400).json({
        success: false,
        message: 'El tipo de inconveniente no corresponde al destinatario seleccionado.',
      });
    }

    if (requestedRecipient != null && !vehiculoId) {
      return res.status(400).json({
        success: false,
        message: 'Selecciona el transporte involucrado.',
      });
    }

    let empresaId = null;
    let vehiculo = null;
    if (vehiculoId) {
      vehiculo = await db('vehiculos')
        .select('id', 'empresa_id')
        .where({ id: vehiculoId, activo: true })
        .first();
      if (!vehiculo) {
        return res.status(404).json({
          success: false,
          message: 'El transporte seleccionado no está disponible.',
        });
      }
      empresaId = vehiculo.empresa_id;
    }

    if (transaccionId) {
      const transaccion = await db('transacciones')
        .where({ id: transaccionId, pasajero_id: usuarioId })
        .first();
      if (!transaccion) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró el pago asociado a tu cuenta.',
        });
      }
      if (vehiculo && transaccion.vehiculo_id !== vehiculo.id) {
        return res.status(400).json({
          success: false,
          message: 'El transporte seleccionado no corresponde al pago indicado.',
        });
      }
      empresaId = transaccion.empresa_id;
      vehiculo = vehiculo || { id: transaccion.vehiculo_id };
    }

    if (recipient === 'EMPRESA' && !empresaId) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo identificar la empresa del transporte seleccionado.',
      });
    }

    // Código único de reclamo: REC-YYYYMMDD-XXXX
    const fechaStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
    const codigoReclamo = `REC-${fechaStr}-${rand}`;

    const [reclamo] = await db('incidencias_reclamos')
      .insert({
        codigo_reclamo: codigoReclamo,
        usuario_id: usuarioId,
        transaccion_id: transaccionId || null,
        empresa_id: empresaId,
        vehiculo_id: vehiculo?.id || null,
        destinatario: recipient,
        tipo_incidencia: incidentType,
        descripcion: detail,
        evidencia_url: evidenciaUrl || null,
        estado: 'REGISTRADO',
      })
      .returning('*');

    res.status(201).json({
      success: true,
      message: 'Reclamo registrado conforme al Código de Protección al Consumidor (Ley 29571).',
      data: reclamo,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Listar reclamos del pasajero autenticado
const getMyClaims = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;

    const claims = await db('incidencias_reclamos')
      .leftJoin('transacciones', 'incidencias_reclamos.transaccion_id', 'transacciones.id')
      .leftJoin('empresas', 'incidencias_reclamos.empresa_id', 'empresas.id')
      .leftJoin('vehiculos', 'incidencias_reclamos.vehiculo_id', 'vehiculos.id')
      .select(
        'incidencias_reclamos.*',
        'transacciones.codigo_boleta',
        'transacciones.monto',
        'empresas.nombre_comercial as empresa_nombre',
        'vehiculos.placa as vehiculo_placa'
      )
      .where({ 'incidencias_reclamos.usuario_id': usuarioId })
      .orderBy('incidencias_reclamos.created_at', 'desc');

    res.json({ success: true, data: claims });
  } catch (error) {
    next(error);
  }
};

// 3. [ADMIN] Listar todos los reclamos
const listAllClaims = async (req, res, next) => {
  try {
    const { estado, empresaId } = req.query;

    let query = db('incidencias_reclamos')
      .join('usuarios', 'incidencias_reclamos.usuario_id', 'usuarios.id')
      .join('perfiles', 'usuarios.id', 'perfiles.usuario_id')
      .leftJoin('transacciones', 'incidencias_reclamos.transaccion_id', 'transacciones.id')
      .leftJoin('empresas', 'incidencias_reclamos.empresa_id', 'empresas.id')
      .leftJoin('vehiculos', 'incidencias_reclamos.vehiculo_id', 'vehiculos.id')
      .select(
        'incidencias_reclamos.*',
        'usuarios.email as pasajero_email',
        'perfiles.nombres as pasajero_nombres',
        'perfiles.apellidos as pasajero_apellidos',
        'perfiles.telefono as pasajero_telefono',
        'transacciones.codigo_boleta',
        'empresas.nombre_comercial as empresa_nombre',
        'vehiculos.placa as vehiculo_placa'
      )
      .orderBy('incidencias_reclamos.created_at', 'desc');

    if (req.user.rol === 'ADMIN_EMPRESA') {
      const empresa = await db('empresas')
        .where({ admin_usuario_id: req.user.id, activo: true })
        .first();
      if (!empresa) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró una empresa activa para este administrador.',
        });
      }
      query = query.where({
        'incidencias_reclamos.empresa_id': empresa.id,
        'incidencias_reclamos.destinatario': 'EMPRESA',
      });
    }

    if (estado) query = query.where({ 'incidencias_reclamos.estado': estado.toUpperCase() });
    if (empresaId && req.user.rol === 'SUPER_ADMIN') {
      query = query.where({ 'incidencias_reclamos.empresa_id': empresaId });
    }

    const claims = await query;
    res.json({ success: true, data: claims });
  } catch (error) {
    next(error);
  }
};

// 4. [ADMIN] Atender y resolver reclamo
const resolveClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado, respuesta } = req.body;
    const respondidoPorId = req.user.id;

    if (!estado || !respuesta) {
      return res.status(400).json({ success: false, message: 'Estado y respuesta son requeridos.' });
    }

    let reclamoQuery = db('incidencias_reclamos').where({ id });
    if (req.user.rol === 'ADMIN_EMPRESA') {
      const empresa = await db('empresas')
        .where({ admin_usuario_id: req.user.id, activo: true })
        .first();
      if (!empresa) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró una empresa activa para este administrador.',
        });
      }
      reclamoQuery = reclamoQuery.where({
        empresa_id: empresa.id,
        destinatario: 'EMPRESA',
      });
    }
    const reclamo = await reclamoQuery.first();
    if (!reclamo) {
      return res.status(404).json({ success: false, message: 'Reclamo no encontrado.' });
    }

    await db('incidencias_reclamos').where({ id }).update({
      estado: estado.toUpperCase(),
      respuesta_resolucion: respuesta.trim(),
      respondido_por_usuario_id: respondidoPorId,
      fecha_resolucion_at: new Date(),
      updated_at: new Date(),
    });

    // Notificación al pasajero
    await db('notificaciones').insert({
      usuario_id: reclamo.usuario_id,
      titulo: 'Respuesta a tu Reclamo',
      mensaje: `Tu reclamo ${reclamo.codigo_reclamo} ha sido atendido: Estado ${estado.toUpperCase()}.`,
      tipo: 'RECLAMO',
      payload: JSON.stringify({ codigoReclamo: reclamo.codigo_reclamo, estado }),
    });

    res.json({
      success: true,
      message: 'Reclamo atendido y resolución registrada.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClaim,
  getMyClaims,
  listAllClaims,
  resolveClaim,
};
