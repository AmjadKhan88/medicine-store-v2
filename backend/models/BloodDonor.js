const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const donationHistorySchema = new mongoose.Schema({
  date:         { type: Date, required: true },
  bagId:        { type: String },
  bloodUnit:    { type: mongoose.Schema.Types.ObjectId, ref: 'BloodUnit' },
  volume:       { type: Number, default: 450 },          // ml
  component:    { type: String, default: 'Whole Blood' },
  hemoglobin:   { type: Number },                        // g/dL — pre-donation test
  bloodPressure:{ type: String },                        // "120/80"
  notes:        { type: String },
  conductedBy:  { type: String },
});

const bloodDonorSchema = new mongoose.Schema({
  storeId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  donorId:      { type: String, unique: true },          // DON-000001

  // Personal info
  name:         { type: String, required: true, trim: true },
  gender:       { type: String, enum: ['Male','Female','Other'], default: 'Male' },
  age:          { type: Number, min: 17, max: 65 },
  cnic:         { type: String, trim: true },
  phone:        { type: String, trim: true },
  email:        { type: String, trim: true },
  address:      { type: String, trim: true },
  occupation:   { type: String, trim: true },

  // Blood info
  bloodGroup:   { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'], required: true },

  // Eligibility
  isEligible:   { type: Boolean, default: true },
  ineligibleReason: { type: String },
  eligibleFrom: { type: Date },                          // can donate again after this date

  // Medical screening
  medicalHistory: { type: String },
  lastHemoglobin: { type: Number },
  hasDisease:     { type: Boolean, default: false },     // HIV/HBV/HCV etc

  // Donation history
  donationHistory: [donationHistorySchema],
  totalDonations:  { type: Number, default: 0 },
  lastDonationDate:{ type: Date },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

/* ── Auto-generate donor ID ── */
bloodDonorSchema.pre('save', async function (next) {
  if (!this.donorId) {
    const count = await mongoose.model('BloodDonor').countDocuments({ storeId: this.storeId });
    this.donorId = `DON-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

/* ── Check eligibility (56 days between donations) ── */
bloodDonorSchema.virtual('canDonateNow').get(function () {
  if (!this.isEligible || this.hasDisease) return false;
  if (!this.lastDonationDate) return true;
  const daysSince = Math.floor((new Date() - this.lastDonationDate) / 86400000);
  return daysSince >= 56;
});

/* ── Days until next eligible ── */
bloodDonorSchema.virtual('daysUntilEligible').get(function () {
  if (!this.lastDonationDate) return 0;
  const daysSince = Math.floor((new Date() - this.lastDonationDate) / 86400000);
  return Math.max(0, 56 - daysSince);
});

bloodDonorSchema.set('toJSON',   { virtuals: true });
bloodDonorSchema.set('toObject', { virtuals: true });
bloodDonorSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('BloodDonor', bloodDonorSchema);