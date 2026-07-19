const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const insurancePanelSchema = new mongoose.Schema({
  storeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  /* ── Identity ── */
  name:       { type: String, required: true, trim: true }, // "Jubilee Life Insurance"
  shortCode:  { type: String, trim: true },                 // "JLI"
  type: {
    type: String,
    enum: ['Insurance Company','Corporate Panel','Government Scheme','TPA'],
    required: true,
  },
  category: {
    type: String,
    enum: ['Health Insurance','Life Insurance','EOBI','PESSI','Zakat Fund','Corporate HR','Other'],
    default: 'Health Insurance',
  },

  /* ── Coverage ── */
  coverageType:       { type: String, enum: ['Full','Partial','Co-pay','Cashless'], default: 'Partial' },
  coveragePercent:    { type: Number, min: 0, max: 100, default: 80 },  // % insurance pays
  patientCoPayPercent:{ type: Number, min: 0, max: 100, default: 20 },  // % patient pays
  maxClaimPerBill:    { type: Number, default: 0 },    // 0 = no limit
  annualLimitPerPatient:{ type: Number, default: 0 },  // 0 = no limit

  /* ── Allowed services ── */
  allowedServices: [{
    type: String,
    enum: ['Medicine','Consultation','Lab Tests','Radiology','IPD','OPD','Surgery','Emergency'],
  }],
  excludedMedicines: [{ type: String }],   // brand names excluded from coverage

  /* ── Contact ── */
  contactPerson:  { type: String, trim: true },
  phone:          { type: String, trim: true },
  email:          { type: String, trim: true },
  address:        { type: String, trim: true },
  city:           { type: String, trim: true },
  website:        { type: String, trim: true },

  /* ── Agreement ── */
  policyNumber:   { type: String, trim: true },    // our agreement number
  agreementDate:  { type: Date },
  expiryDate:     { type: Date },
  paymentTerms:   { type: String, default: 'Net 30' },
  claimSubmissionMethod: {
    type: String,
    enum: ['Online Portal','Email','Physical','WhatsApp','Other'],
    default: 'Email',
  },
  claimPortalUrl: { type: String, trim: true },

  /* ── Pakistan specific ── */
  ntn:            { type: String, trim: true },
  secp:           { type: String, trim: true },    // SECP registration number

  notes:   { type: String },
  isActive:{ type: Boolean, default: true },

  /* ── Running totals (updated on claim events) ── */
  totalClaimed:  { type: Number, default: 0 },
  totalApproved: { type: Number, default: 0 },
  totalPaid:     { type: Number, default: 0 },
  totalPatients: { type: Number, default: 0 },
  totalClaims:   { type: Number, default: 0 },
}, { timestamps: true });

insurancePanelSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('InsurancePanel', insurancePanelSchema);