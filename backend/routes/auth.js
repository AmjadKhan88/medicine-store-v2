const express = require('express');
const router  = express.Router();
const {
  register, login, getMe, updateProfile, changePassword,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
  updateOnboarding,
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

module.exports = router;

