const mongoose = require('mongoose');

const medicineRequestSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Which patient / admission
  admission:   { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission', required: true },
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient',      required: true },
  patientName: { type: String, required: true },
  wardName:    { type: String },
  bedNumber:   { type: String },

  // What medicine
  medicineName:  { type: String, required: true },
  genericName:   { type: String },
  medicine:      { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', default: null },
  quantity:      { type: Number, required: true, min: 1, default: 1 },
  dosage:        { type: String },
  route:         { type: String },
  urgency:       { type: String, enum: ['Routine','Urgent','STAT'], default: 'Routine' },
  notes:         { type: String },

  // Status
  status:        { type: String, enum: ['Pending','Dispensed','Cancelled'], default: 'Pending' },
  requestedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedByName:{ type: String },
  dispensedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispensedByName:{ type: String },
  dispensedAt:   { type: Date },
  cancelledReason:{ type: String },
}, { timestamps: true });

medicineRequestSchema.index({ storeId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('MedicineRequest', medicineRequestSchema);