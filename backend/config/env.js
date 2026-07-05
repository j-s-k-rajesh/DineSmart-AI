const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const REQUIRED_ENV = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL'
];

const allowedSameSiteValues = ['strict', 'lax', 'none'];

function parseClientUrls() {
  return (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

const cookieSameSite = (process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax')).toLowerCase();
const cookieSecure = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

if (!allowedSameSiteValues.includes(cookieSameSite)) {
  throw new Error(`COOKIE_SAME_SITE must be one of: ${allowedSameSiteValues.join(', ')}`);
}

if (cookieSameSite === 'none' && !cookieSecure) {
  throw new Error('COOKIE_SECURE must be true when COOKIE_SAME_SITE is none');
}

function validateEnv() {
  const missing = [];

  REQUIRED_ENV.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    throw new Error(`Bootstrap failed due to missing configuration variables: [${missing.join(', ')}]`);
  }

  if (process.env.JWT_ACCESS_SECRET.length < 32 || process.env.JWT_REFRESH_SECRET.length < 32) {
    console.warn('JWT secrets should be at least 32 characters long for production safety.');
  }
}

module.exports = {
  validateEnv,
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  clientUrl: process.env.CLIENT_URL,
  clientUrls: parseClientUrls(),
  cookieDomain: process.env.COOKIE_DOMAIN || '',
  cookieSameSite,
  cookieSecure,
  nodeEnv: process.env.NODE_ENV || 'development'
};
