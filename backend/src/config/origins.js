const isProduction = process.env.NODE_ENV === 'production';

const isLocalDevelopmentOrigin = (origin) => {
  try {
    const url = new URL(origin);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1'].includes(url.hostname) &&
      (!url.port || (Number(url.port) >= 1 && Number(url.port) <= 65535)) &&
      url.pathname === '/' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
};

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...(configuredOrigins.length
    ? configuredOrigins
    : isProduction
      ? []
      : ['http://localhost:3000', 'http://localhost:5173']),
  ...(process.env.RENDER_EXTERNAL_URL
    ? [process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')]
    : []),
].filter((origin) => !isProduction || !isLocalDevelopmentOrigin(origin));

const isTrustedOrigin = (origin) =>
  Boolean(origin) &&
  (allowedOrigins.includes(origin) ||
    (!isProduction && isLocalDevelopmentOrigin(origin)));

const corsOrigin = (origin, callback) => {
  if (!origin || isTrustedOrigin(origin)) return callback(null, true);
  const error = new Error('El origen no está permitido por la política CORS.');
  error.statusCode = 403;
  return callback(error);
};

module.exports = { corsOrigin, isTrustedOrigin };
