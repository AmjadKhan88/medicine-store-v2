const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName: { type: String, required: true },

  testName: { type: String, required: true, trim: true },
  testCategory: {
    type: String,
    enum: ['Blood Test', 'Urine Test', 'Imaging', 'Microbiology', 'Pathology', 'Cardiac', 'Other'],
    default: 'Blood Test',
  },
  orderedBy: { type: String, trim: true },   // doctor name
  lab: { type: String, trim: true },   // lab name
  status: {
    type: String,
    enum: ['Ordered', 'Sample Collected', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Ordered',
  },

  orderedDate: { type: Date, default: Date.now },
  collectedDate: { type: Date },
  resultDate: { type: Date },

  // Result data
  result: {
    value: { type: String },   // e.g. "14.5"
    unit: { type: String },   // e.g. "g/dL"
    normalRange: { type: String },   // e.g. "12–16 g/dL"
    interpretation: { type: String, enum: ['Normal', 'High', 'Low', 'Critical', 'Pending'], default: 'Pending' },
    notes: { type: String },
  },

  // Structured results for panel tests (CBC etc.)
  resultRows: [{
    parameter: String,
    value: String,
    unit: String,
    normalRange: String,
    flag: { type: String, enum: ['', 'H', 'L', 'HH', 'LL'], default: '' },
  }],

  // Uploaded file (PDF or image)
  file: {
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,   // Cloudinary secure URL
    publicId: String,   // Cloudinary public_id (needed to delete)
    uploadedAt: Date,
  },

  // Linked entities
  linkedPrescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
  linkedAppointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },

  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

labTestSchema.index({ storeId: 1, patient: 1 });
labTestSchema.index({ storeId: 1, status: 1 });

module.exports = mongoose.model('LabTest', labTestSchema);