const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const bloodUnitSchema = new mongoose.Schema({
  storeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bagId:      { type: String, unique: true },             // BB-000001

  // Blood details
  bloodGroup: { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'], required: true },
  component:  {
    type: String,
    enum: ['Whole Blood','Packed RBC','Fresh Frozen Plasma','Platelets','Cryoprecipitate','Single Donor Plasma'],
    default: 'Whole Blood',
  },
  volume:     { type: Number, default: 450 },             // ml
  bagType:    { type: String, enum: ['Single','Double','Triple','Quadruple'], default: 'Single' },

  // Dates
  collectionDate: { type: Date, required: true },
  expiryDate:     { type: Date, required: true },
  processedDate:  { type: Date },

  // Source
  source:         { type: String, enum: ['Donor','External Blood Bank','Replacement'], default: 'Donor' },
  donor:          { type: mongoose.Schema.Types.ObjectId, ref: 'BloodDonor', default: null },
  externalSource: { type: String },                       // name of external blood bank

  // Screening
  hivTested:      { type: Boolean, default: false },
  hbvTested:      { type: Boolean, default: false },
  hcvTested:      { type: Boolean, default: false },
  malariasTested: { type: Boolean, default: false },
  syphilisTested: { type: Boolean, default: false },
  allTestsClear:  { type: Boolean, default: false },

  // Storage
  location:       { type: String, trim: true },           // "Fridge A - Shelf 2"
  temperature:    { type: String },                       // "2-6°C"

  // Status
  status: {
    type: String,
    enum: ['Available','Reserved','Issued','Discarded','Expired'],
    default: 'Available',
  },

  // Reservation
  reservedFor:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  reservedAt:      { type: Date },
  reservedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  crossMatchDone:  { type: Boolean, default: false },

  // Issuance
  issuedTo:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  issuedToName:    { type: String },
  issuedAt:        { type: Date },
  issuedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedByName:    { type: String },
  issuanceNotes:   { type: String },
  requestedBy:     { type: String },                      // doctor who requested

  // Discard
  discardReason:   { type: String },
  discardedAt:     { type: Date },
  discardedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Cost
  cost:            { type: Number, default: 0 },

  addedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

/* ── Auto-generate bag ID ── */
bloodUnitSchema.pre('save', async function (next) {
  if (!this.bagId) {
    const count = await mongoose.model('BloodUnit').countDocuments({ storeId: this.storeId });
    this.bagId = `BB-${String(count + 1).padStart(6, '0')}`;
  }
  // Auto-mark expired
  if (this.status === 'Available' && this.expiryDate < new Date()) {
    this.status = 'Expired';
  }
  next();
});

bloodUnitSchema.virtual('isExpired').get(function () {
  return this.expiryDate < new Date();
});

bloodUnitSchema.virtual('daysToExpiry').get(function () {
  return Math.floor((this.expiryDate - new Date()) / 86400000);
});

bloodUnitSchema.virtual('isExpiringSoon').get(function () {
  const days = this.daysToExpiry;
  return days >= 0 && days <= 7;
});

bloodUnitSchema.index({ storeId: 1, bloodGroup: 1, status: 1 });
bloodUnitSchema.index({ storeId: 1, expiryDate: 1, status: 1 });

bloodUnitSchema.set('toJSON',   { virtuals: true });
bloodUnitSchema.set('toObject', { virtuals: true });
bloodUnitSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('BloodUnit', bloodUnitSchema);