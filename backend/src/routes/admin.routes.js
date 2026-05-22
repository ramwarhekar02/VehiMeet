const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  getDashboard,
  getUsers,
  getPartners,
  getBookings,
  approvePartner,
  updatePartnerByAdmin,
  assignBooking,
} = require("../controllers/admin.controller");
const { reviewKycByAdmin } = require("../controllers/kyc.controller");

const router = express.Router();

router.get("/dashboard", asyncHandler(getDashboard));
router.get("/users", asyncHandler(getUsers));
router.get("/partners", asyncHandler(getPartners));
router.get("/bookings", asyncHandler(getBookings));
router.post("/partners/:id/approve", asyncHandler(approvePartner));
router.patch("/partners/:id", asyncHandler(updatePartnerByAdmin));
router.post("/bookings/:id/assign", asyncHandler(assignBooking));
router.post("/kyc/:id/review", asyncHandler(reviewKycByAdmin));

module.exports = router;
