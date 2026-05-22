const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  getProfile,
  updateProfile,
  updateStatus,
  upsertVehicle,
  updateLocation,
  getAssignedBookings,
  getBroadcastBookings,
  acceptAssignedBooking,
  rejectAssignedBooking,
  markArrivedAtPickup,
  startAssignedTrip,
  completeAssignedTrip,
} = require("../controllers/partner.controller");

const router = express.Router();

router.get("/profile", asyncHandler(getProfile));
router.patch("/profile", asyncHandler(updateProfile));
router.patch("/status", asyncHandler(updateStatus));
router.put("/vehicle", asyncHandler(upsertVehicle));
router.patch("/location", asyncHandler(updateLocation));
router.get("/bookings/assigned", asyncHandler(getAssignedBookings));
router.get("/bookings/broadcast", asyncHandler(getBroadcastBookings));
router.post("/bookings/:id/accept", asyncHandler(acceptAssignedBooking));
router.post("/bookings/:id/reject", asyncHandler(rejectAssignedBooking));
router.post("/bookings/:id/arrive", asyncHandler(markArrivedAtPickup));
router.post("/bookings/:id/start", asyncHandler(startAssignedTrip));
router.post("/bookings/:id/complete", asyncHandler(completeAssignedTrip));

module.exports = router;
