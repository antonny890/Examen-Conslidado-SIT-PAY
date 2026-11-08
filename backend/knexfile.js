require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL es obligatorio para ejecutar las migraciones.');
}

module.exports = {
  client: 'pg',
  connection: {
    connectionString,
    ssl: process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: false },
  },
  pool: { min: 0, max: 5 },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
};
