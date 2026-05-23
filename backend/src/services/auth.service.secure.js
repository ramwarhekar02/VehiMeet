const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/ApiError");
const { ROLES } = require("../constants/roles");
const { KYC_STATUS } = require("../constants/statuses");
const { jwtSecret, adminBootstrapSecret } = require("../config/env");
const { getCookieOptions } = require("../utils/cookie");
const { authCookieName, authCookieMaxAgeMs, refreshCookieName, refreshCookieMaxAgeMs } = require("../config/security");
const { User, CustomerProfile, PartnerProfile } = require("../models");
const { createAppId } = require("../utils/id");

// Always keep token only inside HttpOnly cookies.
// Never return access/refresh tokens in the JSON response.

const sanitizeUser = (user) => {
  const safeUser = user?.toObject ? user.toObject() : { ...user };
  delete safeUser.passwordHash;
  return safeUser;
};

const issueAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      type: "access",
    },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "12h" },
  );

const issueRefreshToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      type: "refresh",
    },
    jwtSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
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
  const accessToken = issueAccessToken(user);
  res.cookie(
    authCookieName,
    accessToken,
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
  setRefreshCookie(res, user);

  return {
    user: sanitizeUser(user),
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
    user: sanitizeUser(user),
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
    user: sanitizeUser(user),
  };
};

const login = async ({ email, password }, res) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
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
    user: sanitizeUser(user),
  };
};

module.exports = {
  registerUser,
  registerAdmin,
  refreshSession,
  login,
};

