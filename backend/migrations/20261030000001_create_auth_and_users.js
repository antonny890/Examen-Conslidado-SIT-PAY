/**
 * Migración: 01 - Roles, Usuarios y Perfiles
 * Cumplimiento Ley 29733 (Protección de Datos Personales):
 * - Consentimiento explícito de tratamiento de datos
 * - Minimización de datos
 * - Supabase Auth mantiene credenciales; PostgreSQL conserva perfiles y roles
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabla de Roles (RBAC)
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('codigo', 30).notNullable().unique(); // 'SUPER_ADMIN', 'ADMIN_EMPRESA', 'CHOFER', 'PASAJERO'
    table.string('nombre', 50).notNullable();
    table.string('descripcion', 255).nullable();
    table.timestamps(true, true);
  });

  // 2. Tabla de Usuarios (Credenciales y Seguridad)
  await knex.schema.createTable('usuarios', (table) => {
    table.uuid('id').primary().references('id').inTable('auth.users').onDelete('CASCADE');
    table.string('email', 150).notNullable().unique();
    table
      .integer('rol_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('roles')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table.string('rol_codigo', 30).notNullable();
    table.string('rol_nombre', 50).notNullable();
    table.string('estado', 20).notNullable().defaultTo('ACTIVO'); // ACTIVO, INACTIVO, BLOQUEADO
    table.boolean('email_verificado').notNullable().defaultTo(false);
    table.boolean('google_connected').notNullable().defaultTo(false);
    table.string('token_recuperacion', 255).nullable();
    table.timestamp('expiracion_recuperacion').nullable();
    table.timestamp('token_invalid_before').nullable();
    table.timestamp('ultimo_login_at').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamps(true, true);

    table.index(['email']);
    table.index(['rol_id']);
    table.index(['estado']);
  });

  // 3. Tabla de Perfiles (Datos personales bajo consentimiento Ley 29733)
  await knex.schema.createTable('perfiles', (table) => {
    table.uuid('id').primary().references('id').inTable('usuarios').onDelete('CASCADE');
    table
      .uuid('usuario_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('usuarios')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.string('nombres', 100).notNullable();
    table.string('apellidos', 100).notNullable();
    table.string('tipo_documento', 10).nullable().defaultTo('DNI'); // DNI, CE
    table.string('numero_documento', 20).nullable();
    table.string('telefono', 20).nullable();
    table.text('foto_url').nullable();
    table.string('foto_storage_path', 500).nullable();
    table.string('alias', 40).nullable();
    table.jsonb('identidad').nullable();
    // Requisito Ley 29733
    table.boolean('consentimiento_datos').notNullable().defaultTo(false);
    table.timestamp('fecha_consentimiento').nullable();
    table.timestamps(true, true);

    table.index(['usuario_id']);
    table.unique(['tipo_documento', 'numero_documento']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('perfiles');
  await knex.schema.dropTableIfExists('usuarios');
  await knex.schema.dropTableIfExists('roles');
};
