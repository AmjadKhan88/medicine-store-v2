const EMR          = require('../models/EMR');
const Patient      = require('../models/Patient');
const Bill         = require('../models/Bill');
const Prescription = require('../models/Prescription');
const LabTest      = require('../models/LabTest');
const Appointment  = require('../models/Appointment');
const IPDAdmission = require('../models/IPDAdmission');
const VitalSign    = require('../models/VitalSign');
const MARSheet     = require('../models/MARSheet');

/* ── Get or create EMR for a patient ── */
exports.getEMR = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    let emr = await EMR.findOne({ storeId: req.storeId, patient: patientId })
      .populate('lastUpdatedBy', 'name');

    // Auto-create if doesn't exist
    if (!emr) {
      emr = await EMR.create({
        storeId:     req.storeId,
        patient:     patientId,
        patientName: patient.name,
      });
    }

    res.json({ success: true, emr, patient });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Update EMR sections ── */
exports.updateEMR = async (req, res) => {
  try {
    const { patientId } = req.params;
    const allowed = [
      'problemList', 'currentMedications', 'allergyDetails',
      'pastMedicalHistory', 'familyHistory', 'socialHistory',
      'surgicalHistory', 'immunizations', 'reviewOfSystems',
      'functionalStatus', 'clinicalSummary',
    ];

    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    update.lastUpdatedBy     = req.user._id;
    update.lastUpdatedByName = req.user.name;

    const emr = await EMR.findOneAndUpdate(
      { storeId: req.storeId, patient: patientId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ success: true, emr, message: 'EMR updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Add / update problem ── */
exports.addProblem = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { condition, icdCode, status, severity, onsetDate, notes } = req.body;
    if (!condition) return res.status(400).json({ success: false, message: 'Condition required' });

    const emr = await EMR.findOneAndUpdate(
      { storeId: req.storeId, patient: patientId },
      {
        $push: { problemList: { condition, icdCode, status: status || 'Active', severity, onsetDate: onsetDate ? new Date(onsetDate) : null, notes, addedBy: req.user.name, addedAt: new Date() } },
        $set: { lastUpdatedBy: req.user._id, lastUpdatedByName: req.user.name },
      },
      { new: true, upsert: true }
    );
    res.status(201).json({ success: true, emr, message: `Problem "${condition}" added` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Update problem status ── */
exports.updateProblem = async (req, res) => {
  try {
    const { patientId, problemId } = req.params;
    const emr = await EMR.findOne({ storeId: req.storeId, patient: patientId });
    if (!emr) return res.status(404).json({ success: false, message: 'EMR not found' });

    const problem = emr.problemList.id(problemId);
    if (!problem) return res.status(404).json({ success: false, message: 'Problem not found' });

    Object.assign(problem, req.body);
    if (req.body.status === 'Resolved' && !problem.resolvedDate) {
      problem.resolvedDate = new Date();
    }
    emr.lastUpdatedBy     = req.user._id;
    emr.lastUpdatedByName = req.user.name;
    await emr.save();
    res.json({ success: true, emr, message: 'Problem updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Remove problem ── */
exports.removeProblem = async (req, res) => {
  try {
    const { patientId, problemId } = req.params;
    const emr = await EMR.findOneAndUpdate(
      { storeId: req.storeId, patient: patientId },
      { $pull: { problemList: { _id: problemId } } },
      { new: true }
    );
    res.json({ success: true, emr, message: 'Problem removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET full timeline ── */
exports.getTimeline = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 200 } = req.query;

    // Fetch all data in parallel
    const [bills, prescriptions, labTests, appointments, admissions, vitals] = await Promise.all([
      Bill.find({ patient: patientId, storeId: req.storeId })
        .select('billNumber totalAmount paymentStatus createdAt items paymentMethod')
        .sort({ createdAt: -1 }).limit(100).lean(),

      Prescription.find({ patient: patientId, storeId: req.storeId })
        .select('rxNumber diagnosis doctorName items status createdAt validDays')
        .sort({ createdAt: -1 }).limit(50).lean(),

      LabTest.find({ patient: patientId, storeId: req.storeId })
        .select('testName category status result orderingDoctor labName createdAt reportDate')
        .sort({ createdAt: -1 }).limit(50).lean(),

      Appointment.find({ patient: patientId, storeId: req.storeId })
        .select('doctorName type status date diagnosis visitNotes vitalSigns createdAt')
        .sort({ date: -1 }).limit(50).lean(),

      IPDAdmission.find({ patient: patientId, storeId: req.storeId })
        .select('admissionNumber status admittedAt dischargedAt wardName bedNumber attendingDoctor admissionDiagnosis dischargeDiagnosis totalCharges daysAdmitted')
        .sort({ admittedAt: -1 }).limit(20).lean(),

      VitalSign.find({ patient: patientId, storeId: req.storeId })
        .select('bpSystolic bpDiastolic pulse temperature spo2 rbs weight recordedAt recordedByName context hasCriticalAlert alerts')
        .sort({ recordedAt: -1 }).limit(Number(limit)).lean(),
    ]);

    // Build unified timeline
    const events = [];

    bills.forEach(b => events.push({
      type: 'bill', date: b.createdAt, id: b._id,
      summary: `Bill ${b.billNumber} — ₨${b.totalAmount?.toLocaleString()} (${b.paymentStatus})`,
      detail:  b,
      icon: '🧾', color: '#0ea5e9',
    }));

    prescriptions.forEach(p => events.push({
      type: 'prescription', date: p.createdAt, id: p._id,
      summary: `Prescription ${p.rxNumber}${p.diagnosis ? ` — ${p.diagnosis}` : ''} by Dr. ${p.doctorName}`,
      detail:  p,
      icon: '💊', color: '#8b5cf6',
    }));

    labTests.forEach(t => events.push({
      type: 'labTest', date: t.reportDate || t.createdAt, id: t._id,
      summary: `${t.testName} (${t.category}) — ${t.status}${t.result ? ` — ${t.result.interpretation || ''}` : ''}`,
      detail:  t,
      icon: '🔬', color: '#10b981',
    }));

    appointments.forEach(a => events.push({
      type: 'appointment', date: a.date || a.createdAt, id: a._id,
      summary: `${a.type} with Dr. ${a.doctorName}${a.status === 'Completed' && a.diagnosis ? ` — ${a.diagnosis}` : ''}`,
      detail:  a,
      icon: '📅', color: '#f59e0b',
    }));

    admissions.forEach(a => {
      events.push({
        type: 'admission', date: a.admittedAt, id: a._id,
        summary: `Admitted: ${a.admissionNumber} — ${a.wardName} Bed ${a.bedNumber}${a.admissionDiagnosis ? ` — ${a.admissionDiagnosis}` : ''}`,
        detail:  a,
        icon: '🏥', color: '#ef4444',
      });
      if (a.dischargedAt) {
        events.push({
          type: 'discharge', date: a.dischargedAt, id: `${a._id}-d`,
          summary: `Discharged: ${a.admissionNumber}${a.dischargeDiagnosis ? ` — ${a.dischargeDiagnosis}` : ''} (${typeof a.daysAdmitted === 'number' ? a.daysAdmitted : 0} days)`,
          detail:  a,
          icon: '✅', color: '#16a34a',
        });
      }
    });

    vitals.forEach(v => {
      const parts = [];
      if (v.bpSystolic && v.bpDiastolic) parts.push(`BP ${v.bpSystolic}/${v.bpDiastolic}`);
      if (v.pulse)       parts.push(`P ${v.pulse}`);
      if (v.temperature) parts.push(`T ${v.temperature}°C`);
      if (v.spo2)        parts.push(`SpO2 ${v.spo2}%`);
      if (v.rbs)         parts.push(`RBS ${v.rbs}`);
      events.push({
        type: 'vitals', date: v.recordedAt, id: v._id,
        summary: parts.join(' · ') || 'Vitals recorded',
        detail:  v,
        icon: v.hasCriticalAlert ? '🚨' : '❤️', color: v.hasCriticalAlert ? '#ef4444' : '#ec4899',
      });
    });

    // Sort by date descending
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, timeline: events.slice(0, Number(limit)), counts: {
      bills:         bills.length,
      prescriptions: prescriptions.length,
      labTests:      labTests.length,
      appointments:  appointments.length,
      admissions:    admissions.length,
      vitals:        vitals.length,
      total:         events.length,
    }});
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET summary for PDF export ── */
exports.getFullRecord = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const [emr, timelineRes] = await Promise.all([
      EMR.findOne({ storeId: req.storeId, patient: patientId }),
      // Reuse timeline logic
      (async () => {
        const [bills, prescriptions, labTests, appointments, admissions, vitals] = await Promise.all([
          Bill.find({ patient: patientId, storeId: req.storeId }).sort({ createdAt: -1 }).limit(20).lean(),
          Prescription.find({ patient: patientId, storeId: req.storeId }).sort({ createdAt: -1 }).limit(20).lean(),
          LabTest.find({ patient: patientId, storeId: req.storeId }).sort({ createdAt: -1 }).limit(20).lean(),
          Appointment.find({ patient: patientId, storeId: req.storeId }).sort({ date: -1 }).limit(20).lean(),
          IPDAdmission.find({ patient: patientId, storeId: req.storeId }).sort({ admittedAt: -1 }).limit(10).lean(),
          VitalSign.find({ patient: patientId, storeId: req.storeId }).sort({ recordedAt: -1 }).limit(10).lean(),
        ]);
        return { bills, prescriptions, labTests, appointments, admissions, vitals };
      })(),
    ]);

    res.json({ success: true, patient, emr: emr || {}, ...timelineRes });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};