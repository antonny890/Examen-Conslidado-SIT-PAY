/**
 * Controlador de Super Administrador (SUPER_ADMIN)
 * Macro-gestión de empresas, cuencas, auditoría y fiscalización tarifaria
 */
const db = require('../../config/db');

// Dashboard Global Consolidado
const getGlobalDashboard = async (req, res, next) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // Recaudación hoy y total
    const [recHoy] = await db('transacciones')
      .where({ estado: 'EXITOSA' })
      .whereRaw('DATE(fecha_pago) = ?', [hoy])
      .sum('monto as total')
      .count('id as cantidad');

    const [recTotal] = await db('transacciones')
      .where({ estado: 'EXITOSA' })
      .sum('monto as total')
      .count('id as cantidad');

    // Desglose por tipo de pasaje (Fiscalización Ley 26271)
    const desgloseTarifas = await db('transacciones')
      .select('tipo_tarifa_aplicada')
      .count('id as cantidad')
      .sum('monto as total')
      .where({ estado: 'EXITOSA' })
      .groupBy('tipo_tarifa_aplicada');

    // Conteos generales
    const [{ count: totalUsuarios }] = await db('usuarios').count('id as count');
    const [{ count: totalEmpresas }] = await db('empresas').count('id as count');
    const [{ count: totalVehiculos }] = await db('vehiculos').where({ activo: true }).count('id as count');
    const [{ count: totalSolicitudesPendientes }] = await db('solicitudes_preferenciales').where({ estado: 'PENDIENTE' }).count('id as count');

    res.json({
      success: true,
      data: {
        recaudacionHoy: {
          monto: parseFloat(recHoy?.total || 0),
          pasajes: parseInt(recHoy?.cantidad || 0, 10),
        },
        recaudacionHistorica: {
          monto: parseFloat(recTotal?.total || 0),
          pasajes: parseInt(recTotal?.cantidad || 0, 10),
        },
        distribucionFiscalizacion: desgloseTarifas,
        metricas: {
          totalUsuarios: parseInt(totalUsuarios, 10),
          totalEmpresas: parseInt(totalEmpresas, 10),
          totalVehiculos: parseInt(totalVehiculos, 10),
          totalSolicitudesPendientes: parseInt(totalSolicitudesPendientes, 10),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Listar empresas
const getCompanies = async (req, res, next) => {
  try {
    const empresas = await db('empresas')
      .leftJoin('usuarios', 'empresas.admin_usuario_id', 'usuarios.id')
      .leftJoin('perfiles', 'usuarios.id', 'perfiles.usuario_id')
      .select(
        'empresas.*',
        'usuarios.email as admin_email',
        'perfiles.nombres as admin_nombres',
        'perfiles.apellidos as admin_apellidos'
      )
      .orderBy('empresas.nombre_comercial', 'asc');

    res.json({ success: true, data: empresas });
  } catch (error) {
    next(error);
  }
};

// Crear nueva empresa concesionaria
const createCompany = async (req, res, next) => {
  try {
    const { ruc, razonSocial, nombreComercial, direccion, telefono, emailContacto } = req.body;

    if (!ruc || !razonSocial || !nombreComercial || !emailContacto) {
      return res.status(400).json({ success: false, message: 'RUC, Razón Social, Nombre Comercial y Correo son obligatorios.' });
    }

    const [nueva] = await db('empresas')
      .insert({
        ruc: ruc.trim(),
        razon_social: razonSocial.trim(),
        nombre_comercial: nombreComercial.trim(),
        direccion: direccion ? direccion.trim() : null,
        telefono: telefono ? telefono.trim() : null,
        email_contacto: emailContacto.toLowerCase().trim(),
        activo: true,
      })
      .returning('*');

    await db('auditoria_logs').insert({
      usuario_id: req.user.id,
      accion: 'EMPRESA_CREADA',
      modulo: 'EMPRESAS',
      valores_nuevos: JSON.stringify(nueva),
    });

    res.status(201).json({ success: true, message: 'Empresa registrada exitosamente.', data: nueva });
  } catch (error) {
    next(error);
  }
};

// Listar las 10 Unidades de Negocio (C2 a C11)
const getBusinessUnits = async (req, res, next) => {
  try {
    const unidades = await db('unidades_negocio').orderBy('id', 'asc');
    res.json({ success: true, data: unidades });
  } catch (error) {
    next(error);
  }
};

// Consultar Logs de Auditoría (Ley 29733)
const getAuditLogs = async (req, res, next) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const logs = await db('auditoria_logs')
      .leftJoin('usuarios', 'auditoria_logs.usuario_id', 'usuarios.id')
      .select('auditoria_logs.*', 'usuarios.email as usuario_email')
      .orderBy('auditoria_logs.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

// Activar o desactivar usuario
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // 'ACTIVO', 'INACTIVO', 'BLOQUEADO'

    const usuario = await db('usuarios').where({ id }).first();
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    await db('usuarios').where({ id }).update({
      estado: estado.toUpperCase(),
      updated_at: new Date(),
    });

    await db('auditoria_logs').insert({
      usuario_id: req.user.id,
      accion: 'ESTADO_USUARIO_MODIFICADO',
      modulo: 'SEGURIDAD',
      valores_anteriores: JSON.stringify({ usuarioId: id, estadoPrevio: usuario.estado }),
      valores_nuevos: JSON.stringify({ usuarioId: id, nuevoEstado: estado }),
    });

    res.json({ success: true, message: `Usuario actualizado a estado ${estado.toUpperCase()}.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGlobalDashboard,
  getCompanies,
  createCompany,
  getBusinessUnits,
  getAuditLogs,
  toggleUserStatus,
};
