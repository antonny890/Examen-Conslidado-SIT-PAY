/**
 * Controlador de Tarifas y Motor de Cálculo (Ley 26271)
 */
const db = require('../../config/db');
const { calculateApplicableFare } = require('../../services/fareEngine');

// Listar todas las tarifas activas en el sistema
const getFares = async (req, res, next) => {
  try {
    const tarifas = await db('tarifas').where({ activo: true }).orderBy('id', 'asc');
    res.json({
      success: true,
      data: tarifas,
    });
  } catch (error) {
    next(error);
  }
};

// Calcular tarifa en tiempo real para el pasajero autenticado
const calculateFare = async (req, res, next) => {
  try {
    const pasajeroId = req.user.id;
    const { customTime } = req.body;

    const evaluacion = await calculateApplicableFare(pasajeroId, customTime ? new Date(customTime) : new Date());

    res.json({
      success: true,
      data: evaluacion,
    });
  } catch (error) {
    next(error);
  }
};

// [SUPER_ADMIN] Crear nueva tarifa configurable
const createFare = async (req, res, next) => {
  try {
    const {
      nombre,
      tipoPasajero,
      monto,
      porcentajeDescuento,
      horaInicio,
      horaFin,
      diasSemana,
      soloDiasLaborables,
      vigenciaInicio,
    } = req.body;

    if (!nombre || !tipoPasajero || monto === undefined) {
      return res.status(400).json({ success: false, message: 'Nombre, tipo de pasajero y monto son obligatorios.' });
    }

    const tipoNormalizado = String(tipoPasajero).toUpperCase();
    if (!['NORMAL', 'UNIVERSITARIA'].includes(tipoNormalizado)) {
      return res.status(400).json({ success: false, message: 'El tipo debe ser NORMAL o UNIVERSITARIA.' });
    }
    if (!Number.isFinite(Number(monto)) || Number(monto) <= 0) {
      return res.status(400).json({ success: false, message: 'El monto debe ser un número mayor que cero.' });
    }
    if (
      porcentajeDescuento !== undefined &&
      (!Number.isFinite(Number(porcentajeDescuento)) ||
        Number(porcentajeDescuento) < 0 ||
        Number(porcentajeDescuento) > 100)
    ) {
      return res.status(400).json({ success: false, message: 'El descuento debe estar entre 0 y 100.' });
    }
    const activeFare = await db('tarifas')
      .where({ tipo_pasajero: tipoNormalizado, activo: true })
      .first();
    if (activeFare) {
      return res.status(409).json({
        success: false,
        message: `Ya existe una tarifa activa de tipo ${tipoNormalizado}. Modifica la tarifa vigente.`,
      });
    }

    const [nuevaTarifa] = await db('tarifas')
      .insert({
        nombre,
        tipo_pasajero: tipoNormalizado,
        monto: parseFloat(monto),
        porcentaje_descuento: porcentajeDescuento || 0,
        hora_inicio: horaInicio || '05:00:00',
        hora_fin: horaFin || '23:59:59',
        dias_semana_aplicables: JSON.stringify(diasSemana || ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']),
        solo_dias_laborables: soloDiasLaborables !== undefined ? soloDiasLaborables : true,
        vigencia_inicio: vigenciaInicio || new Date().toISOString().split('T')[0],
        activo: true,
      })
      .returning('*');

    // Registrar en auditoría
    await db('auditoria_logs').insert({
      usuario_id: req.user.id,
      accion: 'TARIFA_CREADA',
      modulo: 'TARIFAS',
      valores_nuevos: JSON.stringify(nuevaTarifa),
    });

    res.status(201).json({
      success: true,
      message: 'Tarifa configurada exitosamente.',
      data: nuevaTarifa,
    });
  } catch (error) {
    next(error);
  }
};

// [SUPER_ADMIN] Actualizar tarifa existente
const updateFare = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      monto,
      porcentajeDescuento,
      horaInicio,
      horaFin,
      diasSemana,
      activo,
    } = req.body;

    const tarifaPrevia = await db('tarifas').where({ id }).first();
    if (!tarifaPrevia) {
      return res.status(404).json({ success: false, message: 'Tarifa no encontrada.' });
    }

    if (monto !== undefined && (!Number.isFinite(Number(monto)) || Number(monto) <= 0)) {
      return res.status(400).json({ success: false, message: 'El monto debe ser un número mayor que cero.' });
    }
    if (
      porcentajeDescuento !== undefined &&
      (!Number.isFinite(Number(porcentajeDescuento)) ||
        Number(porcentajeDescuento) < 0 ||
        Number(porcentajeDescuento) > 100)
    ) {
      return res.status(400).json({ success: false, message: 'El descuento debe estar entre 0 y 100.' });
    }
    if (activo === true) {
      const anotherActiveFare = await db('tarifas')
        .where({ tipo_pasajero: tarifaPrevia.tipo_pasajero, activo: true })
        .whereNot({ id })
        .first();
      if (anotherActiveFare) {
        return res.status(409).json({
          success: false,
          message: `Ya existe una tarifa activa de tipo ${tarifaPrevia.tipo_pasajero}.`,
        });
      }
    }

    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (monto !== undefined) updateData.monto = parseFloat(monto);
    if (porcentajeDescuento !== undefined) updateData.porcentaje_descuento = parseFloat(porcentajeDescuento);
    if (horaInicio) updateData.hora_inicio = horaInicio;
    if (horaFin) updateData.hora_fin = horaFin;
    if (diasSemana) updateData.dias_semana_aplicables = JSON.stringify(diasSemana);
    if (activo !== undefined) updateData.activo = Boolean(activo);
    updateData.updated_at = new Date();

    await db('tarifas').where({ id }).update(updateData);

    const tarifaActualizada = await db('tarifas').where({ id }).first();

    // Log de auditoría
    await db('auditoria_logs').insert({
      usuario_id: req.user.id,
      accion: 'TARIFA_MODIFICADA',
      modulo: 'TARIFAS',
      valores_anteriores: JSON.stringify(tarifaPrevia),
      valores_nuevos: JSON.stringify(tarifaActualizada),
    });

    res.json({
      success: true,
      message: 'Tarifa actualizada correctamente.',
      data: tarifaActualizada,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFares,
  calculateFare,
  createFare,
  updateFare,
};
