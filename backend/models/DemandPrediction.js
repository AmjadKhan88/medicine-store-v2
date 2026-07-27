const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const monthlyDataSchema = new mongoose.Schema({
  year:   { type: Number },
  month:  { type: Number },   // 1-12
  qty:    { type: Number, default: 0 },
  revenue:{ type: Number, default: 0 },
}, { _id: false });

const demandPredictionSchema = new mongoose.Schema({
  storeId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  medicine:     { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  category:     { type: String },

  /* ── Target period ── */
  targetMonth:  { type: Number, required: true },   // 1-12
  targetYear:   { type: Number, required: true },

  /* ── Historical data (last 12 months) ── */
  historicalData: [monthlyDataSchema],
  avgMonthlySales:{ type: Number, default: 0 },
  totalSales12m:  { type: Number, default: 0 },

  /* ── Prediction ── */
  predictedQty:       { type: Number, default: 0 },
  confidenceInterval: { lower: Number, upper: Number },
  trend:              { type: String, enum: ['Rising','Stable','Falling','Volatile'], default: 'Stable' },
  trendPercent:       { type: Number, default: 0 },   // % change vs last month
  seasonalityFactor:  { type: Number, default: 1 },   // multiplier
  seasonalNote:       { type: String },

  /* ── Order suggestion ── */
  currentStock:       { type: Number, default: 0 },
  suggestedOrderQty:  { type: Number, default: 0 },
  suggestedOrderDate: { type: Date },
  daysOfStockLeft:    { type: Number, default: 0 },
  urgency:            { type: String, enum: ['Critical','High','Medium','Low'], default: 'Low' },

  /* ── Accuracy tracking (filled after target month ends) ── */
  actualQty:     { type: Number },
  accuracyPct:   { type: Number },    // |predicted-actual|/actual * 100
  wasAccurate:   { type: Boolean },   // within 20% tolerance

  /* ── AI insight ── */
  aiInsight:     { type: String },
  confidence:    { type: String, enum: ['High','Medium','Low'], default: 'Medium' },

  generatedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

demandPredictionSchema.index({ storeId: 1, targetMonth: 1, targetYear: 1 });
demandPredictionSchema.index({ storeId: 1, medicine: 1, targetMonth: 1, targetYear: 1 }, { unique: true });
demandPredictionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('DemandPrediction', demandPredictionSchema);