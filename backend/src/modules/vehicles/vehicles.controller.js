/**
 * Controlador de Flota, Vehículos y Códigos QR Fijos
 * Cumple: Código QR seguro opaco por placa que NO expone datos personales ni tarifas.
 */
const db = require('../../config/db');
const { generateSecureVehicleToken, generateQRCodeSVG, generateQRCodeDataURL } = require('../../utils/qrGenerator');

// Listar vehículos
const getVehicles = async (req, res, next) => {
  try {
    const { empresaId, unidadNegocioId } = req.query;

    let query = db('vehiculos')
      .join('empresas', 'vehiculos.empresa_id', 'empresas.id')
      .join('unidades_negocio', 'vehiculos.unidad_negocio_id', 'unidades_negocio.id')
      .leftJoin('choferes', 'vehiculos.id', 'choferes.vehiculo_id')
      .leftJoin('usuarios as u_chofer', 'choferes.usuario_id', 'u_chofer.id')
      .leftJoin('perfiles as p_chofer', 'u_chofer.id', 'p_chofer.usuario_id')
      .select(
        'vehiculos.*',
        'empresas.nombre_comercial as empresa_nombre',
        'unidades_negocio.codigo as cuenca_codigo',
        'unidades_negocio.nombre as cuenca_nombre',
        'choferes.id as chofer_id',
        'choferes.numero_licencia',
        'p_chofer.nombres as chofer_nombres',
        'p_chofer.apellidos as chofer_apellidos'
      )
      .where({ 'vehiculos.activo': true });

    if (req.user.rol === 'ADMIN_EMPRESA') {
      const empresa = await db('empresas')
        .where({ admin_usuario_id: req.user.id, activo: true })
        .first();
      if (!empresa) {
        return res.status(404).json({ success: false, message: 'No se encontró una empresa activa para este administrador.' });
      }
      query = query.where({ 'vehiculos.empresa_id': empresa.id });
    }

    if (empresaId) query = query.where({ 'vehiculos.empresa_id': empresaId });
    if (unidadNegocioId) query = query.where({ 'vehiculos.unidad_negocio_id': unidadNegocioId });

    const vehiculos = await query.orderBy('vehiculos.placa', 'asc');

    res.json({ success: true, data: vehiculos });
  } catch (error) {
    next(error);
  }
};

