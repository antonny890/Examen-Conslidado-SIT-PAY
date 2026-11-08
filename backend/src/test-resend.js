require('dotenv').config();

const resend = require('./config/resend');

const testRecipient = process.env.RESEND_TEST_TO?.trim();
const from = process.env.RESEND_FROM?.trim() || 'SIT-Pay <onboarding@resend.dev>';

const testResend = async () => {
  if (!resend) {
    throw new Error('Configura RESEND_API_KEY en backend/.env.');
  }
  if (!testRecipient) {
    throw new Error('Configura RESEND_TEST_TO con un destinatario permitido por Resend.');
  }

  const { data, error } = await resend.emails.send({
    from,
    to: [testRecipient],
    subject: 'Prueba de SIT-Pay',
    html: '<h2>¡Hola!</h2><p>Resend está funcionando correctamente.</p>',
  });

  if (error) {
    throw new Error(`Resend rechazó el envío: ${error.message}`);
  }
  console.info('Correo de prueba enviado:', data?.id || 'aceptado por Resend');
};

testResend().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
