/**
 * Store hashed registration email codes and their resend/attempt limits.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('usuarios', (table) => {
    table.string('email_verification_code_hash', 64).nullable();
    table.timestamp('email_verification_expires_at').nullable();
    table.timestamp('email_verification_sent_at').nullable();
    table.integer('email_verification_attempts').notNullable().defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('usuarios', (table) => {
    table.dropColumn('email_verification_code_hash');
    table.dropColumn('email_verification_expires_at');
    table.dropColumn('email_verification_sent_at');
    table.dropColumn('email_verification_attempts');
  });
};
