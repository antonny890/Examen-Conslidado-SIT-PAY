/**
 * Controlador de consulta de tarifa y pagos confirmados por una API bancaria.
 *
 * No se acepta un pago hasta integrar un proveedor que permita iniciarlo y
 * verificar su confirmación. SIT-Pay no almacena fondos ni mantiene saldos.
 */
const db = require('../../config/db');
const { calculateApplicableFare } = require('../../services/fareEngine');

const paymentProviderUnavailable = (res) =>
  res.status(503).json({
    success: false,
    code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
    message: 'El pago no se inició: falta integrar la API bancaria. No se realizó ningún cobro.',
  });

const getVehicleQuery = () =>
  db('vehiculos')
    .join('empresas', 'vehiculos.empresa_id', 'empresas.id')
    .join('unidades_negocio', 'vehiculos.unidad_negocio_id', 'unidades_negocio.id')
    .select(
      'vehiculos.id',
      'vehiculos.placa',
      'vehiculos.empresa_id',
      'vehiculos.qr_codigo_seguro',
      'empresas.nombre_comercial as empresa',
      'unidades_negocio.codigo as cuenca_codigo',
      'unidades_negocio.nombre as cuenca_nombre'
    )
    .where({ 'vehiculos.activo': true });

const normalizePlate = (plate) => {
  const cleanPlate = plate.toUpperCase().trim().replace(/\s+/g, '');
  return !cleanPlate.includes('-') && cleanPlate.length === 6
    ? `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3)}`
    : cleanPlate;
};

const findVehicle = async ({ qrCode, plate }) => {
  let query = getVehicleQuery();

  if (qrCode) {
    query = query.where({ 'vehiculos.qr_codigo_seguro': qrCode.trim() });
  } else if (plate) {
    query = query.where({ 'vehiculos.placa': normalizePlate(plate) });
  }

  return query.first();
};

const previewPayment = async (req, res, next) => {
  try {
    const { plate, qrCode } = req.body;
    if (!plate && !qrCode) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar la placa o el código QR del vehículo.',
      });
    }

    const vehiculo = await findVehicle({ plate, qrCode });
    if (!vehiculo) {
      return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    }

    const tarifa = await calculateApplicableFare(req.user.id, new Date());

    return res.json({
      success: true,
      data: {
        vehiculo: {
          id: vehiculo.id,
          placa: vehiculo.placa,
          empresa: vehiculo.empresa,
          cuenca: `${vehiculo.cuenca_codigo} - ${vehiculo.cuenca_nombre}`,
        },
        tarifa,
        paymentAvailable: false,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const beginPayment = async (req, res, next) => {
  try {
    const { qrCode, plate } = req.body;
    if (!qrCode && !plate) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar la placa o el código QR del vehículo.',
      });
    }

    const vehiculo = await findVehicle({ plate, qrCode });
    if (!vehiculo) {
      return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    }

    return paymentProviderUnavailable(res);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  previewPayment,
  payWithQR: beginPayment,
  payWithPlate: beginPayment,
};
