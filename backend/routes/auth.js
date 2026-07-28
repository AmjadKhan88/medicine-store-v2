const express = require('express');
const router  = express.Router();
const {
  register, login, getMe, updateProfile, changePassword,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
  updateOnboarding,
  refreshToken,
  logout,
  logoutAll,
  getSessions,
  setup2FA,
  confirm2FA,
  verify2FA,
  disable2FA,
  regenRecoveryCodes,
  get2FAStatus,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { validate }                  = require('../middleware/validate');
const {
  registerSchema, loginSchema,
  forgotPasswordSchema, resetPasswordSchema,
  changePasswordSchema, updateProfileSchema,
} = require('../validators/authValidators');

const { authLimiter } = require('../middleware/rateLimiter');

// Strict rate limit only on login + register (brute force targets)
router.post('/register',          authLimiter, validate(registerSchema),         register);
router.post('/login',             authLimiter, validate(loginSchema),            login);
router.post('/forgot-password',   authLimiter, validate(forgotPasswordSchema),   forgotPassword);

// Relaxed — users need to resend/verify multiple times without hitting limit
router.post('/verify-email',                                                      verifyEmail);
router.post('/resend-verification',                                               resendVerification);
router.post('/reset-password',               validate(resetPasswordSchema),       resetPassword);

// Protected routes
router.get('/me',                 protect,                                        getMe);
router.put('/profile',            protect,     validate(updateProfileSchema),     updateProfile);
router.put('/change-password',    protect,     validate(changePasswordSchema),    changePassword);
router.patch('/onboarding',       protect,                                        updateOnboarding);

/* ── Refresh & session ── */
router.post('/refresh',      refreshToken);  // no protect — uses cookie
router.post('/logout',       protect, logout);
router.post('/logout-all',   protect, logoutAll);
router.get('/sessions',      protect, getSessions);

/* ── 2FA ── */
router.post('/2fa/setup',    protect, setup2FA);
router.post('/2fa/confirm',  protect, confirm2FA);
router.post('/2fa/verify',   verify2FA);        // during login — no protect
router.post('/2fa/disable',  protect, disable2FA);
router.post('/2fa/regen',    protect, regenRecoveryCodes);
router.get('/2fa/status',    protect, get2FAStatus);

module.exports = router;

