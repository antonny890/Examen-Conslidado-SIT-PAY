const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY?.trim();

module.exports = apiKey ? new Resend(apiKey) : null;
