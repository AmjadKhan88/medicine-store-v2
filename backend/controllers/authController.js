const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('../utils/emailService');

const speakeasy = require('speakeasy');
const QRCode    = require('qrcode');
const bcrypt    = require('bcryptjs');

/* ── Token generators ── */
const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });

/* ── Keep old name as alias so nothing else breaks ── */
const generateToken = generateAccessToken;

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
  || (process.env.JWT_SECRET + '_refresh_fallback');

const generateRefreshToken = (id) =>
  jwt.sign({ id }, REFRESH_SECRET, { expiresIn: '30d' });

const generateRandomToken = () => crypto.randomBytes(32).toString('hex');

/* ── Recovery codes: 10 × 8-char alphanumeric ── */
const generateRecoveryCodes = () =>
  Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

/* ── Set refresh token httpOnly cookie ── */
const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000,
    path:     '/api/auth',   // original — works with Vercel rewrite
  });
};

/* ── Save refresh token to DB (hashed for security) ── */
const saveRefreshToken = async (user, rawToken, device = 'unknown') => {
  const hashed    = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Keep max 5 devices — remove oldest if over limit
  if (user.refreshTokens.length >= 5) {
    user.refreshTokens.sort((a, b) => a.createdAt - b.createdAt);
    user.refreshTokens.shift();
  }
  user.refreshTokens.push({ token: hashed, expiresAt, device });
  await user.save();
};

/* ── Issue both tokens and send response ── */
const issueTokens = async (res, user, device = 'unknown') => {
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  await saveRefreshToken(user, refreshToken, device);
  setRefreshCookie(res, refreshToken);
  return { accessToken };
};

/* ── Register ── */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;


    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const verifyToken = generateRandomToken();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      name, email, password, phone,
      role: 'admin',
      isEmailVerified: false,
      emailVerifyToken: verifyToken,
      emailVerifyExpires: verifyExpires,
    });

    user.storeId = user._id;
    await user.save();

    // Create trial subscription
    try {
      const Subscription = require('../models/Subscription');
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      await Subscription.create({
        storeId: user._id,
        plan: 'trial',
        status: 'active',
        trialEndsAt: trialEnd,
        limits: { medicines: 50, patients: 20, staff: 1, billsPerMonth: 50 },
      });
    } catch { }

    // Send verification email
    try {
      await emailService.sendVerificationEmail({ email, name, token: verifyToken });
    } catch (emailErr) {
      console.error('[Email] Failed to send verification:', emailErr); // log full object
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
      emailVerifyToken: token,
      emailVerifyExpires: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new one.',
      });

    user.isEmailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    // Send welcome email
    try { await emailService.sendWelcomeEmail({ email: user.email, name: user.name }); } catch { }

    /* Issue full token pair (access + refresh cookie) same as normal login */
    const { accessToken } = await issueTokens(res, user, req.headers['user-agent']?.slice(0, 60) || 'email-verify');
    res.json({ success: true, token: accessToken, user, message: 'Email verified! Welcome to EliteHMS.' });
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
    user.emailVerifyToken = token;
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
    const device = req.headers['user-agent']?.slice(0, 60) || 'unknown';

    const user = await User.findOne({ email }).select('+password +twoFactorSecret');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password', errors: { password: 'Invalid email or password' } });

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account deactivated', errors: { email: 'Account deactivated' } });

    if (!user.isEmailVerified)
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in.',
        email: user.email,
        errors: { email: 'Please verify your email before logging in.' },
      });

    /* ── 2FA check ── */
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Issue short-lived temp token (5 min) — no full access yet
      const tempToken = jwt.sign(
        { id: user._id, purpose: '2fa-pending' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({
        success:    true,
        requires2FA:true,
        tempToken,
        message:    'Enter your authenticator code to continue',
      });
    }

    /* ── Normal login (no 2FA) ── */
    const { accessToken } = await issueTokens(res, user, device);
    res.json({ success: true, token: accessToken, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Verify 2FA code (after password) ── */
exports.verify2FA = async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code)
      return res.status(400).json({ success: false, message: 'Temp token and code required' });

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }
    if (decoded.purpose !== '2fa-pending')
      return res.status(401).json({ success: false, message: 'Invalid token' });

    const user = await User.findById(decoded.id).select('+twoFactorSecret +twoFactorRecoveryCodes');
    if (!user || !user.isActive)
      return res.status(404).json({ success: false, message: 'User not found' });

    const device = req.headers['user-agent']?.slice(0, 60) || 'unknown';

    /* ── Check TOTP code ── */
    const isValidTOTP = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token:    code.replace(/\s/g, ''),
      window:   2,   // allow ±2 time steps (60 seconds tolerance)
    });

    if (!isValidTOTP) {
      /* ── Check recovery code ── */
      const cleanCode = code.toUpperCase().replace(/\s/g, '');
      const matchIdx  = await Promise.all(
        user.twoFactorRecoveryCodes.map(hashed => bcrypt.compare(cleanCode, hashed))
      ).then(results => results.findIndex(Boolean));

      if (matchIdx === -1)
        return res.status(401).json({ success: false, message: 'Invalid code. Check your authenticator app or use a recovery code.' });

      // Consume recovery code (one-time use)
      user.twoFactorRecoveryCodes.splice(matchIdx, 1);
      await user.save();
    }

    /* ── Success ── */
    const { accessToken } = await issueTokens(res, user, device);
    res.json({
      success: true,
      token:   accessToken,
      user:    await User.findById(user._id),
      message: '2FA verified successfully',
      ...(user.twoFactorRecoveryCodes.length <= 2 && {
        warning: `Only ${user.twoFactorRecoveryCodes.length} recovery code(s) remaining. Generate new ones in Settings.`,
      }),
    });
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
    user.passwordResetToken = token;
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
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });

    user.password = newPassword;
    user.passwordResetToken = undefined;
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
    if (step !== undefined) update.onboardingStep = step;
    if (complete === true) update.onboardingComplete = true;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════
   REFRESH TOKEN
