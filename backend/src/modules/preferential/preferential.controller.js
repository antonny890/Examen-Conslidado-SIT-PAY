/**
 * Controlador de Verificación de Perfil Preferencial (Ley 26271)
 * Tarifa universitaria acreditada por correo institucional
 */
const db = require('../../config/db');
const { randomInt } = require('node:crypto');
const { sendInstitutionalVerificationCode } = require('../../services/emailService');

const ALLOWED_DOMAINS = (process.env.ALLOWED_EDU_DOMAINS || 'continental.edu.pe,unsa.edu.pe,ucsm.edu.pe,utp.edu.pe')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

// 1. Solicitar acreditación mediante Correo Institucional (.edu.pe)
const requestByEmail = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    const { institucionEducativa, correoInstitucional } = req.body;

    if (
      typeof institucionEducativa !== 'string' ||
      typeof correoInstitucional !== 'string' ||
      !institucionEducativa.trim() ||
      !correoInstitucional.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar la institución educativa y el correo institucional.',
      });
    }

    const emailLower = correoInstitucional.toLowerCase().trim();
    const emailParts = emailLower.split('@');
    const domain = emailParts.length === 2 ? emailParts[1] : '';

    const isEduPe = domain.endsWith('.edu.pe');
    const isAllowedDomain = ALLOWED_DOMAINS.includes(domain);

    if (
      emailLower.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower) ||
      (!isEduPe && !isAllowedDomain)
    ) {
      return res.status(400).json({
        success: false,
        message: `El correo debe pertenecer a un dominio educativo autorizado (.edu.pe o listado autorizado: ${ALLOWED_DOMAINS.join(', ')}).`,
      });
    }

    // Generar código OTP de 6 dígitos
    const otpCode = String(randomInt(100000, 1000000));
    const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Cancelar solicitudes anteriores pendientes
    await db('solicitudes_preferenciales')
      .where({ usuario_id: usuarioId, estado: 'PENDIENTE' })
      .update({ estado: 'RECHAZADA', observacion_revision: 'Reemplazada por nueva solicitud' });

    const [solicitud] = await db('solicitudes_preferenciales')
      .insert({
        usuario_id: usuarioId,
        tipo_preferencial: 'UNIVERSITARIA',
        institucion_educativa: institucionEducativa.trim(),
        metodo_verificacion: 'CORREO_INSTITUCIONAL',
        correo_institucional: emailLower,
        codigo_otp: otpCode,
        codigo_otp_expira_at: expira,
        estado: 'PENDIENTE',
      })
      .returning('*');

    try {
      await sendInstitutionalVerificationCode({
        to: emailLower,
        code: otpCode,
        institution: institucionEducativa.trim(),
      });
    } catch (error) {
      await db('solicitudes_preferenciales')
        .where({ id: solicitud.id })
        .update({
          estado: 'RECHAZADA',
          observacion_revision: 'No se pudo entregar el código al correo institucional.',
        });
      return next(error);
    }

    res.json({
      success: true,
      message: 'Código de verificación enviado al correo institucional.',
      data: {
        solicitudId: solicitud.id,
        correo: emailLower,
        // En modo académico exponemos el código para facilitar pruebas
        ...(process.env.NODE_ENV !== 'production' ? { codigoOtpPruebaDev: otpCode } : {}),
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

    if (!/^\d{6}$/.test(String(codigoOtp || '').trim())) {
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

// Consultar estado actual del pasajero
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
          tipoPasajero: 'NORMAL',
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

module.exports = {
  requestByEmail,
  verifyEmailCode,
  getPassengerStatus,
};
