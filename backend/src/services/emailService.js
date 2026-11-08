const nodemailer = require('nodemailer');
const resend = require('../config/resend');

const isResendConfigured = () => Boolean(resend && process.env.RESEND_FROM);

const isSmtpConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
  );

const sendEmail = async ({ to, subject, text, html }) => {
  if (isResendConfigured()) {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: [to],
      subject,
      text,
      html,
    });
    if (error) {
      const sendError = new Error(`No se pudo enviar el correo con Resend: ${error.message}`);
      sendError.statusCode = 502;
      throw sendError;
    }
    return;
  }

  if (isSmtpConfigured()) {
    await createTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
    return;
  }

  const error = new Error('El servicio de correo no está configurado.');
  error.statusCode = 503;
  throw error;
};

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
  if (!isResendConfigured() && !isSmtpConfigured() && process.env.NODE_ENV !== 'production') {
    console.info(`[SIT-Pay] Código OTP de demostración para ${to}: ${code}`);
    return;
  }

  await sendEmail({
    to,
    subject: 'Código para acreditar tu medio pasaje SIT-Pay',
    text: `Tu código de verificación para ${institution} es ${code}. Expira en 15 minutos. Si no solicitaste esta acreditación, ignora este correo.`,
    html: `<p>Usa este código para acreditar tu medio pasaje en SIT-Pay:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>El código expira en 15 minutos. Si no solicitaste esta acreditación, ignora este correo.</p>`,
  });
};

const sendPasswordResetCode = async ({ to, code }) => {
  await sendEmail({
    to,
    subject: 'Código para cambiar tu contraseña de SIT-Pay',
    text: `Tu código de seguridad para cambiar la contraseña de SIT-Pay es ${code}. Expira en 15 minutos. Si no solicitaste este cambio, ignora este correo.`,
    html: `<p>Usa este código de seguridad para cambiar tu contraseña de SIT-Pay:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>El código expira en 15 minutos. Si no solicitaste este cambio, ignora este correo.</p>`,
  });
};

const sendRegistrationVerificationCode = async ({ to, code }) => {
  await sendEmail({
    to,
    subject: 'Confirma tu correo electrónico - SIT-Pay',
    text: `Tu código de verificación para SIT-Pay es ${code}. Expira en 5 minutos. Si no solicitaste crear esta cuenta, ignora este correo.`,
    html: `<p>Usa este código para confirmar tu correo electrónico en SIT-Pay:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>El código expira en 5 minutos. Si no solicitaste crear esta cuenta, ignora este correo.</p>`,
  });
};

module.exports = {
  sendInstitutionalVerificationCode,
  sendPasswordResetCode,
  sendRegistrationVerificationCode,
};
