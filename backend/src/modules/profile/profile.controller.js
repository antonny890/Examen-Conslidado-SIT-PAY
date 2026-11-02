/**
 * Controlador de Perfil de Usuario y Cumplimiento Ley 29733
 * Gestión de datos personales, derechos ARCO (acceso, rectificación, cancelación)
 */
const bcrypt = require('bcrypt');
const db = require('../../config/db');

// Obtener perfil completo del usuario autenticado
const getProfile = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;

    const usuario = await db('usuarios')
      .join('roles', 'usuarios.rol_id', 'roles.id')
      .select('usuarios.id', 'usuarios.email', 'usuarios.estado', 'usuarios.created_at', 'roles.codigo as rol', 'roles.nombre as rol_nombre')
      .where({ 'usuarios.id': usuarioId })
      .first();

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const perfil = await db('perfiles').where({ usuario_id: usuarioId }).first();

    // Si es pasajero, consultar el estado de su acreditación preferencial
    let preferencialInfo = null;

    if (usuario.rol === 'PASAJERO') {
      preferencialInfo = await db('solicitudes_preferenciales')
        .where({ usuario_id: usuarioId })
        .orderBy('created_at', 'desc')
        .first();
    }

    // Si es chofer, consultar vehículo asignado
    let vehiculoInfo = null;
    if (usuario.rol === 'CHOFER') {
      vehiculoInfo = await db('choferes')
        .join('vehiculos', 'choferes.vehiculo_id', 'vehiculos.id')
        .join('empresas', 'choferes.empresa_id', 'empresas.id')
        .select(
          'vehiculos.id as vehiculo_id',
          'vehiculos.placa',
          'vehiculos.qr_codigo_seguro',
          'choferes.numero_licencia',
          'empresas.nombre_comercial as empresa'
        )
        .where({ 'choferes.usuario_id': usuarioId })
        .first();
    }

    res.json({
      success: true,
      data: {
        usuario,
        perfil,
        preferencial: preferencialInfo,
        vehiculo: vehiculoInfo,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar datos personales básicos
const updateProfile = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    const { nombres, apellidos, telefono, fotoUrl } = req.body;

    const updateData = {};
    if (nombres) updateData.nombres = nombres.trim();
    if (apellidos) updateData.apellidos = apellidos.trim();
    if (telefono !== undefined) updateData.telefono = telefono ? telefono.trim() : null;
    if (fotoUrl !== undefined) updateData.foto_url = fotoUrl;
    updateData.updated_at = new Date();

    await db('perfiles').where({ usuario_id: usuarioId }).update(updateData);

    const perfilActualizado = await db('perfiles').where({ usuario_id: usuarioId }).first();

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente.',
      data: perfilActualizado,
    });
  } catch (error) {
    next(error);
  }
};

// Cambio de contraseña autenticado
const changePassword = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Ingrese la contraseña actual y la nueva.' });
    }

    const usuario = await db('usuarios').where({ id: usuarioId }).first();
    const match = await bcrypt.compare(currentPassword, usuario.password_hash);
    if (!match) {
      return res.status(400).json({ success: false, message: 'La contraseña actual no es correcta.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db('usuarios').where({ id: usuarioId }).update({
      password_hash: newHash,
      updated_at: new Date(),
    });

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente.',
    });
  } catch (error) {
    next(error);
  }
};

// Registro de Consentimiento Ley 29733
const registerConsent = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    const { consentimiento } = req.body;

    await db('perfiles').where({ usuario_id: usuarioId }).update({
      consentimiento_datos: Boolean(consentimiento),
      fecha_consentimiento: new Date(),
      updated_at: new Date(),
    });

    res.json({
      success: true,
      message: 'Consentimiento de tratamiento de datos actualizado según Ley 29733.',
    });
  } catch (error) {
    next(error);
  }
};

// Desactivar cuenta (Derecho ARCO de cancelación)
const deactivateAccount = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;

    await db('usuarios').where({ id: usuarioId }).update({
      estado: 'INACTIVO',
      deleted_at: new Date(),
      refresh_token_hash: null,
    });

    res.json({
      success: true,
      message: 'Cuenta desactivada conforme a los derechos ARCO (Ley 29733).',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  registerConsent,
  deactivateAccount,
};
