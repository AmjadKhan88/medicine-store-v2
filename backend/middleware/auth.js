const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/* ── Verify JWT ── */
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token)
      return res.status(401).json({ success: false, message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.isActive)
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });

    // Attach storeId to every request for tenant filtering
    req.storeId = req.user.storeId;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

/* ── Role guards ── */
const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Admin access required' });
};

const notPharmacist = (req, res, next) => {
  if (req.user?.role !== 'pharmacist') return next();
  res.status(403).json({ success: false, message: 'Pharmacists cannot perform this action' });
};

const canDelete = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Only admins can delete records' });
};

module.exports = { protect, adminOnly, notPharmacist, canDelete };