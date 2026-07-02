const emailService = require('../utils/emailService');
const User = require('../models/User');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

/* ── Get all staff in this store ── */
exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ storeId: req.storeId })
      .select('-password -inviteToken')
      .sort({ createdAt: -1 });
    res.json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Add staff member directly (admin creates account for them) ── */
exports.addStaff = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (role === 'admin')
      return res.status(400).json({ success: false, message: 'Cannot create another admin' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const staff = await User.create({
      name, email, password, role, phone,
      storeId: req.storeId,  // belongs to same store as admin
    });

    // Send invitation email
    try {
      const storeOwner = await User.findOne({ _id: req.storeId, role: 'admin' });
      await emailService.sendStaffInvitationEmail({
        email: email,
        staffName: name,
        role: role,
        storeName: storeOwner?.storeName || 'Your Pharmacy',
        adminName: req.user.name,
        tempPassword: password, // plain password before hashing — must be grabbed before User.create
      });
    } catch (emailErr) {
      console.error('[Email] Staff invitation email failed:', emailErr.message);
    }

    res.status(201).json({ success: true, staff, message: `${role} account created` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Update staff role or status ── */
exports.updateStaff = async (req, res) => {
  try {
    const { role, isActive, name, phone } = req.body;
    const member = await User.findOne({ _id: req.params.id, storeId: req.storeId });

    if (!member)
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    if (member._id.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot modify your own account here' });

    if (role) member.role = role;
    if (name) member.name = name;
    if (phone !== undefined) member.phone = phone;
    if (isActive !== undefined) member.isActive = isActive;
    await member.save();

    res.json({ success: true, staff: member, message: 'Staff updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Reset staff password (admin only) ── */
exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const member = await User.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!member)
      return res.status(404).json({ success: false, message: 'Staff member not found' });

    member.password = newPassword;
    await member.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Remove staff ── */
exports.removeStaff = async (req, res) => {
  try {
    const member = await User.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!member)
      return res.status(404).json({ success: false, message: 'Staff not found' });
    if (member._id.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot remove yourself' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Staff member removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};