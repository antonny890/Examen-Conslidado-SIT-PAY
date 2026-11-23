const ACCESS_COOKIE = 'sitpay_web_access';
const REFRESH_COOKIE = 'sitpay_web_refresh';
const isProduction = process.env.NODE_ENV === 'production';

const getCookie = (req, name) => {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  for (const part of cookies.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
};

const getAccessTokenCookie = (req) => getCookie(req, ACCESS_COOKIE);
const getRefreshTokenCookie = (req) => getCookie(req, REFRESH_COOKIE);
const hasWebSessionCookie = (req) =>
  Boolean(getAccessTokenCookie(req) || getRefreshTokenCookie(req));

const cookieOptions = (path) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path,
});

const setWebSessionCookies = (res, tokens) => {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, cookieOptions('/api/v1'));
  res.cookie(
    REFRESH_COOKIE,
    tokens.refreshToken,
    cookieOptions('/api/v1/auth/web'),
  );
};

const clearWebSessionCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, cookieOptions('/api/v1'));
  res.clearCookie(
    REFRESH_COOKIE,
    cookieOptions('/api/v1/auth/web'),
  );
};

module.exports = {
  clearWebSessionCookies,
  getAccessTokenCookie,
  getRefreshTokenCookie,
  hasWebSessionCookie,
  setWebSessionCookies,
};
