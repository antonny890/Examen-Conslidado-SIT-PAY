const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'production';
const {
  clearWebSessionCookies,
  getAccessTokenCookie,
  getRefreshTokenCookie,
  hasWebSessionCookie,
  setWebSessionCookies,
} = require('../src/utils/webSessionCookies');

test('reads web session cookies without confusing similarly named cookies', () => {
  const req = {
    headers: {
      cookie: 'other=value; sitpay_web_access=access%2Etoken; sitpay_web_refresh=refresh-token',
    },
  };

  assert.equal(getAccessTokenCookie(req), 'access.token');
  assert.equal(getRefreshTokenCookie(req), 'refresh-token');
  assert.equal(hasWebSessionCookie(req), true);
});

test('sets and clears HttpOnly, Secure, SameSite cookies with scoped refresh path', () => {
  const calls = [];
  const res = {
    cookie: (...args) => calls.push(['set', ...args]),
    clearCookie: (...args) => calls.push(['clear', ...args]),
  };

  setWebSessionCookies(res, {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  });
  clearWebSessionCookies(res);

  assert.equal(calls.length, 4);
  const options = [calls[0][3], calls[1][3], calls[2][2], calls[3][2]];
  for (const cookieOptions of options) {
    assert.equal(cookieOptions.httpOnly, true);
    assert.equal(cookieOptions.secure, true);
    assert.equal(cookieOptions.sameSite, 'strict');
  }
  assert.equal(calls[0][3].path, '/api/v1');
  assert.equal(calls[1][3].path, '/api/v1/auth/web');
  assert.equal(calls[2][2].path, '/api/v1');
  assert.equal(calls[3][2].path, '/api/v1/auth/web');
});
