const express = require("express");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { authCookieName } = require("../config/security");
const { realtimeBus } = require("../lib/realtime");
const { User } = require("../models");
const { ApiError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

const authenticateStream = async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = req.cookies?.[authCookieName] || (header.startsWith("Bearer ") ? header.slice(7) : req.query.token);

  if (!token) {
    return next(new ApiError(401, "Authentication required", "AUTH_REQUIRED"));
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.sub).select("-passwordHash");
    if (!user || !user.isActive || user.isBlocked) {
      return next(new ApiError(401, "Invalid or inactive session", "AUTH_INVALID"));
    }
    req.user = user;
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired session", "AUTH_INVALID"));
  }
};

router.get(
  "/stream",
  asyncHandler(authenticateStream),
  (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (message) => {
      res.write(`event: ${message.event}\n`);
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    };

    send({
      event: "realtime:ready",
      payload: { userId: req.user.id, role: req.user.role },
      emittedAt: new Date().toISOString(),
    });

    realtimeBus.on("message", send);

    req.on("close", () => {
      realtimeBus.off("message", send);
      res.end();
    });
  },
);

module.exports = router;
