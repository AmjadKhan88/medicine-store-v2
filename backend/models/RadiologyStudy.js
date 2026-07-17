const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/* ── One image/series within a study ── */
const imageSchema = new mongoose.Schema({
  title:        { type: String },                        // "AP View", "Lateral", "Oblique"
  description:  { type: String },
  file: {
    url:          { type: String, required: true },
    publicId:     { type: String, required: true },
    originalName: { type: String },
    mimetype:     { type: String },
    size:         { type: Number },
    format:       { type: String },
    resourceType: { type: String },                      // 'image' | 'raw'
  },
  uploadedAt:   { type: Date, default: Date.now },
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedByName:{ type: String },
});

const radiologyStudySchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studyNumber: { type: String, unique: true },           // RAD-000001

  /* ── Patient ── */
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName: { type: String, required: true },
  admission:   { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission', default: null },

  /* ── Study details ── */
  modality: {
    type: String,
    enum: [
      'X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'Mammography',
      'Fluoroscopy', 'Nuclear Medicine', 'Angiography',
      'Echocardiography', 'Doppler', 'DEXA Scan', 'Other',
    ],
    required: true,
  },
  studyType:      { type: String, required: true },      // "Chest PA View", "USG Abdomen"
  bodyPart:       { type: String },                      // "Chest", "Abdomen", "Right Knee"
  laterality:     { type: String, enum: ['Left','Right','Bilateral','N/A'], default: 'N/A' },
  contrast:       { type: Boolean, default: false },     // contrast given?
  contrastAgent:  { type: String },                      // "Omnipaque 300"

  /* ── Clinical info ── */
  clinicalHistory:{ type: String },                      // reason for study
  referredBy:     { type: String },                      // referring doctor
  priority:       { type: String, enum: ['Routine','Urgent','STAT','Emergency'], default: 'Routine' },

  /* ── Study timing ── */
  orderedDate:    { type: Date, default: Date.now },
  studyDate:      { type: Date },
  reportDate:     { type: Date },

  /* ── Status ── */
  status: {
    type: String,
    enum: ['Ordered','In Progress','Images Uploaded','Reported','Verified','Cancelled'],
    default: 'Ordered',
  },

  /* ── Radiologist ── */
  radiologist:    { type: String },                       // radiologist name
  reportedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  /* ── Report ── */
  report: {
    technique:    { type: String },                       // how study was performed
    findings:     { type: String },                       // detailed findings
    impression:   { type: String },                       // conclusion / diagnosis
    recommendation:{ type: String },                      // follow-up advice
    isNormal:     { type: Boolean, default: true },
    isCritical:   { type: Boolean, default: false },      // critical finding → instant alert
    criticalAlert:{ type: String },                       // what's critical
  },

  /* ── Images ── */
  images:         [imageSchema],

  /* ── Public share link ── */
  shareToken:     { type: String, index: true },          // random hex
  shareEnabled:   { type: Boolean, default: false },
  shareExpiresAt: { type: Date },

  /* ── Linked entities ── */
  linkedLabTest:  { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest', default: null },
  linkedOT:       { type: mongoose.Schema.Types.ObjectId, ref: 'OTSchedule', default: null },

  orderedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes:      { type: String },
  cost:       { type: Number, default: 0 },
}, { timestamps: true });

/* ── Auto-generate study number ── */
radiologyStudySchema.pre('save', async function (next) {
  if (!this.studyNumber) {
    const count = await mongoose.model('RadiologyStudy').countDocuments({ storeId: this.storeId });
    this.studyNumber = `RAD-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

/* ── Virtual: image count ── */
radiologyStudySchema.virtual('imageCount').get(function () {
  return this.images?.length || 0;
});

/* ── Virtual: share link valid ── */
radiologyStudySchema.virtual('isShareActive').get(function () {
  if (!this.shareEnabled || !this.shareToken) return false;
  if (!this.shareExpiresAt) return true;
  return this.shareExpiresAt > new Date();
});

radiologyStudySchema.index({ storeId: 1, patient: 1, studyDate: -1 });
radiologyStudySchema.index({ storeId: 1, modality: 1, status: 1 });
radiologyStudySchema.index({ shareToken: 1 }, { sparse: true });

radiologyStudySchema.set('toJSON',   { virtuals: true });
radiologyStudySchema.set('toObject', { virtuals: true });
radiologyStudySchema.plugin(mongoosePaginate);

module.exports = mongoose.model('RadiologyStudy', radiologyStudySchema);