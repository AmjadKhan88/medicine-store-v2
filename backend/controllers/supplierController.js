const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Medicine = require('../models/Medicine');

/* ── Get all suppliers ── */
exports.getAll = async (req, res) => {
  try {
    const { search, city, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId, isActive: true };

    if (city) query.city = { $regex: city, $options: 'i' };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const result = await Supplier.paginate(query, {
      page: Number(page),
      limit: Number(limit),
      sort: { name: 1 },
      select: '-medicines',
      lean: true,
      leanWithId: false,
    });

    res.json({
      success: true,
      suppliers: result.docs,
      total: result.totalDocs,
      totalPages: result.totalPages,
      page: result.page,
      hasNext: result.hasNextPage,
      hasPrev: result.hasPrevPage,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Get single supplier with full detail ── */
exports.getOne = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('medicines.medicine', 'name category dosageForm strength stock');

    if (!supplier)
      return res.status(404).json({ success: false, message: 'Supplier not found' });

    // Recent purchase orders from this supplier
    const recentOrders = await PurchaseOrder.find({
      storeId: req.storeId,
      'supplier.name': { $regex: supplier.name, $options: 'i' },
    })
      .select('-items')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, supplier, recentOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Create supplier ── */
exports.create = async (req, res) => {
  try {
    const supplier = await Supplier.create({
      ...req.body,
      storeId: req.storeId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, supplier, message: 'Supplier added' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Update supplier ── */
exports.update = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier)
      return res.status(404).json({ success: false, message: 'Supplier not found' });

    res.json({ success: true, supplier, message: 'Supplier updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Soft delete ── */
exports.remove = async (req, res) => {
  try {
    await Supplier.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { isActive: false }
    );
    res.json({ success: true, message: 'Supplier removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Link medicines to supplier ── */
exports.linkMedicines = async (req, res) => {
  try {
    const { medicines } = req.body;
    // medicines = [{ medicine, medicineName, ourPrice, isPreferred }]

    const supplier = await Supplier.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!supplier)
      return res.status(404).json({ success: false, message: 'Supplier not found' });

    supplier.medicines = medicines;
    await supplier.save();

    res.json({ success: true, supplier, message: 'Medicines linked to supplier' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Record supplier payment ── */
exports.recordPayment = async (req, res) => {
  try {
    const { amount, note } = req.body;
    const pay = Number(amount);
    if (!pay || pay <= 0)
      return res.status(400).json({ success: false, message: 'Invalid amount' });

    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $inc: { totalPaid: pay } },
      { new: true }
    );
    if (!supplier)
      return res.status(404).json({ success: false, message: 'Supplier not found' });

    res.json({ success: true, supplier, message: `Payment of ₨${pay.toLocaleString()} recorded` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Log a performance event ── */
exports.logPerformance = async (req, res) => {
  try {
    const { event, rating } = req.body;
    // event: 'onTime' | 'late' | 'qualityIssue' | 'returned'

    const inc = {};
    if (event === 'onTime') { inc['performance.totalOrders'] = 1; inc['performance.onTimeDeliveries'] = 1; }
    if (event === 'late') { inc['performance.totalOrders'] = 1; inc['performance.lateDeliveries'] = 1; }
    if (event === 'qualityIssue') { inc['performance.qualityIssues'] = 1; }
    if (event === 'returned') { inc['performance.returnedOrders'] = 1; }

    const update = { $inc: inc };
    if (rating !== undefined)
      update.$set = { 'performance.rating': Number(rating) };

    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      update,
      { new: true }
    );
    if (!supplier)
      return res.status(404).json({ success: false, message: 'Supplier not found' });

    res.json({ success: true, supplier, message: 'Performance updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Purchase history for a specific supplier ── */
exports.getPurchaseHistory = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id).select('name');
    if (!supplier)
      return res.status(404).json({ success: false, message: 'Supplier not found' });

    const orders = await PurchaseOrder.find({
      storeId: req.storeId,
      'supplier.name': { $regex: supplier.name, $options: 'i' },
    })
      .sort({ createdAt: -1 });

    const stats = {
      totalOrders: orders.length,
      totalValue: orders.reduce((s, o) => s + o.totalAmount, 0),
      totalPaid: orders.reduce((s, o) => s + o.amountPaid, 0),
      pending: orders.filter(o => o.status !== 'Received').length,
    };
    stats.outstanding = stats.totalValue - stats.totalPaid;

    res.json({ success: true, orders, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Outstanding payments dashboard ── */
exports.getOutstandingDashboard = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ storeId: req.storeId, isActive: true })
      .select('name company phone totalOrdered totalPaid performance city');

    const withBalance = suppliers
      .map(s => ({
        _id: s._id,
        name: s.name,
        company: s.company,
        phone: s.phone,
        city: s.city,
        totalOrdered: s.totalOrdered,
        totalPaid: s.totalPaid,
        outstanding: Math.max(0, s.totalOrdered - s.totalPaid),
        rating: s.performance?.rating || 0,
      }))
      .filter(s => s.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);

    const totalOutstanding = withBalance.reduce((sum, s) => sum + s.outstanding, 0);

    res.json({ success: true, suppliers: withBalance, totalOutstanding });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Stats cards ── */
exports.getStats = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ storeId: req.storeId, isActive: true })
      .select('totalOrdered totalPaid performance');

    const totalOutstanding = suppliers.reduce((s, sup) =>
      s + Math.max(0, sup.totalOrdered - sup.totalPaid), 0);

    const avgRating = suppliers.length
      ? (suppliers.reduce((s, sup) => s + (sup.performance?.rating || 0), 0) / suppliers.length).toFixed(1)
      : 0;

    res.json({
      success: true,
      stats: {
        total: suppliers.length,
        totalOutstanding,
        avgRating: Number(avgRating),
        withBalance: suppliers.filter(s => s.totalOrdered > s.totalPaid).length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};