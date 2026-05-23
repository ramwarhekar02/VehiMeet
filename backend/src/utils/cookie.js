const { ApiError } = require('./ApiError')

const getCookieToken = (req, cookieName) => {
  if (!req.cookies) return null
  return req.cookies[cookieName] || null
}

const isProd = () => process.env.NODE_ENV === 'production'

const getCookieOptions = ({ maxAgeMs, cookieName }) => {
  const secure = isProd()
  const sameSite = process.env.COOKIE_SAMESITE || (secure ? 'none' : 'lax')
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: maxAgeMs,
  }
}

const getCookieParseOptions = () => {
  // cookie-parser defaults are OK; this helper exists to keep prod changes centralized.
  return {}
}


const clearCookieOptions = () => {
  const secure = isProd()
  return {
    httpOnly: true,
    secure,
    sameSite: process.env.COOKIE_SAMESITE || (secure ? 'none' : 'lax'),
    path: '/',
    maxAge: 0,
  }
}

const safeRequireToken = (token) => {
  if (!token) throw new ApiError(401, 'Authentication token is required', 'AUTH_REQUIRED')
  return token
}

module.exports = {
  getCookieToken,
  getCookieOptions,
  clearCookieOptions,
  safeRequireToken,
  getCookieParseOptions,
}


