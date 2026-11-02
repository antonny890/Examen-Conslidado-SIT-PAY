/**
 * Controlador de Super Administrador (SUPER_ADMIN)
 * Macro-gestión de empresas, cuencas, auditoría y fiscalización tarifaria
 */
const db = require('../../config/db');
const bcrypt = require('bcrypt');

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
    if (!/^\d{11}$/.test(String(ruc).trim())) {
      return res.status(400).json({ success: false, message: 'El RUC debe contener exactamente 11 dígitos.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailContacto).trim())) {
      return res.status(400).json({ success: false, message: 'Ingrese un correo de contacto válido.' });
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

// Desactivación lógica para conservar las relaciones históricas y auditoría.
const setCompanyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ success: false, message: 'El estado activo debe ser verdadero o falso.' });
    }

    const company = await db('empresas').where({ id }).first();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
    }

    const [updatedCompany] = await db('empresas')
      .where({ id })
      .update({ activo, updated_at: new Date() })
      .returning('*');

    await db('auditoria_logs').insert({
      usuario_id: req.user.id,
      accion: activo ? 'EMPRESA_ACTIVADA' : 'EMPRESA_DESACTIVADA',
      modulo: 'EMPRESAS',
      valores_anteriores: JSON.stringify({ empresaId: id, activo: company.activo }),
      valores_nuevos: JSON.stringify({ empresaId: id, activo }),
    });

    res.json({
      success: true,
      message: activo ? 'Empresa reactivada.' : 'Empresa desactivada sin borrar su historial.',
      data: updatedCompany,
    });
  } catch (error) {
    next(error);
  }
};

const getAdministrators = async (req, res, next) => {
  try {
    const administrators = await db('usuarios')
      .join('roles', 'usuarios.rol_id', 'roles.id')
      .leftJoin('perfiles', 'usuarios.id', 'perfiles.usuario_id')
      .leftJoin('empresas', 'empresas.admin_usuario_id', 'usuarios.id')
      .whereIn('roles.codigo', ['SUPER_ADMIN', 'ADMIN_EMPRESA'])
      .whereNull('usuarios.deleted_at')
      .select(
        'usuarios.id',
        'usuarios.email',
        'usuarios.estado',
        'usuarios.email_verificado',
        'usuarios.created_at',
        'roles.codigo as rol',
        'perfiles.nombres',
        'perfiles.apellidos',
        'empresas.id as empresa_id',
        'empresas.nombre_comercial as empresa_nombre'
      )
      .orderBy('roles.codigo')
      .orderBy('perfiles.apellidos');

    res.json({ success: true, data: administrators });
  } catch (error) {
    next(error);
  }
};

const createAdministrator = async (req, res, next) => {
  try {
    const {
      email,
      password,
      nombres,
      apellidos,
      dni,
      telefono,
      empresaId,
    } = req.body;

    if (!email || !password || !nombres || !apellidos || !dni || !empresaId) {
      return res.status(400).json({
        success: false,
        message: 'Correo, contraseña, nombres, apellidos, DNI y empresa son obligatorios.',
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ success: false, message: 'Ingrese un correo válido.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (!/^\d{8}$/.test(String(dni).trim())) {
      return res.status(400).json({ success: false, message: 'El DNI debe contener exactamente 8 dígitos.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db('usuarios').where({ email: normalizedEmail }).first();
    if (existing) {
      return res.status(409).json({ success: false, message: 'Ese correo ya está registrado.' });
    }

    const company = await db('empresas').where({ id: empresaId, activo: true }).first();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Seleccione una empresa activa.' });
    }
    if (company.admin_usuario_id) {
      const currentAdministrator = await db('usuarios')
        .where({ id: company.admin_usuario_id })
        .first();
      if (currentAdministrator?.estado === 'ACTIVO') {
        return res.status(409).json({ success: false, message: 'La empresa ya tiene un administrador activo asignado.' });
      }
    }

    const role = await db('roles').where({ codigo: 'ADMIN_EMPRESA' }).first();
    if (!role) {
      return res.status(500).json({ success: false, message: 'Rol ADMIN_EMPRESA no configurado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const administrator = await db.transaction(async (trx) => {
      const [user] = await trx('usuarios')
        .insert({
          email: normalizedEmail,
          password_hash: passwordHash,
          rol_id: role.id,
          estado: 'ACTIVO',
          email_verificado: true,
        })
        .returning(['id', 'email', 'estado', 'created_at']);

      await trx('perfiles').insert({
        usuario_id: user.id,
        nombres: String(nombres).trim(),
        apellidos: String(apellidos).trim(),
        tipo_documento: 'DNI',
        numero_documento: String(dni).trim(),
        telefono: telefono ? String(telefono).trim() : null,
        consentimiento_datos: true,
        fecha_consentimiento: new Date(),
      });

      await trx('empresas').where({ id: empresaId }).update({
        admin_usuario_id: user.id,
        updated_at: new Date(),
      });

      await trx('auditoria_logs').insert({
        usuario_id: req.user.id,
        accion: 'ADMIN_EMPRESA_CREADO',
        modulo: 'SEGURIDAD',
        valores_nuevos: JSON.stringify({ usuarioId: user.id, email: user.email, empresaId }),
      });

      return user;
    });

    res.status(201).json({
      success: true,
      message: 'Administrador de empresa creado.',
      data: {
        ...administrator,
        nombres: String(nombres).trim(),
        apellidos: String(apellidos).trim(),
        rol: 'ADMIN_EMPRESA',
        empresa_id: company.id,
        empresa_nombre: company.nombre_comercial,
      },
    });
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
    const { estado } = req.body;
    if (!['ACTIVO', 'INACTIVO'].includes(String(estado).toUpperCase())) {
      return res.status(400).json({ success: false, message: 'El estado debe ser ACTIVO o INACTIVO.' });
    }
    if (id === req.user.id && String(estado).toUpperCase() !== 'ACTIVO') {
      return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta.' });
    }

    const usuario = await db('usuarios')
      .join('roles', 'usuarios.rol_id', 'roles.id')
      .select('usuarios.*', 'roles.codigo as rol_codigo')
      .where({ 'usuarios.id': id })
      .first();
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    if (usuario.rol_codigo !== 'ADMIN_EMPRESA') {
      return res.status(400).json({ success: false, message: 'Solo se puede cambiar el acceso a administradores de empresa.' });
    }

    const normalizedStatus = String(estado).toUpperCase();
    await db('usuarios').where({ id }).update({
      estado: normalizedStatus,
      updated_at: new Date(),
    });

    await db('auditoria_logs').insert({
      usuario_id: req.user.id,
      accion: 'ESTADO_USUARIO_MODIFICADO',
      modulo: 'SEGURIDAD',
      valores_anteriores: JSON.stringify({ usuarioId: id, estadoPrevio: usuario.estado }),
      valores_nuevos: JSON.stringify({ usuarioId: id, nuevoEstado: normalizedStatus }),
    });

    res.json({ success: true, message: `Usuario actualizado a estado ${normalizedStatus}.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGlobalDashboard,
  getCompanies,
  createCompany,
  setCompanyStatus,
  getBusinessUnits,
  getAdministrators,
  createAdministrator,
  getAuditLogs,
  toggleUserStatus,
};
