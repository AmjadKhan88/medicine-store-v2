const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  storeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth:   { type: String, required: true },
  },
  userAgent: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);