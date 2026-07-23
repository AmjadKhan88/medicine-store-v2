const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const recipientSchema = new mongoose.Schema({
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientName:    { type: String },
  phone:          { type: String },
  personalizedMsg:{ type: String },   // message with {name} replaced
  status:         { type: String, enum: ['Pending','Sent','Failed','Skipped'], default: 'Pending' },
  sentAt:         { type: Date },
  channel:        { type: String, enum: ['WhatsApp','SMS','Both'] },
});

const broadcastSchema = new mongoose.Schema({
  storeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:         { type: String, required: true, trim: true },

  /* ── Audience filter ── */
  filter: {
    type:         { type: String, enum: ['all','condition','last-visit','city','blood-group','age-range','outstanding','upcoming-appointments','insured','custom'], default: 'all' },
    condition:    { type: String },       // e.g. "diabetes"
    lastVisitDays:{ type: Number },       // not seen in X days
    city:         { type: String },
    bloodGroup:   { type: String },
    ageMin:       { type: Number },
    ageMax:       { type: Number },
    outstandingMin:{ type: Number },
    customSearch: { type: String },
  },

  /* ── Message ── */
  messageTemplate: { type: String, required: true },
  channel:         { type: String, enum: ['WhatsApp','SMS','Both'], default: 'WhatsApp' },

  /* ── Template type ── */
  templateType: {
    type: String,
    enum: ['Custom','Eid Mubarak','Appointment Reminder','Health Tip','Medicine Refill','Seasonal Health','Festival Greeting','Other'],
    default: 'Custom',
  },

  /* ── Recipients ── */
  recipients:   [recipientSchema],
  totalCount:   { type: Number, default: 0 },
  sentCount:    { type: Number, default: 0 },
  failedCount:  { type: Number, default: 0 },
  skippedCount: { type: Number, default: 0 },   // no phone number

  /* ── Status ── */
  status: {
    type: String,
    enum: ['Draft','In Progress','Completed','Cancelled'],
    default: 'Draft',
  },

  scheduledAt: { type: Date },
  startedAt:   { type: Date },
  completedAt: { type: Date },

  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String },
}, { timestamps: true });

broadcastSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Broadcast', broadcastSchema);