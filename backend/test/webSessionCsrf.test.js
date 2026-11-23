const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'production';
process.env.CORS_ORIGIN = 'https://sit-pay.example';
const {
  protectWebSessionRequests,
  requireTrustedOrigin,
} = require('../src/middlewares/webSessionCsrf');

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('requires a configured origin for web session authentication actions', () => {
  const res = makeResponse();
  let continued = false;

  requireTrustedOrigin(
    { get: () => 'https://attacker.example' },
    res,
    () => { continued = true; },
  );

  assert.equal(continued, false);
  assert.equal(res.statusCode, 403);
});

test('rejects unsafe cookie-authenticated requests from untrusted origins', () => {
  const req = {
    method: 'POST',
    headers: { cookie: 'sitpay_web_access=token' },
    get: () => 'http://localhost:5173',
  };
  const res = makeResponse();
  let continued = false;

  protectWebSessionRequests(req, res, () => { continued = true; });

  assert.equal(continued, false);
  assert.equal(res.statusCode, 403);
});

test('allows safe reads and unsafe requests from the configured web origin', () => {
  let continued = 0;
  const next = () => { continued += 1; };

  protectWebSessionRequests(
    { method: 'GET', headers: { cookie: 'sitpay_web_access=token' }, get: () => null },
    makeResponse(),
    next,
  );
  protectWebSessionRequests(
    {
      method: 'POST',
      headers: { cookie: 'sitpay_web_access=token' },
      get: () => 'https://sit-pay.example',
    },
    makeResponse(),
    next,
  );

  assert.equal(continued, 2);
});
