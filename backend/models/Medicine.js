const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');


const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  genericName: { type: String, trim: true },
  category: {
    type: String,
    enum: ['Antibiotic', 'Analgesic', 'Antiviral', 'Antifungal', 'Cardiovascular',
           'Diabetes', 'Respiratory', 'Gastrointestinal', 'Neurological',
           'Vitamin & Supplement', 'Dermatological', 'Other'],
    default: 'Other'
  },
  manufacturer: { type: String, trim: true },
  batchNumber: { type: String, trim: true },
  barcode: { type: String, trim: true },
  description: { type: String },
  dosageForm: { type: String, enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Patch', 'Other'], default: 'Tablet' },
  strength: { type: String, trim: true },
  unit: { type: String, enum: ['Pcs', 'Strip', 'Box', 'Bottle', 'Vial', 'Tube'], default: 'Pcs' },
  purchasePrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  minStock: { type: Number, default: 10 },
  expiryDate: { type: Date, required: true },
  manufacturingDate: { type: Date },
  location: { type: String, trim: true },
  requiresPrescription: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  substitutes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' }],
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

medicineSchema.virtual('isExpired').get(function () {
  return this.expiryDate < new Date();
});

medicineSchema.virtual('isExpiringSoon').get(function () {
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  return this.expiryDate >= new Date() && this.expiryDate <= thirtyDaysLater;
});

medicineSchema.virtual('isLowStock').get(function () {
  return this.stock <= this.minStock;
});

medicineSchema.set('toJSON', { virtuals: true });
medicineSchema.set('toObject', { virtuals: true });

medicineSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Medicine', medicineSchema);
