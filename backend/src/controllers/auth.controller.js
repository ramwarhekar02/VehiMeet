const { registerSchema, loginSchema, adminBootstrapSchema } = require("../validations/auth.validation");
const { registerUser, registerAdmin, login, refreshSession } = require("../services/auth.service");
const { sendSuccess } = require("../utils/response");

const register = async (req, res) => {
  const payload = registerSchema.parse(req.body);
  const data = await registerUser(payload, res);
  // Token is stored via HttpOnly cookie by the service.
  // Return only non-sensitive user info.
  return sendSuccess(res, { statusCode: 201, message: "Account created", data });
};

const bootstrapAdmin = async (req, res) => {
  const payload = adminBootstrapSchema.parse(req.body);
  const data = await registerAdmin(payload, res);
  return sendSuccess(res, { statusCode: 201, message: "Admin account created", data });
};

const signIn = async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const data = await login(payload, res);
  return sendSuccess(res, { message: "Login successful", data });
};

const logout = async (_req, res) => {
  const cookieName = process.env.AUTH_COOKIE_NAME || "vehimeet_auth";
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    path: "/",
  });

  return sendSuccess(res, {
    message: "Logout completed",
    data: null,
  });
};

const refresh = async (req, res) => {
  const data = await refreshSession({ userId: req.user.id }, res);
  return sendSuccess(res, {
    message: "Session refreshed",
    data,
  });
};

module.exports = { register, bootstrapAdmin, signIn, logout, refresh };

