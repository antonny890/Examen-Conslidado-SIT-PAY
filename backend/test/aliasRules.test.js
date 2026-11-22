const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hasProhibitedTerm,
  normalizeAlias,
  validateAlias,
} = require('../src/utils/aliasRules');

test('validates the alias format and length', () => {
  assert.equal(validateAlias('Abcde1'), null);
  assert.equal(validateAlias('A1234'), null);
  assert.equal(validateAlias('A'.repeat(16)), null);
  assert.match(validateAlias('Abcd'), /5 y 16/);
  assert.match(validateAlias('A'.repeat(17)), /5 y 16/);
  assert.match(validateAlias('1Abcd'), /iniciar con una letra/);
  assert.match(validateAlias('José123'), /sin tildes/);
  assert.match(validateAlias('Abc 12'), /espacios/);
  assert.match(validateAlias('Abcde '), /espacios/);
});

test('normalizes accents, separators, and common leetspeak substitutions', () => {
  assert.equal(normalizeAlias('P-út4'), 'puta');
  assert.equal(hasProhibitedTerm('Püt4s2026'), true);
  assert.equal(validateAlias('Computadora1'), null);
});

test('blocks prohibited aliases without rejecting empty optional values', () => {
  assert.equal(validateAlias('Puta123'), 'Ese alias no está permitido.');
  assert.equal(validateAlias('Pendejo7'), 'Ese alias no está permitido.');
  assert.equal(validateAlias('P3ndej0'), 'Ese alias no está permitido.');
  assert.equal(validateAlias('SoyPuta123'), 'Ese alias no está permitido.');
  assert.equal(validateAlias(''), null);
});
