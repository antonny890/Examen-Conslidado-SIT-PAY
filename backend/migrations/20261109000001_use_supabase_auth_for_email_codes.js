/**
 * Keep password reset throttling metadata while Supabase Auth owns recovery OTPs.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('usuarios', (table) => {
    table.timestamp('password_reset_sent_at').nullable();
    table.integer('password_reset_attempts').notNullable().defaultTo(0);
    table.dropColumn('token_recuperacion');
    table.dropColumn('expiracion_recuperacion');
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('usuarios', (table) => {
    table.string('token_recuperacion', 255).nullable();
    table.timestamp('expiracion_recuperacion').nullable();
    table.dropColumn('password_reset_sent_at');
    table.dropColumn('password_reset_attempts');
  });
};
