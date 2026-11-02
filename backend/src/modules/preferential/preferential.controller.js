/**
 * Controlador de Verificación de Perfil Preferencial (Ley 26271)
 * Pasaje Universitario y Escolar (50% de la tarifa regular)
 */
const db = require('../../config/db');

const ALLOWED_DOMAINS = (process.env.ALLOWED_EDU_DOMAINS || 'continental.edu.pe,unsa.edu.pe,ucsm.edu.pe,utp.edu.pe').split(',');

// 1. Solicitar acreditación mediante Correo Institucional (.edu.pe)
const requestByEmail = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    const { institucionEducativa, correoInstitucional, tipoPreferencial = 'UNIVERSITARIO' } = req.body;

    if (!institucionEducativa || !correoInstitucional) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar la institución educativa y el correo institucional.',
      });
    }

    const emailLower = correoInstitucional.toLowerCase().trim();
    const domain = emailLower.split('@')[1];

    const isEduPe = emailLower.endsWith('.edu.pe');
    const isAllowedDomain = ALLOWED_DOMAINS.includes(domain);

    if (!isEduPe && !isAllowedDomain) {
      return res.status(400).json({
        success: false,
        message: `El correo debe pertenecer a un dominio universitario acreditado (.edu.pe o listado autorizado: ${ALLOWED_DOMAINS.join(', ')}).`,
      });
    }

    // Generar código OTP de 6 dígitos
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Cancelar solicitudes anteriores pendientes
    await db('solicitudes_preferenciales')
      .where({ usuario_id: usuarioId, estado: 'PENDIENTE' })
      .update({ estado: 'RECHAZADA', observacion_revision: 'Reemplazada por nueva solicitud' });

    const [solicitud] = await db('solicitudes_preferenciales')
      .insert({
        usuario_id: usuarioId,
        tipo_preferencial: tipoPreferencial,
        institucion_educativa: institucionEducativa.trim(),
        metodo_verificacion: 'CORREO_INSTITUCIONAL',
        correo_institucional: emailLower,
        codigo_otp: otpCode,
        codigo_otp_expira_at: expira,
        estado: 'PENDIENTE',
      })
      .returning('*');

    console.log(`\n======================================================`);
    console.log(`[SIMULACIÓN ENVÍO DE CORREO INSTITUCIONAL - LEY 26271]`);
    console.log(`Destinatario: ${emailLower}`);
    console.log(`Código de Acreditación SIT-Pay: ${otpCode}`);
    console.log(`Expira en: 15 minutos`);
    console.log(`======================================================\n`);

    res.json({
      success: true,
      message: 'Código de verificación enviado al correo institucional.',
      data: {
        solicitudId: solicitud.id,
        correo: emailLower,
        // En modo académico exponemos el código para facilitar pruebas
        codigoOtpPruebaDev: otpCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Confirmar código OTP recibido por correo institucional
const verifyEmailCode = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    const { codigoOtp } = req.body;

    if (!codigoOtp) {
      return res.status(400).json({ success: false, message: 'Ingrese el código de 6 dígitos.' });
    }

    const solicitud = await db('solicitudes_preferenciales')
      .where({
        usuario_id: usuarioId,
        metodo_verificacion: 'CORREO_INSTITUCIONAL',
        estado: 'PENDIENTE',
        codigo_otp: String(codigoOtp).trim(),
      })
      .andWhere('codigo_otp_expira_at', '>', new Date())
      .first();

    if (!solicitud) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido, expirado o ya procesado.',
      });
    }

    // Acreditación válida: Vigencia de 6 meses (semestre académico)
    const fechaVencimiento = new Date();
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 6);

    await db('solicitudes_preferenciales')
      .where({ id: solicitud.id })
      .update({
        estado: 'APROBADA',
        fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
        fecha_revision_at: new Date(),
        observacion_revision: 'Acreditado automáticamente mediante validación de correo institucional',
      });

    // Notificación al usuario
    await db('notificaciones').insert({
      usuario_id: usuarioId,
      titulo: 'Medio Pasaje Aprobado',
      mensaje: `Tu solicitud de medio pasaje ${solicitud.tipo_preferencial} ha sido aprobada con éxito. Aplica de 05:00 a 24:00 hrs.`,
      tipo: 'PREFERENCIAL',
    });

    res.json({
      success: true,
      message: '¡Acreditación preferencial aprobada exitosamente! Tu medio pasaje (50%) está activo.',
      data: {
        tipoPreferencial: solicitud.tipo_preferencial,
        vigenciaHasta: fechaVencimiento.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. Solicitar acreditación mediante Foto del Carné
const requestByCard = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    const { institucionEducativa, tipoPreferencial = 'UNIVERSITARIO', fotoCarneUrl } = req.body;

    if (!institucionEducativa || !fotoCarneUrl) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar la institución y adjuntar la fotografía del carné vigente.',
      });
    }

    const [solicitud] = await db('solicitudes_preferenciales')
      .insert({
        usuario_id: usuarioId,
        tipo_preferencial: tipoPreferencial,
        institucion_educativa: institucionEducativa.trim(),
        metodo_verificacion: 'FOTO_CARNE',
        foto_carne_url: fotoCarneUrl,
        estado: 'PENDIENTE',
      })
      .returning('*');

    res.status(201).json({
      success: true,
      message: 'Solicitud registrada. Un administrador revisará la fotografía de tu carné.',
      data: solicitud,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Consultar estado actual del pasajero
const getPassengerStatus = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;

    const solicitud = await db('solicitudes_preferenciales')
      .where({ usuario_id: usuarioId })
      .orderBy('created_at', 'desc')
      .first();

    if (!solicitud) {
      return res.json({
        success: true,
        data: {
          estado: 'SIN_SOLICITUD',
          esMedioPasajeActivo: false,
          tipoPasajero: 'REGULAR',
          tarifaBase: 1.00,
        },
      });
    }

    const hoy = new Date().toISOString().split('T')[0];
    const estaVencida = solicitud.fecha_vencimiento && solicitud.fecha_vencimiento < hoy;
    const esActiva = solicitud.estado === 'APROBADA' && !estaVencida;

    res.json({
      success: true,
      data: {
        solicitudId: solicitud.id,
        estado: estaVencida ? 'VENCIDA' : solicitud.estado,
        tipoPreferencial: solicitud.tipo_preferencial,
        institucion: solicitud.institucion_educativa,
        metodo: solicitud.metodo_verificacion,
        fotoCarneUrl: solicitud.foto_carne_url,
        fechaVencimiento: solicitud.fecha_vencimiento,
        observacion: solicitud.observacion_revision,
        esMedioPasajeActivo: esActiva,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 5. [ADMIN] Listar todas las solicitudes para revisión
const listAllRequests = async (req, res, next) => {
  try {
    const { estado } = req.query;

    let query = db('solicitudes_preferenciales')
      .join('usuarios', 'solicitudes_preferenciales.usuario_id', 'usuarios.id')
      .join('perfiles', 'usuarios.id', 'perfiles.usuario_id')
      .select(
        'solicitudes_preferenciales.*',
        'usuarios.email',
        'perfiles.nombres',
        'perfiles.apellidos',
        'perfiles.tipo_documento',
        'perfiles.numero_documento',
        'perfiles.telefono'
      )
      .orderBy('solicitudes_preferenciales.created_at', 'desc');

    if (estado) {
      query = query.where({ 'solicitudes_preferenciales.estado': estado.toUpperCase() });
    }

    const list = await query;

    res.json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

// 6. [ADMIN] Aprobar o rechazar solicitud
const reviewRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, observacion, fechaVencimiento } = req.body;
    const revisorId = req.user.id;

    if (!['APROBADA', 'RECHAZADA'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'La decisión debe ser APROBADA o RECHAZADA.' });
    }

    const solicitud = await db('solicitudes_preferenciales').where({ id }).first();
    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    // Calcular vencimiento por defecto si no se especificó (6 meses para semestral o 1 año para escolar)
    let finalVencimiento = fechaVencimiento;
    if (decision === 'APROBADA' && !finalVencimiento) {
      const d = new Date();
      d.setMonth(d.getMonth() + (solicitud.tipo_preferencial === 'ESCOLAR' ? 10 : 6));
      finalVencimiento = d.toISOString().split('T')[0];
    }

    await db('solicitudes_preferenciales').where({ id }).update({
      estado: decision,
      revisor_usuario_id: revisorId,
      observacion_revision: observacion || (decision === 'APROBADA' ? 'Aprobado tras validación de credenciales' : 'Rechazado'),
      fecha_vencimiento: decision === 'APROBADA' ? finalVencimiento : null,
      fecha_revision_at: new Date(),
    });

    // Notificación al pasajero
    await db('notificaciones').insert({
      usuario_id: solicitud.usuario_id,
      titulo: decision === 'APROBADA' ? 'Pase Preferencial Aprobado' : 'Solicitud Preferencial Observada',
      mensaje: decision === 'APROBADA'
        ? `Tu pase preferencial ${solicitud.tipo_preferencial} ha sido APROBADO hasta ${finalVencimiento}.`
        : `Tu solicitud fue RECHAZADA. Motivo: ${observacion || 'Documento no legible o no vigente.'}`,
      tipo: 'PREFERENCIAL',
    });

    res.json({
      success: true,
      message: `Solicitud ${decision.toLowerCase()} exitosamente.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestByEmail,
  verifyEmailCode,
  requestByCard,
  getPassengerStatus,
  listAllRequests,
  reviewRequest,
};
