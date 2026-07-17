const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/* ── Individual patient summary in a handover ── */
const handoverPatientSchema = new mongoose.Schema({
  admission:   { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission' },
  patientName: { type: String },
  bedNumber:   { type: String },
  summary:     { type: String },                        // condition summary
  pendingOrders:{ type: String },                       // orders not yet done
  alerts:      { type: String },                        // anything incoming nurse must know
  vitals:      { type: String },                        // last vitals summary
});

const nursingNoteSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  /* ── Note type ── */
  noteType: {
    type: String,
    enum: ['Progress Note','Shift Handover','Observation','Incident Report','Patient Education','Discharge Note','Other'],
    required: true,
  },

  /* ── Linked patient/admission (optional for handover) ── */
  admission:   { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission', default: null },
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient',      default: null },
  patientName: { type: String },
  wardName:    { type: String },
  bedNumber:   { type: String },

  /* ── Content ── */
  title:       { type: String, required: true },
  content:     { type: String, required: true },
  tags:        [{ type: String }],                      // ["pain", "fever", "BP"]

  /* ── Shift handover specific ── */
  shiftHandover: {
    shiftType:       { type: String, enum: ['Morning','Evening','Night'] },
    outgoingNurse:   { type: String },
    incomingNurse:   { type: String },
    wardCovered:     { type: String },
    shiftStart:      { type: Date },
    shiftEnd:        { type: Date },
    overallSummary:  { type: String },
    criticalPatients:{ type: String },
    pendingTasks:    { type: String },
    patientsHandover:[handoverPatientSchema],
  },

  /* ── Incident report specific ── */
  incidentReport: {
    incidentType:  { type: String },                    // "Fall", "Medication Error", "Equipment"
    severity:      { type: String, enum: ['Minor','Moderate','Serious','Critical'] },
    description:   { type: String },
    actionTaken:   { type: String },
    reportedTo:    { type: String },
    witnessName:   { type: String },
  },

  /* ── Author ── */
  writtenBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  writtenByName: { type: String },
  writtenAt:     { type: Date, default: Date.now },

  /* ── Review ── */
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedByName:{ type: String },
  reviewedAt:    { type: Date },
  reviewNotes:   { type: String },

  isPrivate:     { type: Boolean, default: false },     // only visible to nurses
  isPinned:      { type: Boolean, default: false },     // pinned to top
}, { timestamps: true });

nursingNoteSchema.index({ storeId: 1, admission: 1, createdAt: -1 });
nursingNoteSchema.index({ storeId: 1, noteType: 1,  createdAt: -1 });
nursingNoteSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('NursingNote', nursingNoteSchema);