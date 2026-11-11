/**
 * Ensure simulated payment methods exist and preserve receipt details at payment time.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('metodos_pago'))) {
    await knex.schema.createTable('metodos_pago', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('usuario_id').notNullable()
        .references('id').inTable('usuarios').onDelete('CASCADE');
      table.string('tipo', 30).notNullable();
      table.string('marca', 30).notNullable();
      table.string('titular', 100).notNullable();
      table.string('ultimos_digitos', 4).notNullable();
      table.integer('mes_vencimiento').notNullable();
      table.integer('anio_vencimiento').notNullable();
      table.boolean('simulada').notNullable().defaultTo(true);
      table.boolean('predeterminada').notNullable().defaultTo(false);
      table.timestamps(true, true);
      table.index(['usuario_id']);
    });
  }

  const receiptColumns = {
    placa_snapshot: (table) => table.string('placa_snapshot', 10).nullable(),
    empresa_nombre_snapshot: (table) =>
      table.string('empresa_nombre_snapshot', 120).nullable(),
    unidad_codigo_snapshot: (table) =>
      table.string('unidad_codigo_snapshot', 10).nullable(),
    unidad_nombre_snapshot: (table) =>
      table.string('unidad_nombre_snapshot', 150).nullable(),
    tarifa_motivo_snapshot: (table) =>
      table.text('tarifa_motivo_snapshot').nullable(),
  };

  for (const [columnName, addColumn] of Object.entries(receiptColumns)) {
    if (!(await knex.schema.hasColumn('transacciones', columnName))) {
      await knex.schema.alterTable('transacciones', addColumn);
    }
  }

  await knex.raw('ALTER TABLE public."metodos_pago" ENABLE ROW LEVEL SECURITY');
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  for (const columnName of [
    'tarifa_motivo_snapshot',
    'unidad_nombre_snapshot',
    'unidad_codigo_snapshot',
    'empresa_nombre_snapshot',
    'placa_snapshot',
  ]) {
    if (await knex.schema.hasColumn('transacciones', columnName)) {
      await knex.schema.alterTable('transacciones', (table) => {
        table.dropColumn(columnName);
      });
    }
  }
};
