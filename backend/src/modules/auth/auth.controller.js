/**
 * Controlador de Autenticación y Cuentas
 * Roles: SUPER_ADMIN, ADMIN_EMPRESA, CHOFER, PASAJERO
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../../config/db');
const jwtConfig = require('../../config/jwt');
const { sendPasswordResetCode } = require('../../services/emailService');

const googleOAuthClient = new OAuth2Client();

// Generador de tokens JWT de acceso y refresco
const generateTokens = (usuario, rolCodigo) => {
  const payload = {
    id: usuario.id,
    email: usuario.email,
    rol: rolCodigo,
    rolId: usuario.rol_id,
  };

  const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
  const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn });

  return { accessToken, refreshToken };
};

// 1. Registro de Pasajero (Único rol con auto-registro público)
const registerPassenger = async (req, res, next) => {
  try {
    const { email, password, nombres, apellidos, tipoDocumento, numeroDocumento, telefono, consentimientoDatos } = req.body;

    if (!email || !password || !nombres || !apellidos || !numeroDocumento) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos obligatorios deben ser completados.',
      });
    }

    if (!consentimientoDatos) {
      return res.status(400).json({
        success: false,
        message: 'Debe aceptar los términos de tratamiento de datos personales conforme a la Ley 29733.',
      });
    }

    // Verificar si el correo ya existe
    const existingUser = await db('usuarios').where({ email: email.toLowerCase().trim() }).first();
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya se encuentra registrado.',
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Rol de Pasajero (ID = 4)
    const rolPasajero = await db('roles').where({ codigo: 'PASAJERO' }).first();
    if (!rolPasajero) {
      return res.status(500).json({ success: false, message: 'Rol PASAJERO no encontrado en base de datos.' });
    }

    // Transacción atómica: Usuario + Perfil
    const result = await db.transaction(async (trx) => {
      const [nuevoUsuario] = await trx('usuarios')
        .insert({
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          rol_id: rolPasajero.id,
          estado: 'ACTIVO',
          email_verificado: true,
        })
        .returning('*');

      await trx('perfiles').insert({
        usuario_id: nuevoUsuario.id,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        tipo_documento: tipoDocumento || 'DNI',
        numero_documento: numeroDocumento.trim(),
        telefono: telefono ? telefono.trim() : null,
        consentimiento_datos: true,
        fecha_consentimiento: new Date(),
      });

      return nuevoUsuario;
    });

    const tokens = generateTokens(result, 'PASAJERO');

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Ya puede utilizar SIT-Pay para pagar sus pasajes.',
      data: {
        usuario: {
          id: result.id,
          email: result.email,
          rol: 'PASAJERO',
        },
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Login Unificado para todos los roles
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar correo y contraseña.',
      });
    }

    const usuario = await db('usuarios')
      .join('roles', 'usuarios.rol_id', 'roles.id')
      .select('usuarios.*', 'roles.codigo as rol_codigo', 'roles.nombre as rol_nombre')
      .where({ 'usuarios.email': email.toLowerCase().trim() })
      .first();

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    if (usuario.estado !== 'ACTIVO') {
      return res.status(403).json({
        success: false,
        message: 'La cuenta se encuentra inactiva o suspendida. Contacte al administrador.',
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    // Obtener perfil y datos adicionales según rol
    const perfil = await db('perfiles').where({ usuario_id: usuario.id }).first();
    let choferInfo = null;
    let empresaInfo = null;

    if (usuario.rol_codigo === 'CHOFER') {
      choferInfo = await db('choferes')
        .join('vehiculos', 'choferes.vehiculo_id', 'vehiculos.id')
        .join('empresas', 'choferes.empresa_id', 'empresas.id')
        .join('unidades_negocio', 'vehiculos.unidad_negocio_id', 'unidades_negocio.id')
        .select(
          'choferes.id as chofer_id',
          'vehiculos.id as vehiculo_id',
          'vehiculos.placa',
          'vehiculos.qr_codigo_seguro',
          'empresas.id as empresa_id',
          'empresas.nombre_comercial as empresa_nombre',
          'unidades_negocio.codigo as unidad_codigo',
          'unidades_negocio.nombre as unidad_nombre'
        )
        .where({ 'choferes.usuario_id': usuario.id })
        .first();
    } else if (usuario.rol_codigo === 'ADMIN_EMPRESA') {
      empresaInfo = await db('empresas')
        .select('id', 'nombre_comercial', 'activo')
        .where({ admin_usuario_id: usuario.id })
        .first();
    }

    const tokens = generateTokens(usuario, usuario.rol_codigo);

    // Actualizar último login y guardar hash del refresh token
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 8);
    await db('usuarios')
      .where({ id: usuario.id })
      .update({
        ultimo_login_at: new Date(),
        refresh_token_hash: refreshHash,
      });

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      data: {
        usuario: {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol_codigo,
          rolNombre: usuario.rol_nombre,
          nombres: perfil ? perfil.nombres : '',
          apellidos: perfil ? perfil.apellidos : '',
          fotoUrl: perfil ? perfil.foto_url : null,
          empresaId: empresaInfo?.id || null,
          empresaNombre: empresaInfo?.nombre_comercial || null,
          empresaActiva: empresaInfo?.activo ?? null,
          estado: usuario.estado,
          emailVerificado: usuario.email_verificado,
          choferInfo: choferInfo || undefined,
        },
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

const loginWithGoogle = async (req, res, next) => {
  try {
    const { credential } = req.body;
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(503).json({ success: false, message: 'El inicio con Google no está configurado en el servidor.' });
    }
    if (!credential) {
      return res.status(400).json({ success: false, message: 'No se recibió la credencial de Google.' });
    }

    let googleAccount;
    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      googleAccount = ticket.getPayload();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'La credencial de Google no es válida o expiró.' });
    }

    if (!googleAccount?.email || googleAccount.email_verified !== true) {
      return res.status(401).json({ success: false, message: 'Google no pudo verificar el correo de esta cuenta.' });
    }

    const usuario = await db('usuarios')
      .join('roles', 'usuarios.rol_id', 'roles.id')
      .leftJoin('perfiles', 'usuarios.id', 'perfiles.usuario_id')
      .leftJoin('empresas', 'empresas.admin_usuario_id', 'usuarios.id')
      .select(
        'usuarios.*',
        'roles.codigo as rol_codigo',
        'roles.nombre as rol_nombre',
        'perfiles.nombres',
        'perfiles.apellidos',
        'perfiles.foto_url',
        'empresas.id as empresa_id',
        'empresas.nombre_comercial as empresa_nombre',
        'empresas.activo as empresa_activa'
      )
      .where({ 'usuarios.email': googleAccount.email.toLowerCase() })
      .whereNull('usuarios.deleted_at')
      .first();

    if (!usuario || !['ADMIN_EMPRESA', 'SUPER_ADMIN'].includes(usuario.rol_codigo)) {
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta Google no está vinculada a un usuario administrativo de SIT-Pay.',
      });
    }
    if (usuario.estado !== 'ACTIVO' || (usuario.rol_codigo === 'ADMIN_EMPRESA' && !usuario.empresa_activa)) {
      return res.status(403).json({ success: false, message: 'La cuenta administrativa está inactiva.' });
    }

    const tokens = generateTokens(usuario, usuario.rol_codigo);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 8);
    await db('usuarios').where({ id: usuario.id }).update({
      ultimo_login_at: new Date(),
      refresh_token_hash: refreshHash,
    });

    res.json({
      success: true,
      message: 'Inicio de sesión con Google exitoso.',
      data: {
        usuario: {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol_codigo,
          rolNombre: usuario.rol_nombre,
          nombres: usuario.nombres || '',
          apellidos: usuario.apellidos || '',
          fotoUrl: usuario.foto_url || googleAccount.picture || null,
          empresaId: usuario.empresa_id || null,
          empresaNombre: usuario.empresa_nombre || null,
          empresaActiva: usuario.empresa_activa ?? null,
          estado: usuario.estado,
          emailVerificado: usuario.email_verificado,
        },
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. Refresh Token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token requerido.' });
    }

    const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
    const usuario = await db('usuarios')
      .join('roles', 'usuarios.rol_id', 'roles.id')
      .select('usuarios.*', 'roles.codigo as rol_codigo')
      .where({ 'usuarios.id': decoded.id })
      .first();

    if (!usuario || !usuario.refresh_token_hash) {
      return res.status(401).json({ success: false, message: 'Sesión no válida o revocada.' });
    }

    const match = await bcrypt.compare(refreshToken, usuario.refresh_token_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Refresh token revocado o modificado.' });
    }

    const newTokens = generateTokens(usuario, usuario.rol_codigo);
    const newRefreshHash = await bcrypt.hash(newTokens.refreshToken, 8);
    await db('usuarios').where({ id: usuario.id }).update({ refresh_token_hash: newRefreshHash });

    res.json({
      success: true,
      message: 'Token renovado con éxito.',
      data: { tokens: newTokens },
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Refresh token inválido o expirado.' });
  }
};

// 4. Logout
const logout = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      await db('usuarios')
        .where({ id: req.user.id })
        .update({ refresh_token_hash: null });
    }

    res.json({
      success: true,
      message: 'Sesión cerrada correctamente.',
    });
  } catch (error) {
    next(error);
  }
};

// 5. Recuperación de contraseña por código de correo
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Ingrese su correo electrónico.' });
    }

    const usuario = await db('usuarios').where({ email: email.toLowerCase().trim() }).first();
    // Por seguridad, siempre responder con mensaje genérico para no filtrar existencia de emails
    if (!usuario) {
      return res.json({
        success: true,
        message: 'Si el correo está registrado, se enviaron las instrucciones de recuperación.',
      });
    }

    const tokenRecuperacion = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = crypto.createHash('sha256').update(tokenRecuperacion).digest('hex');
    const expira = new Date(Date.now() + 15 * 60 * 1000);

    await db('usuarios')
      .where({ id: usuario.id })
      .update({
        token_recuperacion: tokenHash,
        expiracion_recuperacion: expira,
      });

    try {
      await sendPasswordResetCode({ to: usuario.email, code: tokenRecuperacion });
    } catch (error) {
      await db('usuarios')
        .where({ id: usuario.id, token_recuperacion: tokenHash })
        .update({ token_recuperacion: null, expiracion_recuperacion: null });
      throw error;
    }

    res.json({
      success: true,
      message: 'Si el correo está registrado, se enviaron las instrucciones de recuperación.',
    });
  } catch (error) {
    next(error);
  }
};

// 6. Reset Password con token/código
const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
    }

    if (!/^\d{6}$/.test(String(token)) || String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'El código debe tener 6 dígitos y la contraseña nueva al menos 8 caracteres.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const usuario = await db('usuarios')
      .where({
        email: email.toLowerCase().trim(),
        token_recuperacion: tokenHash,
      })
      .andWhere('expiracion_recuperacion', '>', new Date())
      .first();

    if (!usuario) {
      return res.status(400).json({
        success: false,
        message: 'Código de recuperación inválido o expirado.',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db('usuarios')
      .where({ id: usuario.id })
      .update({
        password_hash: passwordHash,
        token_recuperacion: null,
        expiracion_recuperacion: null,
        refresh_token_hash: null, // Forzar re-login en todos los dispositivos
      });

    res.json({
      success: true,
      message: 'Contraseña actualizada con éxito. Puede iniciar sesión.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerPassenger,
  login,
  loginWithGoogle,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
};
