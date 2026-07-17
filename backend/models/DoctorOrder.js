const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/* ── Nurse acknowledgement ── */
const ackSchema = new mongoose.Schema({
  acknowledgedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  acknowledgedByName:{ type: String },
  acknowledgedAt:    { type: Date, default: Date.now },
  notes:             { type: String },
});

const doctorOrderSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  admission:   { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission', required: true, index: true },
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName: { type: String, required: true },
  wardName:    { type: String },
  bedNumber:   { type: String },

  /* ── Order details ── */
  orderType: {
    type: String,
    enum: ['Medicine','Investigation','Diet','Procedure','Nursing','Consultation','Restriction','Other'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['Routine','Urgent','STAT','One-Time'],
    default: 'Routine',
  },
  title:       { type: String, required: true },       // short summary e.g. "IV Paracetamol 1g"
  details:     { type: String },                        // full instruction
  frequency:   { type: String },                        // "Every 8 hours", "Once", "Ongoing"
  duration:    { type: String },                        // "3 days", "Until discharge"
  startDate:   { type: Date, default: Date.now },
  endDate:     { type: Date },

  /* ── Doctor info ── */
  orderedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderedByName:   { type: String },
  orderedAt:       { type: Date, default: Date.now },

  /* ── Status ── */
  status: {
    type: String,
    enum: ['Pending','Acknowledged','In-Progress','Completed','Cancelled','On-Hold'],
    default: 'Pending',
  },
  isActive:        { type: Boolean, default: true },

  /* ── Acknowledgement ── */
  acknowledgement: { type: ackSchema, default: null },

  /* ── Completion ── */
  completedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedByName: { type: String },
  completedAt:     { type: Date },
  completionNotes: { type: String },

  /* ── Cancellation ── */
  cancelledBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledByName: { type: String },
  cancelledAt:     { type: Date },
  cancellationReason: { type: String },

  /* ── Modification history ── */
  modifiedBy:      { type: String },
  modifiedAt:      { type: Date },
  originalDetails: { type: String },    // stores previous details on edit

  /* ── Linked entities ── */
  linkedMedicineOrder: { type: mongoose.Schema.Types.ObjectId },  // ref to IPD medicine order
  linkedLabTest:       { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest' },
}, { timestamps: true });

doctorOrderSchema.index({ storeId: 1, admission: 1, status: 1, createdAt: -1 });
doctorOrderSchema.index({ storeId: 1, status: 1, priority: 1 });
doctorOrderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('DoctorOrder', doctorOrderSchema);