const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema({
  month:     { type: Number, required: true },
  year:      { type: Number, required: true },
  amount:    { type: Number, required: true },
  paidFrom:  { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRecord' },
  paidAt:    { type: Date, default: Date.now },
  notes:     { type: String },
});

const advanceSchema = new mongoose.Schema({
  storeId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employee:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeName: { type: String, required: true },

  amount:       { type: Number, required: true, min: 1 },
  date:         { type: Date, required: true, default: Date.now },
  reason:       { type: String, required: true },

  /* ── Repayment plan ── */
  monthlyDeduction: { type: Number, default: 0 },  // deduct this per month from salary
  repaymentHistory: [repaymentSchema],
  amountRepaid:     { type: Number, default: 0 },
  status:           { type: String, enum: ['Outstanding','Partially Repaid','Fully Repaid'], default: 'Outstanding' },

  approvedBy:     { type: String },
  notes:          { type: String },
  addedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

advanceSchema.virtual('remainingBalance').get(function () {
  return Math.max(0, this.amount - this.amountRepaid);
});

advanceSchema.set('toJSON',   { virtuals: true });
advanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Advance', advanceSchema);