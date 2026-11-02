/**
 * Migración: 04 - Solicitudes de Perfil Preferencial y Reclamos/Incidencias
 * Cumplimiento Ley 26271 (Validación de carné universitario/escolar)
 * Cumplimiento Ley 29571 (Libro de Reclamaciones e Incidencias del Consumidor)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Solicitudes de Acreditación de Pasaje Preferencial
  await knex.schema.createTable('solicitudes_preferenciales', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('usuario_id')
      .notNullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('CASCADE');
    table.string('tipo_preferencial', 30).notNullable(); // 'UNIVERSITARIO', 'ESCOLAR'
    table.string('institucion_educativa', 180).notNullable(); // ej. 'Universidad Continental', 'UNSA', etc.
    table.string('metodo_verificacion', 30).notNullable(); // 'CORREO_INSTITUCIONAL', 'FOTO_CARNE'
    
    // Método a: Correo Institucional (.edu.pe)
    table.string('correo_institucional', 150).nullable();
    table.string('codigo_otp', 6).nullable();
    table.timestamp('codigo_otp_expira_at').nullable();
    
    // Método b: Foto del Carné
    table.text('foto_carne_url').nullable();
    
    // Estados del flujo: PENDIENTE, APROBADA, RECHAZADA, VENCIDA
    table.string('estado', 20).notNullable().defaultTo('PENDIENTE');
    table
      .uuid('revisor_usuario_id')
      .nullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('SET NULL');
    table.text('observacion_revision').nullable();
    table.date('fecha_vencimiento').nullable(); // Vigencia semestral o anual
    table.timestamp('fecha_revision_at').nullable();
    table.timestamps(true, true);

    table.index(['usuario_id']);
    table.index(['estado']);
    table.index(['correo_institucional']);
  });

  // 2. Incidencias y Reclamos del Pasajero (Ley 29571)
  await knex.schema.createTable('incidencias_reclamos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('codigo_reclamo', 30).notNullable().unique(); // 'REC-20261030-001'
    table
      .uuid('usuario_id')
      .notNullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('CASCADE');
    table
      .uuid('transaccion_id')
      .nullable()
      .references('id')
      .inTable('transacciones')
      .onDelete('SET NULL');
    table
      .uuid('empresa_id')
      .nullable()
      .references('id')
      .inTable('empresas')
      .onDelete('SET NULL');
    table.string('tipo_incidencia', 40).notNullable(); // 'COBRO_INDEBIDO', 'NEGATIVA_MEDIO_PASAJE', 'FALLA_SISTEMA', 'OTRO'
    table.text('descripcion').notNullable();
    table.text('evidencia_url').nullable();
    table.string('estado', 25).notNullable().defaultTo('REGISTRADO'); // 'REGISTRADO', 'EN_REVISION', 'RESUELTO', 'RECHAZADO'
    table.text('respuesta_resolucion').nullable();
    table
      .uuid('respondido_por_usuario_id')
      .nullable()
      .references('id')
      .inTable('usuarios')
      .onDelete('SET NULL');
    table.timestamp('fecha_resolucion_at').nullable();
    table.timestamps(true, true);

    table.index(['usuario_id']);
    table.index(['transaccion_id']);
    table.index(['empresa_id']);
    table.index(['estado']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('incidencias_reclamos');
  await knex.schema.dropTableIfExists('solicitudes_preferenciales');
};
