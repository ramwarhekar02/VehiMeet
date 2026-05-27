const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const { ApiError } = require("../utils/ApiError");
const { ROLES } = require("../constants/roles");
const { KYC_STATUS } = require("../constants/statuses");
const { jwtSecret, adminBootstrapSecret, googleClientId, googleClientSecret, googleRedirectUri, clientOrigin } = require("../config/env");
const { getCookieOptions, clearCookieOptions } = require("../utils/cookie");
const { authCookieName, authCookieMaxAgeMs, refreshCookieName, refreshCookieMaxAgeMs } = require("../config/security");
const { User, CustomerProfile, PartnerProfile } = require("../models");
const { createAppId } = require("../utils/id");

const sanitizeUser = (user) => {
  const safeUser = user.toObject ? user.toObject() : { ...user };
  delete safeUser.passwordHash;
  return safeUser;
};

const toSessionUser = (user) => ({
  id: user.id,
  role: user.role,
  fullName: user.fullName,
  email: user.email,
  avatarUrl: user.avatarUrl || "",
});

const issueToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      role: user.role,
      type: 'access',
    },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' },
  );

const issueRefreshToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      type: 'refresh',
    },
    jwtSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
  );

const createRoleProfile = async ({ user, role, now }) => {
  if (role === ROLES.PARTNER) {
    await PartnerProfile.create({
      _id: createAppId("pp"),
      userId: user._id,
      status: "PENDING_APPROVAL",
      vehicleId: null,
      licenseNumber: "",
      identityDocs: [],
      identityDocDetails: {},
      serviceAreas: [],
      approvedByAdmin: false,
      videoKycRequested: false,
      reviewMessage: "",
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  await CustomerProfile.create({
    _id: createAppId("cp"),
    userId: user._id,
    defaultPickupAddresses: [],
    emergencyContact: {
      name: "",
      phone: "",
    },
    kycStatus: KYC_STATUS.NOT_STARTED,
    lastKycId: null,
    preferences: {},
    createdAt: now,
    updatedAt: now,
  });
};

const setAuthCookie = (res, user) => {
  const token = issueToken(user);
  // cookie contains the signed JWT; HttpOnly prevents JS access.
  res.cookie(
    authCookieName,
    token,
    getCookieOptions({ maxAgeMs: authCookieMaxAgeMs, cookieName: authCookieName }),
  );
};

const setRefreshCookie = (res, user) => {
  const refreshToken = issueRefreshToken(user);
  res.cookie(
    refreshCookieName,
    refreshToken,
    getCookieOptions({ maxAgeMs: refreshCookieMaxAgeMs, cookieName: refreshCookieName }),
  );
};

const registerUser = async ({ fullName, email, phone, password, role = ROLES.CUSTOMER }, res) => {
  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { phone }],
  });
  if (existing) {
    throw new ApiError(409, "User with this email or phone already exists", "USER_EXISTS");
  }

  const now = new Date();
  const normalizedRole = role === ROLES.PARTNER ? ROLES.PARTNER : ROLES.CUSTOMER;
  const user = await User.create({
    _id: createAppId(normalizedRole === ROLES.PARTNER ? "usr_partner" : "usr_customer"),
    role: normalizedRole,
    fullName,
    email: email.toLowerCase(),
    phone,
    passwordHash: await bcrypt.hash(password, 10),
    avatarUrl: "",
    isActive: true,
    isBlocked: false,
    emailVerified: false,
    phoneVerified: false,
    createdAt: now,
    updatedAt: now,
  });

  await createRoleProfile({ user, role: normalizedRole, now });

  setAuthCookie(res, user);
  // set long-lived refresh cookie
  setRefreshCookie(res, user);

  return {
    user: toSessionUser(user),
  };
};

const registerAdmin = async ({ fullName, email, phone, password, secret }, res) => {
  if (!adminBootstrapSecret || secret !== adminBootstrapSecret) {
    throw new ApiError(403, "Admin bootstrap is not allowed", "ADMIN_BOOTSTRAP_FORBIDDEN");
  }

  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { phone }],
  });
  if (existing) {
    throw new ApiError(409, "User with this email or phone already exists", "USER_EXISTS");
  }

  const user = await User.create({
    _id: createAppId("usr_admin"),
    role: ROLES.ADMIN,
    fullName,
    email: email.toLowerCase(),
    phone,
    passwordHash: await bcrypt.hash(password, 10),
    avatarUrl: "",
    isActive: true,
    isBlocked: false,
    emailVerified: false,
    phoneVerified: false,
  });

  setAuthCookie(res, user);
  setRefreshCookie(res, user);

  return {
    user: toSessionUser(user),
  };
};

const refreshSession = async ({ userId }, res) => {
  const user = await User.findById(userId);
  if (!user || user.isBlocked || !user.isActive) {
    throw new ApiError(403, "This account is not active", "ACCOUNT_DISABLED");
  }

  setAuthCookie(res, user);
  setRefreshCookie(res, user);

  return {
    user: toSessionUser(user),
  };
};

const login = async ({ email, password }, res) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (!user.passwordHash) {
    throw new ApiError(401, "Use Google login for this account", "PASSWORD_LOGIN_DISABLED");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (user.isBlocked || !user.isActive) {
    throw new ApiError(403, "This account is not active", "ACCOUNT_DISABLED");
  }

  setAuthCookie(res, user);
  setRefreshCookie(res, user);

  return {
    user: toSessionUser(user),
  };
};

const googleOAuthClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const googleLogin = async ({ credential, role }, res) => {
  if (!googleOAuthClient) {
    throw new ApiError(500, "Google login is not configured on the server", "GOOGLE_OAUTH_NOT_CONFIGURED");
  }

  let payload;
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, "Invalid Google credential", "GOOGLE_INVALID_CREDENTIAL");
  }

  const email = (payload?.email || "").toLowerCase();
  const googleSub = payload?.sub || "";
  if (!email || !googleSub) {
    throw new ApiError(401, "Invalid Google credential", "GOOGLE_INVALID_CREDENTIAL");
  }

  const now = new Date();
  const normalizedRole = role === ROLES.PARTNER ? ROLES.PARTNER : ROLES.CUSTOMER;

  let user =
    (await User.findOne({ googleSub })) ||
    (await User.findOne({ email }));

  if (user) {
    if (user.isBlocked || !user.isActive) {
      throw new ApiError(403, "This account is not active", "ACCOUNT_DISABLED");
    }

    const updates = {};
    if (!user.googleSub) updates.googleSub = googleSub;
    if (!user.fullName && payload?.name) updates.fullName = payload.name;
    if ((!user.avatarUrl || user.avatarUrl === "") && payload?.picture) updates.avatarUrl = payload.picture;
    if (payload?.email_verified === true) updates.emailVerified = true;

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      user = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true });
    }

    setAuthCookie(res, user);
    setRefreshCookie(res, user);

    return { user: toSessionUser(user) };
  }

  // Create new user via Google sign-in.
  const createdUser = await User.create({
    _id: createAppId(normalizedRole === ROLES.PARTNER ? "usr_partner" : "usr_customer"),
    role: normalizedRole,
    fullName: payload?.name || "User",
    email,
    phone: undefined,
    passwordHash: undefined,
    googleSub,
    avatarUrl: payload?.picture || "",
    isActive: true,
    isBlocked: false,
    emailVerified: payload?.email_verified === true,
    phoneVerified: false,
    createdAt: now,
    updatedAt: now,
  });

  await createRoleProfile({ user: createdUser, role: normalizedRole, now });

  setAuthCookie(res, createdUser);
  setRefreshCookie(res, createdUser);

  return { user: toSessionUser(createdUser) };
};

const oauthStateCookieName = "vehimeet_oauth_state";
const oauthCodeVerifierCookieName = "vehimeet_oauth_code_verifier";
const oauthRoleCookieName = "vehimeet_oauth_role";
const oauthCookieMaxAgeMs = 10 * 60 * 1000; // 10 minutes

const base64Url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const sha256Base64Url = (value) => base64Url(crypto.createHash("sha256").update(value).digest());

const getGoogleRedirectClient = () => {
  if (!googleClientId || !googleClientSecret || !googleRedirectUri) return null;
  return new OAuth2Client({
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    redirectUri: googleRedirectUri,
  });
};

const setOAuthCookie = (res, name, value) => {
  res.cookie(
    name,
    value,
    getCookieOptions({
      maxAgeMs: oauthCookieMaxAgeMs,
      cookieName: name,
    }),
  );
};

const clearOAuthCookies = (res) => {
  res.clearCookie(oauthStateCookieName, clearCookieOptions());
  res.clearCookie(oauthCodeVerifierCookieName, clearCookieOptions());
  res.clearCookie(oauthRoleCookieName, clearCookieOptions());
};

const startGoogleRedirectLogin = async ({ role }, res) => {
  const oauthClient = getGoogleRedirectClient();
  if (!oauthClient) {
    throw new ApiError(500, "Google redirect login is not configured on the server", "GOOGLE_OAUTH_NOT_CONFIGURED");
  }

  const state = base64Url(crypto.randomBytes(32));
  const codeVerifier = base64Url(crypto.randomBytes(64));
  const codeChallenge = sha256Base64Url(codeVerifier);

  setOAuthCookie(res, oauthStateCookieName, state);
  setOAuthCookie(res, oauthCodeVerifierCookieName, codeVerifier);

  const normalizedRole = role === ROLES.PARTNER ? ROLES.PARTNER : ROLES.CUSTOMER;
  setOAuthCookie(res, oauthRoleCookieName, normalizedRole);

  const url = oauthClient.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    response_type: "code",
    prompt: "select_account",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return url;
};

const finishGoogleRedirectLogin = async ({ query }, res) => {
  const oauthClient = getGoogleRedirectClient();
  if (!oauthClient) {
    throw new ApiError(500, "Google redirect login is not configured on the server", "GOOGLE_OAUTH_NOT_CONFIGURED");
  }

  const code = String(query?.code || "");
  const state = String(query?.state || "");
  const storedState = String(res.req?.cookies?.[oauthStateCookieName] || "");
  const codeVerifier = String(res.req?.cookies?.[oauthCodeVerifierCookieName] || "");
  const role = String(res.req?.cookies?.[oauthRoleCookieName] || "");

  clearOAuthCookies(res);

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    throw new ApiError(401, "Invalid Google OAuth session", "GOOGLE_OAUTH_SESSION_INVALID");
  }

  let tokens;
  try {
    const tokenResponse = await oauthClient.getToken({
      code,
      codeVerifier,
    });
    tokens = tokenResponse.tokens;
  } catch {
    throw new ApiError(401, "Google OAuth exchange failed", "GOOGLE_OAUTH_EXCHANGE_FAILED");
  }

  const idToken = tokens?.id_token || "";
  if (!idToken) {
    throw new ApiError(401, "Google OAuth exchange failed", "GOOGLE_OAUTH_EXCHANGE_FAILED");
  }

  await googleLogin({ credential: idToken, role: role || undefined }, res);

  return `${clientOrigin}/`;
};

module.exports = {
  sanitizeUser,
  toSessionUser,
  issueToken,
  registerUser,
  registerAdmin,
  refreshSession,
  login,
  googleLogin,
  startGoogleRedirectLogin,
  finishGoogleRedirectLogin,
};
