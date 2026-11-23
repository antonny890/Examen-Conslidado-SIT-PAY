const test = require('node:test');
const assert = require('node:assert/strict');
const { dateKeyInPeru } = require('../src/utils/dateKeyInPeru');

test('uses the Peru calendar date when a UTC timestamp crosses midnight', () => {
  assert.equal(dateKeyInPeru('2026-11-23T00:27:27.000Z'), '2026-11-22');
});

test('returns null for invalid timestamps', () => {
  assert.equal(dateKeyInPeru('not-a-date'), null);
});
