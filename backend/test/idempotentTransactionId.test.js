const test = require('node:test');
const assert = require('node:assert/strict');
const { idempotentTransactionId } = require('../src/utils/idempotentTransactionId');

test('creates a stable PostgreSQL UUID for each passenger and operation key', () => {
  const id = idempotentTransactionId(
    'passenger-1',
    'payment-attempt-1',
  );

  assert.match(id, /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  assert.equal(idempotentTransactionId('passenger-1', 'payment-attempt-1'), id);
  assert.notEqual(idempotentTransactionId('passenger-1', 'payment-attempt-2'), id);
  assert.notEqual(idempotentTransactionId('passenger-2', 'payment-attempt-1'), id);
});
