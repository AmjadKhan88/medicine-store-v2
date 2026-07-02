const Subscription   = require('../models/Subscription');
const PaymentRequest = require('../models/PaymentRequest');
const Medicine       = require('../models/Medicine');
const Patient        = require('../models/Patient');
const Bill           = require('../models/Bill');
const User           = require('../models/User');

/* ── Plan definitions ── */
const PLANS = {
  trial: {
    name: 'Free Trial', price: 0, duration: 14, badge: '14 Days Free',
    limits: { medicines: 50, patients: 20, staff: 1, billsPerMonth: 50 },
    features: [
      'All features unlocked',
      '50 medicines',
      '20 patients',
      '1 user account',
      '50 bills per month',
      'No credit card required',
    ],
  },
  free: {
    name: 'Free', price: 0, badge: 'Forever Free',
    limits: { medicines: 30, patients: 15, staff: 1, billsPerMonth: 20 },
    features: [
      '30 medicines',
      '15 patients',
      '1 user account',
      '20 bills per month',
      'Basic features only',
    ],
  },
  basic: {
    name: 'Basic', price: 2999, badge: 'Most Popular',
    limits: { medicines: 500, patients: 200, staff: 3, billsPerMonth: -1 },
    features: [
      '500 medicines',
      '200 patients',
      '3 staff members',
      'Unlimited bills',
      'PDF invoice & reports',
      'WhatsApp reminders',
      'Expiry alerts',
      'Purchase orders',
    ],
  },
  pro: {
    name: 'Pro', price: 5999, badge: 'Best Value',
    limits: { medicines: -1, patients: -1, staff: -1, billsPerMonth: -1 },
    features: [
      'Unlimited medicines',
      'Unlimited patients',
      'Unlimited staff',
      'Unlimited bills',
      'Everything in Basic',
      'Advanced analytics',
      'Audit log',
      'Data backup & restore',
      'Medicine substitutes',
      'Priority support',
    ],
  },
};

/* ── Helper: create trial subscription ── */
const createTrialSubscription = async (storeId) => {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  return Subscription.create({
    storeId,
    plan:        'trial',
    status:      'active',
    trialEndsAt: trialEnd,
    limits:      PLANS.trial.limits,
  });
};

/* ── Get subscription + usage ── */
exports.getSubscription = async (req, res) => {
  try {
    let sub = await Subscription.findOne({ storeId: req.storeId });
    if (!sub) sub = await createTrialSubscription(req.storeId);

    // Current usage
    const now           = new Date();
    const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);

    const [medicineCount, patientCount, staffCount, billsThisMonth] = await Promise.all([
      Medicine.countDocuments({ storeId: req.storeId, isActive: true }),
      Patient.countDocuments({ storeId: req.storeId, isActive: true }),
      User.countDocuments({ storeId: req.storeId }),
      Bill.countDocuments({ storeId: req.storeId, createdAt: { $gte: startOfMonth } }),
    ]);

    // Check pending payment request
    const pendingRequest = await PaymentRequest.findOne({
      storeId: req.storeId, status: 'pending',
    });

    res.json({
      success: true,
      subscription: sub,
      usage: { medicines: medicineCount, patients: patientCount, staff: staffCount, billsPerMonth: billsThisMonth },
      plans:          PLANS,
      pendingRequest: pendingRequest || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Get plans (public, no auth) ── */
exports.getPlans = (req, res) => {
  res.json({ success: true, plans: PLANS });
};

/* ── Submit payment request ── */
exports.submitPaymentRequest = async (req, res) => {
  try {
    const { plan, paymentMethod, transactionId, amount, notes } = req.body;

    if (!['basic', 'pro'].includes(plan))
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    if (!transactionId?.trim())
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });

    // Only 1 pending request at a time
    const existing = await PaymentRequest.findOne({ storeId: req.storeId, status: 'pending' });
    if (existing)
      return res.status(400).json({
        success: false,
        message: 'You already have a pending payment request. Please wait for approval or contact support.',
      });

    const request = await PaymentRequest.create({
      storeId:       req.storeId,
      adminName:     req.user.name,
      adminEmail:    req.user.email,
      plan,
      amount:        amount || PLANS[plan].price,
      paymentMethod,
      transactionId: transactionId.trim(),
      notes,
    });

    res.status(201).json({
      success: true, request,
      message: 'Payment request submitted! Your account will be activated within 24 hours after verification.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Cancel pending request ── */
exports.cancelPaymentRequest = async (req, res) => {
  try {
    const request = await PaymentRequest.findOne({ storeId: req.storeId, status: 'pending' });
    if (!request) return res.status(404).json({ success: false, message: 'No pending request found' });
    await PaymentRequest.findByIdAndDelete(request._id);
    res.json({ success: true, message: 'Request cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════
   SUPER ADMIN ROUTES
══════════════════════════════════════ */

/* ── All payment requests ── */
exports.getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const requests = await PaymentRequest.find(query).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Approve payment ── */
exports.approvePayment = async (req, res) => {
  try {
    const request = await PaymentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Request already processed' });

    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);

    await Subscription.findOneAndUpdate(
      { storeId: request.storeId },
      {
        plan:               request.plan,
        status:             'active',
        currentPeriodStart: now,
        currentPeriodEnd:   end,
        limits:             PLANS[request.plan].limits,
        $push: {
          payments: {
            plan:          request.plan,
            amount:        request.amount,
            method:        request.paymentMethod,
            transactionId: request.transactionId,
            paidAt:        now,
            approvedBy:    req.user.name,
          },
        },
      },
      { upsert: true, new: true }
    );

    request.status      = 'approved';
    request.processedBy = req.user.name;
    request.processedAt = now;
    await request.save();

    res.json({ success: true, message: `${request.plan} plan activated for ${request.adminEmail}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Reject payment ── */
exports.rejectPayment = async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await PaymentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status          = 'rejected';
    request.processedBy     = req.user.name;
    request.processedAt     = new Date();
    request.rejectionReason = reason || 'Payment could not be verified';
    await request.save();

    res.json({ success: true, message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Manual activation ── */
exports.manualActivate = async (req, res) => {
  try {
    const { storeId, plan, months = 1 } = req.body;
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + Number(months));

    const sub = await Subscription.findOneAndUpdate(
      { storeId },
      {
        plan, status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd:   end,
        limits: PLANS[plan]?.limits || PLANS.free.limits,
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, subscription: sub, message: `${plan} activated for ${months} month(s)` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── All stores overview ── */
exports.getAllStores = async (req, res) => {
  try {
    const [admins, subs, requests] = await Promise.all([
      User.find({ role: 'admin' }).select('name email createdAt'),
      Subscription.find(),
      PaymentRequest.find({ status: 'pending' }),
    ]);

    const subMap = {};
    subs.forEach(s => { subMap[String(s.storeId)] = s; });

    const reqMap = {};
    requests.forEach(r => { reqMap[String(r.storeId)] = r; });

    const stores = admins.map(a => ({
      ...a.toJSON(),
      subscription:   subMap[String(a._id)] || null,
      pendingRequest: reqMap[String(a._id)] || null,
    }));

    res.json({ success: true, stores, pendingCount: requests.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTrialSubscription = createTrialSubscription;
exports.PLANS = PLANS;