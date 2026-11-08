const crypto = require('node:crypto');
const {
  getDocument,
  queryCollection,
} = require('../../services/firestoreData');
const { db } = require('../../config/firebase');
const { calculateApplicableFare } = require('../../services/fareEngine');
const { emitPaymentConfirmationToDriver } = require('../../sockets/socketHandler');

const normalizePlate = (plate) => {
  const cleanPlate = plate.toUpperCase().trim().replace(/\s+/g, '');
  return !cleanPlate.includes('-') && cleanPlate.length === 6
    ? `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3)}`
    : cleanPlate;
};

const findVehicle = async ({ qrCode, plate }) => {
  let matches = [];
  if (qrCode) {
    matches = await queryCollection('vehiculos', 'qr_codigo_seguro', '==', qrCode.trim());
  } else if (plate) {
    matches = await queryCollection('vehiculos', 'placa', '==', normalizePlate(plate));
  }
  const vehicle = matches.find((item) => item.activo === true);
  if (!vehicle) return null;
  const [company, unit] = await Promise.all([
    getDocument('empresas', vehicle.empresa_id),
    getDocument('unidades_negocio', vehicle.unidad_negocio_id),
  ]);
  return {
    ...vehicle,
    empresa: company?.nombre_comercial || '',
    cuenca_codigo: unit?.codigo || '',
    cuenca_nombre: unit?.nombre || '',
  };
};

const previewPayment = async (req, res, next) => {
  try {
    const { plate, qrCode } = req.body || {};
    if (!plate && !qrCode) {
      return res.status(400).json({ success: false, message: 'Debe proporcionar la placa o el código QR del vehículo.' });
    }
    const vehicle = await findVehicle({ plate, qrCode });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    const fare = await calculateApplicableFare(req.user.id, new Date());
    return res.json({
      success: true,
      data: {
        vehiculo: {
          id: vehicle.id,
          placa: vehicle.placa,
          empresa: vehicle.empresa,
          cuenca: `${vehicle.cuenca_codigo} - ${vehicle.cuenca_nombre}`,
        },
        tarifa: fare,
        paymentAvailable: true,
        paymentMode: 'SIMULATED',
      },
    });
  } catch (error) {
    return next(error);
  }
};

const beginPayment = async (req, res, next) => {
  try {
    const { qrCode, plate, paymentMethodId, idempotencyKey } = req.body || {};
    if (!qrCode && !plate) {
      return res.status(400).json({ success: false, message: 'Debe proporcionar la placa o el código QR del vehículo.' });
    }
    if (typeof paymentMethodId !== 'string' || !paymentMethodId.trim()) {
      return res.status(400).json({ success: false, message: 'Selecciona una tarjeta de prueba para continuar.' });
    }
    const vehicle = await findVehicle({ plate, qrCode });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    const method = await getDocument('metodos_pago', paymentMethodId);
    if (!method || method.usuario_id !== req.user.id || method.simulada !== true) {
      return res.status(404).json({ success: false, message: 'La tarjeta seleccionada no está disponible.' });
    }
    const expiry = new Date(Number(method.anio_vencimiento), Number(method.mes_vencimiento), 0, 23, 59, 59, 999);
    if (expiry < new Date()) {
      return res.status(400).json({ success: false, message: 'La tarjeta seleccionada está vencida.' });
    }
    if (idempotencyKey !== undefined &&
        (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(idempotencyKey))) {
      return res.status(400).json({ success: false, message: 'La clave de operación no es válida.' });
    }

    const fare = await calculateApplicableFare(req.user.id, new Date());
    const assignments = await queryCollection('choferes', 'vehiculo_id', '==', vehicle.id);
    const driver = assignments[0] || null;
    const profile = await getDocument('perfiles', req.user.id);
    const operationKey = idempotencyKey || crypto.randomUUID();
    const transactionId = crypto.createHash('sha256')
      .update(`${req.user.id}:${operationKey}`)
      .digest('hex');
    const transactionRef = db.collection('transacciones').doc(transactionId);
    const now = new Date();
    const ticketCode = `BOL-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const record = {
      codigo_boleta: ticketCode,
      idempotency_key: operationKey,
      pasajero_id: req.user.id,
      vehiculo_id: vehicle.id,
      chofer_usuario_id: driver?.usuario_id || null,
      empresa_id: vehicle.empresa_id,
      tarifa_id: fare.tarifaId,
      tipo_tarifa_aplicada: fare.tipoTarifaAplicada,
      monto: fare.monto,
      saldo_anterior: 0,
      saldo_posterior: 0,
      metodo_pago: 'TARJETA_SIMULADA',
      origen_pago: plate ? 'PLACA_MANUAL' : 'QR',
      metodo_pago_id: method.id,
      tarjeta_ultimos_digitos: method.ultimos_digitos,
      pago_simulado: true,
      estado: 'EXITOSA',
      fecha_pago: now,
      created_at: now,
      updated_at: now,
    };

    let created = false;
    const transactionRecord = await db.runTransaction(async (transaction) => {
      const current = await transaction.get(transactionRef);
      if (current.exists) {
        created = false;
        return { id: current.id, ...current.data() };
      }
      created = true;
      transaction.create(transactionRef, record);
      return { id: transactionRef.id, ...record };
    });

    if (created) {
      emitPaymentConfirmationToDriver(
        vehicle.id,
        profile?.alias || profile?.nombres || null,
        transactionRecord.codigo_boleta,
        { simulated: true },
      );
    }
    return res.status(created ? 201 : 200).json({
      success: true,
      message: 'Pago simulado exitosamente. No se realizó ningún cargo real.',
      data: { boleta: transactionRecord, simulated: true },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  previewPayment,
  payWithQR: beginPayment,
  payWithPlate: beginPayment,
};
