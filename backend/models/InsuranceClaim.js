const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/* ── Each bill item submitted in the claim ── */
const claimItemSchema = new mongoose.Schema({
  description:    { type: String, required: true },
  quantity:       { type: Number, default: 1 },
  unitPrice:      { type: Number, required: true },
  totalPrice:     { type: Number, required: true },
  isApproved:     { type: Boolean, default: true },
  approvedAmount: { type: Number, default: 0 },
  rejectionReason:{ type: String },
  serviceType:    { type: String, enum: ['Medicine','Consultation','Lab Tests','Radiology','Procedure','Room','Other'], default: 'Medicine' },
});

const insuranceClaimSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  claimNumber: { type: String, unique: true },       // CLM-000001

  /* ── Links ── */
  panel:       { type: mongoose.Schema.Types.ObjectId, ref: 'InsurancePanel', required: true },
  panelName:   { type: String },
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName: { type: String },
  patientPolicyNumber:{ type: String },
  bill:        { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
  billNumber:  { type: String },
  admission:   { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission', default: null },

  /* ── Amounts ── */
  totalBillAmount:  { type: Number, required: true },
  claimAmount:      { type: Number, required: true },   // amount submitted to insurance
  patientPortion:   { type: Number, required: true },   // amount patient pays upfront
  approvedAmount:   { type: Number, default: 0 },       // approved by insurance
  paidAmount:       { type: Number, default: 0 },       // actually received from insurance
  outstandingFromInsurance:{ type: Number, default: 0 },// approvedAmount - paidAmount

  /* ── Items ── */
  items: [claimItemSchema],

  /* ── Status flow ── */
  status: {
    type: String,
    enum: ['Draft','Submitted','Under Review','Approved','Partially Approved','Rejected','Paid','Appealed'],
    default: 'Draft',
  },

  /* ── Timestamps ── */
  submittedAt:   { type: Date },
  reviewedAt:    { type: Date },
  approvedAt:    { type: Date },
  paidAt:        { type: Date },
  rejectedAt:    { type: Date },

  /* ── Notes ── */
  submissionNotes:  { type: String },
  approvalNotes:    { type: String },
  rejectionReason:  { type: String },
  appealNotes:      { type: String },

  /* ── Pre-authorization ── */
  preAuthRequired:  { type: Boolean, default: false },
  preAuthNumber:    { type: String },
  preAuthDate:      { type: Date },
  preAuthAmount:    { type: Number },

  /* ── Documents ── */
  attachments: [{ url: String, name: String, uploadedAt: Date }],

  /* ── Panel reference ── */
  panelClaimRef:{ type: String, trim: true },    // claim ref from insurance company
  chequeNumber: { type: String, trim: true },
  bankDetails:  { type: String, trim: true },

  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String },
}, { timestamps: true });

/* ── Auto-generate claim number ── */
insuranceClaimSchema.pre('save', async function (next) {
  if (!this.claimNumber) {
    const count = await mongoose.model('InsuranceClaim').countDocuments({ storeId: this.storeId });
    this.claimNumber = `CLM-${String(count + 1).padStart(6, '0')}`;
  }
  // Recalculate outstanding
  this.outstandingFromInsurance = Math.max(0, (this.approvedAmount || 0) - (this.paidAmount || 0));
  next();
});

insuranceClaimSchema.index({ storeId: 1, status: 1, createdAt: -1 });
insuranceClaimSchema.index({ storeId: 1, panel: 1, createdAt: -1 });
insuranceClaimSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);