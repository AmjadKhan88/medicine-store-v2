const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  storeId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName:       { type: String },
  adminEmail:      { type: String },
  plan:            { type: String, enum: ['basic', 'pro'], required: true },
  amount:          { type: Number, required: true },
  paymentMethod:   { type: String, enum: ['jazzcash', 'easypaisa', 'bank'], required: true },
  transactionId:   { type: String, required: true, trim: true },
  notes:           { type: String },
  status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  processedBy:     { type: String },
  processedAt:     { type: Date  },
  rejectionReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);