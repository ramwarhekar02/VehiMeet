const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/ApiError");
const { ROLES } = require("../constants/roles");
const { KYC_STATUS } = require("../constants/statuses");
const { jwtSecret, adminBootstrapSecret } = require("../config/env");
const { getCookieOptions } = require("../utils/cookie");
const { authCookieName, authCookieMaxAgeMs } = require("../config/security");
const { User, CustomerProfile, PartnerProfile } = require("../models");
const { createAppId } = require("../utils/id");

const sanitizeUser = (user) => {
  const safeUser = user.toObject ? user.toObject() : { ...user };
  delete safeUser.passwordHash;
  return safeUser;
};

const issueToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    jwtSecret,
    { expiresIn: "12h" },
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
  return token;
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

  return {
    user: sanitizeUser(user),
  };
};

module.exports = {
  sanitizeUser,
  issueToken,
  registerUser,
  registerAdmin,
  refreshSession,
  login,
};

