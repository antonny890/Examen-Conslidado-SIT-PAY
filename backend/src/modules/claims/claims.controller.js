/**
 * Controlador de Reclamos e Incidencias del Consumidor (Ley 29571)
 */
const crypto = require('crypto');
const db = require('../../config/db');

// 1. Crear nuevo reclamo (Pasajero)
const createClaim = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    const { transaccionId, tipoIncidencia, descripcion, evidenciaUrl } = req.body;

    if (!tipoIncidencia || !descripcion) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de incidencia y descripción detallada son requeridos.',
      });
    }

    let empresaId = null;
    if (transaccionId) {
      const transaccion = await db('transacciones').where({ id: transaccionId }).first();
      if (transaccion) {
        empresaId = transaccion.empresa_id;
      }
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
        tipo_incidencia: tipoIncidencia,
        descripcion: descripcion.trim(),
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
      .select(
        'incidencias_reclamos.*',
        'transacciones.codigo_boleta',
        'transacciones.monto',
        'empresas.nombre_comercial as empresa_nombre'
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
      .select(
        'incidencias_reclamos.*',
        'usuarios.email as pasajero_email',
        'perfiles.nombres as pasajero_nombres',
        'perfiles.apellidos as pasajero_apellidos',
        'perfiles.telefono as pasajero_telefono',
        'transacciones.codigo_boleta',
        'empresas.nombre_comercial as empresa_nombre'
      )
      .orderBy('incidencias_reclamos.created_at', 'desc');

    if (estado) query = query.where({ 'incidencias_reclamos.estado': estado.toUpperCase() });
    if (empresaId) query = query.where({ 'incidencias_reclamos.empresa_id': empresaId });

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

    const reclamo = await db('incidencias_reclamos').where({ id }).first();
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
