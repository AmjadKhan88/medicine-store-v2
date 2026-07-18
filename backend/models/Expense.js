const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const expenseSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  /* ── Core fields ── */
  title:       { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: [
      'Rent','Salaries','Utilities','Medicine Purchase','Equipment',
      'Maintenance','Marketing','Transport','Taxes & Fees',
      'Insurance','Office Supplies','Miscellaneous',
    ],
    required: true,
  },
  amount:      { type: Number, required: true, min: 0 },
  date:        { type: Date, required: true, default: Date.now },

  /* ── Payment ── */
  paymentMethod:{ type: String, enum: ['Cash','Bank Transfer','Cheque','JazzCash','EasyPaisa','Other'], default: 'Cash' },
  vendor:      { type: String, trim: true },
  referenceNo: { type: String, trim: true },        // cheque/receipt number
  invoiceNo:   { type: String, trim: true },

  /* ── Tax (FBR Pakistan) ── */
  isGSTApplicable: { type: Boolean, default: false },
  gstRate:     { type: Number, default: 18 },        // %
  gstAmount:   { type: Number, default: 0 },
  ntn:         { type: String, trim: true },         // vendor NTN

  /* ── Recurring ── */
  isRecurring: { type: Boolean, default: false },
  recurringCycle:{ type: String, enum: ['Monthly','Quarterly','Yearly',''], default: '' },

  notes:       { type: String },
  receipt:     { type: String },                     // Cloudinary URL for receipt scan
  addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedByName: { type: String },
}, { timestamps: true });

expenseSchema.index({ storeId: 1, date: -1 });
expenseSchema.index({ storeId: 1, category: 1, date: -1 });
expenseSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Expense', expenseSchema);