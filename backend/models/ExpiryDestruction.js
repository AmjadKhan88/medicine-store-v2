const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const expiryDestructionSchema = new mongoose.Schema({
  storeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  /* ── Medicine details ── */
  medicine:      { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', default: null },
  medicineName:  { type: String, required: true, trim: true },
  genericName:   { type: String, trim: true },
  batchNumber:   { type: String, trim: true },
  manufacturer:  { type: String, trim: true },
  expiryDate:    { type: Date,   required: true },
  dosageForm:    { type: String, trim: true },
  strength:      { type: String, trim: true },

  /* ── Destruction details ── */
  quantityDestroyed: { type: Number, required: true, min: 1 },
  unit:              { type: String, default: 'Pcs' },
  purchaseValue:     { type: Number, default: 0 },    // cost value of destroyed stock
  destructionDate:   { type: Date,   required: true, default: Date.now },
  destructionMethod: {
    type: String,
    enum: ['Incineration','Chemical Neutralization','Landfill','Return to Supplier','Other'],
    default: 'Incineration',
  },
  reason:           { type: String, enum: ['Expired','Damaged','Recalled','Contaminated','Other'], default: 'Expired' },
  destructionLocation:{ type: String, trim: true },

  /* ── Witnesses / authorization ── */
  pharmacistName:   { type: String, trim: true },
  pharmacistLicense:{ type: String, trim: true },
  witnessName:      { type: String, trim: true },
  witnessDesignation:{ type: String, trim: true },
  supervisorName:   { type: String, trim: true },

  /* ── DRAP fields ── */
  drapRefNumber:    { type: String, trim: true },     // DRAP-assigned reference if any
  isControlled:     { type: Boolean, default: false }, // Schedule H drug
  requiresDrapNotification:{ type: Boolean, default: false },
  drapNotifiedAt:   { type: Date },
  drapNotificationRef:{ type: String, trim: true },

  notes:            { type: String },
  recordedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByName:   { type: String },
}, { timestamps: true });

expiryDestructionSchema.index({ storeId: 1, destructionDate: -1 });
expiryDestructionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('ExpiryDestruction', expiryDestructionSchema);