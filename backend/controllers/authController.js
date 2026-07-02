const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

/* ── Register (creates a new store owner) ── */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password required' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    // Create the user first (no storeId yet)
    const user = await User.create({ name, email, password, phone, role: 'admin' });

    // storeId = their own _id (they are the tenant root)
    user.storeId = user._id;
    await user.save();

    // Auto-create 14-day trial
    const Subscription = require('../models/Subscription');
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    await Subscription.create({
      storeId: user._id,
      plan: 'trial',
      status: 'active',
      trialEndsAt: trialEnd,
      limits: { medicines: 50, patients: 20, staff: 1, billsPerMonth: 50 },
    }).catch(() => { }); // Don't fail registration if this errors

    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Login ── */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account deactivated' });

    const token = generateToken(user._id);
    res.json({ success: true, token, user });
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
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id, { name, phone }, { new: true }
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