════════════════════════════════ */
exports.refreshToken = async (req, res) => {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken)
      return res.status(401).json({ success: false, message: 'No refresh token', code: 'NO_REFRESH_TOKEN' });

    /* ── Verify JWT ── */
    let decoded;
    try {
      decoded = jwt.verify(rawToken, REFRESH_SECRET);
    } catch (err) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ success: false, message: 'Refresh token expired. Please login again.', code: 'REFRESH_EXPIRED' });
    }

    /* ── Check token in DB (not revoked) ── */
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user   = await User.findById(decoded.id);

    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'User not found', code: 'USER_NOT_FOUND' });

    const stored = user.refreshTokens.find(t => t.token === hashed && t.expiresAt > new Date());
    if (!stored) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.', code: 'SESSION_REVOKED' });
    }

    /* ── Rotate: issue new refresh token, revoke old ── */
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== hashed);  // remove old
    const device = req.headers['user-agent']?.slice(0, 60) || stored.device;
    const { accessToken } = await issueTokens(res, user, device);  // adds new refresh token

    res.json({ success: true, token: accessToken, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Logout — revoke refresh token ── */
exports.logout = async (req, res) => {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken) {
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: hashed } },
      });
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Logout all devices ── */
exports.logoutAll = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshTokens: [] } });
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Get active sessions ── */
exports.getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('refreshTokens');
    const sessions = (user.refreshTokens || [])
      .filter(t => t.expiresAt > new Date())
      .map(t => ({
        device:    t.device,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
      }));
    res.json({ success: true, sessions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════════════════════════════
   2FA SETUP
════════════════════════════════ */

/* ── Step 1: Generate secret + QR code ── */
exports.setup2FA = async (req, res) => {
  try {
    const user  = await User.findById(req.user._id).select('+twoFactorSecret');
    if (user.twoFactorEnabled)
      return res.status(400).json({ success: false, message: '2FA is already enabled' });

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name:   `EliteHMS (${user.email})`,
      issuer: 'EliteHMS',
      length: 32,
    });

    // Save secret (pending — not enabled until verified)
    user.twoFactorSecret      = secret.base32;
    user.twoFactorSetupPending= true;
    await user.save();

    // Generate QR code data URL
    const qrDataURL = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success:     true,
      secret:      secret.base32,
      qrCode:      qrDataURL,
      manualEntry: secret.base32.match(/.{1,4}/g).join(' '),  // "XXXX XXXX XXXX" format
      message:     'Scan QR code with Google Authenticator, then verify with a code',
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Step 2: Verify first code and activate 2FA ── */
exports.confirm2FA = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code required' });

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user.twoFactorSetupPending || !user.twoFactorSecret)
      return res.status(400).json({ success: false, message: 'Start 2FA setup first' });

    const isValid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token:    code.replace(/\s/g, ''),
      window:   2,
    });

    if (!isValid)
      return res.status(400).json({ success: false, message: 'Invalid code. Make sure your phone clock is correct.' });

    /* ── Generate recovery codes ── */
    const plainCodes  = generateRecoveryCodes();
    const hashedCodes = await Promise.all(plainCodes.map(c => bcrypt.hash(c, 8)));

    user.twoFactorEnabled      = true;
    user.twoFactorSetupPending = false;
    user.twoFactorRecoveryCodes= hashedCodes;
    await user.save();

    res.json({
      success:       true,
      recoveryCodes: plainCodes,  // shown ONCE — user must save these
      message:       '2FA enabled! Save these recovery codes in a safe place.',
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Disable 2FA (requires password confirmation) ── */
exports.disable2FA = async (req, res) => {
  try {
    const { password, code } = req.body;
    const user = await User.findById(req.user._id).select('+password +twoFactorSecret');

    if (!(await user.matchPassword(password)))
      return res.status(400).json({ success: false, message: 'Incorrect password' });

    if (user.twoFactorEnabled) {
      const isValid = speakeasy.totp.verify({
        secret:   user.twoFactorSecret,
        encoding: 'base32',
        token:    code?.replace(/\s/g, '') || '',
        window:   2,
      });
      if (!isValid)
        return res.status(400).json({ success: false, message: 'Invalid 2FA code' });
    }

    user.twoFactorEnabled      = false;
    user.twoFactorSecret       = undefined;
    user.twoFactorSetupPending = false;
    user.twoFactorRecoveryCodes= [];
    await user.save();

    res.json({ success: true, message: '2FA disabled. Your account is now protected by password only.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Regenerate recovery codes ── */
exports.regenRecoveryCodes = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id).select('+twoFactorSecret');

    if (!user.twoFactorEnabled)
      return res.status(400).json({ success: false, message: '2FA not enabled' });

    const isValid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token:    code?.replace(/\s/g, '') || '',
      window:   2,
    });
    if (!isValid)
      return res.status(400).json({ success: false, message: 'Invalid 2FA code' });

    const plainCodes  = generateRecoveryCodes();
    const hashedCodes = await Promise.all(plainCodes.map(c => bcrypt.hash(c, 8)));
    await User.findByIdAndUpdate(req.user._id, { twoFactorRecoveryCodes: hashedCodes });

    res.json({ success: true, recoveryCodes: plainCodes, message: '10 new recovery codes generated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Get 2FA status ── */
exports.get2FAStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFactorRecoveryCodes');
    res.json({
      success: true,
      status: {
        enabled:             user.twoFactorEnabled,
        setupPending:        user.twoFactorSetupPending,
        recoveryCodesLeft:   user.twoFactorRecoveryCodes?.length || 0,
        forced:              user.twoFactorForced,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};