const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeSuccessfulPayments } = require('../src/utils/paymentDashboardSummary');

test('counts successful and simulated payments on the Peru calendar day', () => {
  const summary = summarizeSuccessfulPayments([
    { estado: 'EXITOSA', pago_simulado: true, fecha_pago: '2026-05-04T03:00:00Z', monto: '1.50' },
    { estado: 'EXITOSA', pago_simulado: false, fecha_pago: '2026-05-04T04:00:00Z', monto: '2.00' },
    { estado: 'PENDIENTE', fecha_pago: '2026-05-04T04:10:00Z', monto: '9.00' },
    { estado: 'EXITOSA', fecha_pago: '2026-05-04T05:30:00Z', monto: '3.00' },
  ], '2026-05-04T04:30:00Z');

  assert.deepEqual(summary.today, { monto: 3.5, pasajes: 2 });
  assert.deepEqual(summary.historical, { monto: 6.5, pasajes: 3 });
});
