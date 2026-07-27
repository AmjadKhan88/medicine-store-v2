const { GoogleGenerativeAI } = require('@google/generative-ai');
const DemandPrediction = require('../models/DemandPrediction');
const Medicine         = require('../models/Medicine');
const Bill             = require('../models/Bill');
const PurchaseOrder    = require('../models/PurchaseOrder');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ════════════════════════════════
   PAKISTAN SEASONALITY FACTORS
   Based on epidemiological patterns
════════════════════════════════ */
const PAKISTAN_SEASONALITY = {
  // category → monthly multipliers [Jan..Dec]
  Antibiotic:        [1.3,1.2,1.0,0.9,0.9,0.9,1.0,1.0,1.1,1.1,1.2,1.3],
  Analgesic:         [1.2,1.1,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.1,1.2],
  Antiviral:         [1.2,1.1,0.9,0.8,0.8,0.9,1.0,1.1,1.0,1.0,1.2,1.3],
  Respiratory:       [1.4,1.3,1.0,0.8,0.7,0.7,0.8,0.8,0.9,1.0,1.2,1.4],
  Gastrointestinal:  [0.8,0.8,0.9,1.0,1.2,1.3,1.4,1.4,1.3,1.1,0.9,0.8],  // summer/monsoon peak
  Cardiovascular:    [1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0],  // chronic — stable
  Diabetes:          [1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0],  // chronic — stable
  'Vitamin & Supplement': [1.1,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.1],
  Dermatological:    [0.9,0.9,1.0,1.1,1.2,1.3,1.3,1.2,1.1,1.0,0.9,0.9],  // summer rashes
  Antifungal:        [0.8,0.8,0.9,1.0,1.2,1.4,1.5,1.4,1.2,1.0,0.9,0.8],  // monsoon peak
  Neurological:      [1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0],
  Other:             [1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0],
};

const SEASON_NOTES = {
  1:  'Winter peak — respiratory, flu medicines in high demand',
  2:  'Winter tapering — antibiotics still elevated',
  3:  'Spring transition — demand normalizing',
  4:  'Pre-summer — Ramadan may affect patterns',
  5:  'Early summer — GI medicines rising, ORS demand starts',
  6:  'Peak summer — ORS, antidiarrheals, antiemetics at highest demand',
  7:  'Monsoon starts — malaria, typhoid, gastroenteritis medicines spike',
  8:  'Peak monsoon — vector-borne disease medicines critical',
  9:  'Monsoon tapering — GI still elevated',
  10: 'Post-monsoon — demand normalizing',
  11: 'Winter approaching — antibiotics, respiratory medicines rising',
  12: 'Winter peak — cough syrups, analgesics, antibiotics highest demand',
};

/* ── Weighted moving average (weights: last 3 months 3:2:1, rest equal) ── */
function weightedAverage(data) {
  if (!data.length) return 0;
  const sorted = [...data].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  if (sorted.length === 1) return sorted[0].qty;
  if (sorted.length === 2) return Math.round((sorted[1].qty * 2 + sorted[0].qty) / 3);
  if (sorted.length === 3) return Math.round((sorted[2].qty * 3 + sorted[1].qty * 2 + sorted[0].qty) / 6);

  // For 4+ months: last 3 weighted + rest averaged
  const recent = sorted.slice(-3);
  const older  = sorted.slice(0, -3);
  const recentWA = (recent[2].qty * 3 + recent[1].qty * 2 + recent[0].qty) / 6;
  const olderAvg = older.reduce((s, m) => s + m.qty, 0) / older.length;
  // Blend: 70% weighted recent, 30% older average
  return Math.round(recentWA * 0.7 + olderAvg * 0.3);
}

