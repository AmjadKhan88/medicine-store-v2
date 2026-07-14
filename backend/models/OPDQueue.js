const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  tokenNumber:    { type: Number, required: true },         // 1, 2, 3...
  displayToken:   { type: String, required: true },         // "A-001"
  patientName:    { type: String, required: true, trim: true },
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  phone:          { type: String, trim: true },
  doctorName:     { type: String, trim: true },
  department:     { type: String, trim: true, default: 'General OPD' },
  priority:       { type: String, enum: ['Normal','Urgent','VIP'], default: 'Normal' },
  status: {
    type: String,
    enum: ['Waiting','Called','In-Consultation','Done','Skipped','No-Show'],
    default: 'Waiting',
  },
  registeredAt:      { type: Date, default: Date.now },
  calledAt:          { type: Date },
  consultationStartAt:{ type: Date },
  consultationEndAt:  { type: Date },
  waitMinutes:       { type: Number },    // filled on Called
  consultMinutes:    { type: Number },    // filled on Done
  notes:             { type: String },
  servedBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const opdQueueSchema = new mongoose.Schema({
  storeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:      { type: String, required: true },   // "2025-07-15" — one doc per store per day
  prefix:    { type: String, default: 'A' },     // token prefix
  tokens:    [tokenSchema],
  isOpen:    { type: Boolean, default: true },   // can close queue at end of day
  currentlyServing: { type: String, default: null }, // displayToken being seen now
}, { timestamps: true });

opdQueueSchema.index({ storeId: 1, date: 1 }, { unique: true });

/* ── Virtual stats ── */
opdQueueSchema.virtual('stats').get(function () {
  const t = this.tokens;
  const done = t.filter(x => x.status === 'Done');
  const avgWait = done.length
    ? Math.round(done.reduce((s, x) => s + (x.waitMinutes || 0), 0) / done.length) : 0;
  const avgConsult = done.length
    ? Math.round(done.reduce((s, x) => s + (x.consultMinutes || 0), 0) / done.length) : 0;

  return {
    total:          t.length,
    waiting:        t.filter(x => x.status === 'Waiting').length,
    called:         t.filter(x => x.status === 'Called').length,
    inConsultation: t.filter(x => x.status === 'In-Consultation').length,
    done:           done.length,
    skipped:        t.filter(x => x.status === 'Skipped').length,
    noShow:         t.filter(x => x.status === 'No-Show').length,
    avgWaitMinutes: avgWait,
    avgConsultMinutes: avgConsult,
  };
});

opdQueueSchema.set('toJSON',   { virtuals: true });
opdQueueSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('OPDQueue', opdQueueSchema);