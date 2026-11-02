/**
 * Migración: 03 - Tarifas, Billeteras Virtuales, Recargas y Transacciones
 * Cumplimiento Ley 26271 (Pasaje diferenciado) y Ley 29985 (Dinero electrónico / Billetera simulada)
 * Manejo de atomicidad financiera y prevención de doble cobro con idempotencia.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Motor de Tarifas Dinámicas y Configurables (Ley 26271)
  await knex.schema.createTable('tarifas', (table) => {
    table.increments('id').primary();
    table.string('nombre', 80).notNullable(); // ej. 'Tarifa Regular Adulto', 'Medio Pasaje Universitario'
    table.string('tipo_pasajero', 30).notNullable(); // 'ADULTO', 'UNIVERSITARIO', 'ESCOLAR'
    table.decimal('monto', 6, 2).notNullable(); // S/ 1.00, S/ 0.50
    table.decimal('porcentaje_descuento', 5, 2).notNullable().defaultTo(0.0); // 0% o 50%
    table.time('hora_inicio').notNullable().defaultTo('05:00:00'); // Ley 26271: 05:00 a 24:00
    table.time('hora_fin').notNullable().defaultTo('23:59:59');
    // Días en formato JSON: ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"]
    table.jsonb('dias_semana_aplicables').notNullable();
    table.boolean('solo_dias_laborables').notNullable().defaultTo(true);
    table.date('vigencia_inicio').notNullable();
    table.date('vigencia_fin').nullable();
    table.boolean('activo').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['tipo_pasajero', 'activo']);
  });

  // 2. Billetera Virtual (Simulada según Ley 29985)
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
    table.decimal('saldo', 10, 2).notNullable().defaultTo(0.0);
    table.string('moneda', 3).notNullable().defaultTo('PEN');
    table.string('estado', 20).notNullable().defaultTo('ACTIVA'); // ACTIVA, SUSPENDIDA
    table.timestamps(true, true);

    table.index(['usuario_id']);
  });

  // 3. Recargas a la Billetera (Pasarela simulada)
  await knex.schema.createTable('recargas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('billetera_id')
      .notNullable()
      .references('id')
      .inTable('billeteras')
      .onDelete('CASCADE');
    table.decimal('monto', 8, 2).notNullable();
    table.string('metodo_pago', 40).notNullable(); // 'SIMULADO_TARJETA', 'SIMULADO_YAPE', 'SIMULADO_PLIN'
    table.string('codigo_operacion', 50).notNullable().unique();
    table.string('estado', 20).notNullable().defaultTo('COMPLETADA'); // COMPLETADA, PENDIENTE, FALLIDA
    table.decimal('saldo_resultante', 10, 2).notNullable();
    table.timestamps(true, true);

    table.index(['billetera_id']);
    table.index(['codigo_operacion']);
  });

  // 4. Transacciones de Pago de Pasaje (Cumplimiento Ley 29571: Boleta digital y comprobante)
  await knex.schema.createTable('transacciones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('codigo_boleta', 40).notNullable().unique(); // ej. 'BOL-20261030-000456'
    table.string('idempotency_key', 100).notNullable().unique(); // Previene doble cobro
    table
      .uuid('pasajero_id')
      .notNullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('RESTRICT');
    table
      .uuid('vehiculo_id')
      .notNullable()
      .references('id')
      .inTable('vehiculos')
      .onDelete('RESTRICT');
    table
      .uuid('chofer_usuario_id')
      .nullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('SET NULL');
    table
      .uuid('empresa_id')
      .notNullable()
      .references('id')
      .inTable('empresas')
      .onDelete('RESTRICT');
    table
      .integer('tarifa_id')
      .notNullable()
      .references('id')
      .inTable('tarifas')
      .onDelete('RESTRICT');

    table.string('tipo_tarifa_aplicada', 30).notNullable(); // 'ADULTO', 'UNIVERSITARIO', 'ESCOLAR'
    table.decimal('monto', 6, 2).notNullable();
    table.decimal('saldo_anterior', 10, 2).notNullable();
    table.decimal('saldo_posterior', 10, 2).notNullable();
    table.string('metodo_pago', 20).notNullable().defaultTo('QR'); // 'QR', 'PLACA_MANUAL'
    table.string('estado', 20).notNullable().defaultTo('EXITOSA'); // EXITOSA, ANULADA
    table.timestamp('fecha_pago').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.index(['pasajero_id']);
    table.index(['vehiculo_id']);
    table.index(['chofer_usuario_id']);
    table.index(['empresa_id']);
    table.index(['fecha_pago']);
    table.index(['codigo_boleta']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('transacciones');
  await knex.schema.dropTableIfExists('recargas');
  await knex.schema.dropTableIfExists('billeteras');
  await knex.schema.dropTableIfExists('tarifas');
};
