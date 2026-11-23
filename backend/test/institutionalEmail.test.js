const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getVerifiedInstitutionalEmail,
  isInstitutionalEmailAddress,
} = require('../src/utils/institutionalEmail');

test('accepts a verified passenger account with an institutional email', () => {
  const identity = getVerifiedInstitutionalEmail({
    rol_codigo: 'PASAJERO',
    email_verificado: true,
    email: '  student@continental.edu.pe ',
  });

  assert.deepEqual(identity, {
    email: 'student@continental.edu.pe',
    domain: 'continental.edu.pe',
    institution: 'Universidad Continental',
  });
});

test('does not auto-accredit unverified or non-passenger accounts', () => {
  assert.equal(getVerifiedInstitutionalEmail({
    rol_codigo: 'PASAJERO',
    email_verificado: false,
    email: 'student@continental.edu.pe',
  }), null);
  assert.equal(getVerifiedInstitutionalEmail({
    rol_codigo: 'CHOFER',
    email_verificado: true,
    email: 'driver@continental.edu.pe',
  }), null);
  assert.equal(getVerifiedInstitutionalEmail({
    rol_codigo: 'PASAJERO',
    email_verificado: true,
    email: 'user@gmail.com',
  }), null);
});

test('institutional email validation is case-insensitive and rejects malformed addresses', () => {
  assert.equal(isInstitutionalEmailAddress('Student@CONTINENTAL.EDU.PE'), true);
  assert.equal(isInstitutionalEmailAddress('student@invalid'), false);
  assert.equal(isInstitutionalEmailAddress(''), false);
});
