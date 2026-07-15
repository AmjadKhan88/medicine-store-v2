const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/* ── Pre-op checklist items ── */
const checklistSchema = new mongoose.Schema({
  item:      { type: String, required: true },
  done:      { type: Boolean, default: false },
  doneAt:    { type: Date },
  doneBy:    { type: String },
  notes:     { type: String },
});

/* ── Team member ── */
const teamMemberSchema = new mongoose.Schema({
  role:  { type: String, enum: ['Surgeon', 'Co-Surgeon', 'Anesthesiologist', 'OT Nurse', 'Scrub Nurse', 'OT Technician', 'Other'] },
  name:  { type: String, required: true },
  phone: { type: String },
});

/* ── OT Theatre definition (embedded in store config or set per schedule) ── */

const otScheduleSchema = new mongoose.Schema({
  storeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scheduleNumber:{ type: String, unique: true },   // OT-000001

  // Patient
  patient:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName:   { type: String, required: true },
  admissionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission' }, // linked if inpatient

  // OT details
  otRoom:        { type: String, required: true },    // "OT-1", "OT-2", "Major OT"
  surgeryType:   { type: String, required: true },    // "Appendectomy"
  surgeryCategory:{ type: String, enum: ['Elective','Emergency','Semi-Urgent'], default: 'Elective' },
  anesthesiaType:{ type: String, enum: ['General','Spinal','Epidural','Local','Regional','Sedation'], default: 'General' },
  priority:      { type: String, enum: ['Routine','Urgent','Emergency'], default: 'Routine' },

  // Scheduling
  scheduledDate:  { type: Date, required: true },
  startTime:      { type: String, required: true },   // "09:00"
  estimatedMinutes:{ type: Number, default: 60 },     // estimated duration
  endTime:        { type: String },                    // calculated or actual

  // Status
  status: {
    type: String,
    enum: ['Scheduled','Pre-Op','In-Progress','Completed','Cancelled','Postponed'],
    default: 'Scheduled',
  },
  cancellationReason: { type: String },
  postponedTo:        { type: Date },

  // Surgical team
  team: [teamMemberSchema],

  // Pre-op checklist
  preOpChecklist: {
    type: [checklistSchema],
    default: () => [
      { item: 'Blood work done (CBC, Coagulation)' },
      { item: 'Blood group confirmed' },
      { item: 'Patient consent signed' },
      { item: 'Anesthesia consent signed' },
      { item: 'Fasting confirmed (6+ hours)' },
      { item: 'Allergies reviewed' },
      { item: 'Previous imaging available' },
      { item: 'Blood arranged / cross-matched' },
      { item: 'IV access secured' },
      { item: 'Pre-medication given' },
      { item: 'Patient identity verified' },
      { item: 'Site marking done' },
    ],
  },

  // Clinical notes
  preOpNotes:      { type: String },
  operativeNotes:  { type: String },   // intra-op notes
  postOpNotes:     { type: String },
  complications:   { type: String },
  implants:        { type: String },   // prosthetics / meshes used

  // Timing (actual)
  actualStartTime: { type: Date },
  actualEndTime:   { type: Date },
  actualMinutes:   { type: Number },

  // Post-op
  postOpWard:      { type: String },      // where patient goes after
  postOpBed:       { type: String },
  recoveryNotes:   { type: String },

  // Financials
  estimatedCost:   { type: Number, default: 0 },
  actualCost:      { type: Number, default: 0 },

  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

/* ── Auto-generate schedule number ── */
otScheduleSchema.pre('save', async function (next) {
  if (!this.scheduleNumber) {
    const count = await mongoose.model('OTSchedule').countDocuments({ storeId: this.storeId });
    this.scheduleNumber = `OT-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

/* ── Virtual: actual duration ── */
otScheduleSchema.virtual('durationActual').get(function () {
  if (!this.actualStartTime || !this.actualEndTime) return null;
  return Math.round((this.actualEndTime - this.actualStartTime) / 60000);
});

/* ── Virtual: checklist completion % ── */
otScheduleSchema.virtual('checklistProgress').get(function () {
  if (!this.preOpChecklist?.length) return 0;
  const done = this.preOpChecklist.filter(c => c.done).length;
  return Math.round((done / this.preOpChecklist.length) * 100);
});

otScheduleSchema.index({ storeId: 1, scheduledDate: 1, otRoom: 1 });
otScheduleSchema.index({ storeId: 1, status: 1 });

otScheduleSchema.set('toJSON',   { virtuals: true });
otScheduleSchema.set('toObject', { virtuals: true });
otScheduleSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('OTSchedule', otScheduleSchema);