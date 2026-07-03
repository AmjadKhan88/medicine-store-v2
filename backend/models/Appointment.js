const mongoose = require('mongoose');

const visitMedicineSchema = new mongoose.Schema({
  medicine:     { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  medicineName: { type: String, required: true },
  dosage:       { type: String },
  quantity:     { type: Number, default: 0 },
});

const appointmentSchema = new mongoose.Schema({
  storeId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName:  { type: String, required: true },
  doctorName:   { type: String, required: true },
  date:         { type: Date, required: true },
  timeSlot:     { type: String },               // e.g. "10:30 AM"
  type:         {
    type:    String,
    enum:    ['Checkup', 'Follow-up', 'Emergency', 'Consultation', 'Procedure', 'Lab Test', 'Other'],
    default: 'Checkup',
  },
  status:       {
    type:    String,
    enum:    ['Scheduled', 'Completed', 'Cancelled', 'No-Show'],
    default: 'Scheduled',
  },
  // Visit record (filled when completed)
  visitNotes:      { type: String },
  diagnosis:       { type: String },
  vitalSigns: {
    bp:          { type: String },   // blood pressure e.g. "120/80"
    pulse:       { type: Number },
    temperature: { type: Number },
    weight:      { type: Number },
    sugar:       { type: Number },   // blood sugar
  },
  medicinesGiven:  [visitMedicineSchema],
  followUpDate:    { type: Date },
  linkedPrescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
  linkedBill:         { type: mongoose.Schema.Types.ObjectId, ref: 'Bill',         default: null },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

appointmentSchema.index({ storeId: 1, date: 1 });
appointmentSchema.index({ storeId: 1, patient: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);