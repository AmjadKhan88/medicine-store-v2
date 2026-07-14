const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
  bedNumber:   { type: String, required: true },  // e.g. "A-01"
  type:        { type: String, enum: ['General', 'ICU', 'Private', 'Semi-Private', 'Emergency'], default: 'General' },
  status:      { type: String, enum: ['Available', 'Occupied', 'Cleaning', 'Maintenance', 'Reserved'], default: 'Available' },

  // Current patient (if occupied)
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  admittedAt:  { type: Date, default: null },
  expectedDischarge: { type: Date, default: null },
  assignedDoctor:    { type: String, default: null },
  admissionNotes:    { type: String, default: null },
  admittedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

const wardSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true, trim: true },   // e.g. "General Ward A"
  floor:       { type: String, trim: true },                   // e.g. "2nd Floor"
  type:        { type: String, enum: ['General', 'ICU', 'Pediatric', 'Maternity', 'Surgical', 'Emergency', 'Private'], default: 'General' },
  totalBeds:   { type: Number, required: true, min: 1, max: 200 },
  beds:        [bedSchema],
  isActive:    { type: Boolean, default: true },
  notes:       { type: String },
}, { timestamps: true });

// Virtual stats
wardSchema.virtual('stats').get(function () {
  return {
    total:       this.beds.length,
    available:   this.beds.filter(b => b.status === 'Available').length,
    occupied:    this.beds.filter(b => b.status === 'Occupied').length,
    cleaning:    this.beds.filter(b => b.status === 'Cleaning').length,
    maintenance: this.beds.filter(b => b.status === 'Maintenance').length,
    reserved:    this.beds.filter(b => b.status === 'Reserved').length,
  };
});

wardSchema.set('toJSON',   { virtuals: true });
wardSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Ward', wardSchema);