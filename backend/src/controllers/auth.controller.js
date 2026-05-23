const { registerSchema, loginSchema, adminBootstrapSchema } = require("../validations/auth.validation");
const { registerUser, registerAdmin, login, refreshSession, sanitizeUser } = require("../services/auth.service");
const { authCookieName, refreshCookieName } = require("../config/security");
const { clearCookieOptions } = require("../utils/cookie");
const { sendSuccess } = require("../utils/response");

const register = async (req, res) => {
  const payload = registerSchema.parse(req.body);
  const result = await registerUser(payload, res);
  return sendSuccess(res, { statusCode: 201, message: "Account created", data: result.user });
};

const bootstrapAdmin = async (req, res) => {
  const payload = adminBootstrapSchema.parse(req.body);
  const result = await registerAdmin(payload, res);
  return sendSuccess(res, { statusCode: 201, message: "Admin account created", data: result.user });
};

const signIn = async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const result = await login(payload, res);
  return sendSuccess(res, { message: "Login successful", data: result.user });
};

const logout = async (_req, res) => {
  res.clearCookie(authCookieName, clearCookieOptions());
  res.clearCookie(refreshCookieName, clearCookieOptions());

  return sendSuccess(res, {
    message: "Logout completed",
    data: null,
  });
};

const refresh = async (req, res) => {
  const result = await refreshSession({ userId: req.user.id }, res);
  return sendSuccess(res, {
    message: "Session refreshed",
    data: result.user,
  });
};

const me = async (req, res) => sendSuccess(res, { message: "Session active", data: sanitizeUser(req.user) });

module.exports = { register, bootstrapAdmin, signIn, logout, refresh, me };
