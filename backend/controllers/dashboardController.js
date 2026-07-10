const Medicine = require('../models/Medicine');
const Patient = require('../models/Patient');
const Bill = require('../models/Bill');

exports.getDashboard = async (req, res) => {
  try {
    const storeId = req.storeId;
    const now = new Date();
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const [
      totalMedicines, totalPatients, expiredMedicines, expiringSoon,
      lowStockMedicines, todayBills, monthBills, pendingBills,
      totalOutstanding,
    ] = await Promise.all([
      Medicine.countDocuments({ isActive: true,storeId }),
      Patient.countDocuments({ isActive: true, storeId }),
      Medicine.countDocuments({ isActive: true, storeId, expiryDate: { $lt: now } }),
      Medicine.countDocuments({ isActive: true, storeId, expiryDate: { $gte: now, $lte: thirtyDays } }),
      Medicine.countDocuments({ isActive: true, storeId, $expr: { $lte: ['$stock', '$minStock'] } }),
      Bill.aggregate([{ $match: {storeId, createdAt: { $gte: startOfDay } } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalAmount' } } }]),
      Bill.aggregate([{ $match: {storeId, createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalAmount' }, paid: { $sum: '$amountPaid' } } }]),
      Bill.countDocuments({storeId, paymentStatus: { $in: ['Pending', 'Partial'] } }),
      Bill.aggregate([{ $match: {storeId, paymentStatus: { $in: ['Pending', 'Partial'] } } }, { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', '$amountPaid'] } } } }]),
    ]);

    // Monthly revenue for last 6 months
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Bill.aggregate([
      { $match: {storeId, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Top selling medicines
    const topMedicines = await Bill.aggregate([
      { $match: { storeId } },
      { $unwind: '$items' },
      { $group: { _id: '$items.medicineName', totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.totalPrice' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
    ]);

    // Category distribution
    const categoryDist = await Medicine.aggregate([
      { $match: { isActive: true, storeId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalMedicines,
        totalPatients,
        expiredMedicines,
        expiringSoon,
        lowStockMedicines,
        todaySales: todayBills[0] || { count: 0, total: 0 },
        monthlySales: monthBills[0] || { count: 0, total: 0, paid: 0 },
        pendingBills,
        totalOutstanding: totalOutstanding[0]?.total || 0,
      },
      monthlyRevenue,
      topMedicines,
      categoryDist,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Advanced Sales Report with date range + top patients ── */
exports.getAdvancedReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to current month if no dates given
    let from = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let to   = endDate   ? new Date(endDate)   : new Date();
    to.setHours(23, 59, 59, 999);
    from.setHours(0, 0, 0, 0);

    const dateMatch = { storeId: req.storeId, createdAt: { $gte: from, $lte: to } };

    const [
      summary,
      topPatients,
      topMedicines,
      paymentMethodBreakdown,
      dailyTrend,
      categoryBreakdown,
    ] = await Promise.all([

      // Overall summary: revenue collected vs outstanding
      Bill.aggregate([
        { $match: dateMatch },
        { $group: {
          _id: null,
          totalBills:      { $sum: 1 },
          totalRevenue:    { $sum: '$totalAmount' },
          totalCollected:  { $sum: '$amountPaid' },
          totalDiscount:   { $sum: '$discount' },
          totalTax:        { $sum: '$tax' },
        } },
      ]),

      // Top patients by total spending in this period
      Bill.aggregate([
        { $match: dateMatch },
        { $group: {
          _id:          '$patient',
          patientName:  { $first: '$patientName' },
          totalSpent:   { $sum: '$totalAmount' },
          totalPaid:    { $sum: '$amountPaid' },
          billCount:    { $sum: 1 },
        } },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
      ]),

      // Top selling medicines in this period
      Bill.aggregate([
        { $match: dateMatch },
        { $unwind: '$items' },
        { $group: {
          _id:          '$items.medicineName',
          totalQty:     { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
        } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]),

      // Payment method breakdown
      Bill.aggregate([
        { $match: dateMatch },
        { $group: {
          _id:    '$paymentMethod',
          count:  { $sum: 1 },
          amount: { $sum: '$amountPaid' },
        } },
      ]),

      // Daily revenue trend (for the chart)
      Bill.aggregate([
        { $match: dateMatch },
        { $group: {
          _id: {
            year:  { $year:      '$createdAt' },
            month: { $month:     '$createdAt' },
            day:   { $dayOfMonth:'$createdAt' },
          },
          revenue:   { $sum: '$totalAmount' },
          collected: { $sum: '$amountPaid' },
          count:     { $sum: 1 },
        } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      // Category-wise revenue
      Bill.aggregate([
        { $match: dateMatch },
        { $unwind: '$items' },
        { $lookup: {
          from: 'medicines',
          localField: 'items.medicine',
          foreignField: '_id',
          as: 'medInfo',
        } },
        { $unwind: { path: '$medInfo', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id:     { $ifNull: ['$medInfo.category', 'Other'] },
          revenue: { $sum: '$items.totalPrice' },
          qty:     { $sum: '$items.quantity' },
        } },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    const summaryData = summary[0] || {
      totalBills: 0, totalRevenue: 0, totalCollected: 0, totalDiscount: 0, totalTax: 0,
    };
    summaryData.totalOutstanding = summaryData.totalRevenue - summaryData.totalCollected;

    res.json({
      success: true,
      dateRange: { from, to },
      summary: summaryData,
      topPatients: topPatients.map(p => ({
        ...p,
        outstanding: p.totalSpent - p.totalPaid,
      })),
      topMedicines,
      paymentMethodBreakdown,
      dailyTrend,
      categoryBreakdown,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Get raw bill rows for export (CSV/PDF) within date range ── */
exports.getReportExportData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let from = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let to   = endDate   ? new Date(endDate)   : new Date();
    to.setHours(23, 59, 59, 999);
    from.setHours(0, 0, 0, 0);

    const bills = await Bill.find({
      storeId: req.storeId,
      createdAt: { $gte: from, $lte: to },
    })
      .populate('patient', 'patientId phone')
      .populate('createdBy', 'name')
      .sort({ createdAt: 1 });

    res.json({ success: true, bills, dateRange: { from, to } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};