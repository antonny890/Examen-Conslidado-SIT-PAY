const { dateKeyInPeru } = require('./dateKeyInPeru');

const amount = (value) => Number(value || 0);

const summarizeSuccessfulPayments = (transactions, now = new Date()) => {
  const successful = transactions.filter((record) => record.estado === 'EXITOSA');
  const today = dateKeyInPeru(now);
  const todayTransactions = successful.filter(
    (record) => dateKeyInPeru(record.fecha_pago) === today,
  );

  return {
    successful,
    today: {
      monto: todayTransactions.reduce((sum, record) => sum + amount(record.monto), 0),
      pasajes: todayTransactions.length,
    },
    historical: {
      monto: successful.reduce((sum, record) => sum + amount(record.monto), 0),
      pasajes: successful.length,
    },
  };
};

module.exports = { summarizeSuccessfulPayments };
