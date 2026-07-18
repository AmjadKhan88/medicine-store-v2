const mongoose = require('mongoose');

/* ── Problem / Condition ── */
const problemSchema = new mongoose.Schema({
  condition:   { type: String, required: true },     // "Type 2 Diabetes Mellitus"
  icdCode:     { type: String },                     // "E11" (optional)
  status:      { type: String, enum: ['Active','Resolved','Inactive','Suspected'], default: 'Active' },
  severity:    { type: String, enum: ['Mild','Moderate','Severe',''], default: '' },
  onsetDate:   { type: Date },
  resolvedDate:{ type: Date },
  notes:       { type: String },
  addedBy:     { type: String },
  addedAt:     { type: Date, default: Date.now },
});

/* ── Surgical history item ── */
const surgerySchema = new mongoose.Schema({
  procedure:   { type: String, required: true },     // "Appendectomy"
  date:        { type: Date },
  surgeon:     { type: String },
  hospital:    { type: String },
  anesthesia:  { type: String, enum: ['General','Spinal','Local','Regional',''], default: '' },
  complications:{ type: String },
  notes:       { type: String },
});

/* ── Family history item ── */
const familyHistorySchema = new mongoose.Schema({
  relation:    { type: String, required: true },     // "Father", "Mother", "Sibling"
  condition:   { type: String, required: true },     // "Hypertension", "Diabetes"
  status:      { type: String, enum: ['Living','Deceased','Unknown'], default: 'Unknown' },
  ageAtDiagnosis:{ type: Number },
  notes:       { type: String },
});

/* ── Immunization ── */
const immunizationSchema = new mongoose.Schema({
  vaccine:     { type: String, required: true },     // "COVID-19 Vaccine"
  date:        { type: Date },
  dose:        { type: String },                     // "1st dose", "Booster"
  manufacturer:{ type: String },
  batchNumber: { type: String },
  administeredBy:{ type: String },
  notes:       { type: String },
});

/* ── Medication ── */
const currentMedSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  dose:        { type: String },
  frequency:   { type: String },
  route:       { type: String },
  startDate:   { type: Date },
  prescribedBy:{ type: String },
  indication:  { type: String },                     // "For hypertension"
  isActive:    { type: Boolean, default: true },
});

/* ── Main EMR ── */
const emrSchema = new mongoose.Schema({
  storeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patient:   { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, unique: true },
  patientName:{ type: String },

  /* ── Problem list (chronic conditions) ── */
  problemList:  [problemSchema],

  /* ── Current medications ── */
  currentMedications: [currentMedSchema],

  /* ── Allergies (synced from Patient) ── */
  allergyDetails: [{
    allergen:  { type: String },
    reaction:  { type: String },                     // "Rash", "Anaphylaxis"
    severity:  { type: String, enum: ['Mild','Moderate','Severe','Unknown'], default: 'Unknown' },
    type:      { type: String, enum: ['Drug','Food','Environmental','Other'], default: 'Drug' },
    notes:     { type: String },
  }],

  /* ── Past medical history ── */
  pastMedicalHistory: { type: String },

  /* ── Family history ── */
  familyHistory: [familyHistorySchema],

  /* ── Social history ── */
  socialHistory: {
    smokingStatus:  { type: String, enum: ['Never','Current','Former',''], default: '' },
    smokingPackYears:{ type: Number },
    alcoholUse:     { type: String, enum: ['None','Occasional','Moderate','Heavy','Former',''], default: '' },
    substanceUse:   { type: String },
    occupation:     { type: String },
    maritalStatus:  { type: String, enum: ['Single','Married','Divorced','Widowed',''], default: '' },
    educationLevel: { type: String },
    exerciseFrequency:{ type: String, enum: ['None','Rarely','1-2x/week','3-4x/week','Daily',''], default: '' },
    diet:           { type: String },                // "Vegetarian", "Diabetic diet"
    livingStatus:   { type: String },               // "Lives alone", "With family"
    notes:          { type: String },
  },

  /* ── Surgical history ── */
  surgicalHistory: [surgerySchema],

  /* ── Immunizations ── */
  immunizations: [immunizationSchema],

  /* ── Review of systems ── */
  reviewOfSystems: {
    general:        { type: String },
    cardiovascular: { type: String },
    respiratory:    { type: String },
    gastrointestinal:{ type: String },
    genitourinary:  { type: String },
    musculoskeletal:{ type: String },
    neurological:   { type: String },
    psychiatric:    { type: String },
    dermatological: { type: String },
    endocrine:      { type: String },
  },

  /* ── Functional status ── */
  functionalStatus: {
    adlStatus:      { type: String, enum: ['Independent','Needs Assistance','Dependent',''], default: '' },
    mobilityStatus: { type: String, enum: ['Ambulatory','Walking Aid','Wheelchair','Bedbound',''], default: '' },
    cognitionStatus:{ type: String, enum: ['Intact','Mild Impairment','Moderate','Severe',''], default: '' },
    notes:          { type: String },
  },

  /* ── Doctor notes ── */
  clinicalSummary: { type: String },                 // free-text overall summary
  lastUpdatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedByName:{ type: String },
}, { timestamps: true });

emrSchema.index({ storeId: 1, patient: 1 }, { unique: true });

module.exports = mongoose.model('EMR', emrSchema);