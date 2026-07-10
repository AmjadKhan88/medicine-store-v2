const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const User   = require('../models/User');
const emailService = require('../utils/emailService');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const generateRandomToken = () => crypto.randomBytes(32).toString('hex');

/* ── Register ── */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;


    const existing = await User.findOne({ email });
    if (existing){
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const verifyToken   = generateRandomToken();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      name, email, password, phone,
      role:                'admin',
      isEmailVerified:     false,
      emailVerifyToken:    verifyToken,
      emailVerifyExpires:  verifyExpires,
    });

    user.storeId = user._id;
    await user.save();

    // Create trial subscription
    try {
      const Subscription = require('../models/Subscription');
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      await Subscription.create({
        storeId:     user._id,
        plan:        'trial',
        status:      'active',
        trialEndsAt: trialEnd,
        limits:      { medicines: 50, patients: 20, staff: 1, billsPerMonth: 50 },
      });
    } catch {}

    // Send verification email
    try {
      await emailService.sendVerificationEmail({ email, name, token: verifyToken });
    } catch (emailErr) {
      console.error('[Email] Failed to send verification:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email to verify your account.',
      needsVerification: true,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Verify email ── */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ success: false, message: 'Verification token required' });

    const user = await User.findOne({
      emailVerifyToken:   token,
      emailVerifyExpires: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new one.',
      });

    user.isEmailVerified    = true;
    user.emailVerifyToken   = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    // Send welcome email
    try { await emailService.sendWelcomeEmail({ email: user.email, name: user.name }); } catch {}

    const jwtToken = generateToken(user._id);
    res.json({ success: true, token: jwtToken, user, message: 'Email verified! Welcome to MediStore.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Resend verification ── */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: 'No account with this email' });
    if (user.isEmailVerified)
      return res.status(400).json({ success: false, message: 'Email already verified' });

    const token = generateRandomToken();
    user.emailVerifyToken   = token;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await emailService.sendVerificationEmail({ email, name: user.name, token });
    res.json({ success: true, message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Login ── */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password',errors: {password:"Invalid email or password"} });

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account deactivated',errors: {email: "Account deactivated"} });

    if (!user.isEmailVerified)
      return res.status(403).json({
        success:           false,
        code:              'EMAIL_NOT_VERIFIED',
        message:           'Please verify your email before logging in.',
        email:             user.email,
        errors: {email: "Please verify your email before logging in."}
      });

    const token = generateToken(user._id);
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Forgot password ── */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: 'No account with this email' });

    const token = generateRandomToken();
    user.passwordResetToken   = token;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await user.save();

    await emailService.sendPasswordResetEmail({ email, name: user.name, token });
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Reset password ── */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      passwordResetToken:   token,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });

    user.password             = newPassword;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Get current user ── */
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

/* ── Update profile ── */
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, storeName } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, ...(storeName && { storeName }) },
      { new: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Change password ── */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Complete onboarding step ── */
exports.updateOnboarding = async (req, res) => {
  try {
    const { step, complete } = req.body;
    const update = {};
    if (step !== undefined)   update.onboardingStep     = step;
    if (complete === true)    update.onboardingComplete = true;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};