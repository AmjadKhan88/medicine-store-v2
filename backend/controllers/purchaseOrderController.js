const PurchaseOrder = require('../models/PurchaseOrder');
const Medicine      = require('../models/Medicine');
const Supplier = require('../models/Supplier');

/* ── Helper: sync supplier financial totals from this store's POs ── */
async function syncSupplierTotals(storeId, supplierName) {
  try {
    const supplier = await Supplier.findOne({
      storeId,
      name: { $regex: `^${supplierName}$`, $options: 'i' },
      isActive: true,
    });
    if (!supplier) return;

    const orders = await PurchaseOrder.find({
      storeId,
      'supplier.name': { $regex: `^${supplierName}$`, $options: 'i' },
    });

    supplier.totalOrdered = orders.reduce((s, o) => s + o.totalAmount, 0);
    supplier.totalPaid    = orders.reduce((s, o) => s + o.amountPaid,  0);
    await supplier.save();
  } catch (err) {
    console.error('[Supplier Sync]', err.message);
  }
}

/* ── GET all ── */
exports.getAll = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query;
    // const query = {};
    const query = { storeId: req.storeId };
    if (status) query.status = status;
    if (search) query.$or = [
      { poNumber:        { $regex: search, $options: 'i' } },
      { 'supplier.name': { $regex: search, $options: 'i' } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip).limit(Number(limit)),
      PurchaseOrder.countDocuments(query),
    ]);

    res.json({ success: true, orders, total, totalPages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET single ── */
exports.getOne = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('items.medicine', 'name stock unit')
      .populate('createdBy', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CREATE ── */
exports.create = async (req, res) => {
  try {
    const { supplier, items, expectedDate, notes, amountPaid = 0 } = req.body;

    if (!items?.length)
      return res.status(400).json({ success: false, message: 'Add at least one item' });

    // Build items with medicine name + total cost
    const builtItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);
      if (!medicine)
        return res.status(404).json({ success: false, message: `Medicine ${item.medicine} not found` });

      const totalCost = item.unitCost * item.orderedQty;
      totalAmount += totalCost;
      builtItems.push({
        medicine:     medicine._id,
        medicineName: medicine.name,
        orderedQty:   item.orderedQty,
        receivedQty:  0,
        unitCost:     item.unitCost,
        totalCost,
      });
    }

    const order = await PurchaseOrder.create({
      storeId: req.storeId,
      supplier,
      items: builtItems,
      totalAmount,
      amountPaid: Number(amountPaid),
      expectedDate,
      notes,
      status: 'Ordered',
      createdBy: req.user._id,
    });

    await syncSupplierTotals(req.storeId, supplier.name);

    res.status(201).json({ success: true, order, message: 'Purchase order created!' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── RECEIVE ORDER (full or partial) ── */
exports.receiveOrder = async (req, res) => {
  try {
    const { receivedItems, receivedDate } = req.body;
    // receivedItems = [{ medicineId, receivedQty }]

    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'Received')
      return res.status(400).json({ success: false, message: 'Order already fully received' });
    if (order.status === 'Cancelled')
      return res.status(400).json({ success: false, message: 'Order is cancelled' });

    let allReceived = true;
    let anyReceived = false;

    for (const received of receivedItems) {
      const item = order.items.find(i => i.medicine.toString() === received.medicineId);
      if (!item) continue;

      const qty = Number(received.receivedQty);
      if (qty <= 0) continue;

      const maxReceivable = item.orderedQty - item.receivedQty;
      const toReceive = Math.min(qty, maxReceivable);
      if (toReceive <= 0) continue;

      // Add stock to medicine
      await Medicine.findByIdAndUpdate(item.medicine, { $inc: { stock: toReceive } });

      item.receivedQty += toReceive;
      anyReceived = true;

      if (item.receivedQty < item.orderedQty) allReceived = false;
    }

    // Check if all items are fully received
    for (const item of order.items) {
      if (item.receivedQty < item.orderedQty) { allReceived = false; break; }
    }

    if (!anyReceived)
      return res.status(400).json({ success: false, message: 'No valid quantities to receive' });

    order.status       = allReceived ? 'Received' : 'Partially Received';
    order.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
    await order.save();

    await syncSupplierTotals(req.storeId, order.supplier.name);

    res.json({ success: true, order, message: `Stock updated — order ${order.status}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── RECORD PAYMENT ── */
exports.recordPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const pay = Number(amount);
    if (order.amountPaid + pay > order.totalAmount)
      return res.status(400).json({ success: false, message: 'Payment exceeds order total' });

    order.amountPaid += pay;
    await order.save();

    await syncSupplierTotals(req.storeId, order.supplier.name);

    res.json({ success: true, order, message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE STATUS / CANCEL ── */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await PurchaseOrder.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order, message: `Order ${status}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE ── */
exports.deleteOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'Received')
      return res.status(400).json({ success: false, message: 'Cannot delete a received order' });
    await PurchaseOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── STATS (for dashboard card) ── */
exports.getStats = async (req, res) => {
  try {
    const [pending, ordered, partial, totalUnpaid] = await Promise.all([
      PurchaseOrder.countDocuments({ status: 'Pending' }),
      PurchaseOrder.countDocuments({ status: 'Ordered' }),
      PurchaseOrder.countDocuments({ status: 'Partially Received' }),
      PurchaseOrder.aggregate([
        { $match: { paymentStatus: { $in: ['Unpaid', 'Partial'] } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', '$amountPaid'] } } } },
      ]),
    ]);
    res.json({
      success: true,
      stats: {
        pending, ordered, partial,
        totalUnpaid: totalUnpaid[0]?.total || 0,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};