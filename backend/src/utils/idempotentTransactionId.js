const crypto = require('node:crypto');

const idempotentTransactionId = (passengerId, operationKey) => {
  const hash = crypto.createHash('sha256')
    .update(`${passengerId}:${operationKey}`)
    .digest('hex')
    .slice(0, 32);

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20),
  ].join('-');
};

module.exports = { idempotentTransactionId };
