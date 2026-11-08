const crypto = require('node:crypto');
const {
  createDocument,
  db,
  queryCollection,
  timestampToDate,
  writeNotification,
} = require('../../services/postgresData');
const { sendInstitutionalVerificationCode } = require('../../services/emailService');

const ALLOWED_DOMAINS = (process.env.ALLOWED_EDU_DOMAINS || 'continental.edu.pe,unsa.edu.pe,ucsm.edu.pe,utp.edu.pe')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

const requestByEmail = async (req, res, next) => {
  try {
    const institution = req.body?.institucionEducativa;
    const email = req.body?.correoInstitucional;
    if (typeof institution !== 'string' || typeof email !== 'string' ||
        !institution.trim() || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar la institución educativa y el correo institucional.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const domain = normalizedEmail.split('@')[1] || '';
    if (normalizedEmail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        (!domain.endsWith('.edu.pe') && !ALLOWED_DOMAINS.includes(domain))) {
      return res.status(400).json({
        success: false,
        message: `El correo debe pertenecer a un dominio educativo autorizado (.edu.pe o listado autorizado: ${ALLOWED_DOMAINS.join(', ')}).`,
      });
    }

    const pending = await queryCollection('solicitudes_preferenciales', 'usuario_id', '==', req.user.id);
    const batch = db.batch();
    pending.filter((request) => request.estado === 'PENDIENTE').forEach((request) => {
      batch.update(db.collection('solicitudes_preferenciales').doc(request.id), {
        estado: 'RECHAZADA',
        observacion_revision: 'Reemplazada por nueva solicitud',
        updated_at: new Date(),
      });
    });

    const otp = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const request = await createDocument('solicitudes_preferenciales', {
      usuario_id: req.user.id,
      tipo_preferencial: 'UNIVERSITARIA',
      institucion_educativa: institution.trim(),
      metodo_verificacion: 'CORREO_INSTITUCIONAL',
      correo_institucional: normalizedEmail,
      codigo_otp_hash: crypto.createHash('sha256').update(otp).digest('hex'),
      codigo_otp_expira_at: expiresAt,
      estado: 'PENDIENTE',
    });
    await batch.commit();
    try {
      await sendInstitutionalVerificationCode({
        to: normalizedEmail,
        code: otp,
        institution: institution.trim(),
      });
    } catch (error) {
      await db.collection('solicitudes_preferenciales').doc(request.id).update({
        estado: 'RECHAZADA',
        observacion_revision: 'No se pudo entregar el código al correo institucional.',
        codigo_otp_hash: null,
        updated_at: new Date(),
      });
      return next(error);
    }

    return res.json({
      success: true,
      message: 'Código de verificación enviado al correo institucional.',
      data: {
        solicitudId: request.id,
        correo: normalizedEmail,
        ...(process.env.NODE_ENV !== 'production' ? { codigoOtpPruebaDev: otp } : {}),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const verifyEmailCode = async (req, res, next) => {
  try {
    const code = String(req.body?.codigoOtp || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Ingrese el código de 6 dígitos.' });
    }
    const expectedHash = crypto.createHash('sha256').update(code).digest('hex');
    const requests = await queryCollection('solicitudes_preferenciales', 'usuario_id', '==', req.user.id);
    const request = requests
      .filter((record) => record.metodo_verificacion === 'CORREO_INSTITUCIONAL' &&
        record.estado === 'PENDIENTE' && record.codigo_otp_hash === expectedHash)
      .find((record) => {
        const expiration = timestampToDate(record.codigo_otp_expira_at);
        return expiration && expiration.getTime() > Date.now();
      });
    if (!request) {
      return res.status(400).json({ success: false, message: 'Código inválido, expirado o ya procesado.' });
    }

    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 6);
    const validUntil = expirationDate.toISOString().slice(0, 10);
    await db.collection('solicitudes_preferenciales').doc(request.id).update({
      estado: 'APROBADA',
      fecha_vencimiento: validUntil,
      fecha_revision_at: new Date(),
      observacion_revision: 'Acreditado automáticamente mediante validación de correo institucional',
      codigo_otp_hash: null,
      updated_at: new Date(),
    });
    await writeNotification({
      usuarioId: req.user.id,
      titulo: 'Medio Pasaje Aprobado',
      mensaje: `Tu solicitud de medio pasaje ${request.tipo_preferencial} ha sido aprobada con éxito. Aplica de 05:00 a 24:00 hrs.`,
      tipo: 'PREFERENCIAL',
    });
    return res.json({
      success: true,
      message: '¡Acreditación preferencial aprobada exitosamente! Tu medio pasaje (50%) está activo.',
      data: { tipoPreferencial: request.tipo_preferencial, vigenciaHasta: validUntil },
    });
  } catch (error) {
    return next(error);
  }
};

const getPassengerStatus = async (req, res, next) => {
  try {
    const requests = (await queryCollection('solicitudes_preferenciales', 'usuario_id', '==', req.user.id))
      .sort((left, right) =>
        (timestampToDate(right.created_at)?.getTime() || 0) -
        (timestampToDate(left.created_at)?.getTime() || 0),
      );
    const request = requests[0];
    if (!request) {
      return res.json({
        success: true,
        data: { estado: 'SIN_SOLICITUD', esMedioPasajeActivo: false, tipoPasajero: 'NORMAL', tarifaBase: 1.00 },
      });
    }
    const today = new Date().toISOString().slice(0, 10);
    const expired = request.fecha_vencimiento && request.fecha_vencimiento < today;
    return res.json({
      success: true,
      data: {
        solicitudId: request.id,
        estado: expired ? 'VENCIDA' : request.estado,
        tipoPreferencial: request.tipo_preferencial,
        institucion: request.institucion_educativa,
        metodo: request.metodo_verificacion,
        fotoCarneUrl: request.foto_carne_url,
        fechaVencimiento: request.fecha_vencimiento,
        observacion: request.observacion_revision,
        esMedioPasajeActivo: request.estado === 'APROBADA' && !expired,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { requestByEmail, verifyEmailCode, getPassengerStatus };
