const express = require('express');
const router  = express.Router();
const {
  register, login, getMe, updateProfile, changePassword,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
  updateOnboarding,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register',             register);
router.post('/login',                login);
router.post('/verify-email',         verifyEmail);
router.post('/resend-verification',  resendVerification);
router.post('/forgot-password',      forgotPassword);
router.post('/reset-password',       resetPassword);
router.get('/me',                    protect, getMe);
router.put('/profile',               protect, updateProfile);
router.put('/change-password',       protect, changePassword);
router.patch('/onboarding',          protect, updateOnboarding);

module.exports = router;

