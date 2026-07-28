const mongoose = require('mongoose');

const PLAN_LIMITS = {
  trial:           { medicines: 100, patients: 50,   staff: 3,  billsPerMonth: 100 },
  free:            { medicines: 30,  patients: 15,   staff: 1,  billsPerMonth: 20  },

  /* ── Legacy plans (keep for existing users) ── */
  basic:           { medicines: 500, patients: 200,  staff: 3,  billsPerMonth: -1  },
  pro:             { medicines: -1,  patients: -1,   staff: -1, billsPerMonth: -1  },

  /* ── New tiered plans ── */
  pharmacy_basic:  { medicines: 500, patients: 300,  staff: 3,  billsPerMonth: -1  },
  pharmacy_pro:    { medicines: -1,  patients: -1,   staff: 5,  billsPerMonth: -1  },
  clinic:          { medicines: -1,  patients: -1,   staff: 10, billsPerMonth: -1  },
  hospital_basic:  { medicines: -1,  patients: -1,   staff: 20, billsPerMonth: -1  },
  hospital_pro:    { medicines: -1,  patients: -1,   staff: -1, billsPerMonth: -1  },
};

const PLAN_PRICES = {
  trial:          0,
  free:           0,
  basic:          1999,   // legacy → maps to pharmacy_basic pricing
  pro:            3999,   // legacy → maps to pharmacy_pro pricing
  pharmacy_basic: 1999,
  pharmacy_pro:   3999,
  clinic:         5999,
  hospital_basic: 10999,
  hospital_pro:   20999,
};

/* ── Feature access per plan ── */
const PLAN_FEATURES = {
  /* Core pharmacy features — available on ALL paid plans */
  billing:         ['basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  medicines:       ['basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  patients:        ['basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  prescriptions:   ['basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  purchaseOrders:  ['basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  suppliers:       ['basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  staff:           ['basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  reports:         ['basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  barcodeScanner:  ['basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  patientMatching: ['basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],

  /* Pharmacy Pro+ */
  labTests:        ['pro','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  appointments:    ['pro','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  accounting:      ['pro','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  prescriptionOCR: ['pro','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  demandForecast:  ['pro','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
  twoFA:           ['pro','pharmacy_pro','clinic','hospital_basic','hospital_pro'],

  /* Clinic+ */
  opd:             ['clinic','hospital_basic','hospital_pro'],
  doctorOrders:    ['clinic','hospital_basic','hospital_pro'],
  emr:             ['clinic','hospital_basic','hospital_pro'],
  vitals:          ['clinic','hospital_basic','hospital_pro'],
  feedback:        ['clinic','hospital_basic','hospital_pro'],
  onlineBooking:   ['clinic','hospital_basic','hospital_pro'],
  broadcast:       ['clinic','hospital_basic','hospital_pro'],

  /* Hospital Basic+ */
  ipd:             ['hospital_basic','hospital_pro'],
  wards:           ['hospital_basic','hospital_pro'],
  nurseStation:    ['hospital_basic','hospital_pro'],
  otScheduling:    ['hospital_basic','hospital_pro'],
  bloodBank:       ['hospital_basic','hospital_pro'],
  radiology:       ['hospital_basic','hospital_pro'],

  /* Hospital Pro only */
  insurance:       ['hospital_pro'],
  payroll:         ['hospital_pro'],
  drap:            ['hospital_pro'],
  aiDiagnosis:     ['hospital_pro'],
};

const subscriptionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: {
    type: String,
    enum: ['trial','free','basic','pro','pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'],
    default: 'trial',
  },
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

subscriptionSchema.statics.PLAN_LIMITS   = PLAN_LIMITS;
subscriptionSchema.statics.PLAN_PRICES   = PLAN_PRICES;
subscriptionSchema.statics.PLAN_FEATURES = PLAN_FEATURES;

module.exports = mongoose.model('Subscription', subscriptionSchema);