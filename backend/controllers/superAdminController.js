const User          = require('../models/User');
const Subscription  = require('../models/Subscription');
const PaymentRequest= require('../models/PaymentRequest');
const Medicine      = require('../models/Medicine');
const Patient       = require('../models/Patient');
const Bill          = require('../models/Bill');
const SupportTicket = require('../models/SupportTicket');

/* ═══════════════════════════════════════
   PLATFORM ANALYTICS
═══════════════════════════════════════ */
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const now        = new Date();
    const thisMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const in7Days    = new Date(now.getTime() + 7  * 86400000);
    const in30Days   = new Date(now.getTime() + 30 * 86400000);

    const [
      totalStores,
      totalMedicines,
      totalPatients,
      totalBills,
      monthlyBillStats,
      lastMonthBillStats,
      subBreakdown,
      expiringIn7,
      expiringIn30,
      pendingRequests,
      openTickets,
      recentStores,
      monthlyRevenue,
    ] = await Promise.all([
      User.countDocuments({ role: 'admin' }),
      Medicine.countDocuments({ isActive: true }),
      Patient.countDocuments({ isActive: true }),
      Bill.countDocuments(),

      Bill.aggregate([
        { $match: { createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      Bill.aggregate([
        { $match: { createdAt: { $gte: lastMonth, $lte: lastMonthEnd } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      Subscription.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } },
      ]),

      Subscription.find({
        status: 'active',
        plan:   { $nin: ['trial', 'free'] },
        currentPeriodEnd: { $gte: now, $lte: in7Days },
      }).populate('storeId', 'name email phone'),

      Subscription.find({
        status: 'active',
        plan:   { $nin: ['trial', 'free'] },
        currentPeriodEnd: { $gte: now, $lte: in30Days },
      }).populate('storeId', 'name email phone'),

      PaymentRequest.countDocuments({ status: 'pending' }),
      SupportTicket.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),

      User.find({ role: 'admin' })
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(5),

      // Monthly subscription revenue for last 6 months
      PaymentRequest.aggregate([
        { $match: { status: 'approved' } },
        { $group: {
          _id:   { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } },
          revenue: { $sum: '$amount' },
          count:   { $sum: 1 },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 6 },
      ]),
    ]);

    const planMap = {};
    subBreakdown.forEach(s => { planMap[s._id] = s.count; });

    const thisMonthRevenue = monthlyBillStats[0]?.revenue  || 0;
    const lastMonthRevenue = lastMonthBillStats[0]?.revenue || 0;
    const revenueGrowth    = lastMonthRevenue > 0
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : null;

    res.json({
      success: true,
      analytics: {
        platform: {
          totalStores,
          totalMedicines,
          totalPatients,
          totalBills,
          pendingRequests,
          openTickets,
        },
        billing: {
          thisMonthRevenue,
          lastMonthRevenue,
          revenueGrowth,
          thisMonthBills: monthlyBillStats[0]?.count || 0,
        },
        subscriptions: {
          trial:   planMap['trial']   || 0,
          free:    planMap['free']    || 0,
          basic:   planMap['basic']   || 0,
          pro:     planMap['pro']     || 0,
          expiringIn7Days:  expiringIn7.length,
          expiringIn30Days: expiringIn30.length,
        },
        expiringStores: expiringIn7.map(s => ({
          storeId:  s.storeId?._id,
          name:     s.storeId?.name,
          email:    s.storeId?.email,
          phone:    s.storeId?.phone,
          plan:     s.plan,
          expiresAt:s.currentPeriodEnd,
        })),
        recentStores,
        monthlyRevenue,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   STORE MANAGEMENT
═══════════════════════════════════════ */
exports.getAllStores = async (req, res) => {
  try {
    const { search, plan, page = 1, limit = 20 } = req.query;

    let admins = await User.find({ role: 'admin' })
      .select('name email phone isActive createdAt storeName')
      .sort({ createdAt: -1 });

    if (search) {
      const s = search.toLowerCase();
      admins = admins.filter(a =>
        a.name?.toLowerCase().includes(s) ||
        a.email?.toLowerCase().includes(s) ||
        a.storeName?.toLowerCase().includes(s)
      );
    }

    const adminIds = admins.map(a => a._id);

    const [subs, requests, ticketCounts, medicineCounts, patientCounts] = await Promise.all([
      Subscription.find({ storeId: { $in: adminIds } }),
      PaymentRequest.find({ storeId: { $in: adminIds }, status: 'pending' }),

      SupportTicket.aggregate([
        { $match: { storeId: { $in: adminIds }, status: { $in: ['Open', 'In Progress'] } } },
        { $group: { _id: '$storeId', count: { $sum: 1 } } },
      ]),

      Medicine.aggregate([
        { $match: { storeId: { $in: adminIds }, isActive: true } },
        { $group: { _id: '$storeId', count: { $sum: 1 } } },
      ]),

      Patient.aggregate([
        { $match: { storeId: { $in: adminIds }, isActive: true } },
        { $group: { _id: '$storeId', count: { $sum: 1 } } },
      ]),
    ]);

    const subMap     = Object.fromEntries(subs.map(s => [String(s.storeId), s]));
    const reqMap     = Object.fromEntries(requests.map(r => [String(r.storeId), r]));
    const ticketMap  = Object.fromEntries(ticketCounts.map(t => [String(t._id), t.count]));
    const medMap     = Object.fromEntries(medicineCounts.map(m => [String(m._id), m.count]));
    const patMap     = Object.fromEntries(patientCounts.map(p => [String(p._id), p.count]));

    let stores = admins.map(a => ({
      _id:            a._id,
      name:           a.name,
      storeName:      a.storeName,
      email:          a.email,
      phone:          a.phone,
      isActive:       a.isActive,
      createdAt:      a.createdAt,
      subscription:   subMap[String(a._id)]  || null,
      pendingRequest: reqMap[String(a._id)]  || null,
      openTickets:    ticketMap[String(a._id)]|| 0,
      medicineCount:  medMap[String(a._id)]  || 0,
      patientCount:   patMap[String(a._id)]  || 0,
    }));

    // Filter by plan
    if (plan) stores = stores.filter(s => s.subscription?.plan === plan);

    const total  = stores.length;
    const start  = (Number(page) - 1) * Number(limit);
    stores       = stores.slice(start, start + Number(limit));

    res.json({
      success: true,
      stores,
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Activate / Deactivate a store ── */
exports.toggleStoreStatus = async (req, res) => {
  try {
    const { storeId, isActive, reason } = req.body;

    const user = await User.findByIdAndUpdate(
      storeId,
      { isActive },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'Store not found' });

    // Also suspend/restore subscription
    if (!isActive) {
      await Subscription.findOneAndUpdate(
        { storeId },
        { status: 'suspended' }
      );
    } else {
      // Restore to active if it was suspended
      await Subscription.findOneAndUpdate(
        { storeId, status: 'suspended' },
        { status: 'active' }
      );
    }

    res.json({
      success: true,
      message: isActive
        ? `Store "${user.name}" reactivated`
        : `Store "${user.name}" deactivated — ${reason || 'No reason given'}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Manually extend subscription ── */
exports.extendSubscription = async (req, res) => {
  try {
    const { storeId, plan, months } = req.body;
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + Number(months || 1));

    const PLANS = {
      free:  { medicines: 30,  patients: 15,  staff: 1,  billsPerMonth: 20  },
      basic: { medicines: 500, patients: 200, staff: 3,  billsPerMonth: -1  },
      pro:   { medicines: -1,  patients: -1,  staff: -1, billsPerMonth: -1  },
    };

    const sub = await Subscription.findOneAndUpdate(
      { storeId },
      {
        plan,
        status:             'active',
        currentPeriodStart: now,
        currentPeriodEnd:   end,
        limits:             PLANS[plan] || PLANS.basic,
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, subscription: sub, message: `${plan} plan activated for ${months} month(s)` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   PAYMENT REQUESTS
═══════════════════════════════════════ */
exports.getPaymentRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const skip  = (Number(page) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      PaymentRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      PaymentRequest.countDocuments(query),
    ]);
    res.json({ success: true, requests, total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approvePayment = async (req, res) => {
  try {
    const PLANS = {
      basic: { medicines: 500, patients: 200, staff: 3,  billsPerMonth: -1 },
      pro:   { medicines: -1,  patients: -1,  staff: -1, billsPerMonth: -1 },
    };

    const request = await PaymentRequest.findById(req.params.id);
    if (!request || request.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Request not found or already processed' });

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
        limits:             PLANS[request.plan] || PLANS.basic,
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

    res.json({ success: true, message: `${request.plan} activated for ${request.adminEmail}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectPayment = async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await PaymentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
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

/* ═══════════════════════════════════════
   SUPPORT TICKETS — admin side
═══════════════════════════════════════ */
exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status)   query.status   = status;
    if (priority) query.priority = priority;

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip).limit(Number(limit)),
      SupportTicket.countDocuments(query),
    ]);

    res.json({ success: true, tickets, total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.replyToTicket = async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.replies.push({ message, sentBy: 'admin', senderName: req.user.name });
    if (ticket.status === 'Open') ticket.status = 'In Progress';
    await ticket.save();

    res.json({ success: true, ticket, message: 'Reply sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        status,
        ...(status === 'Resolved' && { resolvedAt: new Date() }),
      },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket, message: `Ticket marked as ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   SUPPORT TICKETS — store side
═══════════════════════════════════════ */
exports.createTicket = async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    if (!subject || !message)
      return res.status(400).json({ success: false, message: 'Subject and message required' });

    const ticket = await SupportTicket.create({
      storeId:    req.storeId,
      storeName:  req.user.storeName || req.user.name,
      storeEmail: req.user.email,
      subject,
      message,
      category:   category  || 'Other',
      priority:   priority  || 'Medium',
    });

    res.status(201).json({ success: true, ticket, message: 'Ticket submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ storeId: req.storeId })
      .sort({ updatedAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.replyToMyTicket = async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findOne({
      _id: req.params.id, storeId: req.storeId,
    });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.status === 'Closed')
      return res.status(400).json({ success: false, message: 'Ticket is closed' });

    ticket.replies.push({ message, sentBy: 'store', senderName: req.user.name });
    if (ticket.status === 'Resolved') ticket.status = 'In Progress';
    await ticket.save();

    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};