const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  createKycSession,
  getKycSession,
  startKycSession,
  completeKycSession,
} = require("../controllers/kyc.controller");

const router = express.Router();

router.post("/session/create", asyncHandler(createKycSession));
router.get("/session/:id", asyncHandler(getKycSession));
router.post("/session/:id/start", asyncHandler(startKycSession));
router.post("/session/:id/complete", asyncHandler(completeKycSession));

module.exports = router;
