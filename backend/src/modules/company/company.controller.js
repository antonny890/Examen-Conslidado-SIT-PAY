/**
 * Controlador de Gestión de Empresa (ADMIN_EMPRESA)
 * Métricas de recaudación, gestión de choferes, flota y exportación a CSV
 */
const bcrypt = require('bcrypt');
const db = require('../../config/db');

// Obtener datos consolidados del Dashboard de Empresa
const getCompanyDashboard = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;

    // Obtener la empresa vinculada al admin autenticado
    const empresa = await db('empresas')
      .where({ admin_usuario_id: usuarioId })
      .first();

    const empresaId = empresa ? empresa.id : req.query.empresaId || (await db('empresas').first())?.id;

    if (!empresaId) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada para este administrador.' });
    }

    const hoy = new Date().toISOString().split('T')[0];

    // 1. Recaudación del día
    const recHoy = await db('transacciones')
      .where({ empresa_id: empresaId, estado: 'EXITOSA' })
      .whereRaw('DATE(fecha_pago) = ?', [hoy])
      .sum('monto as total')
      .count('id as cantidad')
      .first();

    // 2. Recaudación histórica total
    const recTotal = await db('transacciones')
      .where({ empresa_id: empresaId, estado: 'EXITOSA' })
      .sum('monto as total')
      .count('id as cantidad')
      .first();

    // 3. Cantidad de vehículos y choferes
    const [{ count: totalVehiculos }] = await db('vehiculos')
      .where({ empresa_id: empresaId, activo: true })
      .count('id as count');

    const [{ count: totalChoferes }] = await db('choferes')
      .where({ empresa_id: empresaId })
      .count('id as count');

    // 4. Solicitudes y reclamos pendientes
    const [{ count: reclamosPendientes }] = await db('incidencias_reclamos')
      .where({ empresa_id: empresaId, estado: 'REGISTRADO' })
      .count('id as count');

    // 5. Últimas 10 transacciones
    const ultimasTransacciones = await db('transacciones')
      .join('vehiculos', 'transacciones.vehiculo_id', 'vehiculos.id')
      .select(
        'transacciones.id',
        'transacciones.codigo_boleta',
        'transacciones.monto',
        'transacciones.tipo_tarifa_aplicada',
        'transacciones.fecha_pago',
        'vehiculos.placa'
      )
      .where({ 'transacciones.empresa_id': empresaId, 'transacciones.estado': 'EXITOSA' })
      .orderBy('transacciones.fecha_pago', 'desc')
      .limit(10);

    res.json({
      success: true,
      data: {
        empresa: empresa || { id: empresaId },
        recaudacionHoy: {
          monto: parseFloat(recHoy?.total || 0),
          pasajesCobrados: parseInt(recHoy?.cantidad || 0, 10),
        },
        recaudacionHistorica: {
          monto: parseFloat(recTotal?.total || 0),
          pasajesCobrados: parseInt(recTotal?.cantidad || 0, 10),
        },
        flota: {
          totalVehiculos: parseInt(totalVehiculos, 10),
          totalChoferes: parseInt(totalChoferes, 10),
        },
        reclamosPendientes: parseInt(reclamosPendientes, 10),
        ultimasTransacciones,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Crear nuevo chofer y usuario vinculado
const createDriver = async (req, res, next) => {
  try {
    const { email, password, nombres, apellidos, dni, telefono, numeroLicencia, categoriaLicencia, vehiculoId, empresaId } = req.body;

    if (!email || !password || !nombres || !apellidos || !dni || !numeroLicencia) {
      return res.status(400).json({ success: false, message: 'Todos los campos obligatorios deben ser llenados.' });
    }

    const targetEmpresaId = empresaId || (await db('empresas').where({ admin_usuario_id: req.user.id }).first())?.id;
    if (!targetEmpresaId) {
      return res.status(400).json({ success: false, message: 'Identificador de empresa no determinado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const rolChofer = await db('roles').where({ codigo: 'CHOFER' }).first();

    const choferCreado = await db.transaction(async (trx) => {
      const [usuario] = await trx('usuarios')
        .insert({
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          rol_id: rolChofer.id,
          estado: 'ACTIVO',
          email_verificado: true,
        })
        .returning('*');

      await trx('perfiles').insert({
        usuario_id: usuario.id,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        tipo_documento: 'DNI',
        numero_documento: dni.trim(),
        telefono: telefono ? telefono.trim() : null,
        consentimiento_datos: true,
        fecha_consentimiento: new Date(),
      });

      const [chofer] = await trx('choferes')
        .insert({
          usuario_id: usuario.id,
          empresa_id: targetEmpresaId,
          vehiculo_id: vehiculoId || null,
          numero_licencia: numeroLicencia.trim(),
          categoria_licencia: categoriaLicencia || 'A-IIIa',
          estado_operativo: 'DISPONIBLE',
        })
        .returning('*');

      return { usuario, chofer };
    });

    res.status(201).json({
      success: true,
      message: 'Chofer registrado exitosamente y credenciales generadas.',
      data: choferCreado,
    });
  } catch (error) {
    next(error);
  }
};

// Exportar recaudación a formato CSV
const exportReportCSV = async (req, res, next) => {
  try {
    const { empresaId, fechaInicio, fechaFin } = req.query;

    let query = db('transacciones')
      .join('vehiculos', 'transacciones.vehiculo_id', 'vehiculos.id')
      .join('unidades_negocio', 'vehiculos.unidad_negocio_id', 'unidades_negocio.id')
      .select(
        'transacciones.codigo_boleta',
        'transacciones.fecha_pago',
        'vehiculos.placa',
        'unidades_negocio.codigo as cuenca',
        'transacciones.tipo_tarifa_aplicada as tarifa',
        'transacciones.monto',
        'transacciones.metodo_pago'
      )
      .where({ 'transacciones.estado': 'EXITOSA' })
      .orderBy('transacciones.fecha_pago', 'desc');

    if (empresaId) query = query.where({ 'transacciones.empresa_id': empresaId });
    if (fechaInicio) query = query.where('transacciones.fecha_pago', '>=', fechaInicio);
    if (fechaFin) query = query.where('transacciones.fecha_pago', '<=', `${fechaFin} 23:59:59`);

    const filas = await query.limit(1000);

    // Formatear CSV con cabeceras estándar
    const headers = 'Codigo_Boleta,Fecha_Hora,Placa,Cuenca,Tipo_Tarifa,Monto_Soles,Metodo_Pago\n';
    const csvRows = filas
      .map((f) =>
        `"${f.codigo_boleta}","${new Date(f.fecha_pago).toISOString()}","${f.placa}","${f.cuenca}","${f.tarifa}",${parseFloat(f.monto).toFixed(2)},"${f.metodo_pago}"`
      )
      .join('\n');

    const csvContent = headers + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=recaudacion-sit-pay-${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanyDashboard,
  createDriver,
  exportReportCSV,
};
