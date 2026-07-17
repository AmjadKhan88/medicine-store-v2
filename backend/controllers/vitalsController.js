const VitalSign    = require('../models/VitalSign');
const IPDAdmission = require('../models/IPDAdmission');
const Patient      = require('../models/Patient');
const { emitToStore } = require('../socket');

/* ── GET vitals for a patient ── */
exports.getPatientVitals = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { admissionId, limit = 100, from, to } = req.query;

    const query = { storeId: req.storeId, patient: patientId };
    if (admissionId) query.admission = admissionId;
    if (from || to) {
      query.recordedAt = {};
      if (from) query.recordedAt.$gte = new Date(from);
      if (to)   query.recordedAt.$lte = new Date(to);
    }

    const vitals = await VitalSign.find(query)
      .populate('recordedBy', 'name')
      .sort({ recordedAt: 1 })
      .limit(Number(limit))
      .lean();

    // Get patient's admission history for comparison
    const admissions = await IPDAdmission.find({
      storeId: req.storeId, patient: patientId,
    }).select('admissionNumber admittedAt dischargedAt wardName status admissionDiagnosis').sort({ admittedAt: -1 }).limit(10).lean();

    // Summary stats
    const summary = buildSummary(vitals);

    res.json({ success: true, vitals, admissions, summary });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET latest vitals for a patient ── */
