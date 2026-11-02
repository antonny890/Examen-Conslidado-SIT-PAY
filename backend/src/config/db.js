/**
 * Configuración e inicialización del cliente Knex para PostgreSQL
 */
const knex = require('knex');
const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment] || knexConfig.development;

const db = knex(config);

module.exports = db;
