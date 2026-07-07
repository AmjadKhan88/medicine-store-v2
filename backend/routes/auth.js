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

router.post('/register',                        validate(registerSchema),                register);
router.post('/login',                           validate(loginSchema),                      login);
router.post('/verify-email',                                                          verifyEmail);
router.post('/resend-verification',                                            resendVerification);
router.post('/forgot-password',                 validate(forgotPasswordSchema),    forgotPassword);
router.post('/reset-password',                  validate(resetPasswordSchema),      resetPassword);
router.get('/me',                    protect,                                               getMe);
router.put('/profile',               protect,   validate(updateProfileSchema),      updateProfile);
router.put('/change-password',       protect,   validate(changePasswordSchema),     changePassword);
router.patch('/onboarding',          protect,                                     updateOnboarding);

module.exports = router;

