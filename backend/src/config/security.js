module.exports = {
  authCookieName: process.env.AUTH_COOKIE_NAME || 'vehimeet_auth',
  // 12h aligns with current JWT expiresIn
  authCookieMaxAgeMs: Number(process.env.AUTH_COOKIE_MAX_AGE_MS || 12 * 60 * 60 * 1000),
}

