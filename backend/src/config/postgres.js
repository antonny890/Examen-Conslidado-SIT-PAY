const knexFactory = require('knex');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está configurado para conectar con PostgreSQL.');
}

const ssl = process.env.DATABASE_SSL === 'false'
  ? false
  : { rejectUnauthorized: false };

const db = knexFactory({
  client: 'pg',
  connection: {
    connectionString,
    ssl,
  },
  pool: { min: 0, max: Number(process.env.DATABASE_POOL_MAX) || 10 },
});

module.exports = db;
