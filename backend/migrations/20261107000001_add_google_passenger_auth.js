/**
 * Persist Google identities and the separate consent to query the DNI provider.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('usuarios', (table) => {
    table.string('google_subject', 255).nullable().unique();
  });

  await knex.schema.alterTable('perfiles', (table) => {
    table.boolean('consentimiento_consulta_dni').notNullable().defaultTo(false);
    table.timestamp('fecha_consentimiento_consulta_dni').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('perfiles', (table) => {
    table.dropColumn('consentimiento_consulta_dni');
    table.dropColumn('fecha_consentimiento_consulta_dni');
  });

  await knex.schema.alterTable('usuarios', (table) => {
    table.dropUnique(['google_subject']);
    table.dropColumn('google_subject');
  });
};
