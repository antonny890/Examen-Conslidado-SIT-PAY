/**
 * Track confirmation email resend attempts for rate limiting.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('usuarios', (table) => {
    table.timestamp('email_verification_request_attempted_at').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('usuarios', (table) => {
    table.dropColumn('email_verification_request_attempted_at');
  });
};
