/**
 * Migración: 02 - Entidades del Sistema Integrado de Transporte (SIT)
 * - Unidades de negocio (cuencas C2 a C11)
 * - Empresas concesionarias
 * - Vehículos (con placa única y código QR seguro opaco)
 * - Choferes (vinculación 1 a 1 chofer-placa fija)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Unidades de Negocio (Zonas/Cuencas de Arequipa: C2 - C11)
  await knex.schema.createTable('unidades_negocio', (table) => {
    table.increments('id').primary();
    table.string('codigo', 10).notNullable().unique(); // 'C2', 'C3', ... 'C11'
    table.string('nombre', 150).notNullable(); // ej. 'Cono Norte - Cerro Colorado'
    table.text('descripcion').nullable();
    table.string('color_identificador', 20).nullable(); // para UI y señalética
    table.boolean('activo').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  // 2. Empresas Operadoras Concesionarias
  await knex.schema.createTable('empresas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('ruc', 11).notNullable().unique();
    table.string('razon_social', 180).notNullable();
    table.string('nombre_comercial', 120).notNullable();
    table.string('direccion', 200).nullable();
    table.string('telefono', 30).nullable();
    table.string('email_contacto', 150).notNullable();
    table
      .uuid('admin_usuario_id')
      .nullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('SET NULL');
    table.boolean('activo').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['ruc']);
  });

  // 3. Vehículos del SIT
  await knex.schema.createTable('vehiculos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('placa', 10).notNullable().unique(); // ej. 'V7A-890' (Normalizado mayúsculas)
    table
      .uuid('empresa_id')
      .notNullable()
      .references('id')
      .inTable('empresas')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table
      .integer('unidad_negocio_id')
      .notNullable()
      .references('id')
      .inTable('unidades_negocio')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table.string('modelo', 80).nullable();
    table.integer('anio_fabricacion').nullable();
    table.integer('capacidad_pasajeros').notNullable().defaultTo(35);
    // Código QR seguro opaco (NO contiene datos personales ni montos)
    table.string('qr_codigo_seguro', 120).notNullable().unique();
    table.text('qr_imagen_svg').nullable();
    table.boolean('activo').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['placa']);
    table.index(['empresa_id']);
    table.index(['unidad_negocio_id']);
    table.index(['qr_codigo_seguro']);
  });

  // 4. Choferes vinculados a una placa fija
  await knex.schema.createTable('choferes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('usuario_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('usuarios')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .uuid('empresa_id')
      .notNullable()
      .references('id')
      .inTable('empresas')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    // Relación 1 a 1: cada chofer está vinculado a UNA placa fija
    table
      .uuid('vehiculo_id')
      .nullable()
      .unique()
      .references('id')
      .inTable('vehiculos')
      .onDelete('SET NULL')
      .onUpdate('CASCADE');
    table.string('numero_licencia', 20).notNullable().unique();
    table.string('categoria_licencia', 10).notNullable().defaultTo('A-IIIa');
    table.string('estado_operativo', 20).notNullable().defaultTo('DISPONIBLE'); // DISPONIBLE, EN_RUTA, DESCANSO, SUSPENDIDO
    table.timestamps(true, true);

    table.index(['empresa_id']);
    table.index(['vehiculo_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('choferes');
  await knex.schema.dropTableIfExists('vehiculos');
  await knex.schema.dropTableIfExists('empresas');
  await knex.schema.dropTableIfExists('unidades_negocio');
};
