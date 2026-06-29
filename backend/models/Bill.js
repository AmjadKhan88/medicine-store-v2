const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
});

const billSchema = new mongoose.Schema({
  billNumber: { type: String, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName: { type: String, required: true },
  items: [billItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'Online', 'Pending'], default: 'Cash' },
  paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Pending' },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

billSchema.virtual('remainingAmount').get(function () {
  return Math.max(0, this.totalAmount - this.amountPaid);
});

billSchema.pre('save', async function (next) {
  if (!this.billNumber) {
    const count = await mongoose.model('Bill').countDocuments();
    this.billNumber = `INV-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.amountPaid >= this.totalAmount) this.paymentStatus = 'Paid';
  else if (this.amountPaid > 0) this.paymentStatus = 'Partial';
  else this.paymentStatus = 'Pending';
  next();
});

billSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Bill', billSchema);
