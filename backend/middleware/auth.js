const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/* ════════════════════════════════
   ROLE PERMISSION MAP
   What each role can do
════════════════════════════════ */
const ROLE_PERMISSIONS = {
  admin: {
    // Full access to everything
    canManageStaff:      true,
    canViewFinance:      true,
    canManageInventory:  true,
    canBill:             true,
    canViewReports:      true,
    canManagePatients:   true,
    canViewClinical:     true,
    canNurseStation:     true,
    canLabTests:         true,
    canManageIPD:        true,
    canManageOPD:        true,
    canViewAuditLog:     true,
    canStoreSettings:    true,
    canPurchaseOrders:   true,
    canDeleteRecords:    true,
    canManageInsurance:  true,
    canManagePayroll:    true,
    canAccessAI:         true,
    canDRAP:             true,
    canBroadcast:        true,
    canRAG:              true,
    settings:            true,
  },
  doctor: {
    canManageStaff:      false,
    canViewFinance:      false,
    canManageInventory:  false,
    canBill:             false,
    canViewReports:      true,
    canManagePatients:   true,
    canViewClinical:     true,
    canNurseStation:     false,
    canLabTests:         true,
    canManageIPD:        true,
    canManageOPD:        true,
    canViewAuditLog:     false,
    canStoreSettings:    false,
    canPurchaseOrders:   false,
    canDeleteRecords:    false,
    canManageInsurance:  false,
    canManagePayroll:    false,
    canAccessAI:         true,
    canDRAP:             false,
    canBroadcast:        false,
    canRAG:              true,
    settings:            false,
  },
  pharmacist: {
    canManageStaff:      false,
    canViewFinance:      false,
    canManageInventory:  true,
    canBill:             true,
    canViewReports:      false,
    canManagePatients:   true,
    canViewClinical:     false,
    canNurseStation:     false,
    canLabTests:         true,
    canManageIPD:        false,
    canManageOPD:        false,
    canViewAuditLog:     false,
    canStoreSettings:    false,
    canPurchaseOrders:   true,
    canDeleteRecords:    false,
    canManageInsurance:  false,
    canManagePayroll:    false,
    canAccessAI:         false,
    canDRAP:             false,
    canBroadcast:        false,
    canRAG:              true,
    settings:            false,
  },
  nurse: {
    canManageStaff:      false,
    canViewFinance:      false,
    canManageInventory:  false,
    canBill:             false,
    canViewReports:      false,
    canManagePatients:   true,    // view patients
    canViewClinical:     true,    // view doctor orders
    canNurseStation:     true,    // full nurse station access
    canLabTests:         false,
    canManageIPD:        false,   // can view IPD but not admit/discharge
    canManageOPD:        false,
    canViewAuditLog:     false,
    canStoreSettings:    false,
    canPurchaseOrders:   false,
    canDeleteRecords:    false,
    canManageInsurance:  false,
    canManagePayroll:    false,
    canAccessAI:         false,
    canDRAP:             false,
    canBroadcast:        false,
    canRAG:              true,
    settings:            false,
  },
  receptionist: {
    canManageStaff:      false,
    canViewFinance:      false,
    canManageInventory:  false,
    canBill:             true,    // can bill
    canViewReports:      false,
    canManagePatients:   true,    // register patients
    canViewClinical:     false,
    canNurseStation:     false,
    canLabTests:         false,
    canManageIPD:        false,
    canManageOPD:        true,    // manage OPD queue
    canViewAuditLog:     false,
    canStoreSettings:    false,
    canPurchaseOrders:   false,
    canDeleteRecords:    false,
    canManageInsurance:  false,
    canManagePayroll:    false,
    canAccessAI:         false,
    canDRAP:             false,
    canBroadcast:        false,
    canRAG:              false,
    settings:            false,
  },
  lab_technician: {
    canManageStaff:      false,
    canViewFinance:      false,
    canManageInventory:  false,
    canBill:             false,
    canViewReports:      false,
    canManagePatients:   true,    // view patients to process tests
    canViewClinical:     false,
    canNurseStation:     false,
    canLabTests:         true,    // full lab access
    canManageIPD:        false,
    canManageOPD:        false,
    canViewAuditLog:     false,
    canStoreSettings:    false,
    canPurchaseOrders:   false,
    canDeleteRecords:    false,
    canManageInsurance:  false,
    canManagePayroll:    false,
    canAccessAI:         false,
    canDRAP:             false,
    canBroadcast:        false,
    canRAG:              false,
    settings:            false,
  },
};

/* ── Helper: get permissions for a role ── */
const getPermissions = (role) =>
  ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.pharmacist;

/* ════════════════════════════════
   VERIFY JWT
════════════════════════════════ */
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

    req.storeId     = req.user.storeId;
    req.permissions = getPermissions(req.user.role);  // attach permissions
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    if (err.name === 'JsonWebTokenError')
      return res.status(401).json({ success: false, message: 'Token invalid', code: 'TOKEN_INVALID' });
    console.error('[Auth middleware] Unexpected error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during authentication' });
  }
};

/* ════════════════════════════════
   ROLE GUARDS
════════════════════════════════ */

/* ── Admin only ── */
const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Admin access required' });
};

/* ── Admin or Doctor ── */
const adminOrDoctor = (req, res, next) => {
  if (['admin', 'doctor'].includes(req.user?.role)) return next();
  res.status(403).json({ success: false, message: 'Doctor or Admin access required' });
};

/* ── Clinical staff (doctor, nurse, admin) ── */
const clinicalStaff = (req, res, next) => {
  if (['admin', 'doctor', 'nurse'].includes(req.user?.role)) return next();
  res.status(403).json({ success: false, message: 'Clinical staff access required' });
};

/* ── Nurse or above ── */
const nurseOrAbove = (req, res, next) => {
  if (['admin', 'doctor', 'nurse'].includes(req.user?.role)) return next();
  res.status(403).json({ success: false, message: 'Nurse access required' });
};

/* ── Not pharmacist (for financial/sensitive actions) ── */
const notPharmacist = (req, res, next) => {
  if (!['pharmacist', 'nurse', 'receptionist', 'lab_technician'].includes(req.user?.role))
    return next();
  res.status(403).json({ success: false, message: 'Insufficient permissions for this action' });
};

/* ── Can delete records ── */
const canDelete = (req, res, next) => {
  if (req.permissions?.canDeleteRecords || req.user?.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Only admins can delete records' });
};

/* ── Permission-based guard (flexible) ── */
const requirePermission = (permission) => (req, res, next) => {
  if (req.permissions?.[permission]) return next();
  res.status(403).json({
    success:    false,
    message:    `Your role (${req.user?.role}) does not have permission to perform this action`,
    permission,
    role:       req.user?.role,
  });
};

module.exports = {
  protect,
  adminOnly,
  adminOrDoctor,
  clinicalStaff,
  nurseOrAbove,
  notPharmacist,
  canDelete,
  requirePermission,
  ROLE_PERMISSIONS,
  getPermissions,
};