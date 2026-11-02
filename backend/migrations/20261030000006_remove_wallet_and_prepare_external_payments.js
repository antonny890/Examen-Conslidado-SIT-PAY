/**
 * Replace the simulated stored-value wallet with external payment references.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.dropTableIfExists('recargas');
  await knex.schema.dropTableIfExists('billeteras');

  await knex.schema.alterTable('transacciones', (table) => {
    table.dropColumn('saldo_anterior');
    table.dropColumn('saldo_posterior');
    table.string('proveedor_pago', 50).nullable();
    table.string('referencia_pago_externa', 120).nullable().unique();
  });

  await knex('transacciones').where({ estado: 'EXITOSA' }).update({ estado: 'ANULADA' });
  await knex.raw("ALTER TABLE transacciones ALTER COLUMN estado SET DEFAULT 'PENDIENTE_PAGO'");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw("ALTER TABLE transacciones ALTER COLUMN estado SET DEFAULT 'EXITOSA'");

  await knex.schema.alterTable('transacciones', (table) => {
    table.dropColumn('referencia_pago_externa');
    table.dropColumn('proveedor_pago');
    table.decimal('saldo_anterior', 10, 2).notNullable().defaultTo(0);
    table.decimal('saldo_posterior', 10, 2).notNullable().defaultTo(0);
  });

  await knex.schema.createTable('billeteras', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('usuario_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('usuarios')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.decimal('saldo', 10, 2).notNullable().defaultTo(0);
    table.string('moneda', 3).notNullable().defaultTo('PEN');
    table.string('estado', 20).notNullable().defaultTo('ACTIVA');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('recargas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('billetera_id')
      .notNullable()
      .references('id')
      .inTable('billeteras')
      .onDelete('CASCADE');
    table.decimal('monto', 8, 2).notNullable();
    table.string('metodo_pago', 40).notNullable();
    table.string('codigo_operacion', 50).notNullable().unique();
    table.string('estado', 20).notNullable().defaultTo('COMPLETADA');
    table.decimal('saldo_resultante', 10, 2).notNullable();
    table.timestamps(true, true);
  });
};
