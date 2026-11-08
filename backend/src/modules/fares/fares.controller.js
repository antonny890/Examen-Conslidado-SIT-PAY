const {
  db,
  getDocument,
  listCollection,
  writeAuditLog,
} = require('../../services/postgresData');
const { calculateApplicableFare } = require('../../services/fareEngine');

const getFares = async (req, res, next) => {
  try {
    const fares = (await listCollection('tarifas'))
      .filter((fare) => fare.activo === true)
      .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    return res.json({ success: true, data: fares });
  } catch (error) {
    return next(error);
  }
};

const calculateFare = async (req, res, next) => {
  try {
    const customTime = req.body?.customTime;
    const evaluatedAt = customTime ? new Date(customTime) : new Date();
    if (Number.isNaN(evaluatedAt.getTime())) {
      return res.status(400).json({ success: false, message: 'La fecha de cálculo no es válida.' });
    }
    const evaluation = await calculateApplicableFare(req.user.id, evaluatedAt);
    return res.json({ success: true, data: evaluation });
  } catch (error) {
    return next(error);
  }
};

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
    } = req.body || {};
    if (!nombre || !tipoPasajero || monto === undefined) {
      return res.status(400).json({ success: false, message: 'Nombre, tipo de pasajero y monto son obligatorios.' });
    }
    const type = String(tipoPasajero).toUpperCase();
    if (!['NORMAL', 'UNIVERSITARIA'].includes(type)) {
      return res.status(400).json({ success: false, message: 'El tipo debe ser NORMAL o UNIVERSITARIA.' });
    }
    if (!Number.isFinite(Number(monto)) || Number(monto) <= 0) {
      return res.status(400).json({ success: false, message: 'El monto debe ser un número mayor que cero.' });
    }
    if (porcentajeDescuento !== undefined &&
        (!Number.isFinite(Number(porcentajeDescuento)) || Number(porcentajeDescuento) < 0 ||
         Number(porcentajeDescuento) > 100)) {
      return res.status(400).json({ success: false, message: 'El descuento debe estar entre 0 y 100.' });
    }

    const now = new Date();
    const reference = db.collection('tarifas').doc();
    const fare = {
      nombre: String(nombre).trim(),
      tipo_pasajero: type,
      monto: Number(monto),
      porcentaje_descuento: Number(porcentajeDescuento || 0),
      hora_inicio: horaInicio || '05:00:00',
      hora_fin: horaFin || '23:59:59',
      dias_semana_aplicables: diasSemana || ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'],
      solo_dias_laborables: soloDiasLaborables !== undefined ? Boolean(soloDiasLaborables) : true,
      vigencia_inicio: vigenciaInicio || now.toISOString().slice(0, 10),
      activo: true,
      created_at: now,
      updated_at: now,
    };
    await db.runTransaction(async (transaction) => {
      const activeFares = await transaction.get(
        db.collection('tarifas').where('tipo_pasajero', '==', type).where('activo', '==', true),
      );
      if (!activeFares.empty) {
        const conflict = new Error(`Ya existe una tarifa activa de tipo ${type}. Modifica la tarifa vigente.`);
        conflict.statusCode = 409;
        throw conflict;
      }
      transaction.create(reference, fare);
    });

    const created = { id: reference.id, ...fare };
    await writeAuditLog({
      usuarioId: req.user.id,
      accion: 'TARIFA_CREADA',
      modulo: 'TARIFAS',
      valoresNuevos: created,
    });
    return res.status(201).json({
      success: true,
      message: 'Tarifa configurada exitosamente.',
      data: created,
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

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
    } = req.body || {};
    const previous = await getDocument('tarifas', id);
    if (!previous) return res.status(404).json({ success: false, message: 'Tarifa no encontrada.' });
    if (monto !== undefined && (!Number.isFinite(Number(monto)) || Number(monto) <= 0)) {
      return res.status(400).json({ success: false, message: 'El monto debe ser un número mayor que cero.' });
    }
    if (porcentajeDescuento !== undefined &&
        (!Number.isFinite(Number(porcentajeDescuento)) || Number(porcentajeDescuento) < 0 ||
         Number(porcentajeDescuento) > 100)) {
      return res.status(400).json({ success: false, message: 'El descuento debe estar entre 0 y 100.' });
    }

    const updateData = { updated_at: new Date() };
    if (nombre) updateData.nombre = String(nombre).trim();
    if (monto !== undefined) updateData.monto = Number(monto);
    if (porcentajeDescuento !== undefined) updateData.porcentaje_descuento = Number(porcentajeDescuento);
    if (horaInicio) updateData.hora_inicio = horaInicio;
    if (horaFin) updateData.hora_fin = horaFin;
    if (diasSemana) updateData.dias_semana_aplicables = diasSemana;
    if (activo !== undefined) updateData.activo = Boolean(activo);

    await db.runTransaction(async (transaction) => {
      if (updateData.activo === true) {
        const activeFares = await transaction.get(
          db.collection('tarifas')
            .where('tipo_pasajero', '==', previous.tipo_pasajero)
            .where('activo', '==', true),
        );
        if (activeFares.docs.some((fare) => fare.id !== id)) {
          const conflict = new Error(`Ya existe una tarifa activa de tipo ${previous.tipo_pasajero}.`);
          conflict.statusCode = 409;
          throw conflict;
        }
      }
      transaction.update(db.collection('tarifas').doc(id), updateData);
    });

    const updated = { ...previous, ...updateData };
    await writeAuditLog({
      usuarioId: req.user.id,
      accion: 'TARIFA_MODIFICADA',
      modulo: 'TARIFAS',
      valoresAnteriores: previous,
      valoresNuevos: updated,
    });
    return res.json({ success: true, message: 'Tarifa actualizada correctamente.', data: updated });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

module.exports = { getFares, calculateFare, createFare, updateFare };
