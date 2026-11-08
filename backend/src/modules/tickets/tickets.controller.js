const {
  getDocument,
  queryCollection,
  timestampToDate,
} = require('../../services/firestoreData');

const dateDescending = (left, right) =>
  (timestampToDate(right.fecha_pago)?.getTime() || 0) -
  (timestampToDate(left.fecha_pago)?.getTime() || 0);

const expandTicket = async (transaction) => {
  const [vehicle, company] = await Promise.all([
    getDocument('vehiculos', transaction.vehiculo_id),
    getDocument('empresas', transaction.empresa_id),
  ]);
  const unit = vehicle?.unidad_negocio_id
    ? await getDocument('unidades_negocio', vehicle.unidad_negocio_id)
    : null;
  return {
    ...transaction,
    placa: vehicle?.placa || '',
    empresa_nombre: company?.nombre_comercial || '',
    cuenca_codigo: unit?.codigo || '',
    cuenca_nombre: unit?.nombre || '',
  };
};

const getMyTickets = async (req, res, next) => {
  try {
    const rawLimit = Number.parseInt(req.query.limit, 10);
    const rawPage = Number.parseInt(req.query.page, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 30;
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;
    const transactions = (await queryCollection('transacciones', 'pasajero_id', '==', req.user.id))
      .filter((record) => record.estado === 'EXITOSA')
      .sort(dateDescending);
    const tickets = await Promise.all(
      transactions.slice((page - 1) * limit, page * limit).map(expandTicket),
    );
    return res.json({
      success: true,
      data: {
        tickets,
        pagination: { total: transactions.length, page, limit },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getTicketByCode = async (req, res, next) => {
  try {
    const code = String(req.params.code || '').trim();
    const matches = await queryCollection('transacciones', 'codigo_boleta', '==', code);
    const transaction = matches.find((record) => record.estado === 'EXITOSA');
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Boleta digital no encontrada.' });
    }
    if (transaction.pasajero_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Boleta digital no encontrada.' });
    }

    const [expanded, profile, vehicle, company, user] = await Promise.all([
      expandTicket(transaction),
      getDocument('perfiles', transaction.pasajero_id),
      getDocument('vehiculos', transaction.vehiculo_id),
      getDocument('empresas', transaction.empresa_id),
      getDocument('usuarios', transaction.pasajero_id),
    ]);
    const unit = vehicle?.unidad_negocio_id
      ? await getDocument('unidades_negocio', vehicle.unidad_negocio_id)
      : null;
    return res.json({
      success: true,
      data: {
        id: transaction.id,
        codigo_boleta: transaction.codigo_boleta,
        monto: transaction.monto,
        tipo_tarifa_aplicada: transaction.tipo_tarifa_aplicada,
        metodo_pago: transaction.metodo_pago,
        fecha_pago: transaction.fecha_pago,
        estado: transaction.estado,
        placa: vehicle?.placa || '',
        vehiculo_modelo: vehicle?.modelo || '',
        empresa_ruc: company?.ruc || '',
        empresa_razon_social: company?.razon_social || '',
        empresa_nombre: company?.nombre_comercial || '',
        cuenca_codigo: unit?.codigo || '',
        cuenca_nombre: unit?.nombre || '',
        pasajero_nombres: profile?.nombres || '',
        pasajero_apellidos: profile?.apellidos || '',
        pasajero_documento: profile?.numero_documento || '',
        pasajero_email: user?.email || '',
        ...expanded,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getMyTickets, getTicketByCode };
