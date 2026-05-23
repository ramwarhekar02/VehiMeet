const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { jwtSecret, clientOrigin } = require("../config/env");
const { User, PartnerProfile } = require("../models");
const { PARTNER_STATUS } = require("../constants/statuses");
const { authCookieName } = require("../config/security");

let io = null;

const getSocketServer = () => io;

const joinDefaultRooms = (socket) => {
  socket.join(`user:${socket.user.id}`);

  if (socket.user.role === "partner") {
    socket.join(`partner:${socket.user.id}`);
  }

  if (socket.user.role === "admin") {
    socket.join("admin:dashboard");
  }
};

const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [rawKey, ...rawValue] = cookie.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
};

const authenticateSocket = async (socket, next) => {
  const token =
    getCookieValue(socket.handshake.headers?.cookie, authCookieName) ||
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return next(new Error("AUTH_REQUIRED"));
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.sub).select("-passwordHash");
    if (!user || !user.isActive || user.isBlocked) {
      return next(new Error("AUTH_INVALID"));
    }
    socket.user = user;
    return next();
  } catch {
    return next(new Error("AUTH_INVALID"));
  }
};

const handlePartnerGoOnline = async (socket, callback) => {
  try {
    if (socket.user.role !== "partner") {
      throw new Error("PARTNER_ONLY");
    }

    const profile = await PartnerProfile.findOne({ userId: socket.user.id });
    if (!profile || !profile.approvedByAdmin || !profile.vehicleId) {
      throw new Error("PARTNER_NOT_READY");
    }

    profile.status = PARTNER_STATUS.ONLINE;
    await profile.save();

    io.to("admin:dashboard").emit("partner:statusChanged", {
      partnerId: socket.user.id,
      status: profile.status,
    });
    callback?.({ success: true, data: profile });
  } catch (error) {
    callback?.({ success: false, message: error.message });
  }
};

const handlePartnerLocation = async (socket, payload, callback) => {
  try {
    if (socket.user.role !== "partner") {
      throw new Error("PARTNER_ONLY");
    }

    const { recordLocation } = require("../services/tracking.service");
    const location = await recordLocation({ ...payload, partnerId: socket.user.id });
    callback?.({ success: true, data: location });
  } catch (error) {
    callback?.({ success: false, message: error.message });
  }
};

const initializeSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: clientOrigin,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    joinDefaultRooms(socket);

    socket.emit("realtime:ready", {
      userId: socket.user.id,
      role: socket.user.role,
    });

    socket.on("booking:subscribe", ({ bookingId } = {}, callback) => {
      if (!bookingId) {
        callback?.({ success: false, message: "bookingId is required" });
        return;
      }
      socket.join(`booking:${bookingId}`);
      callback?.({ success: true, room: `booking:${bookingId}` });
    });

    socket.on("booking:unsubscribe", ({ bookingId } = {}, callback) => {
      if (bookingId) {
        socket.leave(`booking:${bookingId}`);
      }
      callback?.({ success: true });
    });

    socket.on("kyc:joinRoom", ({ sessionId } = {}, callback) => {
      if (!sessionId) {
        callback?.({ success: false, message: "sessionId is required" });
        return;
      }
      socket.join(`kyc:${sessionId}`);
      callback?.({ success: true, room: `kyc:${sessionId}` });
    });

    socket.on("partner:goOnline", (callback) => handlePartnerGoOnline(socket, callback));
    socket.on("partner:updateLocation", (payload, callback) =>
      handlePartnerLocation(socket, payload, callback),
    );
  });

  return io;
};

module.exports = { initializeSocketServer, getSocketServer };
