const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  medicine:      { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName:  { type: String, required: true },
  orderedQty:    { type: Number, required: true, min: 1 },
  receivedQty:   { type: Number, default: 0 },
  unitCost:      { type: Number, required: true, min: 0 },
  totalCost:     { type: Number, required: true },
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber:        { type: String, unique: true },
  supplier: {
    name:    { type: String, required: true, trim: true },
    phone:   { type: String, trim: true },
    email:   { type: String, trim: true },
    address: { type: String, trim: true },
  },
  items:           [purchaseItemSchema],
  totalAmount:     { type: Number, required: true },
  amountPaid:      { type: Number, default: 0 },
  paymentStatus:   { type: String, enum: ['Unpaid', 'Partial', 'Paid'], default: 'Unpaid' },
  status:          { type: String, enum: ['Pending', 'Ordered', 'Partially Received', 'Received', 'Cancelled'], default: 'Pending' },
  expectedDate:    { type: Date },
  receivedDate:    { type: Date },
  notes:           { type: String },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

// Auto-generate PO number
purchaseOrderSchema.pre('save', async function (next) {
  if (!this.poNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    this.poNumber = `PO-${String(count + 1).padStart(5, '0')}`;
  }
  // Sync payment status
  if (this.amountPaid >= this.totalAmount) this.paymentStatus = 'Paid';
  else if (this.amountPaid > 0)            this.paymentStatus = 'Partial';
  else                                     this.paymentStatus = 'Unpaid';
  next();
});

purchaseOrderSchema.virtual('balance').get(function () {
  return Math.max(0, this.totalAmount - this.amountPaid);
});

purchaseOrderSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);