/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('perfiles', (table) => {
    table.timestamp('alias_updated_at').nullable();
  });

  await knex.raw(`
    CREATE UNIQUE INDEX perfiles_alias_lower_unique
    ON perfiles (LOWER(alias))
    WHERE alias IS NOT NULL AND BTRIM(alias) <> ''
  `);

  await knex.schema.createTable('reportes_alias', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('usuario_objetivo_id').notNullable()
      .references('id').inTable('usuarios').onDelete('CASCADE');
    table.uuid('usuario_reportante_id').notNullable()
      .references('id').inTable('usuarios').onDelete('CASCADE');
    table.string('alias_reportado', 40).notNullable();
    table.string('motivo', 32).notNullable();
    table.text('detalle').nullable();
    table.string('estado', 20).notNullable().defaultTo('PENDIENTE');
    table.text('resolucion').nullable();
    table.uuid('resuelto_por').nullable()
      .references('id').inTable('usuarios').onDelete('SET NULL');
    table.timestamp('resuelto_at').nullable();
    table.timestamps(true, true);
    table.index(['estado', 'created_at']);
    table.index(['usuario_objetivo_id']);
  });

  await knex.raw(`
    CREATE UNIQUE INDEX reportes_alias_pending_unique
    ON reportes_alias (usuario_objetivo_id, usuario_reportante_id)
    WHERE estado = 'PENDIENTE'
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS reportes_alias_pending_unique');
  await knex.schema.dropTableIfExists('reportes_alias');
  await knex.raw('DROP INDEX IF EXISTS perfiles_alias_lower_unique');
  await knex.schema.alterTable('perfiles', (table) => {
    table.dropColumn('alias_updated_at');
  });
};
