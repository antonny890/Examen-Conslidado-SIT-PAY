/**
 * Motor de Tarifas Dinámicas - Cumplimiento Ley 26271
 *
 * Reglas de la Ley 26271 (Pasaje Universitario y Escolar):
 * - El pasaje universitario y escolar es el 50% del pasaje adulto (tarifa configurable en BD).
 * - Se aplica de 05:00 a 24:00 horas en días laborables (Lunes a Sábado).
 * - Requiere validación previa y acreditación con estado APROBADA y vigencia no expirada.
 * - Fuera de dicho horario, días no laborables o sin acreditación aprobada, se cobra tarifa REGULAR ADULTO.
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

  // 1. Obtener la tarifa regular de adulto vigente como base
  const tarifaAdulto = await db('tarifas')
    .where({ tipo_pasajero: 'ADULTO', activo: true })
    .orderBy('id', 'desc')
    .first();

  if (!tarifaAdulto) {
    throw new Error('No se encontró una tarifa regular de adulto configurada en el sistema.');
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
      tarifaId: tarifaAdulto.id,
      tipoPasajero: 'REGULAR',
      tipoTarifaAplicada: 'ADULTO',
      monto: parseFloat(tarifaAdulto.monto),
      descuento: 0,
      motivo: 'Sin acreditación preferencial activa aprobada (Tarifa Regular)',
      esMedioPasaje: false,
    };
  }

  // 3. Evaluar horario y día de la Ley 26271 para la tarifa preferencial correspondiente
  const tipoPreferencial = acreditacion.tipo_preferencial; // 'UNIVERSITARIO' o 'ESCOLAR'

  const tarifaPreferencial = await db('tarifas')
    .where({ tipo_pasajero: tipoPreferencial, activo: true })
    .orderBy('id', 'desc')
    .first();

  if (!tarifaPreferencial) {
    return {
      tarifaId: tarifaAdulto.id,
      tipoPasajero: tipoPreferencial,
      tipoTarifaAplicada: 'ADULTO',
      monto: parseFloat(tarifaAdulto.monto),
      descuento: 0,
      motivo: `Tarifa preferencial para ${tipoPreferencial} no disponible en sistema`,
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
      tipoPasajero: tipoPreferencial,
      tipoTarifaAplicada: tipoPreferencial,
      monto: parseFloat(tarifaPreferencial.monto),
      descuento: parseFloat(tarifaPreferencial.porcentaje_descuento),
      motivo: `Beneficio Ley 26271 aplicado (50% de descuento en horario 05:00 a 24:00)`,
      esMedioPasaje: true,
      acreditacionId: acreditacion.id,
    };
  } else {
    return {
      tarifaId: tarifaAdulto.id,
      tipoPasajero: tipoPreferencial,
      tipoTarifaAplicada: 'ADULTO',
      monto: parseFloat(tarifaAdulto.monto),
      descuento: 0,
      motivo: `Acreditado como ${tipoPreferencial}, pero fuera del horario reglamentario Ley 26271 (05:00 a 24:00 días laborables)`,
      esMedioPasaje: false,
    };
  }
};

module.exports = {
  calculateApplicableFare,
};
