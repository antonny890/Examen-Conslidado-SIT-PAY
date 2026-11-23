const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Lima',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const weekdays = {
  Sunday: 'DOMINGO',
  Monday: 'LUNES',
  Tuesday: 'MARTES',
  Wednesday: 'MIERCOLES',
  Thursday: 'JUEVES',
  Friday: 'VIERNES',
  Saturday: 'SABADO',
};

const dateTimePartsInPeru = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value: part }) => [type, part]),
  );
  return {
    day: weekdays[parts.weekday],
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
};

module.exports = { dateTimePartsInPeru };
