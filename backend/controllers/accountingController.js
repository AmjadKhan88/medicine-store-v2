const Expense  = require('../models/Expense');
const Bill     = require('../models/Bill');
const Medicine = require('../models/Medicine');
const PurchaseOrder = require('../models/PurchaseOrder');

/* ── Date range helper ── */
const getRange = (from, to, month, year) => {
  let start, end;

  if (month && year) {
    start = new Date(Number(year), Number(month) - 1, 1);
    end   = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
  } else if (year && !month) {
    start = new Date(Number(year), 0, 1);
    end   = new Date(Number(year), 11, 31, 23, 59, 59, 999);
  } else if (from && to) {
    start = new Date(from);
    end   = new Date(to); end.setHours(23, 59, 59, 999);
  } else {
    // Default: current month
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { start, end };
};

/* ════════ EXPENSES ════════ */

/* ── GET all expenses ── */
exports.getExpenses = async (req, res) => {
  try {
    const { category, from, to, month, year, search, page = 1, limit = 30 } = req.query;
    const { start, end } = getRange(from, to, month, year);

    const query = { storeId: req.storeId, date: { $gte: start, $lte: end } };
    if (category) query.category = category;
    if (search)   query.$or = [
      { title:       { $regex: search, $options: 'i' } },
      { vendor:      { $regex: search, $options: 'i' } },
      { referenceNo: { $regex: search, $options: 'i' } },
    ];

    const result = await Expense.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { date: -1 },
      lean: true, leanWithId: false,
    });

    // Category totals
    const categoryTotals = await Expense.aggregate([
      { $match: { storeId: req.storeId, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const totalExpenses = categoryTotals.reduce((s, c) => s + c.total, 0);

    res.json({
      success: true,
      expenses:       result.docs,
      total:          result.totalDocs,
      totalPages:     result.totalPages,
      categoryTotals,
      totalExpenses,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ADD expense ── */
exports.addExpense = async (req, res) => {
  try {
    const {
      title, category, amount, date, paymentMethod,
      vendor, referenceNo, invoiceNo,
      isGSTApplicable, gstRate, ntn,
      isRecurring, recurringCycle, notes,
    } = req.body;

    if (!title || !category || !amount || !date)
      return res.status(400).json({ success: false, message: 'Title, category, amount and date required' });

    const gst = isGSTApplicable ? Math.round(Number(amount) * (Number(gstRate || 18) / 100)) : 0;

    const expense = await Expense.create({
      storeId:     req.storeId,
      title:       title.trim(),
      category,
      amount:      Number(amount),
      date:        new Date(date),
      paymentMethod: paymentMethod || 'Cash',
      vendor:      vendor?.trim()     || '',
      referenceNo: referenceNo?.trim()|| '',
      invoiceNo:   invoiceNo?.trim()  || '',
      isGSTApplicable: !!isGSTApplicable,
      gstRate:     Number(gstRate || 18),
      gstAmount:   gst,
      ntn:         ntn?.trim() || '',
      isRecurring: !!isRecurring,
      recurringCycle: isRecurring ? (recurringCycle || 'Monthly') : '',
      notes:       notes || '',
      addedBy:     req.user._id,
      addedByName: req.user.name,
    });

    res.status(201).json({ success: true, expense, message: `Expense "${title}" added — ₨${Number(amount).toLocaleString()}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE expense ── */
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body,
      { new: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, expense, message: 'Expense updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE expense ── */
exports.deleteExpense = async (req, res) => {
  try {
    await Expense.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ P&L STATEMENT ════════ */
exports.getPnL = async (req, res) => {
  try {
    const { from, to, month, year } = req.query;
    const { start, end } = getRange(from, to, month, year);

    /* ── Revenue ── */
    const billAgg = await Bill.aggregate([
      { $match: { storeId: req.storeId, createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id: null,
        grossRevenue:  { $sum: '$totalAmount' },
        totalCollected:{ $sum: '$amountPaid' },
        totalDiscount: { $sum: '$discount' },
        totalTax:      { $sum: '$tax' },
        billCount:     { $sum: 1 },
      }},
    ]);

    const rev = billAgg[0] || { grossRevenue:0, totalCollected:0, totalDiscount:0, totalTax:0, billCount:0 };

    /* ── COGS — from bill items × purchase price ── */
    const billItems = await Bill.aggregate([
      { $match: { storeId: req.storeId, createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.medicine',
        medicineName: { $first: '$items.medicineName' },
        qtySold:      { $sum: '$items.quantity'  },
        revenue:      { $sum: '$items.totalPrice' },
      }},
    ]);

    // Get purchase prices for COGS calculation
    const medicineIds = billItems.map(i => i._id).filter(Boolean);
    const medicines   = await Medicine.find({ _id: { $in: medicineIds } }).select('purchasePrice').lean();
    const priceMap    = Object.fromEntries(medicines.map(m => [m._id.toString(), m.purchasePrice || 0]));

    let cogs = 0;
    const itemsWithMargin = billItems.map(item => {
      const purchasePrice = priceMap[item._id?.toString()] || 0;
      const itemCOGS      = purchasePrice * item.qtySold;
      cogs += itemCOGS;
      const margin = item.revenue > 0 ? Math.round(((item.revenue - itemCOGS) / item.revenue) * 100) : 0;
      return { ...item, purchasePrice, cogs: itemCOGS, grossProfit: item.revenue - itemCOGS, margin };
    });

    const grossProfit  = rev.grossRevenue - cogs;
    const grossMargin  = rev.grossRevenue > 0 ? Math.round((grossProfit / rev.grossRevenue) * 100) : 0;

    /* ── Expenses ── */
    const expenseAgg = await Expense.aggregate([
      { $match: { storeId: req.storeId, date: { $gte: start, $lte: end } } },
      { $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      }},
      { $sort: { total: -1 } },
    ]);

    const totalExpenses = expenseAgg.reduce((s, e) => s + e.total, 0);
    const netProfit     = grossProfit - totalExpenses;
    const netMargin     = rev.grossRevenue > 0 ? Math.round((netProfit / rev.grossRevenue) * 100) : 0;

    /* ── Payment method breakdown ── */
    const paymentBreakdown = await Bill.aggregate([
      { $match: { storeId: req.storeId, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$paymentMethod', amount: { $sum: '$amountPaid' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
    ]);

    /* ── Unpaid / outstanding ── */
    const outstanding = await Bill.aggregate([
      { $match: { storeId: req.storeId, paymentStatus: { $in: ['Partial','Pending'] }, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount','$amountPaid'] } }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      period:  { start, end },
      pnl: {
        /* Revenue */
        grossRevenue:   rev.grossRevenue,
        totalDiscount:  rev.totalDiscount,
        totalTax:       rev.totalTax,
        netRevenue:     rev.grossRevenue - rev.totalDiscount,
        totalCollected: rev.totalCollected,
        billCount:      rev.billCount,
        outstanding:    outstanding[0]?.total || 0,

        /* COGS & Gross Profit */
        cogs,
        grossProfit,
        grossMargin,

        /* Operating Expenses */
        totalExpenses,
        expensesByCategory: expenseAgg,

        /* Net Profit */
        netProfit,
        netMargin,

        /* Breakdown */
        paymentBreakdown,
        topMedicinesByMargin: itemsWithMargin
          .sort((a,b) => b.grossProfit - a.grossProfit)
          .slice(0, 15),
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ GROSS MARGIN PER MEDICINE ════════ */
exports.getMedicineMargins = async (req, res) => {
  try {
    const { from, to, month, year, category, limit = 50 } = req.query;
    const { start, end } = getRange(from, to, month, year);

    const billItems = await Bill.aggregate([
      { $match: { storeId: req.storeId, createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$items' },
      { $group: {
        _id:          '$items.medicine',
        medicineName: { $first: '$items.medicineName' },
        qtySold:      { $sum: '$items.quantity'   },
        revenue:      { $sum: '$items.totalPrice' },
        avgSalePrice: { $avg: { $divide: ['$items.totalPrice','$items.quantity'] } },
      }},
      { $sort: { revenue: -1 } },
      { $limit: Number(limit) },
    ]);

    const medicineIds = billItems.map(i => i._id).filter(Boolean);
    const medicines   = await Medicine.find({ _id: { $in: medicineIds } })
      .select('purchasePrice category')
      .lean();
    const medMap = Object.fromEntries(medicines.map(m => [m._id.toString(), m]));

    const result = billItems.map(item => {
      const med           = medMap[item._id?.toString()] || {};
      const purchasePrice = med.purchasePrice || 0;
      const totalCOGS     = purchasePrice * item.qtySold;
      const grossProfit   = item.revenue - totalCOGS;
      const margin        = item.revenue > 0 ? Math.round((grossProfit / item.revenue) * 100) : 0;
      return {
        medicineId:   item._id,
        medicineName: item.medicineName,
        category:     med.category || 'Other',
        qtySold:      item.qtySold,
        revenue:      Math.round(item.revenue),
        purchasePrice,
        avgSalePrice: Math.round(item.avgSalePrice || 0),
        totalCOGS:    Math.round(totalCOGS),
        grossProfit:  Math.round(grossProfit),
        margin,
      };
    }).filter(item => !category || item.category === category);

    res.json({ success: true, medicines: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ MONTHLY TREND ════════ */
exports.getMonthlyTrend = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const start = new Date(Number(year), 0, 1);
    const end   = new Date(Number(year), 11, 31, 23, 59, 59);

    const [revenueByMonth, expensesByMonth] = await Promise.all([
      Bill.aggregate([
        { $match: { storeId: req.storeId, createdAt: { $gte: start, $lte: end } } },
        { $group: {
          _id:   { month: { $month: '$createdAt' } },
          revenue:  { $sum: '$totalAmount' },
          collected:{ $sum: '$amountPaid'  },
          bills:    { $sum: 1              },
        }},
        { $sort: { '_id.month': 1 } },
      ]),
      Expense.aggregate([
        { $match: { storeId: req.storeId, date: { $gte: start, $lte: end } } },
        { $group: {
          _id:     { month: { $month: '$date' } },
          expenses:{ $sum: '$amount' },
        }},
        { $sort: { '_id.month': 1 } },
      ]),
    ]);

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const revMap  = Object.fromEntries(revenueByMonth.map(r => [r._id.month, r]));
    const expMap  = Object.fromEntries(expensesByMonth.map(e => [e._id.month, e.expenses]));

    const trend = MONTHS.map((name, i) => {
      const m   = i + 1;
      const rev = revMap[m] || { revenue:0, collected:0, bills:0 };
      const exp = expMap[m] || 0;
      return {
        month:     name,
        revenue:   rev.revenue,
        collected: rev.collected,
        expenses:  exp,
        profit:    rev.revenue - exp,
        bills:     rev.bills,
      };
    });

    res.json({ success: true, year, trend });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ FBR TAX SUMMARY ════════ */
exports.getFBRSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const { start, end }  = getRange(null, null, month, year);

    /* ── Sales tax (GST) on revenue ── */
    const salesTax = await Bill.aggregate([
      { $match: { storeId: req.storeId, createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalTax:     { $sum: '$tax'         },
        billCount:    { $sum: 1              },
      }},
    ]);

    /* ── Input tax on purchases (GST paid to suppliers) ── */
    const inputTax = await Expense.aggregate([
      { $match: { storeId: req.storeId, isGSTApplicable: true, date: { $gte: start, $lte: end } } },
      { $group: {
        _id: null,
        totalExpenses: { $sum: '$amount'    },
        totalGSTPaid:  { $sum: '$gstAmount' },
        invoiceCount:  { $sum: 1            },
      }},
    ]);

    const rev       = salesTax[0]  || { totalRevenue:0, totalTax:0, billCount:0 };
    const inp       = inputTax[0]  || { totalExpenses:0, totalGSTPaid:0, invoiceCount:0 };

    /* ── Expense GST breakdown by vendor ── */
    const gstByVendor = await Expense.aggregate([
      { $match: { storeId: req.storeId, isGSTApplicable: true, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$vendor', totalGST: { $sum: '$gstAmount' }, invoices: { $sum: 1 }, ntn: { $first: '$ntn' } } },
      { $sort: { totalGST: -1 } },
    ]);

    const netTaxPayable = (rev.totalTax || 0) - (inp.totalGSTPaid || 0);

    res.json({
      success: true,
      period:  { start, end },
      fbr: {
        outputTax:   rev.totalTax    || 0,    // GST collected from customers
        inputTax:    inp.totalGSTPaid|| 0,    // GST paid to vendors
        netTaxPayable: Math.max(0, netTaxPayable),
        excessCredit:  Math.max(0, -netTaxPayable),
        totalRevenue:  rev.totalRevenue || 0,
        billCount:     rev.billCount    || 0,
        expenseWithGST:inp.totalExpenses|| 0,
        gstInvoiceCount:inp.invoiceCount|| 0,
        gstByVendor,
        stdGSTRate:   18,                     // Pakistan standard GST rate
        note:         'For FBR IRIS portal filing. Consult a tax advisor for final submission.',
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ DASHBOARD STATS ════════ */
exports.getStats = async (req, res) => {
  try {
    const now         = new Date();
    const monthStart  = new Date(now.getFullYear(), now.getMonth(),     1);
    const monthEnd    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const prevStart   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd     = new Date(now.getFullYear(), now.getMonth(),     0, 23, 59, 59);

    const calc = async (start, end) => {
      const [rev, exp] = await Promise.all([
        Bill.aggregate([
          { $match: { storeId: req.storeId, createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: null, revenue: { $sum: '$totalAmount' }, collected: { $sum: '$amountPaid' } } },
        ]),
        Expense.aggregate([
          { $match: { storeId: req.storeId, date: { $gte: start, $lte: end } } },
          { $group: { _id: null, expenses: { $sum: '$amount' } } },
        ]),
      ]);
      const r = rev[0] || { revenue:0, collected:0 };
      const e = exp[0]?.expenses || 0;
      return { revenue: r.revenue, collected: r.collected, expenses: e, profit: r.revenue - e };
    };

    const [current, previous] = await Promise.all([calc(monthStart, monthEnd), calc(prevStart, prevEnd)]);

    const change = (curr, prev) =>
      prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

    res.json({
      success: true,
      stats: {
        thisMonth:    current,
        lastMonth:    previous,
        changes: {
          revenue:  change(current.revenue,  previous.revenue),
          expenses: change(current.expenses, previous.expenses),
          profit:   change(current.profit,   previous.profit),
        },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};