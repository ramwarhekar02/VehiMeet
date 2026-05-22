const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  createLocation,
  getLiveBookingTracking,
  getBookingTrackingHistory,
} = require("../controllers/tracking.controller");

const router = express.Router();

router.post("/location", asyncHandler(createLocation));
router.get("/booking/:bookingId/live", asyncHandler(getLiveBookingTracking));
router.get("/booking/:bookingId/history", asyncHandler(getBookingTrackingHistory));

module.exports = router;
