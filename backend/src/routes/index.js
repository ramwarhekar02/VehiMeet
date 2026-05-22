const express = require("express");
const authRoutes = require("./auth.routes");
const vehicleRoutes = require("./vehicle.routes");
const customerRoutes = require("./customer.routes");
const partnerRoutes = require("./partner.routes");
const kycRoutes = require("./kyc.routes");
const trackingRoutes = require("./tracking.routes");
const adminRoutes = require("./admin.routes");
const realtimeRoutes = require("./realtime.routes");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../constants/roles");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/customer", requireAuth, requireRole(ROLES.CUSTOMER, ROLES.ADMIN), customerRoutes);
router.use("/partner", requireAuth, requireRole(ROLES.PARTNER, ROLES.ADMIN), partnerRoutes);
router.use("/kyc", requireAuth, kycRoutes);
router.use("/tracking", requireAuth, trackingRoutes);
router.use("/admin", requireAuth, requireRole(ROLES.ADMIN), adminRoutes);
router.use("/events", realtimeRoutes);

module.exports = router;
