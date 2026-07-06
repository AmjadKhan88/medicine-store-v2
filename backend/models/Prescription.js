const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');


const prescriptionItemSchema = new mongoose.Schema({
  medicine:     { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  medicineName: { type: String, required: true },
  dosage:       { type: String, required: true },  // e.g. "1 tablet"
  frequency:    { type: String, required: true },  // e.g. "twice daily"
  duration:     { type: String, required: true },  // e.g. "5 days"
  quantity:     { type: Number, required: true },  // total qty to dispense
  instructions: { type: String },                  // "Take after meal"
  route:        { type: String, enum: ['Oral', 'Topical', 'Injection', 'Inhale', 'Eye Drops', 'Ear Drops', 'Other'], default: 'Oral' },
});

const prescriptionSchema = new mongoose.Schema({
  rxNumber:     { type: String, unique: true },
  storeId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName:  { type: String, required: true },
  doctorName:   { type: String, required: true },
  diagnosis:    { type: String },
  items:        [prescriptionItemSchema],
  notes:        { type: String },
  status:       { type: String, enum: ['Active', 'Dispensed', 'Cancelled', 'Expired'], default: 'Active' },
  validUntil:   { type: Date },
  // Linked bill — set when prescription is converted to invoice
  linkedBill:   { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-generate Rx number
prescriptionSchema.pre('save', async function (next) {
  if (!this.rxNumber) {
    const count    = await mongoose.model('Prescription').countDocuments();
    this.rxNumber  = `RX-${String(count + 1).padStart(6, '0')}`;
  }
  // Auto-expire after validUntil
  if (this.validUntil && this.validUntil < new Date() && this.status === 'Active') {
    this.status = 'Expired';
  }
  next();
});

prescriptionSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Prescription', prescriptionSchema);