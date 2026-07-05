const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const env = require('../config/env');
const { csrfCookieOptions } = require('../config/cookies');

const secureHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'ws:', 'wss:']
    }
  },
  referrerPolicy: { policy: 'same-origin' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: 'Brute-force alert: Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const cleanInput = (val) => {
  if (typeof val === 'string') {
    return val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  if (Array.isArray(val)) {
    return val.map(cleanInput);
  }

  if (val !== null && typeof val === 'object') {
    const cleanObj = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        cleanObj[key] = cleanInput(val[key]);
      }
    }
    return cleanObj;
  }

  return val;
};

const xssSanitizer = (req, res, next) => {
  if (req.body) req.body = cleanInput(req.body);
  if (req.query) req.query = cleanInput(req.query);
  if (req.params) req.params = cleanInput(req.params);
  next();
};

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

const tokensMatch = (cookieToken, headerToken) => {
  if (!cookieToken || !headerToken) {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(cookieBuffer, headerBuffer);
};

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return env.clientUrls.includes(origin);
};

const csrfValidator = (req, res, next) => {
  if (safeMethods.has(req.method)) {
    return next();
  }

  if (!isAllowedOrigin(req.get('origin'))) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'Request origin is not allowed'
    });
  }

  const csrfCookie = req.cookies ? req.cookies.csrfToken : null;
  const csrfHeader = req.get('X-CSRF-Token');

  if (!tokensMatch(csrfCookie, csrfHeader)) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'CSRF token mismatch. Action forbidden.'
    });
  }

  next();
};

const isValidCsrfToken = (token) => /^[a-f0-9]{64}$/i.test(token || '');

const csrfTokenHandler = (req, res) => {
  const existingToken = req.cookies ? req.cookies.csrfToken : null;
  const csrfToken = isValidCsrfToken(existingToken)
    ? existingToken
    : crypto.randomBytes(32).toString('hex');

  res.cookie('csrfToken', csrfToken, csrfCookieOptions());
  res.set('Cache-Control', 'no-store');

  return res.status(200).json({
    success: true,
    csrfToken
  });
};

module.exports = {
  secureHeaders,
  apiLimiter,
  authLimiter,
  xssSanitizer,
  csrfValidator,
  csrfTokenHandler
};
