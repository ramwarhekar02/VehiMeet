const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { register, bootstrapAdmin, signIn, logout, refresh, me } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/bootstrap-admin", asyncHandler(bootstrapAdmin));
router.post("/login", asyncHandler(signIn));
router.post("/logout", asyncHandler(logout));
router.post("/refresh", requireAuth, asyncHandler(refresh));
router.get("/me", requireAuth, asyncHandler(me));

module.exports = router;
