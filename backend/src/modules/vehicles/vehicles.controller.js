const crypto = require('node:crypto');
const {
  db,
  getDocument,
  listCollection,
  queryCollection,
  writeAuditLog,
} = require('../../services/firestoreData');
const {
  generateSecureVehicleToken,
  generateQRCodeSVG,
  generateQRCodeDataURL,
} = require('../../utils/qrGenerator');

const companyForAdmin = async (userId) => {
  const companies = await queryCollection('empresas', 'admin_usuario_id', '==', userId);
  return companies.find((company) => company.activo === true) || null;
};

const canManageVehicle = async (user, vehicle) => {
  if (user.rol === 'SUPER_ADMIN') return true;
  const company = await companyForAdmin(user.id);
  return Boolean(company && company.id === vehicle.empresa_id);
};

const normalizePlate = (plate) => {
  const cleanPlate = String(plate || '').toUpperCase().trim().replace(/\s+/g, '');
  if (!cleanPlate.includes('-') && cleanPlate.length === 6) {
    return `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3)}`;
  }
  return cleanPlate;
};

const getVehicles = async (req, res, next) => {
  try {
    const { empresaId, unidadNegocioId } = req.query;
    let vehicles = (await listCollection('vehiculos')).filter((vehicle) => vehicle.activo === true);
    if (req.user.rol === 'ADMIN_EMPRESA') {
      const company = await companyForAdmin(req.user.id);
      if (!company) return res.status(404).json({ success: false, message: 'No se encontró una empresa activa para este administrador.' });
      vehicles = vehicles.filter((vehicle) => vehicle.empresa_id === company.id);
    }
    if (empresaId) vehicles = vehicles.filter((vehicle) => vehicle.empresa_id === empresaId);
    if (unidadNegocioId) vehicles = vehicles.filter((vehicle) => vehicle.unidad_negocio_id === unidadNegocioId);
    vehicles.sort((left, right) => String(left.placa).localeCompare(String(right.placa)));
    const data = await Promise.all(vehicles.map(async (vehicle) => {
      const [company, unit, drivers] = await Promise.all([
        getDocument('empresas', vehicle.empresa_id),
        getDocument('unidades_negocio', vehicle.unidad_negocio_id),
        queryCollection('choferes', 'vehiculo_id', '==', vehicle.id),
      ]);
      const driver = drivers[0];
      const profile = driver ? await getDocument('perfiles', driver.usuario_id) : null;
      return {
        ...vehicle,
        empresa_nombre: company?.nombre_comercial || '',
        cuenca_codigo: unit?.codigo || '',
        cuenca_nombre: unit?.nombre || '',
        chofer_id: driver?.id || null,
        numero_licencia: driver?.numero_licencia || null,
        chofer_nombres: profile?.nombres || null,
        chofer_apellidos: profile?.apellidos || null,
      };
    }));
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const getVehicleQR = async (req, res, next) => {
  try {
    const vehicle = await getDocument('vehiculos', req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    if (!(await canManageVehicle(req.user, vehicle))) {
      return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    }
    const company = await getDocument('empresas', vehicle.empresa_id);
    return res.json({
      success: true,
      data: {
        placa: vehicle.placa,
        empresa: company?.nombre_comercial || '',
        tokenSeguro: vehicle.qr_codigo_seguro,
        qrSvg: await generateQRCodeSVG(vehicle.qr_codigo_seguro),
        qrPngBase64: await generateQRCodeDataURL(vehicle.qr_codigo_seguro),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getVehicleQRByPlate = async (req, res, next) => {
  try {
    const cleanPlate = normalizePlate(req.params.plate);
    const matches = await queryCollection('vehiculos', 'placa', '==', cleanPlate);
    const vehicle = matches.find((item) => item.activo === true);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: `No se encontró vehículo con placa ${cleanPlate}.` });
    }
    const company = await getDocument('empresas', vehicle.empresa_id);
    return res.json({
      success: true,
      data: {
        vehiculoId: vehicle.id,
        placa: vehicle.placa,
        empresa: company?.nombre_comercial || '',
        tokenSeguro: vehicle.qr_codigo_seguro,
        qrSvg: await generateQRCodeSVG(vehicle.qr_codigo_seguro),
        qrPngBase64: await generateQRCodeDataURL(vehicle.qr_codigo_seguro),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const regenerateQR = async (req, res, next) => {
  try {
    const vehicle = await getDocument('vehiculos', req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    if (!(await canManageVehicle(req.user, vehicle))) {
      return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    }
    const token = generateSecureVehicleToken(vehicle.placa);
    const svg = await generateQRCodeSVG(token);
    await db.collection('vehiculos').doc(vehicle.id).update({
      qr_codigo_seguro: token,
      qr_imagen_svg: svg,
      updated_at: new Date(),
    });
    await writeAuditLog({
      usuarioId: req.user.id,
      accion: 'REGENERACION_QR_VEHICULO',
      modulo: 'FLOTA',
      valoresAnteriores: { placa: vehicle.placa },
      valoresNuevos: { placa: vehicle.placa },
    });
    return res.json({
      success: true,
      message: `Código QR para la placa ${vehicle.placa} regenerado con éxito. El QR anterior quedó invalidado.`,
      data: { placa: vehicle.placa, nuevoToken: token, qrSvg: svg },
    });
  } catch (error) {
    return next(error);
  }
};

const reassignDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { choferId } = req.body || {};
    const vehicle = await getDocument('vehiculos', id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    if (!(await canManageVehicle(req.user, vehicle))) {
      return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
    }
    const drivers = await queryCollection('choferes', 'vehiculo_id', '==', id);
    const nextDriver = choferId ? await getDocument('choferes', choferId) : null;
    if (choferId && !nextDriver) {
      return res.status(404).json({ success: false, message: 'Chofer no encontrado.' });
    }
    if (nextDriver && nextDriver.empresa_id !== vehicle.empresa_id) {
      return res.status(400).json({ success: false, message: 'El chofer y el vehículo deben pertenecer a la misma empresa.' });
    }
    if (nextDriver?.vehiculo_id && nextDriver.vehiculo_id !== id) {
      return res.status(409).json({ success: false, message: 'El chofer ya tiene otro vehículo asignado.' });
    }

    const batch = db.batch();
    drivers.forEach((driver) => {
      batch.update(db.collection('choferes').doc(driver.id), { vehiculo_id: null, updated_at: new Date() });
    });
    if (nextDriver) {
      batch.update(db.collection('choferes').doc(nextDriver.id), { vehiculo_id: id, updated_at: new Date() });
    }
    await batch.commit();
    await writeAuditLog({
      usuarioId: req.user.id,
      accion: 'REASIGNACION_CHOFER_PLACA',
      modulo: 'FLOTA',
      valoresNuevos: { vehiculoId: id, placa: vehicle.placa, nuevoChoferId: choferId || null },
    });
    return res.json({
      success: true,
      message: `Asignación de chofer para la placa ${vehicle.placa} actualizada correctamente.`,
    });
  } catch (error) {
    return next(error);
  }
};

const createVehicle = async (req, res, next) => {
  try {
    const {
      placa,
      empresaId: requestedCompanyId,
      unidadNegocioId,
      modelo,
      anioFabricacion,
      capacidadPasajeros,
    } = req.body || {};
    if (!placa || !unidadNegocioId ||
        (req.user.rol === 'SUPER_ADMIN' && !requestedCompanyId)) {
      return res.status(400).json({ success: false, message: 'Placa, empresa y unidad de negocio son obligatorios.' });
    }
    const inputPlate = String(placa).toUpperCase().trim().replace(/\s+/g, '');
    if (!/^[A-Z0-9]{3}-?[A-Z0-9]{3}$/.test(inputPlate)) {
      return res.status(400).json({ success: false, message: 'La placa debe tener un formato válido, por ejemplo ABC-123.' });
    }
    const cleanPlate = normalizePlate(inputPlate);
    const existing = (await listCollection('vehiculos'))
      .filter((vehicle) => normalizePlate(vehicle.placa) === cleanPlate);
    if (existing.length) return res.status(409).json({ success: false, message: 'La placa ya está registrada.' });
    const [company, unit] = await Promise.all([
      req.user.rol === 'ADMIN_EMPRESA'
        ? companyForAdmin(req.user.id)
        : getDocument('empresas', requestedCompanyId),
      getDocument('unidades_negocio', unidadNegocioId),
    ]);
    if (!company || company.activo !== true) {
      return res.status(404).json({ success: false, message: 'Seleccione una empresa activa.' });
    }
    if (!unit) return res.status(404).json({ success: false, message: 'La unidad de negocio no existe.' });
    const token = generateSecureVehicleToken(cleanPlate);
    const svg = await generateQRCodeSVG(token);
    const now = new Date();
    const vehicleRef = db.collection('vehiculos').doc();
    const plateIndexRef = db.collection('indice_placas')
      .doc(crypto.createHash('sha256').update(cleanPlate).digest('hex'));
    const vehicleData = {
      placa: cleanPlate,
      empresa_id: company.id,
      unidad_negocio_id: unidadNegocioId,
      modelo: modelo || 'Bus Urbano Estándar',
      anio_fabricacion: anioFabricacion || 2022,
      capacidad_pasajeros: capacidadPasajeros || 35,
      qr_codigo_seguro: token,
      qr_imagen_svg: svg,
      activo: true,
      created_at: now,
      updated_at: now,
    };
    try {
      await db.runTransaction(async (transaction) => {
        const plateIndex = await transaction.get(plateIndexRef);
        if (plateIndex.exists) {
          const conflict = new Error('PLATE_ALREADY_REGISTERED');
          conflict.code = 'PLATE_ALREADY_REGISTERED';
          throw conflict;
        }
        transaction.create(vehicleRef, vehicleData);
        transaction.create(plateIndexRef, { vehiculo_id: vehicleRef.id, placa: cleanPlate });
      });
    } catch (error) {
      if (error.code === 'PLATE_ALREADY_REGISTERED') {
        return res.status(409).json({ success: false, message: 'La placa ya está registrada.' });
      }
      return next(error);
    }
    return res.status(201).json({
      success: true,
      message: `Vehículo ${cleanPlate} registrado y QR generado con éxito.`,
      data: { id: vehicleRef.id, ...vehicleData },
    });
  } catch (error) {
    return next(error);
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
