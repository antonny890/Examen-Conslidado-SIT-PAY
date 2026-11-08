/**
 * Complete the PostgreSQL schema used by the Supabase-backed API.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('transacciones', (table) => {
    table.uuid('metodo_pago_id').nullable();
    table.string('tarjeta_ultimos_digitos', 4).nullable();
    table.string('origen_pago', 30).notNullable().defaultTo('QR');
    table.boolean('pago_simulado').notNullable().defaultTo(true);
    table.string('proveedor_pago', 50).nullable();
    table.string('referencia_pago_externa', 120).nullable().unique();
  });

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

  await knex.schema.alterTable('transacciones', (table) => {
    table.foreign('metodo_pago_id').references('id').inTable('metodos_pago').onDelete('SET NULL');
  });

  await knex.schema.createTable('consultas_dni', (table) => {
    table.string('id', 64).primary();
    table.string('numero_documento', 8).notNullable().unique();
    table.jsonb('datos_proveedor').nullable();
    table.jsonb('datos_proporcionados').nullable();
    table.string('fuente', 20).notNullable().defaultTo('MIGO');
    table.string('estado_consulta', 20).notNullable().defaultTo('CONSULTADA');
    table.boolean('verificacion_oficial').notNullable().defaultTo(false);
    table.timestamp('consultado_at').nullable();
    table.uuid('usuario_id').nullable().references('id')
      .inTable('usuarios').onDelete('SET NULL');
    table.string('reservation_id', 36).nullable();
    table.timestamp('reservation_expires_at').nullable();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  for (const [tableName, keyLength] of [
    ['indice_emails', 64],
    ['indice_placas', 64],
    ['indice_ruc', 11],
  ]) {
    await knex.schema.createTable(tableName, (table) => {
      table.string('id', keyLength).primary();
      table.uuid('usuario_id').nullable().references('id')
        .inTable('usuarios').onDelete('CASCADE');
      table.uuid('vehiculo_id').nullable().references('id')
        .inTable('vehiculos').onDelete('CASCADE');
      table.uuid('empresa_id').nullable().references('id')
        .inTable('empresas').onDelete('CASCADE');
      table.string('email', 150).nullable();
      table.string('placa', 10).nullable();
      table.string('ruc', 11).nullable();
      table.timestamps(true, true);
    });
  }

  await knex.schema.alterTable('solicitudes_preferenciales', (table) => {
    table.integer('codigo_otp_intentos').notNullable().defaultTo(0);
    table.timestamp('codigo_otp_enviado_at').nullable();
  });

  for (const tableName of [
    'auditoria_logs',
    'choferes',
    'consultas_dni',
    'empresas',
    'incidencias_reclamos',
    'indice_emails',
    'indice_placas',
    'indice_ruc',
    'metodos_pago',
    'notificaciones',
    'perfiles',
    'roles',
    'solicitudes_preferenciales',
    'tarifas',
    'transacciones',
    'unidades_negocio',
    'usuarios',
    'vehiculos',
  ]) {
    await knex.raw(`ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY`);
  }
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  for (const tableName of [
    'auditoria_logs',
    'choferes',
    'consultas_dni',
    'empresas',
    'incidencias_reclamos',
    'indice_emails',
    'indice_placas',
    'indice_ruc',
    'metodos_pago',
    'notificaciones',
    'perfiles',
    'roles',
    'solicitudes_preferenciales',
    'tarifas',
    'transacciones',
    'unidades_negocio',
    'usuarios',
    'vehiculos',
  ]) {
    await knex.raw(`ALTER TABLE public."${tableName}" DISABLE ROW LEVEL SECURITY`);
  }
  await knex.schema.alterTable('solicitudes_preferenciales', (table) => {
    table.dropColumn('codigo_otp_intentos');
    table.dropColumn('codigo_otp_enviado_at');
  });
  await knex.schema.dropTableIfExists('indice_ruc');
  await knex.schema.dropTableIfExists('indice_placas');
  await knex.schema.dropTableIfExists('indice_emails');
  await knex.schema.dropTableIfExists('consultas_dni');
  await knex.schema.alterTable('transacciones', (table) => {
    table.dropForeign(['metodo_pago_id']);
  });
  await knex.schema.dropTableIfExists('metodos_pago');
  await knex.schema.alterTable('transacciones', (table) => {
    table.dropUnique(['referencia_pago_externa']);
    table.dropColumn('referencia_pago_externa');
    table.dropColumn('proveedor_pago');
    table.dropColumn('pago_simulado');
    table.dropColumn('origen_pago');
    table.dropColumn('tarjeta_ultimos_digitos');
    table.dropColumn('metodo_pago_id');
  });
};
