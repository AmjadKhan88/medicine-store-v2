const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },

  // What this document belongs to
  entityType:  {
    type:    String,
    enum:    ['patient', 'medicine', 'store', 'supplier'],
    required: true,
  },
  entityId:    { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  entityName:  { type: String }, // denormalized for display

  // Document metadata
  title:       { type: String, required: true, trim: true },
  category:    {
    type: String,
    enum: [
      // Patient docs
      'ID Card', 'Previous Prescription', 'Test Result', 'Insurance Card',
      'Discharge Summary', 'Referral Letter', 'Consent Form',
      // Medicine docs
      'Batch Certificate', 'Import License', 'Quality Report', 'Drug Registration',
      // Store docs
      'Drug License', 'Tax Certificate', 'Inspection Report', 'Supplier Agreement',
      // General
      'Other',
    ],
    default: 'Other',
  },
  notes:       { type: String },
  tags:        [{ type: String, trim: true }],

  // Cloudinary
  file: {
    url:          { type: String, required: true },
    publicId:     { type: String, required: true },
    originalName: { type: String },
    mimetype:     { type: String },
    size:         { type: Number },
    format:       { type: String }, // pdf, jpg, png etc
    resourceType: { type: String }, // image | raw
  },

  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

documentSchema.index({ storeId: 1, entityType: 1, entityId: 1 });
documentSchema.index({ storeId: 1, category: 1 });

module.exports = mongoose.model('Document', documentSchema);