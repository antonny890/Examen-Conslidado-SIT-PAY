/**
 * Kept as a no-op to preserve migration ordering from the pre-Supabase project.
 * The wallet tables are not created by the PostgreSQL baseline.
 * @param { import("knex").Knex } knex
 */
exports.up = async function () {};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function () {};
