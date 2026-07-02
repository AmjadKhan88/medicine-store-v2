const Subscription = require('../models/Subscription');
const Medicine     = require('../models/Medicine');
const Patient      = require('../models/Patient');
const Bill         = require('../models/Bill');
const User         = require('../models/User');

/* ── Require active subscription ── */
const requireSubscription = async (req, res, next) => {
  try {
    let sub = await Subscription.findOne({ storeId: req.storeId });

    // Auto-create trial if missing (for existing users before this feature)
    if (!sub) {
      const { createTrialSubscription } = require('../controllers/subscriptionController');
      sub = await createTrialSubscription(req.storeId);
    }

    const now      = new Date();
    let   isActive = false;

    if (sub.status === 'active') {
      if      (sub.plan === 'trial') isActive = sub.trialEndsAt > now;
      else if (sub.plan === 'free')  isActive = true;
      else                           isActive = sub.currentPeriodEnd > now;
    }

    if (!isActive) {
      return res.status(403).json({
        success: false,
        code:    'SUBSCRIPTION_EXPIRED',
        plan:    sub.plan,
        message: sub.plan === 'trial'
          ? 'Your 14-day free trial has expired. Please upgrade to continue.'
          : 'Your subscription has expired. Please renew to continue.',
      });
    }

    req.subscription = sub;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Check a specific limit before a create operation ── */
const checkLimit = (resource) => async (req, res, next) => {
  try {
    const sub = req.subscription;
    if (!sub) return next();

    const limit = sub.limits?.[resource];
    if (limit === undefined || limit === -1) return next(); // unlimited

    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let count = 0;
    if      (resource === 'medicines')     count = await Medicine.countDocuments({ storeId: req.storeId, isActive: true });
    else if (resource === 'patients')      count = await Patient.countDocuments({ storeId: req.storeId, isActive: true });
    else if (resource === 'staff')         count = await User.countDocuments({ storeId: req.storeId });
    else if (resource === 'billsPerMonth') count = await Bill.countDocuments({ storeId: req.storeId, createdAt: { $gte: startOfMonth } });

    if (count >= limit) {
      const planNames = { trial: 'Free Trial', free: 'Free', basic: 'Basic', pro: 'Pro' };
      return res.status(403).json({
        success:  false,
        code:     'LIMIT_EXCEEDED',
        resource,
        current:  count,
        limit,
        plan:     sub.plan,
        message:  `You've reached your ${resource} limit (${limit}) on the ${planNames[sub.plan]} plan. Upgrade to add more.`,
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { requireSubscription, checkLimit };