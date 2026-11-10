const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const c = require("../controllers/Auth");
const { protect } = require("../middlewares/auth");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in a few minutes." },
});

// Sign up, log in, email verification and password reset all happen in Firebase.
// The backend only turns a verified Firebase login into a shop session.
router.post("/session", authLimiter, c.session);
router.post("/contact", authLimiter, c.contactUs);
router.get("/me", protect, c.me);
router.post("/logout", c.logout);

module.exports = router;
