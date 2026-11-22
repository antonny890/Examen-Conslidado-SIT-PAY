const db = require('../config/postgres');

const findAliasOwner = async (alias, excludeUserId = null) => {
  let query = db('perfiles')
    .select('usuario_id')
    .whereNotNull('alias')
    .whereRaw('LOWER(alias) = ?', [alias.toLowerCase()]);
  if (excludeUserId) query = query.whereNot('usuario_id', excludeUserId);
  return query.first();
};

module.exports = { findAliasOwner };
