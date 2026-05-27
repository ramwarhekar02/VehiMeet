const { registerSchema, loginSchema, adminBootstrapSchema, googleLoginSchema } = require("../validations/auth.validation");
const {
  registerUser,
  registerAdmin,
  login,
  googleLogin,
  startGoogleRedirectLogin,
  finishGoogleRedirectLogin,
  refreshSession,
  toSessionUser,
} = require("../services/auth.service");
const { authCookieName, refreshCookieName } = require("../config/security");
const { clearCookieOptions } = require("../utils/cookie");
const { sendSuccess } = require("../utils/response");

const register = async (req, res) => {
  const payload = registerSchema.parse(req.body);
  await registerUser(payload, res);
  return sendSuccess(res, { statusCode: 201, message: "Account created", data: null });
};

const bootstrapAdmin = async (req, res) => {
  const payload = adminBootstrapSchema.parse(req.body);
  await registerAdmin(payload, res);
  return sendSuccess(res, { statusCode: 201, message: "Admin account created", data: null });
};

const signIn = async (req, res) => {
  const payload = loginSchema.parse(req.body);
  await login(payload, res);
  return sendSuccess(res, { message: "Login successful", data: null });
};

const signInWithGoogle = async (req, res) => {
  const payload = googleLoginSchema.parse(req.body);
  await googleLogin(payload, res);
  return sendSuccess(res, { message: "Login successful", data: null });
};

const startGoogleRedirect = async (req, res) => {
  const role = String(req.query?.role || "");
  const url = await startGoogleRedirectLogin({ role }, res);
  return res.redirect(url);
};

const googleRedirectCallback = async (req, res) => {
  const redirectTo = await finishGoogleRedirectLogin({ query: req.query }, res);
  return res.redirect(redirectTo);
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
  await refreshSession({ userId: req.user.id }, res);
  return sendSuccess(res, {
    message: "Session refreshed",
    data: null,
  });
};

const me = async (req, res) => sendSuccess(res, { message: "Session active", data: toSessionUser(req.user) });

module.exports = {
  register,
  bootstrapAdmin,
  signIn,
  signInWithGoogle,
  startGoogleRedirect,
  googleRedirectCallback,
  logout,
  refresh,
  me,
};
