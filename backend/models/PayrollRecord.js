const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const payrollRecordSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employee:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile' },
  employeeName:{ type: String, required: true },
  designation: { type: String },
  employeeCode:{ type: String },

  /* ── Period ── */
  month:       { type: Number, required: true, min: 1, max: 12 },
  year:        { type: Number, required: true },

  /* ── Working days ── */
  workingDaysInMonth: { type: Number, default: 26 },
  daysWorked:         { type: Number, default: 26 },
  daysAbsent:         { type: Number, default: 0 },
  leavesApproved:     { type: Number, default: 0 },
  overtime:           { type: Number, default: 0 },  // hours

  /* ── Earnings ── */
  basicSalary:   { type: Number, required: true },
  allowances: [{
    type:   { type: String },
    amount: { type: Number },
  }],
  overtimePay:   { type: Number, default: 0 },
  bonuses:       { type: Number, default: 0 },
  bonusNote:     { type: String },
  grossSalary:   { type: Number, required: true },

  /* ── Deductions ── */
  absenceDeduction:{ type: Number, default: 0 },
  eobiDeduction:   { type: Number, default: 0 },
  incomeTax:       { type: Number, default: 0 },
  advanceDeducted: { type: Number, default: 0 },
  customDeductions:[{
    type:   { type: String },
    amount: { type: Number },
  }],
  totalDeductions: { type: Number, default: 0 },

  /* ── Net ── */
  netSalary:     { type: Number, required: true },

  /* ── Status ── */
  status:        { type: String, enum: ['Draft','Processed','Paid'], default: 'Draft' },
  paidAt:        { type: Date },
  paymentMethod: { type: String, enum: ['Cash','Bank Transfer','Cheque','JazzCash','EasyPaisa','Other'], default: 'Cash' },
  transactionRef:{ type: String },

  /* ── Payslip ── */
  payslipSent:   { type: Boolean, default: false },
  payslipSentAt: { type: Date },
  payslipSentVia:{ type: String },

  notes:         { type: String },
  processedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedByName:{ type: String },
}, { timestamps: true });

payrollRecordSchema.index({ storeId: 1, month: 1, year: 1 });
payrollRecordSchema.index({ storeId: 1, employee: 1, month: 1, year: 1 }, { unique: true });
payrollRecordSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('PayrollRecord', payrollRecordSchema);