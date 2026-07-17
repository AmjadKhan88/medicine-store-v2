const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/* ── Normal ranges for alert detection ── */
const NORMAL_RANGES = {
  bpSystolic:  { min: 90,  max: 140 },
  bpDiastolic: { min: 60,  max: 90  },
  pulse:       { min: 50,  max: 100 },
  temperature: { min: 36.0,max: 37.5},
  spo2:        { min: 95,  max: 100 },
  rbs:         { min: 70,  max: 140 },
  weight:      { min: 0,   max: 999 }, // no upper limit alert for weight
  respiratoryRate:{ min: 12, max: 20 },
  painScore:   { min: 0,   max: 3   }, // 0-3 = acceptable
};

const vitalSignSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  /* ── Links ── */
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  patientName: { type: String, required: true },
  admission:   { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission', default: null },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment',  default: null },

  /* ── Context ── */
  context:     { type: String, enum: ['IPD','OPD','Emergency','ICU','OT','Follow-up','Home'], default: 'OPD' },
  notes:       { type: String },

  /* ── Blood Pressure ── */
  bpSystolic:  { type: Number },    // mmHg
  bpDiastolic: { type: Number },    // mmHg
  bpPosition:  { type: String, enum: ['Sitting','Lying','Standing'], default: 'Sitting' },
  bpArm:       { type: String, enum: ['Left','Right'], default: 'Right' },

  /* ── Heart ── */
  pulse:       { type: Number },    // bpm
  pulseRhythm: { type: String, enum: ['Regular','Irregular','','N/A'], default: '' },

  /* ── Respiratory ── */
  respiratoryRate:{ type: Number }, // breaths/min
  spo2:        { type: Number },    // %
  oxygenSupport:{ type: String },   // "Room Air", "2L Nasal Cannula", "Mask"

  /* ── Temperature ── */
  temperature:  { type: Number },   // °C
  tempRoute:    { type: String, enum: ['Oral','Axillary','Rectal','Tympanic',''], default: '' },

  /* ── Blood Sugar ── */
  rbs:         { type: Number },    // mg/dL
  rbsTiming:   { type: String, enum: ['Fasting','Post-meal (2h)','Random','Pre-meal','Bedtime',''], default: '' },

  /* ── Other ── */
  weight:         { type: Number }, // kg
  height:         { type: Number }, // cm
  painScore:      { type: Number, min: 0, max: 10 }, // 0-10 VAS scale
  gcsScore:       { type: Number, min: 3, max: 15  }, // Glasgow Coma Scale
  urineOutput:    { type: Number }, // ml/hour
  fluidIntake:    { type: Number }, // ml/hour

  /* ── Alerts detected ── */
  alerts: [{
    parameter: { type: String },
    value:     { type: Number },
    severity:  { type: String, enum: ['Warning','Critical'] },
    message:   { type: String },
  }],
  hasCriticalAlert: { type: Boolean, default: false },

  /* ── Recorded by ── */
  recordedAt:      { type: Date, default: Date.now },
  recordedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByName:  { type: String },
}, { timestamps: true });

/* ── BMI virtual ── */
vitalSignSchema.virtual('bmi').get(function () {
  if (!this.weight || !this.height) return null;
  return Math.round((this.weight / Math.pow(this.height / 100, 2)) * 10) / 10;
});

/* ── BP display virtual ── */
vitalSignSchema.virtual('bp').get(function () {
  if (!this.bpSystolic && !this.bpDiastolic) return null;
  return `${this.bpSystolic || '?'}/${this.bpDiastolic || '?'}`;
});

/* ── Alert detection static method ── */
vitalSignSchema.statics.detectAlerts = function (data) {
  const alerts = [];

  const check = (param, val, label, unit, warnMin, warnMax, critMin, critMax) => {
    if (val === null || val === undefined) return;
    if (critMin !== undefined && val < critMin) {
      alerts.push({ parameter: param, value: val, severity: 'Critical', message: `${label} critically low: ${val}${unit}` });
    } else if (critMax !== undefined && val > critMax) {
      alerts.push({ parameter: param, value: val, severity: 'Critical', message: `${label} critically high: ${val}${unit}` });
    } else if (warnMin !== undefined && val < warnMin) {
      alerts.push({ parameter: param, value: val, severity: 'Warning', message: `${label} low: ${val}${unit}` });
    } else if (warnMax !== undefined && val > warnMax) {
      alerts.push({ parameter: param, value: val, severity: 'Warning', message: `${label} high: ${val}${unit}` });
    }
  };

  check('bpSystolic',  data.bpSystolic,  'Systolic BP',  ' mmHg', 90,  140, 70,  180);
  check('bpDiastolic', data.bpDiastolic, 'Diastolic BP', ' mmHg', 60,  90,  40,  120);
  check('pulse',       data.pulse,       'Pulse',        ' bpm',  50,  100, 40,  130);
  check('temperature', data.temperature, 'Temperature',  '°C',    36.0,37.5,35.0,39.5);
  check('spo2',        data.spo2,        'SpO2',         '%',     95,  null,90,  null);
  check('rbs',         data.rbs,         'Blood Sugar',  'mg/dL', 70,  140, 50,  400);
  check('respiratoryRate',data.respiratoryRate,'RR',     '/min',  12,  20,  8,   30 );
  check('painScore',   data.painScore,   'Pain Score',   '/10',   null,7,   null,9  );
  check('gcsScore',    data.gcsScore,    'GCS',          '',      13,  null,8,   null);

  return alerts;
};

vitalSignSchema.index({ storeId: 1, patient: 1, recordedAt: -1 });
vitalSignSchema.index({ storeId: 1, admission: 1, recordedAt: 1 });
vitalSignSchema.index({ storeId: 1, hasCriticalAlert: 1 });

vitalSignSchema.set('toJSON',   { virtuals: true });
vitalSignSchema.set('toObject', { virtuals: true });
vitalSignSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('VitalSign', vitalSignSchema);