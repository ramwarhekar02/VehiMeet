const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  getProfile,
  updateProfile,
  getBookings,
  createNewBooking,
  getBooking,
  cancelCustomerBooking,
} = require("../controllers/customer.controller");

const router = express.Router();

router.get("/profile", asyncHandler(getProfile));
router.patch("/profile", asyncHandler(updateProfile));
router.get("/bookings", asyncHandler(getBookings));
router.post("/bookings", asyncHandler(createNewBooking));
router.get("/bookings/:id", asyncHandler(getBooking));
router.post("/bookings/:id/cancel", asyncHandler(cancelCustomerBooking));

module.exports = router;
