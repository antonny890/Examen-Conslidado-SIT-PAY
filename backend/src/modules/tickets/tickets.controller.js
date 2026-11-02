/**
 * Controlador de Boleta Digital e Historial de Pasajes (Ley 29571)
 */
const db = require('../../config/db');

// Listar historial de pagos del pasajero autenticado
const getMyTickets = async (req, res, next) => {
  try {
    const pasajeroId = req.user.id;
    const { limit = 30, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const tickets = await db('transacciones')
      .join('vehiculos', 'transacciones.vehiculo_id', 'vehiculos.id')
      .join('empresas', 'transacciones.empresa_id', 'empresas.id')
      .join('unidades_negocio', 'vehiculos.unidad_negocio_id', 'unidades_negocio.id')
      .select(
        'transacciones.id',
        'transacciones.codigo_boleta',
        'transacciones.monto',
        'transacciones.tipo_tarifa_aplicada',
        'transacciones.metodo_pago',
        'transacciones.fecha_pago',
        'transacciones.estado',
        'vehiculos.placa',
        'empresas.nombre_comercial as empresa_nombre',
        'unidades_negocio.codigo as cuenca_codigo',
        'unidades_negocio.nombre as cuenca_nombre'
      )
      .where({ 'transacciones.pasajero_id': pasajeroId })
      .andWhere({ 'transacciones.estado': 'EXITOSA' })
      .orderBy('transacciones.fecha_pago', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('transacciones')
      .where({ pasajero_id: pasajeroId, estado: 'EXITOSA' })
      .count('id as count');

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          total: parseInt(count, 10),
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Obtener detalle de boleta digital por su código único
const getTicketByCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    const ticket = await db('transacciones')
      .join('vehiculos', 'transacciones.vehiculo_id', 'vehiculos.id')
      .join('empresas', 'transacciones.empresa_id', 'empresas.id')
      .join('unidades_negocio', 'vehiculos.unidad_negocio_id', 'unidades_negocio.id')
      .join('usuarios', 'transacciones.pasajero_id', 'usuarios.id')
      .join('perfiles', 'usuarios.id', 'perfiles.usuario_id')
      .select(
        'transacciones.id',
        'transacciones.codigo_boleta',
        'transacciones.monto',
        'transacciones.tipo_tarifa_aplicada',
        'transacciones.metodo_pago',
        'transacciones.fecha_pago',
        'transacciones.estado',
        'vehiculos.placa',
        'vehiculos.modelo as vehiculo_modelo',
        'empresas.ruc as empresa_ruc',
        'empresas.razon_social as empresa_razon_social',
        'empresas.nombre_comercial as empresa_nombre',
        'unidades_negocio.codigo as cuenca_codigo',
        'unidades_negocio.nombre as cuenca_nombre',
        'perfiles.nombres as pasajero_nombres',
        'perfiles.apellidos as pasajero_apellidos',
        'perfiles.numero_documento as pasajero_documento'
      )
      .where({ 'transacciones.codigo_boleta': code.trim(), 'transacciones.estado': 'EXITOSA' })
      .first();

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Boleta digital no encontrada.' });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyTickets,
  getTicketByCode,
};
