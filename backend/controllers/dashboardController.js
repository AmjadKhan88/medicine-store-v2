const Medicine = require('../models/Medicine');
const Patient = require('../models/Patient');
const Bill = require('../models/Bill');

exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const [
      totalMedicines, totalPatients, expiredMedicines, expiringSoon,
      lowStockMedicines, todayBills, monthBills, pendingBills,
      totalOutstanding,
    ] = await Promise.all([
      Medicine.countDocuments({ isActive: true }),
      Patient.countDocuments({ isActive: true }),
      Medicine.countDocuments({ isActive: true, expiryDate: { $lt: now } }),
      Medicine.countDocuments({ isActive: true, expiryDate: { $gte: now, $lte: thirtyDays } }),
      Medicine.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$minStock'] } }),
      Bill.aggregate([{ $match: { createdAt: { $gte: startOfDay } } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalAmount' } } }]),
      Bill.aggregate([{ $match: { createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalAmount' }, paid: { $sum: '$amountPaid' } } }]),
      Bill.countDocuments({ paymentStatus: { $in: ['Pending', 'Partial'] } }),
      Bill.aggregate([{ $match: { paymentStatus: { $in: ['Pending', 'Partial'] } } }, { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', '$amountPaid'] } } } }]),
    ]);

    // Monthly revenue for last 6 months
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Bill.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Top selling medicines
    const topMedicines = await Bill.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.medicineName', totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.totalPrice' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
    ]);

    // Category distribution
    const categoryDist = await Medicine.aggregate([
      { $match: { isActive: true } },
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