/* ── Trend detection ── */
function detectTrend(data) {
  if (data.length < 2) return { trend: 'Stable', trendPercent: 0 };
  const sorted = [...data].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  const last   = sorted[sorted.length - 1]?.qty || 0;
  const prev   = sorted[sorted.length - 2]?.qty || 0;
  const twoAgo = sorted[sorted.length - 3]?.qty || prev;

  const recentChange = prev > 0 ? ((last - prev) / prev) * 100 : 0;
  const olderChange  = twoAgo > 0 ? ((prev - twoAgo) / twoAgo) * 100 : 0;
  const avgChange    = (recentChange + olderChange) / 2;

  let trend = 'Stable';
  if (avgChange > 15)         trend = 'Rising';
  else if (avgChange < -15)   trend = 'Falling';
  else {
    // Check volatility
    const values = sorted.map(d => d.qty);
    const avg    = values.reduce((s,v)=>s+v,0)/values.length;
    const stdDev = Math.sqrt(values.reduce((s,v)=>s+(v-avg)**2,0)/values.length);
    const cv     = avg > 0 ? stdDev/avg : 0;
    if (cv > 0.4) trend = 'Volatile';
  }

  return { trend, trendPercent: Math.round(recentChange) };
}

/* ── Urgency calculator ── */
function calcUrgency(currentStock, predictedQty, daysLeft) {
  const coverage = predictedQty > 0 ? (currentStock / predictedQty) * 30 : 30;  // days
  if (currentStock <= 0 || coverage < 7)  return 'Critical';
  if (coverage < 14)                       return 'High';
  if (coverage < 21)                       return 'Medium';
  return 'Low';
}

