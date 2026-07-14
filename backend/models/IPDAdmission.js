const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/* ── Medicine order written by doctor ── */
const medicineOrderSchema = new mongoose.Schema({
  medicine:     { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  medicineName: { type: String, required: true },
  genericName:  { type: String },
  dosage:       { type: String, required: true },      // e.g. "500mg"
  frequency:    {
    type: String,
    enum: ['Once daily','Twice daily','Three times daily',
           'Four times daily','Every 6 hours','Every 8 hours',
           'Every 4 hours','As needed','Stat (Immediately)'],
    default: 'Once daily',
  },
  route:        { type: String, enum: ['Oral','IV','IM','SC','Topical','Inhaled','Eye Drops','Ear Drops'], default: 'Oral' },
  scheduleTimes:[{ type: String }],     // ["08:00","14:00","20:00"]
  startDate:    { type: Date, default: Date.now },
  endDate:      { type: Date },
  notes:        { type: String },
  orderedBy:    { type: String },       // doctor name
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

/* ── Charge item (medicine dispensed, procedure, room, etc.) ── */
const chargeSchema = new mongoose.Schema({
  type:        { type: String, enum: ['Medicine','Procedure','Room','Consultation','Lab','Other'], default: 'Other' },
  description: { type: String, required: true },
  quantity:    { type: Number, default: 1, min: 1 },
  unitPrice:   { type: Number, required: true, min: 0 },
  totalPrice:  { type: Number, required: true, min: 0 },
  date:        { type: Date, default: Date.now },
  addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  medicine:    { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' }, // if type=Medicine
});

/* ── Main IPD Admission ── */
const ipdAdmissionSchema = new mongoose.Schema({
  storeId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  admissionNumber:{ type: String, unique: true },   // IPD-000001

  // Patient + location
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName:    { type: String, required: true },
  ward:           { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true },
  wardName:       { type: String },
  bedId:          { type: String, required: true },    // embedded bed _id
  bedNumber:      { type: String, required: true },

  // Status
  status:         { type: String, enum: ['Active','Discharged','Transferred'], default: 'Active' },
  admittedAt:     { type: Date, default: Date.now },
  dischargedAt:   { type: Date },
  expectedDischarge: { type: Date },

  // Clinical
  attendingDoctor:    { type: String },
  admissionDiagnosis: { type: String },
  dischargeDiagnosis: { type: String },
  admissionNotes:     { type: String },
  dischargeNotes:     { type: String },
  dischargeInstructions: { type: String },

  // Medicine orders (active orders written by doctor)
  medicineOrders: [medicineOrderSchema],

  // Running charges
  charges:        [chargeSchema],

  // Billing summary
  totalCharges:   { type: Number, default: 0 },
  discount:       { type: Number, default: 0 },
  amountPaid:     { type: Number, default: 0 },
  paymentStatus:  { type: String, enum: ['Pending','Partial','Paid'], default: 'Pending' },
  finalBill:      { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }, // linked on discharge

  admittedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dischargedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

/* ── Auto-generate admission number ── */
ipdAdmissionSchema.pre('save', async function (next) {
  if (!this.admissionNumber) {
    const count = await mongoose.model('IPDAdmission').countDocuments({ storeId: this.storeId });
    this.admissionNumber = `IPD-${String(count + 1).padStart(6, '0')}`;
  }
  // Recalculate totalCharges
  this.totalCharges = this.charges.reduce((s, c) => s + c.totalPrice, 0);
  // Payment status
  const net = this.totalCharges - this.discount;
  if (this.amountPaid >= net && net > 0) this.paymentStatus = 'Paid';
  else if (this.amountPaid > 0) this.paymentStatus = 'Partial';
  else this.paymentStatus = 'Pending';
  next();
});

ipdAdmissionSchema.virtual('remainingAmount').get(function () {
  return Math.max(0, this.totalCharges - this.discount - this.amountPaid);
});

ipdAdmissionSchema.virtual('daysAdmitted').get(function () {
  const end = this.dischargedAt || new Date();
  return Math.floor((end - this.admittedAt) / 86400000);
});

ipdAdmissionSchema.set('toJSON',   { virtuals: true });
ipdAdmissionSchema.set('toObject', { virtuals: true });
ipdAdmissionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('IPDAdmission', ipdAdmissionSchema);