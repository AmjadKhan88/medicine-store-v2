const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  message:    { type: String, required: true },
  sentBy:     { type: String, enum: ['store', 'admin'], required: true },
  senderName: { type: String },
  createdAt:  { type: Date, default: Date.now },
});

const supportTicketSchema = new mongoose.Schema({
  storeId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeName:    { type: String },
  storeEmail:   { type: String },
  subject:      { type: String, required: true, trim: true },
  message:      { type: String, required: true },
  category:     {
    type: String,
    enum: ['Billing', 'Technical', 'Feature Request', 'Bug Report', 'Account', 'Other'],
    default: 'Other',
  },
  priority:     { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status:       { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
  replies:      [replySchema],
  resolvedAt:   { type: Date },
  assignedTo:   { type: String },
}, { timestamps: true });

supportTicketSchema.virtual('replyCount').get(function () {
  return this.replies?.length || 0;
});

supportTicketSchema.set('toJSON', { virtuals: true });
module.exports = mongoose.model('SupportTicket', supportTicketSchema);