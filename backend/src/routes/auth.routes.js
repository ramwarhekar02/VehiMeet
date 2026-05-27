const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  register,
  bootstrapAdmin,
  signIn,
  signInWithGoogle,
  startGoogleRedirect,
  googleRedirectCallback,
  logout,
  refresh,
  me,
} = require("../controllers/auth.controller");
const { requireAuth, requireCookieAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/bootstrap-admin", asyncHandler(bootstrapAdmin));
router.post("/login", asyncHandler(signIn));
router.post("/google", asyncHandler(signInWithGoogle));
router.get("/google/start", asyncHandler(startGoogleRedirect));
router.get("/google/callback", asyncHandler(googleRedirectCallback));
router.post("/logout", asyncHandler(logout));
router.post("/refresh", requireAuth, asyncHandler(refresh));
router.get("/me", requireCookieAuth, asyncHandler(me));

module.exports = router;
