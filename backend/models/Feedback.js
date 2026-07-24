const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const feedbackSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  feedbackToken:{ type: String, unique: true, sparse: true },   // for public link

  /* ── Links ── */
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  patientName: { type: String },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  doctorName:  { type: String, trim: true },
  visitDate:   { type: Date },

  /* ── Ratings (1-5 stars each) ── */
  overallRating:    { type: Number, min: 1, max: 5 },
  doctorRating:     { type: Number, min: 1, max: 5 },
  staffRating:      { type: Number, min: 1, max: 5 },
  cleanlinessRating:{ type: Number, min: 1, max: 5 },
  waitTimeRating:   { type: Number, min: 1, max: 5 },

  /* ── Review ── */
  review:       { type: String, trim: true, maxlength: 1000 },
  isAnonymous:  { type: Boolean, default: false },
  isPublic:     { type: Boolean, default: true },   // show on website?

  /* ── Status ── */
  status: {
    type: String,
    enum: ['Pending','Submitted','Flagged','Responded'],
    default: 'Pending',
  },
  isFlagged:    { type: Boolean, default: false },
  flagReason:   { type: String },
  flaggedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  flaggedAt:    { type: Date },

  /* ── Clinic response ── */
  response:     { type: String },
  respondedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  respondedByName:{ type: String },
  respondedAt:  { type: Date },

  submittedAt:  { type: Date },
  channel:      { type: String, enum: ['Link','Walk-in','Phone','WhatsApp'], default: 'Link' },
  sentAt:       { type: Date },
  expiresAt:    { type: Date },
}, { timestamps: true });

feedbackSchema.index({ storeId: 1, status: 1, submittedAt: -1 });
feedbackSchema.index({ storeId: 1, doctorName: 1 });
feedbackSchema.index({ feedbackToken: 1 }, { sparse: true });

feedbackSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Feedback', feedbackSchema);