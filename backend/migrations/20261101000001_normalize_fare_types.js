/**
 * Normaliza las tarifas del sistema a NORMAL y UNIVERSITARIA.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.transaction(async (trx) => {
    const fares = await trx('tarifas').select('id', 'tipo_pasajero').orderBy('id', 'asc');
    const universityFares = fares.filter((fare) =>
      ['UNIVERSITARIO', 'UNIVERSITARIA', 'ESCOLAR'].includes(fare.tipo_pasajero)
    );
    const canonicalUniversityFare = universityFares.find((fare) =>
      ['UNIVERSITARIA', 'UNIVERSITARIO'].includes(fare.tipo_pasajero)
    ) || universityFares[0];

    for (const fare of fares) {
      if (fare.tipo_pasajero === 'ADULTO') {
        await trx('tarifas').where({ id: fare.id }).update({ tipo_pasajero: 'NORMAL' });
      }
    }

    if (canonicalUniversityFare) {
      for (const fare of universityFares) {
        if (fare.id === canonicalUniversityFare.id) continue;

        await trx('transacciones')
          .where({ tarifa_id: fare.id })
          .update({ tarifa_id: canonicalUniversityFare.id });
        await trx('tarifas').where({ id: fare.id }).del();
      }

      await trx('tarifas')
        .where({ id: canonicalUniversityFare.id })
        .update({ tipo_pasajero: 'UNIVERSITARIA' });
    }

    await trx('solicitudes_preferenciales')
      .whereIn('tipo_preferencial', ['UNIVERSITARIO', 'ESCOLAR'])
      .update({ tipo_preferencial: 'UNIVERSITARIA' });
    await trx('solicitudes_preferenciales')
      .where({ metodo_verificacion: 'FOTO_CARNE', estado: 'PENDIENTE' })
      .update({
        estado: 'RECHAZADA',
        observacion_revision: 'Método de foto deshabilitado; acredita el beneficio con correo institucional.',
      });

    await trx('transacciones')
      .whereIn('tipo_tarifa_aplicada', ['ADULTO'])
      .update({ tipo_tarifa_aplicada: 'NORMAL' });

    await trx('transacciones')
      .whereIn('tipo_tarifa_aplicada', ['UNIVERSITARIO', 'ESCOLAR'])
      .update({ tipo_tarifa_aplicada: 'UNIVERSITARIA' });
  });
};

exports.down = async function (knex) {
  await knex('tarifas').where({ tipo_pasajero: 'NORMAL' }).update({ tipo_pasajero: 'ADULTO' });
  await knex('tarifas').where({ tipo_pasajero: 'UNIVERSITARIA' }).update({ tipo_pasajero: 'UNIVERSITARIO' });
  await knex('solicitudes_preferenciales')
    .where({ tipo_preferencial: 'UNIVERSITARIA' })
    .update({ tipo_preferencial: 'UNIVERSITARIO' });
  await knex('transacciones').where({ tipo_tarifa_aplicada: 'NORMAL' }).update({ tipo_tarifa_aplicada: 'ADULTO' });
  await knex('transacciones')
    .where({ tipo_tarifa_aplicada: 'UNIVERSITARIA' })
    .update({ tipo_tarifa_aplicada: 'UNIVERSITARIO' });
};
