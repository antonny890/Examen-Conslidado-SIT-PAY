/**
 * Route passenger claims to the transport company or the system authority.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('incidencias_reclamos', (table) => {
    table.string('destinatario', 20).nullable();
    table
      .uuid('vehiculo_id')
      .nullable()
      .references('id')
      .inTable('vehiculos')
      .onDelete('SET NULL');
  });

  await knex('incidencias_reclamos').update({
    destinatario: knex.raw(
      "CASE WHEN empresa_id IS NULL THEN 'SUPER_ADMIN' ELSE 'EMPRESA' END"
    ),
  });

  await knex.schema.alterTable('incidencias_reclamos', (table) => {
    table.string('destinatario', 20).notNullable().defaultTo('SUPER_ADMIN').alter();
    table.index(['destinatario', 'empresa_id']);
    table.index(['vehiculo_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('incidencias_reclamos', (table) => {
    table.dropIndex(['destinatario', 'empresa_id']);
    table.dropIndex(['vehiculo_id']);
    table.dropColumn('vehiculo_id');
    table.dropColumn('destinatario');
  });
};