/* ════════════════════════════════
   GET SALES HISTORY (last 12 months)
════════════════════════════════ */
async function getSalesHistory(storeId) {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const raw = await Bill.aggregate([
    { $match: { storeId, createdAt: { $gte: since } } },
    { $unwind: '$items' },
    { $group: {
      _id: {
        medicine:     '$items.medicine',
        medicineName: '$items.medicineName',
        year:  { $year:  '$createdAt' },
        month: { $month: '$createdAt' },
      },
      qty:     { $sum: '$items.quantity'  },
      revenue: { $sum: '$items.totalPrice'},
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Group by medicine
  const byMedicine = {};
  raw.forEach(r => {
    const key = r._id.medicine?.toString();
    if (!key) return;
    if (!byMedicine[key]) {
      byMedicine[key] = {
        medicineId:   r._id.medicine,
        medicineName: r._id.medicineName,
        history:      [],
      };
    }
    byMedicine[key].history.push({
      year:  r._id.year,
      month: r._id.month,
      qty:   r.qty,
      revenue: r.revenue,
    });
  });

  return byMedicine;
}

/* ════════════════════════════════
   GENERATE PREDICTIONS
════════════════════════════════ */
exports.generatePredictions = async (req, res) => {
  try {
    const { targetMonth, targetYear, useAI = false } = req.body;

    const tMonth = Number(targetMonth || new Date().getMonth() + 2);  // next month default
    const tYear  = Number(targetYear  || (tMonth > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear()));
    const month  = tMonth > 12 ? 1 : tMonth;
    const year   = tMonth > 12 ? tYear : tYear;

    // Get all medicines for this store
    const medicines = await Medicine.find({ storeId: req.storeId, isActive: true })
      .select('name category stock minStock purchasePrice salePrice')
      .lean();

    if (!medicines.length)
      return res.status(400).json({ success: false, message: 'No active medicines found' });

    // Get 12-month sales history
    const salesHistory = await getSalesHistory(req.storeId);
    const monthIdx     = month - 1;  // 0-indexed for arrays

    const predictions = [];
    const medicinesWithData = [];

    for (const med of medicines) {
      const medId = med._id.toString();
      const hist  = salesHistory[medId];
      if (!hist || hist.history.length < 2) continue;  // need at least 2 months of data

      const category    = med.category || 'Other';
      const seasonTable = PAKISTAN_SEASONALITY[category] || PAKISTAN_SEASONALITY.Other;
      const seasonal    = seasonTable[monthIdx];

      const baseQty      = weightedAverage(hist.history);
      const predictedQty = Math.max(1, Math.round(baseQty * seasonal));
      const { trend, trendPercent } = detectTrend(hist.history);

      const totalSales   = hist.history.reduce((s, h) => s + h.qty, 0);
      const avgMonthly   = Math.round(totalSales / hist.history.length);
      const dailyAvg     = predictedQty / 30;
      const daysOfStock  = dailyAvg > 0 ? Math.round(med.stock / dailyAvg) : 99;

      // Suggest order quantity = predicted demand + safety stock (20%) - current stock
      const safety          = Math.ceil(predictedQty * 0.2);
      const suggestedOrder  = Math.max(0, predictedQty + safety - med.stock);
      const urgency         = calcUrgency(med.stock, predictedQty, daysOfStock);

      // Suggest order date: 14 days before month starts
      const suggestedDate = new Date(year, month - 1, 1);
      suggestedDate.setDate(suggestedDate.getDate() - 14);

      // Confidence interval (±25% for high variance, ±15% for stable)
      const spread = trend === 'Volatile' ? 0.25 : trend === 'Stable' ? 0.15 : 0.20;
      const lower  = Math.max(0, Math.round(predictedQty * (1 - spread)));
      const upper  = Math.round(predictedQty * (1 + spread));

      const confidence = hist.history.length >= 6 ? 'High' : hist.history.length >= 3 ? 'Medium' : 'Low';

      medicinesWithData.push({
        medicineId:  med._id,
        medicineName:med.name,
        category,
        seasonal, trend, trendPercent, predictedQty, totalSales, avgMonthly,
        currentStock: med.stock, suggestedOrder, urgency, daysOfStock,
        purchasePrice: med.purchasePrice,
        historicalData: hist.history,
      });

      predictions.push({
        storeId:      req.storeId,
        medicine:     med._id,
        medicineName: med.name,
        category,
        targetMonth:  month,
        targetYear:   year,
        historicalData: hist.history,
        avgMonthlySales: avgMonthly,
        totalSales12m:   totalSales,
        predictedQty,
        confidenceInterval: { lower, upper },
        trend,
        trendPercent,
        seasonalityFactor: seasonal,
        seasonalNote: SEASON_NOTES[month],
        currentStock:      med.stock,
        suggestedOrderQty: suggestedOrder,
        suggestedOrderDate: suggestedDate,
        daysOfStockLeft:   daysOfStock,
        urgency,
        confidence,
        generatedAt: new Date(),
      });
    }

    /* ── AI Enhancement (top 25 medicines by urgency/volume) ── */
    let aiInsights = {};
    if (useAI && medicinesWithData.length > 0) {
      try {
        const model   = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const top25   = [...medicinesWithData]
          .sort((a, b) => {
            const urgScore = { Critical:4, High:3, Medium:2, Low:1 };
            return (urgScore[b.urgency] - urgScore[a.urgency]) || (b.predictedQty - a.predictedQty);
          })
          .slice(0, 25);

        const prompt = `You are a pharmacy inventory AI for a Pakistani pharmacy.
Analyze these medicine demand predictions for ${MONTH_NAMES[monthIdx]} ${year}:

${top25.map(m =>
  `${m.medicineName} (${m.category}): Predicted ${m.predictedQty} units, Stock ${m.currentStock}, Trend: ${m.trend} ${m.trendPercent > 0 ? '+' : ''}${m.trendPercent}%, Urgency: ${m.urgency}`
).join('\n')}

For each medicine, provide a 1-2 sentence insight considering:
- Pakistan seasonal patterns (${SEASON_NOTES[month]})
- Disease burden (dengue/malaria in monsoon, respiratory in winter)
- Generic vs brand availability
- Patient affordability in Pakistan

Return ONLY valid JSON (no markdown):
{
  "insights": {
    "MedicineName": "insight text",
    ...
  },
  "topPriorities": ["Medicine1","Medicine2","Medicine3"],
  "seasonalAlert": "Overall seasonal advice for this month in Pakistan"
}`;

        const result  = await model.generateContent(prompt);
        const raw     = result.response.text().trim();
        const fence   = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = fence ? fence[1] : raw;
        const match   = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          aiInsights = parsed;

          // Attach insights to predictions
          predictions.forEach(p => {
            if (parsed.insights?.[p.medicineName]) {
              p.aiInsight = parsed.insights[p.medicineName];
            }
          });
        }
      } catch (aiErr) {
        console.warn('[DemandAI] AI enhancement failed (non-fatal):', aiErr.message);
      }
    }

    /* ── Upsert predictions to DB ── */
    let saved = 0;
    for (const pred of predictions) {
      await DemandPrediction.findOneAndUpdate(
        { storeId: req.storeId, medicine: pred.medicine, targetMonth: month, targetYear: year },
        { $set: pred },
        { upsert: true, new: true }
      );
      saved++;
    }

    res.json({
      success: true,
      generated: saved,
      targetMonth: month,
      targetYear:  year,
      monthName:   MONTH_NAMES[month - 1],
      seasonalNote: SEASON_NOTES[month],
      aiInsights,
      message: `${saved} predictions generated for ${MONTH_NAMES[month - 1]} ${year}`,
    });
  } catch (err) {
    console.error('[DemandPrediction] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════
   GET PREDICTIONS
════════════════════════════════ */
exports.getPredictions = async (req, res) => {
  try {
    const { month, year, urgency, category, sortBy = 'urgency', page = 1, limit = 50 } = req.query;

    const tMonth = Number(month || new Date().getMonth() + 2);
    const tYear  = Number(year  || new Date().getFullYear());
    const m      = tMonth > 12 ? 1 : tMonth;
    const y      = tMonth > 12 ? tYear + 1 : tYear;

    const query = { storeId: req.storeId, targetMonth: m, targetYear: y };
    if (urgency)  query.urgency  = urgency;
    if (category) query.category = category;

    const sortMap = {
      urgency:  { urgency: -1, predictedQty: -1 },
      qty:      { predictedQty: -1 },
      stock:    { daysOfStockLeft: 1 },
      trend:    { trendPercent: -1 },
      accuracy: { accuracyPct: 1 },
    };
    const sort = sortMap[sortBy] || sortMap.urgency;

    const result = await DemandPrediction.paginate(query, {
      page:  Number(page),
      limit: Number(limit),
      sort,
      lean:  true,
      leanWithId: false,
    });

    /* ── Summary stats ── */
    const allPreds = await DemandPrediction.find(query).lean();
    const summary = {
      total:          allPreds.length,
      critical:       allPreds.filter(p => p.urgency === 'Critical').length,
      high:           allPreds.filter(p => p.urgency === 'High').length,
      rising:         allPreds.filter(p => p.trend   === 'Rising').length,
      totalOrderQty:  allPreds.reduce((s,p) => s + (p.suggestedOrderQty || 0), 0),
      totalOrderValue:allPreds.reduce((s,p) => {
        // Fetch price from prediction or estimate
        return s + (p.suggestedOrderQty || 0) * 50; // ₨50 avg — replaced by actual in frontend
      }, 0),
      monthName:      MONTH_NAMES[m - 1],
      targetMonth:    m,
      targetYear:     y,
      seasonalNote:   SEASON_NOTES[m],
    };

    res.json({
      success: true,
      predictions: result.docs,
      total:       result.totalDocs,
      totalPages:  result.totalPages,
      page:        result.page,
      summary,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════════════════════════════
   UPDATE ACTUAL (after month ends)
════════════════════════════════ */
exports.updateActual = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year required' });

    // Aggregate actual sales for that month
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end   = new Date(Number(year), Number(month), 0, 23, 59, 59);

    const actual = await Bill.aggregate([
      { $match: { storeId: req.storeId, createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.medicine', actualQty: { $sum: '$items.quantity' } } },
    ]);

    const actualMap = Object.fromEntries(actual.map(a => [a._id.toString(), a.actualQty]));

    let updated = 0;
    const preds  = await DemandPrediction.find({
      storeId: req.storeId, targetMonth: Number(month), targetYear: Number(year),
    });

    for (const pred of preds) {
      const actual = actualMap[pred.medicine.toString()] || 0;
      pred.actualQty = actual;

      if (pred.predictedQty > 0) {
        const error       = Math.abs(pred.predictedQty - actual);
        pred.accuracyPct  = Math.round((1 - error / Math.max(pred.predictedQty, actual)) * 100);
        pred.wasAccurate  = pred.accuracyPct >= 80;
      }
      await pred.save();
      updated++;
    }

    const avgAccuracy = preds.filter(p => p.accuracyPct != null).reduce((s, p) => s + p.accuracyPct, 0)
      / (preds.filter(p => p.accuracyPct != null).length || 1);

    res.json({
      success: true,
      updated,
      avgAccuracy: Math.round(avgAccuracy),
      message: `Actuals updated for ${MONTH_NAMES[Number(month)-1]} ${year}. Avg accuracy: ${Math.round(avgAccuracy)}%`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════════════════════════════
   CREATE PURCHASE ORDER FROM PREDICTIONS
════════════════════════════════ */
exports.createPO = async (req, res) => {
  try {
    const { month, year, urgencyFilter, supplierName = 'Auto-generated Supplier', medicineIds } = req.body;

    const query = {
      storeId:     req.storeId,
      targetMonth: Number(month),
      targetYear:  Number(year),
      suggestedOrderQty: { $gt: 0 },
    };

    if (urgencyFilter && urgencyFilter !== 'All') query.urgency = urgencyFilter;
    if (medicineIds?.length) query.medicine = { $in: medicineIds };

    const preds     = await DemandPrediction.find(query)
      .populate('medicine', 'purchasePrice name')
      .lean();

    if (!preds.length)
      return res.status(400).json({ success: false, message: 'No medicines qualify for a purchase order' });

    const items = preds.map(p => ({
      medicine:    p.medicine._id,
      medicineName:p.medicineName,
      orderedQty:  p.suggestedOrderQty,
      receivedQty: 0,
      unitCost:    p.medicine?.purchasePrice || 0,
      totalCost:   (p.medicine?.purchasePrice || 0) * p.suggestedOrderQty,
    }));

    const PurchaseOrder = require('../models/PurchaseOrder');
    const totalAmount   = items.reduce((s, i) => s + i.totalCost, 0);

    const po = await PurchaseOrder.create({
      storeId: req.storeId,
      supplier: { name: supplierName },
      items,
      totalAmount,
      status: 'Pending',
      notes: `AI-generated from demand predictions for ${MONTH_NAMES[Number(month)-1]} ${year}`,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      po,
      message: `PO created — ${items.length} medicines, total ₨${totalAmount.toLocaleString()}`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════════════════════════════
   ACCURACY HISTORY (model performance)
════════════════════════════════ */
exports.getAccuracyHistory = async (req, res) => {
  try {
    const history = await DemandPrediction.aggregate([
      { $match: { storeId: req.storeId, accuracyPct: { $exists: true } } },
      { $group: {
        _id:          { month: '$targetMonth', year: '$targetYear' },
        avgAccuracy:  { $avg: '$accuracyPct' },
        total:        { $sum: 1 },
        accurate:     { $sum: { $cond: ['$wasAccurate', 1, 0] } },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      history: history.map(h => ({
        label:       `${MONTH_NAMES[h._id.month - 1]} ${h._id.year}`,
        month:       h._id.month,
        year:        h._id.year,
        avgAccuracy: Math.round(h.avgAccuracy),
        total:       h.total,
        accurate:    h.accurate,
        hitRate:     Math.round((h.accurate / h.total) * 100),
      })),
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Get stats ── */
exports.getStats = async (req, res) => {
  try {
    const now    = new Date();
    const month  = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
    const year   = now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear();

    const [preds, accuracy] = await Promise.all([
      DemandPrediction.find({ storeId: req.storeId, targetMonth: month, targetYear: year }).lean(),
      DemandPrediction.aggregate([
        { $match: { storeId: req.storeId, accuracyPct: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$accuracyPct' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        nextMonthPredictions: preds.length,
        critical:   preds.filter(p => p.urgency === 'Critical').length,
        high:       preds.filter(p => p.urgency === 'High').length,
        rising:     preds.filter(p => p.trend === 'Rising').length,
        avgAccuracy:Math.round(accuracy[0]?.avg || 0),
        totalTracked: accuracy[0]?.count || 0,
        monthName:  MONTH_NAMES[month - 1],
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};