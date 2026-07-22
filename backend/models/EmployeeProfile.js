const mongoose = require('mongoose');

const allowanceSchema = new mongoose.Schema({
  type:   { type: String, required: true },   // "House Rent", "Medical", "Transport"
  amount: { type: Number, required: true, min: 0 },
  isFixed:{ type: Boolean, default: true },   // false = % of basic salary
  percent:{ type: Number, default: 0 },
});

const employeeProfileSchema = new mongoose.Schema({
  storeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  /* ── Personal ── */
  cnic:          { type: String, trim: true },
  dateOfBirth:   { type: Date },
  gender:        { type: String, enum: ['Male','Female','Other',''], default: '' },
  address:       { type: String, trim: true },
  emergencyContactName:  { type: String, trim: true },
  emergencyContactPhone: { type: String, trim: true },

  /* ── Employment ── */
  designation:   { type: String, trim: true },     // "Senior Pharmacist"
  department:    { type: String, trim: true },     // "Pharmacy", "Admin", "Lab"
  employeeCode:  { type: String, trim: true },     // "EMP-001"
  joiningDate:   { type: Date },
  employmentType:{ type: String, enum: ['Full-Time','Part-Time','Contract','Intern'], default: 'Full-Time' },
  workingHours:  { type: Number, default: 8 },     // per day

  /* ── Salary structure ── */
  basicSalary:   { type: Number, required: true, min: 0 },
  allowances:    [allowanceSchema],

  /* ── Standard deductions ── */
  deductEOBI:        { type: Boolean, default: false },   // ₨570/month (employee share)
  deductIncomeTax:   { type: Boolean, default: false },   // calculated from gross
  customDeductions: [{
    type:   { type: String },
    amount: { type: Number, min: 0 },
    notes:  { type: String },
  }],

  /* ── Bank ── */
  bankName:      { type: String, trim: true },
  accountTitle:  { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  iban:          { type: String, trim: true },

  /* ── Leave balances ── */
  annualLeaveBalance:  { type: Number, default: 18 },   // days/year
  sickLeaveBalance:    { type: Number, default: 10 },
  leavesTaken:         { type: Number, default: 0 },

  notes:         { type: String },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

/* ── Virtual: gross salary ── */
employeeProfileSchema.virtual('grossSalary').get(function () {
  const allowanceTotal = (this.allowances || []).reduce((sum, a) => {
    return sum + (a.isFixed ? a.amount : (this.basicSalary * a.percent / 100));
  }, 0);
  return this.basicSalary + allowanceTotal;
});

/* ── Virtual: EOBI deduction (fixed Pakistan 2024: ₨570/month employee share) ── */
employeeProfileSchema.virtual('eobiDeduction').get(function () {
  return this.deductEOBI ? 570 : 0;
});

/* ── Virtual: estimated income tax (simple slab) ── */
employeeProfileSchema.virtual('estimatedIncomeTax').get(function () {
  if (!this.deductIncomeTax) return 0;
  const annualGross = this.grossSalary * 12;
  // Pakistan FY2024 simplified slabs
  if (annualGross <= 600000)    return 0;
  if (annualGross <= 1200000)   return Math.round(((annualGross - 600000) * 0.025) / 12);
  if (annualGross <= 2400000)   return Math.round((15000 + (annualGross - 1200000) * 0.125) / 12);
  if (annualGross <= 3600000)   return Math.round((165000 + (annualGross - 2400000) * 0.20) / 12);
  if (annualGross <= 6000000)   return Math.round((405000 + (annualGross - 3600000) * 0.25) / 12);
  return Math.round((1005000 + (annualGross - 6000000) * 0.35) / 12);
});

employeeProfileSchema.set('toJSON',   { virtuals: true });
employeeProfileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmployeeProfile', employeeProfileSchema);