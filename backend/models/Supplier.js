const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');


const supplierSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  company:     { type: String, trim: true },
  phone:       { type: String, trim: true },
  phone2:      { type: String, trim: true },
  email:       { type: String, trim: true, lowercase: true },
  address:     { type: String, trim: true },
  city:        { type: String, trim: true },
  ntn:         { type: String, trim: true },   // National Tax Number
  bankName:    { type: String, trim: true },
  bankAccount: { type: String, trim: true },
  bankIBAN:    { type: String, trim: true },

  // Which medicines this supplier provides
  medicines: [{
    medicine:     { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    medicineName: { type: String },
    ourPrice:     { type: Number },   // negotiated price from this supplier
    isPreferred:  { type: Boolean, default: false },
  }],

  // Performance tracking
  performance: {
    totalOrders:       { type: Number, default: 0 },
    onTimeDeliveries:  { type: Number, default: 0 },
    lateDeliveries:    { type: Number, default: 0 },
    qualityIssues:     { type: Number, default: 0 },
    returnedOrders:    { type: Number, default: 0 },
    rating:            { type: Number, default: 0, min: 0, max: 5 },
  },

  // Financial summary (auto-updated when POs are processed)
  totalOrdered:  { type: Number, default: 0 },
  totalPaid:     { type: Number, default: 0 },

  paymentTerms:  { type: String, trim: true },   // e.g. "Net 30"
  creditLimit:   { type: Number, default: 0 },
  notes:         { type: String },
  isActive:      { type: Boolean, default: true },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

supplierSchema.virtual('totalOutstanding').get(function () {
  return Math.max(0, this.totalOrdered - this.totalPaid);
});

supplierSchema.virtual('deliveryScore').get(function () {
  const total = this.performance.onTimeDeliveries + this.performance.lateDeliveries;
  if (!total) return null;
  return Math.round((this.performance.onTimeDeliveries / total) * 100);
});

supplierSchema.set('toJSON', { virtuals: true });

supplierSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Supplier', supplierSchema);