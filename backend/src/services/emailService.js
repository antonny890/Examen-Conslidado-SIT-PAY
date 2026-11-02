const nodemailer = require('nodemailer');

const isSmtpConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
  );

const createTransporter = () => {
  if (!isSmtpConfigured()) {
    const error = new Error('El servicio de correo no está configurado.');
    error.statusCode = 503;
    throw error;
  }

  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT debe ser un puerto válido.');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

const sendInstitutionalVerificationCode = async ({ to, code, institution }) => {
  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      const error = new Error('El servicio de correo institucional no está configurado.');
      error.statusCode = 503;
      throw error;
    }

    console.info(`[SIT-Pay] Código OTP de demostración para ${to}: ${code}`);
    return;
  }

  await createTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Código para acreditar tu medio pasaje SIT-Pay',
    text: `Tu código de verificación para ${institution} es ${code}. Expira en 15 minutos. Si no solicitaste esta acreditación, ignora este correo.`,
    html: `<p>Usa este código para acreditar tu medio pasaje en SIT-Pay:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>El código expira en 15 minutos. Si no solicitaste esta acreditación, ignora este correo.</p>`,
  });
};

const sendPasswordResetCode = async ({ to, code }) => {
  await createTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Código para cambiar tu contraseña de SIT-Pay',
    text: `Tu código de seguridad para cambiar la contraseña de SIT-Pay es ${code}. Expira en 15 minutos. Si no solicitaste este cambio, ignora este correo.`,
    html: `<p>Usa este código de seguridad para cambiar tu contraseña de SIT-Pay:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>El código expira en 15 minutos. Si no solicitaste este cambio, ignora este correo.</p>`,
  });
};

module.exports = { sendInstitutionalVerificationCode, sendPasswordResetCode };
