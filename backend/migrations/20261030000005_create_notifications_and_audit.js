/**
 * Migración: 05 - Notificaciones y Auditoría del Sistema
 * Cumplimiento Ley 29733 (Trazabilidad y seguridad de operaciones sensibles)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Notificaciones push/in-app para usuarios
  await knex.schema.createTable('notificaciones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('usuario_id')
      .notNullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('CASCADE');
    table.string('titulo', 120).notNullable();
    table.text('mensaje').notNullable();
    table.string('tipo', 35).notNullable(); // 'PAGO', 'RECARGA', 'PREFERENCIAL', 'RECLAMO', 'SEGURIDAD'
    table.boolean('leido').notNullable().defaultTo(false);
    table.jsonb('payload').nullable();
    table.timestamps(true, true);

    table.index(['usuario_id', 'leido']);
  });

  // 2. Registro de Auditoría (Logs inmutables de acciones sensibles)
  await knex.schema.createTable('auditoria_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('usuario_id')
      .nullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('SET NULL');
    table.string('accion', 80).notNullable(); // ej. 'TARIFA_MODIFICADA', 'SOLICITUD_APROBADA', 'REASIGNACION_CHOFER'
    table.string('modulo', 50).notNullable(); // 'TARIFAS', 'FLOTA', 'PREFERENCIAL', 'AUTH'
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 255).nullable();
    table.jsonb('valores_anteriores').nullable();
    table.jsonb('valores_nuevos').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['usuario_id']);
    table.index(['accion']);
    table.index(['created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('auditoria_logs');
  await knex.schema.dropTableIfExists('notificaciones');
};
