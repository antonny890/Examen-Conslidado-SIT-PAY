const { listCollection, queryCollection, timestampToDate } = require('./firestoreData');

const DAYS = {
  0: 'DOMINGO',
  1: 'LUNES',
  2: 'MARTES',
  3: 'MIERCOLES',
  4: 'JUEVES',
  5: 'VIERNES',
  6: 'SABADO',
};

const newestFirst = (left, right) => {
  const leftDate = timestampToDate(left.created_at)?.getTime() || 0;
  const rightDate = timestampToDate(right.created_at)?.getTime() || 0;
  return rightDate - leftDate;
};

const isFareCurrent = (fare, today) => {
  const startsAt = timestampToDate(fare.vigencia_inicio)?.toISOString().slice(0, 10) ||
    String(fare.vigencia_inicio || '').slice(0, 10);
  const endsAt = timestampToDate(fare.vigencia_fin)?.toISOString().slice(0, 10) ||
    String(fare.vigencia_fin || '').slice(0, 10);
  return (!startsAt || startsAt <= today) && (!endsAt || endsAt >= today);
};

const calculateApplicableFare = async (passengerId, customDate = new Date()) => {
  const now = customDate instanceof Date ? customDate : new Date(customDate);
  if (Number.isNaN(now.getTime())) throw new Error('La fecha de cálculo de tarifa no es válida.');
  const today = now.toISOString().slice(0, 10);
  const activeFares = (await queryCollection('tarifas', 'activo', '==', true))
    .filter((fare) => isFareCurrent(fare, today))
    .sort(newestFirst);
  const normalFare = activeFares.find((fare) => fare.tipo_pasajero === 'NORMAL');
  if (!normalFare) throw new Error('No se encontró una tarifa normal configurada en el sistema.');

  const preferences = (await queryCollection('solicitudes_preferenciales', 'usuario_id', '==', passengerId))
    .filter((request) => request.estado === 'APROBADA')
    .filter((request) => !request.fecha_vencimiento || request.fecha_vencimiento >= today)
    .sort(newestFirst);
  const accreditation = preferences[0];
  if (!accreditation) {
    return {
      tarifaId: normalFare.id,
      tipoPasajero: 'NORMAL',
      tipoTarifaAplicada: 'NORMAL',
      monto: Number(normalFare.monto),
      descuento: 0,
      motivo: 'Sin acreditación universitaria activa (Tarifa normal)',
      esMedioPasaje: false,
    };
  }

  const universityFare = activeFares.find((fare) => fare.tipo_pasajero === 'UNIVERSITARIA');
  if (!universityFare) {
    return {
      tarifaId: normalFare.id,
      tipoPasajero: 'UNIVERSITARIA',
      tipoTarifaAplicada: 'NORMAL',
      monto: Number(normalFare.monto),
      descuento: 0,
      motivo: 'Tarifa universitaria no disponible en el sistema',
      esMedioPasaje: false,
    };
  }

  let applicableDays = universityFare.dias_semana_aplicables;
  if (typeof applicableDays === 'string') {
    try {
      applicableDays = JSON.parse(applicableDays);
    } catch (error) {
      throw new Error('La configuración de días de la tarifa universitaria no es válida.', { cause: error });
    }
  }
  const day = DAYS[now.getDay()];
  const time = now.toTimeString().split(' ')[0];
  const validDay = Array.isArray(applicableDays) && applicableDays.includes(day);
  const validTime = time >= universityFare.hora_inicio && time <= universityFare.hora_fin;
  if (validDay && validTime) {
    return {
      tarifaId: universityFare.id,
      tipoPasajero: 'UNIVERSITARIA',
      tipoTarifaAplicada: 'UNIVERSITARIA',
      monto: Number(universityFare.monto),
      descuento: Number(universityFare.porcentaje_descuento || 0),
      motivo: 'Beneficio Ley 26271 aplicado (50% de descuento en horario 05:00 a 24:00)',
      esMedioPasaje: true,
      acreditacionId: accreditation.id,
    };
  }

  return {
    tarifaId: normalFare.id,
    tipoPasajero: 'UNIVERSITARIA',
    tipoTarifaAplicada: 'NORMAL',
    monto: Number(normalFare.monto),
    descuento: 0,
    motivo: 'Acreditación universitaria fuera del horario reglamentario (05:00 a 24:00 días laborables)',
    esMedioPasaje: false,
  };
};

module.exports = { calculateApplicableFare };