// Obtener QR vectorial y Base64 de un vehículo por ID
const getVehicleQR = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehiculo = await db('vehiculos')
      .join('empresas', 'vehiculos.empresa_id', 'empresas.id')
      .select('vehiculos.*', 'empresas.nombre_comercial as empresa_nombre')
      .where({ 'vehiculos.id': id })
      .first();

    if (!vehiculo) {
      return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    }

    const svgString = await generateQRCodeSVG(vehiculo.qr_codigo_seguro);
    const dataUrl = await generateQRCodeDataURL(vehiculo.qr_codigo_seguro);

    res.json({
      success: true,
      data: {
        placa: vehiculo.placa,
        empresa: vehiculo.empresa_nombre,
        tokenSeguro: vehiculo.qr_codigo_seguro,
        qrSvg: svgString,
        qrPngBase64: dataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Obtener QR por número de placa (ideal para chofer en su app o pasajero)
const getVehicleQRByPlate = async (req, res, next) => {
  try {
    const { plate } = req.params;
    const cleanPlate = plate.toUpperCase().trim();

    const vehiculo = await db('vehiculos')
      .join('empresas', 'vehiculos.empresa_id', 'empresas.id')
      .select('vehiculos.*', 'empresas.nombre_comercial as empresa_nombre')
      .where({ 'vehiculos.placa': cleanPlate })
      .first();

    if (!vehiculo) {
      return res.status(404).json({ success: false, message: `No se encontró vehículo con placa ${cleanPlate}.` });
    }

    const svgString = await generateQRCodeSVG(vehiculo.qr_codigo_seguro);
    const dataUrl = await generateQRCodeDataURL(vehiculo.qr_codigo_seguro);

    res.json({
      success: true,
      data: {
        vehiculoId: vehiculo.id,
        placa: vehiculo.placa,
        empresa: vehiculo.empresa_nombre,
        tokenSeguro: vehiculo.qr_codigo_seguro,
        qrSvg: svgString,
        qrPngBase64: dataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Regenerar código QR si se compromete la seguridad física de la calcomanía
const regenerateQR = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehiculo = await db('vehiculos').where({ id }).first();
    if (!vehiculo) {
      return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    }

    const nuevoToken = generateSecureVehicleToken(vehiculo.placa);
    const svgString = await generateQRCodeSVG(nuevoToken);

    await db('vehiculos').where({ id }).update({
      qr_codigo_seguro: nuevoToken,
      qr_imagen_svg: svgString,
      updated_at: new Date(),
    });

    // Auditoría
    await db('auditoria_logs').insert({
      usuario_id: req.user.id,
      accion: 'REGENERACION_QR_VEHICULO',
      modulo: 'FLOTA',
      valores_anteriores: JSON.stringify({ placa: vehiculo.placa, tokenPrevio: vehiculo.qr_codigo_seguro }),
      valores_nuevos: JSON.stringify({ placa: vehiculo.placa, nuevoToken }),
    });

    res.json({
      success: true,
      message: `Código QR para la placa ${vehiculo.placa} regenerado con éxito. El QR anterior quedó invalidado.`,
      data: {
        placa: vehiculo.placa,
        nuevoToken,
        qrSvg: svgString,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reasignar chofer a una placa fija (ADMIN_EMPRESA / SUPER_ADMIN)
const reassignDriver = async (req, res, next) => {
  try {
    const { id } = req.params; // vehiculo_id
    const { choferId } = req.body; // id de la tabla choferes (o null para desvincular)

    const vehiculo = await db('vehiculos').where({ id }).first();
    if (!vehiculo) {
      return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    }

    await db.transaction(async (trx) => {
      // Liberar al chofer que actualmente tenía este vehículo asignado
      await trx('choferes')
        .where({ vehiculo_id: id })
        .update({ vehiculo_id: null, updated_at: new Date() });

      if (choferId) {
        // Asignar el nuevo chofer asegurando que no tenga otro vehículo asignado previamente
        await trx('choferes')
          .where({ id: choferId })
          .update({ vehiculo_id: id, updated_at: new Date() });
      }

      await trx('auditoria_logs').insert({
        usuario_id: req.user.id,
        accion: 'REASIGNACION_CHOFER_PLACA',
        modulo: 'FLOTA',
        valores_nuevos: JSON.stringify({ vehiculoId: id, placa: vehiculo.placa, nuevoChoferId: choferId }),
      });
    });

    res.json({
      success: true,
      message: `Asignación de chofer para la placa ${vehiculo.placa} actualizada correctamente.`,
    });
  } catch (error) {
    next(error);
  }
};

// Crear nuevo vehículo con generación automática de QR
const createVehicle = async (req, res, next) => {
  try {
    const { placa, empresaId, unidadNegocioId, modelo, anioFabricacion, capacidadPasajeros } = req.body;

    if (!placa || !empresaId || !unidadNegocioId) {
      return res.status(400).json({ success: false, message: 'Placa, empresa y unidad de negocio son obligatorios.' });
    }

    const cleanPlate = placa.toUpperCase().trim();
    const tokenSeguro = generateSecureVehicleToken(cleanPlate);
    const svgString = await generateQRCodeSVG(tokenSeguro);

    const [nuevoVehiculo] = await db('vehiculos')
      .insert({
        placa: cleanPlate,
        empresa_id: empresaId,
        unidad_negocio_id: unidadNegocioId,
        modelo: modelo || 'Bus Urbano Estándar',
        anio_fabricacion: anioFabricacion || 2022,
        capacidad_pasajeros: capacidadPasajeros || 35,
        qr_codigo_seguro: tokenSeguro,
        qr_imagen_svg: svgString,
        activo: true,
      })
      .returning('*');

    res.status(201).json({
      success: true,
      message: `Vehículo ${cleanPlate} registrado y QR generado con éxito.`,
      data: nuevoVehiculo,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVehicles,
  getVehicleQR,
  getVehicleQRByPlate,
  regenerateQR,
  reassignDriver,
  createVehicle,
};
