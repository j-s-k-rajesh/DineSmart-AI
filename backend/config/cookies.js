const env = require('./env');

const baseCookieOptions = () => ({
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
  ...(env.cookieDomain ? { domain: env.cookieDomain } : {})
});

const authCookieOptions = (maxAge) => ({
  ...baseCookieOptions(),
  httpOnly: true,
  maxAge
});

const csrfCookieOptions = () => ({
  ...baseCookieOptions(),
  httpOnly: false,
  maxAge: 8 * 60 * 60 * 1000
});

const clearCookieOptions = (httpOnly) => ({
  ...baseCookieOptions(),
  httpOnly
});

module.exports = {
  authCookieOptions,
  csrfCookieOptions,
  clearCookieOptions
};
