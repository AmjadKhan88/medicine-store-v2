const mongoose = require('mongoose');

const invoiceSettingsSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // Template
  template: {
    type:    String,
    enum:    ['detailed', 'compact', 'thermal80', 'thermal58'],
    default: 'detailed',
  },

  // Branding
  accentColor:   { type: String, default: '#0ea5e9' },
  darkColor:     { type: String, default: '#0f172a' },
  fontStyle:     { type: String, enum: ['default', 'modern', 'classic'], default: 'default' },

  // Logo
  logo: {
    url:      { type: String },
    publicId: { type: String },
  },

  // Header content
  showLogo:          { type: Boolean, default: true },
  showStoreName:     { type: Boolean, default: true },
  showDoctorName:    { type: Boolean, default: true },
  showAddress:       { type: Boolean, default: true },
  showPhone:         { type: Boolean, default: true },
  showLicenseNumber: { type: Boolean, default: true },
  showEmail:         { type: Boolean, default: false },

  // Invoice body
  showPatientId:   { type: Boolean, default: true },
  showPatientAge:  { type: Boolean, default: false },
  showGenericName: { type: Boolean, default: true },
  showDiscount:    { type: Boolean, default: true },
  showTax:         { type: Boolean, default: false },
  showSavings:     { type: Boolean, default: true },

  // Footer
  footerText:       { type: String, default: 'Thank you for your visit. Get well soon!' },
  showFooterNote:   { type: Boolean, default: true },
  showPoweredBy:    { type: Boolean, default: true },

  // Thermal specific
  thermalFontSize:  { type: Number, default: 9  },
  thermalLineSpacing:{ type: Number, default: 5 },

}, { timestamps: true });

module.exports = mongoose.model('InvoiceSettings', invoiceSettingsSchema);