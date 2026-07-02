const mongoose = require('mongoose');

const PLAN_LIMITS = {
  trial: { medicines: 50,  patients: 20,  staff: 1, billsPerMonth: 50  },
  free:  { medicines: 30,  patients: 15,  staff: 1, billsPerMonth: 20  },
  basic: { medicines: 500, patients: 200, staff: 3, billsPerMonth: -1  },
  pro:   { medicines: -1,  patients: -1,  staff: -1, billsPerMonth: -1 },
};

const PLAN_PRICES = { trial: 0, free: 0, basic: 2999, pro: 5999 };

const subscriptionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan:    { type: String, enum: ['trial', 'free', 'basic', 'pro'], default: 'trial' },
  status:  { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' },

  trialEndsAt:        { type: Date },
  currentPeriodStart: { type: Date },
  currentPeriodEnd:   { type: Date },

  limits: {
    medicines:     { type: Number, default: 50 },
    patients:      { type: Number, default: 20 },
    staff:         { type: Number, default: 1  },
    billsPerMonth: { type: Number, default: 50 },
  },

  payments: [{
    plan:          String,
    amount:        Number,
    method:        String,
    transactionId: String,
    paidAt:        Date,
    approvedBy:    String,
  }],
}, { timestamps: true });

// Virtual: is subscription currently usable?
subscriptionSchema.virtual('isActive').get(function () {
  if (this.status !== 'active') return false;
  const now = new Date();
  if (this.plan === 'trial') return this.trialEndsAt > now;
  if (this.plan === 'free')  return true;
  return this.currentPeriodEnd > now;
});

// Virtual: days left
subscriptionSchema.virtual('daysRemaining').get(function () {
  const end = this.plan === 'trial' ? this.trialEndsAt : this.currentPeriodEnd;
  if (!end) return 0;
  return Math.max(0, Math.ceil((end - new Date()) / 86400000));
});

subscriptionSchema.set('toJSON', { virtuals: true });

subscriptionSchema.statics.PLAN_LIMITS = PLAN_LIMITS;
subscriptionSchema.statics.PLAN_PRICES = PLAN_PRICES;

module.exports = mongoose.model('Subscription', subscriptionSchema);