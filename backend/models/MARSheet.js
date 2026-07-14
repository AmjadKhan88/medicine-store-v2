const mongoose = require('mongoose');

/* ── One MAR entry per scheduled dose ── */
const doseSchema = new mongoose.Schema({
  medicineOrderId: { type: mongoose.Schema.Types.ObjectId },
  medicineName:    { type: String, required: true },
  genericName:     { type: String },
  dosage:          { type: String },
  route:           { type: String },
  scheduledTime:   { type: String },  // "08:00"
  status:          {
    type: String,
    enum: ['Pending','Given','Skipped','Refused','Hold'],
    default: 'Pending',
  },
  administeredAt:  { type: Date },
  administeredBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  administeredByName: { type: String },
  notes:           { type: String },   // reason for skip/refuse
});

/* ── One MAR sheet per patient per day ── */
const marSheetSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  admission:   { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission', required: true, index: true },
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  date:        { type: String, required: true },  // "2025-01-15" — one sheet per day
  doses:       [doseSchema],
}, { timestamps: true });

marSheetSchema.index({ admission: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('MARSheet', marSheetSchema);