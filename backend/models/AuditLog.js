const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'MEDICINE_ADDED',
      'MEDICINE_UPDATED',
      'MEDICINE_DELETED',
      'STOCK_UPDATED',
      'STOCK_RECEIVED',
      'BILL_CREATED',
      'BILL_DELETED',
      'PAYMENT_RECORDED',
      'PATIENT_REGISTERED',
      'PATIENT_UPDATED',
      'PATIENT_DELETED',
      'PURCHASE_ORDER_CREATED',
      'PURCHASE_ORDER_CANCELLED',
      'USER_LOGIN',
      'USER_REGISTERED',
    ],
  },
  category: {
    type: String,
    enum: ['Medicine', 'Billing', 'Patient', 'Stock', 'Purchase', 'Auth'],
    required: true,
  },
  // Human-readable one-line summary shown in timeline
  summary: { type: String, required: true },

  // Entity that was affected
  entityType: { type: String, enum: ['Medicine', 'Bill', 'Patient', 'PurchaseOrder', 'User'] },
  entityId:   { type: mongoose.Schema.Types.ObjectId },
  entityName: { type: String },

  // Extra structured data (amounts, quantities, old→new values, etc.)
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Who did it
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  performedByName: { type: String },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  // IP / user-agent (optional, nice to have)
  ip: { type: String },
}, { timestamps: true });

// Index for fast queries
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ category: 1 });
auditLogSchema.index({ entityId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ performedBy: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);