exports.getLatest = async (req, res) => {
  try {
    const { patientId } = req.params;
    const latest = await VitalSign.findOne({ storeId: req.storeId, patient: patientId })
      .sort({ recordedAt: -1 }).lean();
    res.json({ success: true, vitals: latest });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET all active patients with recent critical alerts ── */
exports.getCriticalAlerts = async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
    const alerts = await VitalSign.find({
      storeId: req.storeId,
      hasCriticalAlert: true,
      recordedAt: { $gte: since },
    })
      .populate('patient', 'name patientId')
      .sort({ recordedAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, alerts });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── RECORD vitals ── */
exports.record = async (req, res) => {
  try {
    const {
      patientId, admissionId, appointmentId, context,
      bpSystolic, bpDiastolic, bpPosition, bpArm,
      pulse, pulseRhythm,
      respiratoryRate, spo2, oxygenSupport,
      temperature, tempRoute,
      rbs, rbsTiming,
      weight, height,
      painScore, gcsScore,
      urineOutput, fluidIntake,
      notes, recordedAt,
    } = req.body;

    if (!patientId) return res.status(400).json({ success: false, message: 'Patient ID required' });

    const patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const data = {
      bpSystolic:   bpSystolic   ? Number(bpSystolic)   : undefined,
      bpDiastolic:  bpDiastolic  ? Number(bpDiastolic)  : undefined,
      pulse:        pulse        ? Number(pulse)        : undefined,
      temperature:  temperature  ? Number(temperature)  : undefined,
      spo2:         spo2         ? Number(spo2)         : undefined,
      rbs:          rbs          ? Number(rbs)          : undefined,
      weight:       weight       ? Number(weight)       : undefined,
      height:       height       ? Number(height)       : undefined,
      respiratoryRate: respiratoryRate ? Number(respiratoryRate) : undefined,
      painScore:    painScore    ? Number(painScore)    : undefined,
      gcsScore:     gcsScore     ? Number(gcsScore)     : undefined,
      urineOutput:  urineOutput  ? Number(urineOutput)  : undefined,
      fluidIntake:  fluidIntake  ? Number(fluidIntake)  : undefined,
    };

    // Detect alerts
    const alerts = VitalSign.detectAlerts(data);
    const hasCriticalAlert = alerts.some(a => a.severity === 'Critical');

    const vital = await VitalSign.create({
      storeId:     req.storeId,
      patient:     patientId,
      patientName: patient.name,
      admission:   admissionId   || null,
      appointment: appointmentId || null,
      context:     context       || 'OPD',
      notes:       notes         || '',
      bpPosition:  bpPosition    || 'Sitting',
      bpArm:       bpArm         || 'Right',
      pulseRhythm: pulseRhythm   || '',
      oxygenSupport: oxygenSupport || '',
      tempRoute:   tempRoute     || '',
      rbsTiming:   rbsTiming     || '',
      alerts,
      hasCriticalAlert,
      recordedBy:     req.user._id,
      recordedByName: req.user.name,
      recordedAt:  recordedAt ? new Date(recordedAt) : new Date(),
      ...data,
    });

    // Emit critical alert immediately
    if (hasCriticalAlert) {
      emitToStore(req.storeId, 'vitals:critical', {
        vitalId:    vital._id,
        patientName:patient.name,
        patientId:  patient.patientId,
        alerts:     alerts.filter(a => a.severity === 'Critical').map(a => a.message),
        recordedBy: req.user.name,
        context,
      });
    }

    // Also sync to IPD admission vitalsHistory for backwards compatibility
    if (admissionId) {
      await IPDAdmission.findByIdAndUpdate(admissionId, {
        $push: {
          vitalsHistory: {
            recordedAt:     vital.recordedAt,
            recordedBy:     req.user._id,
            recordedByName: req.user.name,
            bp:   data.bpSystolic && data.bpDiastolic ? `${data.bpSystolic}/${data.bpDiastolic}` : undefined,
            pulse:       data.pulse,
            temperature: data.temperature,
            spo2:        data.spo2,
            rbs:         data.rbs,
            weight:      data.weight,
            notes:       notes || '',
          },
        },
      });
    }

    res.status(201).json({
      success: true,
      vital,
      alerts,
      hasCriticalAlert,
      message: hasCriticalAlert
        ? `Vitals recorded ⚠️ ${alerts.filter(a => a.severity === 'Critical').length} critical alert(s)`
        : 'Vitals recorded successfully',
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE a vital entry ── */
exports.remove = async (req, res) => {
  try {
    const vital = await VitalSign.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!vital) return res.status(404).json({ success: false, message: 'Record not found' });
    await VitalSign.findByIdAndDelete(vital._id);
    res.json({ success: true, message: 'Vital record deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET stats for dashboard ── */
exports.getStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [todayCount, criticalCount, totalCount] = await Promise.all([
      VitalSign.countDocuments({ storeId: req.storeId, recordedAt: { $gte: today } }),
      VitalSign.countDocuments({ storeId: req.storeId, hasCriticalAlert: true, recordedAt: { $gte: new Date(Date.now() - 24 * 3600000) } }),
      VitalSign.countDocuments({ storeId: req.storeId }),
    ]);
    res.json({ success: true, stats: { todayCount, criticalCount, totalCount } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Helpers ── */
function buildSummary(vitals) {
  if (!vitals.length) return {};
  const nums = field => vitals.map(v => v[field]).filter(v => v != null);
  const avg  = arr => arr.length ? Math.round(arr.reduce((a,b) => a+b, 0) / arr.length * 10) / 10 : null;
  const min  = arr => arr.length ? Math.min(...arr) : null;
  const max  = arr => arr.length ? Math.max(...arr) : null;
  const last = field => {
    for (let i = vitals.length - 1; i >= 0; i--) {
      if (vitals[i][field] != null) return vitals[i][field];
    }
    return null;
  };

  return {
    count:       vitals.length,
    dateRange:   { from: vitals[0].recordedAt, to: vitals[vitals.length - 1].recordedAt },
    bpSystolic:  { avg: avg(nums('bpSystolic')),  min: min(nums('bpSystolic')),  max: max(nums('bpSystolic')),  last: last('bpSystolic')  },
    bpDiastolic: { avg: avg(nums('bpDiastolic')), min: min(nums('bpDiastolic')), max: max(nums('bpDiastolic')), last: last('bpDiastolic') },
    pulse:       { avg: avg(nums('pulse')),        min: min(nums('pulse')),        max: max(nums('pulse')),        last: last('pulse')       },
    temperature: { avg: avg(nums('temperature')),  min: min(nums('temperature')),  max: max(nums('temperature')),  last: last('temperature') },
    spo2:        { avg: avg(nums('spo2')),          min: min(nums('spo2')),          max: max(nums('spo2')),          last: last('spo2')        },
    rbs:         { avg: avg(nums('rbs')),            min: min(nums('rbs')),            max: max(nums('rbs')),            last: last('rbs')         },
    weight:      { avg: avg(nums('weight')),        min: min(nums('weight')),        max: max(nums('weight')),        last: last('weight')      },
  };
}