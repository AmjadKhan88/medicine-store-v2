const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Bill = require('../models/Bill');

// Sales report
router.get('/report', protect, async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    let groupBy, matchFrom = new Date();
    if (period === 'daily') { matchFrom.setDate(matchFrom.getDate() - 30); groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }; }
    else if (period === 'weekly') { matchFrom.setDate(matchFrom.getDate() - 84); groupBy = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } }; }
    else { matchFrom.setMonth(matchFrom.getMonth() - 12); groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }; }

    const data = await Bill.aggregate([
      { $match: { createdAt: { $gte: matchFrom } } },
      { $group: { _id: groupBy, revenue: { $sum: '$totalAmount' }, paid: { $sum: '$amountPaid' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
