module.exports = {
  authCookieName: process.env.AUTH_COOKIE_NAME || 'vehimeet_auth',
  // 12h aligns with current JWT expiresIn
  authCookieMaxAgeMs: Number(process.env.AUTH_COOKIE_MAX_AGE_MS || 12 * 60 * 60 * 1000),
  // Refresh token cookie (longer lived)
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'vehimeet_refresh',
  refreshCookieMaxAgeMs: Number(process.env.REFRESH_COOKIE_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000),
}

