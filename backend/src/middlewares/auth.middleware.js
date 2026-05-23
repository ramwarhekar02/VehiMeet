const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { ApiError } = require("../utils/ApiError");
const { User } = require("../models");

const requireAuth = async (req, _res, next) => {
  const cookieName = process.env.AUTH_COOKIE_NAME || "vehimeet_auth";
  const tokenFromCookie = req.cookies?.[cookieName];

  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  const token = tokenFromCookie || tokenFromHeader;
  return verifyRequestToken({ req, next, token });
};

const requireCookieAuth = async (req, _res, next) => {
  const cookieName = process.env.AUTH_COOKIE_NAME || "vehimeet_auth";
  const token = req.cookies?.[cookieName];
  return verifyRequestToken({ req, next, token });
};

const verifyRequestToken = async ({ req, next, token }) => {
  if (!token) {
    return next(new ApiError(401, "Authentication token is required", "AUTH_REQUIRED"));
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.sub).select("-passwordHash");

    if (!user) {
      throw new ApiError(401, "User session is no longer valid", "SESSION_INVALID");
    }

    req.user = user;
    next();
  } catch (_error) {
    next(new ApiError(401, "Invalid or expired token", "INVALID_TOKEN"));
  }
};

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication is required", "AUTH_REQUIRED"));
  }
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, "You do not have permission for this action", "FORBIDDEN"));
  }
  return next();
};

module.exports = { requireAuth, requireCookieAuth, requireRole };
