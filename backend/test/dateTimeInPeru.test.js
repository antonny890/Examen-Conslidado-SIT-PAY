const test = require('node:test');
const assert = require('node:assert/strict');
const { dateTimePartsInPeru } = require('../src/utils/dateTimeInPeru');

test('dateTimePartsInPeru uses Arequipa weekday and time across UTC midnight', () => {
  const parts = dateTimePartsInPeru('2026-05-04T04:30:00.000Z');

  assert.deepEqual(parts, { day: 'DOMINGO', time: '23:30:00' });
});

test('dateTimePartsInPeru rejects invalid dates', () => {
  assert.equal(dateTimePartsInPeru('invalid-date'), null);
});
