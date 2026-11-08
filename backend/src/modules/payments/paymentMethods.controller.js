const {
  createDocument,
  db,
  getDocument,
  queryCollection,
} = require('../../services/postgresData');

const listPaymentMethods = async (req, res, next) => {
  try {
    const methods = await queryCollection('metodos_pago', 'usuario_id', '==', req.user.id);
    methods.sort((left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    return res.json({ success: true, data: methods });
  } catch (error) {
    return next(error);
  }
};

const addPaymentMethod = async (req, res, next) => {
  try {
    const { cardholder, cardNumber, expiryMonth, expiryYear, cvv } = req.body || {};
    const cleanCardholder = typeof cardholder === 'string' ? cardholder.trim() : '';
    const cleanNumber = typeof cardNumber === 'string' ? cardNumber.replace(/\D/g, '') : '';
    const month = Number(expiryMonth);
    const year = Number(expiryYear);
    const cleanCvv = typeof cvv === 'string' ? cvv.trim() : '';

    if (cleanCardholder.length < 3 || cleanCardholder.length > 100) {
      return res.status(400).json({ success: false, message: 'Ingresa un nombre de titular válido.' });
    }
    if (!/^9999\d{12}$/.test(cleanNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se aceptan tarjetas ficticias de prueba que comiencen con 9999. No ingreses una tarjeta real.',
      });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12 ||
        !Number.isInteger(year) || year < new Date().getFullYear() ||
        !/^\d{3,4}$/.test(cleanCvv)) {
      return res.status(400).json({ success: false, message: 'Revisa la fecha de vencimiento y el código de seguridad.' });
    }
    const expiry = new Date(year, month, 0, 23, 59, 59, 999);
    if (expiry < new Date()) {
      return res.status(400).json({ success: false, message: 'La tarjeta de prueba está vencida.' });
    }

    const existing = await queryCollection('metodos_pago', 'usuario_id', '==', req.user.id);
    const method = await createDocument('metodos_pago', {
      usuario_id: req.user.id,
      tipo: 'TARJETA_SIMULADA',
      marca: 'SIMULADA',
      titular: cleanCardholder,
      ultimos_digitos: cleanNumber.slice(-4),
      mes_vencimiento: month,
      anio_vencimiento: year,
      simulada: true,
      predeterminada: existing.length === 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Tarjeta de prueba agregada. No se guardaron el número completo ni el CVV.',
      data: method,
    });
  } catch (error) {
    return next(error);
  }
};

const removePaymentMethod = async (req, res, next) => {
  try {
    const method = await getDocument('metodos_pago', req.params.id);
    if (!method || method.usuario_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Método de pago no encontrado.' });
    }
    await db.collection('metodos_pago').doc(method.id).delete();
    return res.json({ success: true, message: 'Tarjeta de prueba eliminada.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { addPaymentMethod, listPaymentMethods, removePaymentMethod };
