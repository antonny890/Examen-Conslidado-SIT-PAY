/**
 * Motor de Tarifas Dinámicas - Cumplimiento Ley 26271
 *
 * Reglas de la Ley 26271 (Pasaje Universitario y Escolar):
 * - La tarifa universitaria acreditada es el 50% de la tarifa normal (configurable en BD).
 * - Se aplica de 05:00 a 24:00 horas en días laborables (Lunes a Sábado).
 * - Requiere validación previa y acreditación con estado APROBADA y vigencia no expirada.
 * - Fuera de dicho horario, días no laborables o sin acreditación aprobada, se cobra tarifa NORMAL.
 */
const db = require('../config/db');

const DIAS_MAP = {
  0: 'DOMINGO',
  1: 'LUNES',
  2: 'MARTES',
  3: 'MIERCOLES',
  4: 'JUEVES',
  5: 'VIERNES',
  6: 'SABADO',
};

/**
 * Calcula la tarifa aplicable a un pasajero en el momento actual o fecha dada
 * @param {string} pasajeroId - UUID del pasajero
 * @param {Date} [customDate] - Fecha de evaluación (por defecto Date.now())
 * @returns {Promise<Object>}
 */
const calculateApplicableFare = async (pasajeroId, customDate = new Date()) => {
  const now = customDate instanceof Date ? customDate : new Date(customDate);
  const diaSemana = DIAS_MAP[now.getDay()];
  const horaActualStr = now.toTimeString().split(' ')[0]; // 'HH:MM:SS'
  const fechaHoyStr = now.toISOString().split('T')[0]; // 'YYYY-MM-DD'

  // 1. Obtener la tarifa normal vigente como base
  const tarifaNormal = await db('tarifas')
    .where({ tipo_pasajero: 'NORMAL', activo: true })
    .orderBy('id', 'desc')
    .first();

  if (!tarifaNormal) {
    throw new Error('No se encontró una tarifa normal configurada en el sistema.');
  }

  // 2. Verificar si el pasajero tiene una acreditación preferencial APROBADA y VIGENTE
  const acreditacion = await db('solicitudes_preferenciales')
    .where({
      usuario_id: pasajeroId,
      estado: 'APROBADA',
    })
    .where((builder) => {
      builder.whereNull('fecha_vencimiento').orWhere('fecha_vencimiento', '>=', fechaHoyStr);
    })
    .orderBy('created_at', 'desc')
    .first();

  // Si no cuenta con acreditación aprobada, se aplica la tarifa regular
  if (!acreditacion) {
    return {
      tarifaId: tarifaNormal.id,
      tipoPasajero: 'NORMAL',
      tipoTarifaAplicada: 'NORMAL',
      monto: parseFloat(tarifaNormal.monto),
      descuento: 0,
      motivo: 'Sin acreditación universitaria activa (Tarifa normal)',
      esMedioPasaje: false,
    };
  }

  // 3. Evaluar horario y día de la Ley 26271 para la tarifa preferencial correspondiente
  const tarifaPreferencial = await db('tarifas')
    .where({ tipo_pasajero: 'UNIVERSITARIA', activo: true })
    .orderBy('id', 'desc')
    .first();

  if (!tarifaPreferencial) {
    return {
      tarifaId: tarifaNormal.id,
      tipoPasajero: 'UNIVERSITARIA',
      tipoTarifaAplicada: 'NORMAL',
      monto: parseFloat(tarifaNormal.monto),
      descuento: 0,
      motivo: 'Tarifa universitaria no disponible en el sistema',
      esMedioPasaje: false,
    };
  }

  // Verificar días aplicables
  const diasAplicables = typeof tarifaPreferencial.dias_semana_aplicables === 'string'
    ? JSON.parse(tarifaPreferencial.dias_semana_aplicables)
    : tarifaPreferencial.dias_semana_aplicables;

  const esDiaValido = Array.isArray(diasAplicables) && diasAplicables.includes(diaSemana);

  // Verificar rango de hora reglamentario (05:00 a 24:00)
  const esHoraValida =
    horaActualStr >= tarifaPreferencial.hora_inicio &&
    horaActualStr <= tarifaPreferencial.hora_fin;

  if (esDiaValido && esHoraValida) {
    return {
      tarifaId: tarifaPreferencial.id,
      tipoPasajero: 'UNIVERSITARIA',
      tipoTarifaAplicada: 'UNIVERSITARIA',
      monto: parseFloat(tarifaPreferencial.monto),
      descuento: parseFloat(tarifaPreferencial.porcentaje_descuento),
      motivo: `Beneficio Ley 26271 aplicado (50% de descuento en horario 05:00 a 24:00)`,
      esMedioPasaje: true,
      acreditacionId: acreditacion.id,
    };
  } else {
    return {
      tarifaId: tarifaNormal.id,
      tipoPasajero: 'UNIVERSITARIA',
      tipoTarifaAplicada: 'NORMAL',
      monto: parseFloat(tarifaNormal.monto),
      descuento: 0,
      motivo: 'Acreditación universitaria fuera del horario reglamentario (05:00 a 24:00 días laborables)',
      esMedioPasaje: false,
    };
  }
};

module.exports = {
  calculateApplicableFare,
};
