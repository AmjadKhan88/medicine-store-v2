const mongoose = require('mongoose');

const diagnosisSessionSchema = new mongoose.Schema({
  storeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patient:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  patientName:   { type: String },
  patientAge:    { type: Number },
  patientGender: { type: String },
  chiefComplaint:{ type: String, required: true },

  clinicalData:  { type: mongoose.Schema.Types.Mixed },   // full input snapshot
  lastAnalysis:  { type: mongoose.Schema.Types.Mixed },   // most recent AI output

  conversationHistory: [{
    role:      { type: String, enum: ['user','model'] },
    content:   { type: String },
    timestamp: { type: Date, default: Date.now },
  }],

  hasRedFlags: { type: Boolean, default: false },
  hasReferral: { type: Boolean, default: false },

  doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorName:  { type: String },
}, { timestamps: true });

diagnosisSessionSchema.index({ storeId: 1, createdAt: -1 });
module.exports = mongoose.model('DiagnosisSession', diagnosisSessionSchema);