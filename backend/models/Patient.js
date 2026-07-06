const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');


const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number, min: 0 },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  phone: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  address: { type: String },
  city: { type: String, trim: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'], default: 'Unknown' },
  medicalHistory: { type: String },
  allergies: [{ type: String }],
  doctor: { type: String, trim: true },
  totalBilled: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  // Portal access
  portalToken: { type: String, unique: true, sparse: true },
  portalEnabled: { type: Boolean, default: true },
  portalLastViewed: { type: Date },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

patientSchema.virtual('remainingBalance').get(function () {
  return Math.max(0, this.totalBilled - this.totalPaid);
});

patientSchema.pre('save', async function (next) {
  if (!this.patientId) {
    const count = await mongoose.model('Patient').countDocuments();
    this.patientId = `PT-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

patientSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Patient', patientSchema);
