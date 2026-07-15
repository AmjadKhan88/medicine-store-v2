const IPDAdmission    = require('../models/IPDAdmission');
const MARSheet        = require('../models/MARSheet');
const MedicineRequest = require('../models/MedicineRequest');
const { emitToStore } = require('../socket');

const todayStr = () => new Date().toISOString().slice(0, 10);

/* ── Get all active patients for nurse station ── */
exports.getPatients = async (req, res) => {
  try {
    const { wardId } = req.query;
    const query = { storeId: req.storeId, status: 'Active' };

    const admissions = await IPDAdmission.find(query)
      .populate('patient', 'name patientId age gender phone bloodGroup allergies')
      .select('admissionNumber patientName patient ward wardName bedNumber bedId attendingDoctor admissionDiagnosis admittedAt expectedDischarge medicineOrders')
      .sort({ admittedAt: 1 });

    // Filter by ward if provided
    const filtered = wardId
      ? admissions.filter(a => a.ward?.toString() === wardId)
      : admissions;

    // Attach today's MAR summary to each admission
    const admissionIds = filtered.map(a => a._id);
    const marSheets = await MARSheet.find({
      admission: { $in: admissionIds },
      storeId: req.storeId,
      date: todayStr(),
    });

    const marMap = Object.fromEntries(marSheets.map(m => [m.admission.toString(), m]));

    const result = filtered.map(a => {
      const mar  = marMap[a._id.toString()];
      const doses = mar?.doses || [];
      const now   = new Date();

      // Flag overdue doses — scheduled time passed + still Pending
      const overdueCount = doses.filter(d => {
        if (d.status !== 'Pending') return false;
        const [h, m] = (d.scheduledTime || '00:00').split(':').map(Number);
        const scheduled = new Date();
        scheduled.setHours(h, m, 0, 0);
        return scheduled < now;
      }).length;

      return {
        ...a.toObject(),
        marSummary: {
          total:    doses.length,
          given:    doses.filter(d => d.status === 'Given').length,
          pending:  doses.filter(d => d.status === 'Pending').length,
          skipped:  doses.filter(d => d.status === 'Skipped').length,
          refused:  doses.filter(d => d.status === 'Refused').length,
          overdue:  overdueCount,
        },
      };
    });

    res.json({ success: true, patients: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Get full nurse view for ONE patient ── */
exports.getPatientDetail = async (req, res) => {
  try {
    const admission = await IPDAdmission.findOne({
      _id: req.params.admissionId, storeId: req.storeId, status: 'Active',
    }).populate('patient', 'name patientId age gender phone bloodGroup allergies medicalHistory');

    if (!admission) return res.status(404).json({ success: false, message: 'Active admission not found' });

    // Today's MAR
    let mar = await MARSheet.findOne({
      admission: admission._id, storeId: req.storeId, date: todayStr(),
    }).populate('doses.administeredBy', 'name');

    // Last 7 days MAR for trend
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });

    const history = await MARSheet.find({
      admission: admission._id, storeId: req.storeId,
      date: { $in: last7Days },
    }).sort({ date: -1 });

    // Pending medicine requests
    const requests = await MedicineRequest.find({
      admission: admission._id, storeId: req.storeId, status: 'Pending',
    }).sort({ createdAt: -1 });

    res.json({ success: true, admission, mar, history, requests });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Record vitals ── */
exports.recordVitals = async (req, res) => {
  try {
    const { bp, pulse, temperature, spo2, rbs, weight, notes } = req.body;

    const admission = await IPDAdmission.findOne({
      _id: req.params.admissionId, storeId: req.storeId,
    });
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    // Initialize vitalsHistory if not present
    if (!admission.vitalsHistory) admission.vitalsHistory = [];

    // Push new vitals entry
    admission.vitalsHistory = admission.vitalsHistory || [];

    // Use a custom approach — store vitals as part of the doc
    // We add to a vitalsHistory array in the document via $push
    await IPDAdmission.findByIdAndUpdate(
      admission._id,
      {
        $push: {
          vitalsHistory: {
            recordedAt: new Date(),
            recordedBy: req.user._id,
            recordedByName: req.user.name,
            bp, pulse: pulse ? Number(pulse) : null,
            temperature: temperature ? Number(temperature) : null,
            spo2: spo2 ? Number(spo2) : null,
            rbs: rbs ? Number(rbs) : null,
            weight: weight ? Number(weight) : null,
            notes: notes || '',
          },
        },
      }
    );

    // Emit alert if critical values
    const alerts = [];
    if (pulse && (Number(pulse) > 120 || Number(pulse) < 50)) alerts.push(`Critical pulse: ${pulse}`);
    if (spo2 && Number(spo2) < 90) alerts.push(`Critical SpO2: ${spo2}%`);
    if (temperature && Number(temperature) > 39.5) alerts.push(`High fever: ${temperature}°C`);
    if (rbs && Number(rbs) > 400) alerts.push(`Critical blood sugar: ${rbs}`);

    if (alerts.length > 0) {
      emitToStore(req.storeId, 'nurse:criticalVitals', {
        patientName: admission.patientName,
        bedNumber:   admission.bedNumber,
        wardName:    admission.wardName,
        alerts,
        admissionId: admission._id,
      });
    }

    const updated = await IPDAdmission.findById(admission._id)
      .populate('patient', 'name patientId');

    res.json({
      success: true,
      vitalsHistory: updated.vitalsHistory,
      criticalAlerts: alerts,
      message: `Vitals recorded for ${admission.patientName}`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Get vitals history for a patient ── */
exports.getVitals = async (req, res) => {
  try {
    const admission = await IPDAdmission.findOne({
      _id: req.params.admissionId, storeId: req.storeId,
    }).select('vitalsHistory patientName');

    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    // Return last 20 vitals records
    const vitals = (admission.vitalsHistory || []).slice(-20).reverse();
    res.json({ success: true, vitals, patientName: admission.patientName });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Request medicine from pharmacy ── */
exports.requestMedicine = async (req, res) => {
  try {
    const {
      medicineName, genericName, medicineId,
      quantity = 1, dosage, route, urgency = 'Routine', notes,
    } = req.body;

    if (!medicineName || !quantity)
      return res.status(400).json({ success: false, message: 'Medicine name and quantity required' });

    const admission = await IPDAdmission.findOne({
      _id: req.params.admissionId, storeId: req.storeId, status: 'Active',
    });
    if (!admission) return res.status(404).json({ success: false, message: 'Active admission not found' });

    const request = await MedicineRequest.create({
      storeId:          req.storeId,
      admission:        admission._id,
      patient:          admission.patient,
      patientName:      admission.patientName,
      wardName:         admission.wardName,
      bedNumber:        admission.bedNumber,
      medicineName,
      genericName:      genericName || '',
      medicine:         medicineId  || null,
      quantity:         Number(quantity),
      dosage,
      route,
      urgency,
      notes,
      requestedBy:      req.user._id,
      requestedByName:  req.user.name,
    });

    // Notify pharmacy via socket
    emitToStore(req.storeId, 'nurse:medicineRequest', {
      requestId:    request._id,
      medicineName,
      quantity,
      urgency,
      patientName:  admission.patientName,
      bedNumber:    admission.bedNumber,
      wardName:     admission.wardName,
      requestedBy:  req.user.name,
      createdAt:    request.createdAt,
    });

    res.status(201).json({
      success: true,
      request,
      message: `Medicine request sent to pharmacy — ${medicineName} (${urgency})`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Dispense medicine request (pharmacist action) ── */
exports.dispenseMedicine = async (req, res) => {
  try {
    const request = await MedicineRequest.findOne({
      _id: req.params.requestId, storeId: req.storeId,
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'Pending')
      return res.status(400).json({ success: false, message: `Request is already ${request.status}` });

    request.status          = 'Dispensed';
    request.dispensedBy     = req.user._id;
    request.dispensedByName = req.user.name;
    request.dispensedAt     = new Date();
    await request.save();

    // Notify nurse
    emitToStore(req.storeId, 'nurse:medicineDispensed', {
      requestId:    request._id,
      medicineName: request.medicineName,
      quantity:     request.quantity,
      patientName:  request.patientName,
      bedNumber:    request.bedNumber,
      dispensedBy:  req.user.name,
    });

    res.json({ success: true, request, message: `${request.medicineName} dispensed to ${request.patientName}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Cancel medicine request ── */
exports.cancelRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await MedicineRequest.findOne({
      _id: req.params.requestId, storeId: req.storeId,
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status           = 'Cancelled';
    request.cancelledReason  = reason || '';
    await request.save();
    res.json({ success: true, request, message: 'Request cancelled' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Get all pending requests (pharmacy view) ── */
exports.getPendingRequests = async (req, res) => {
  try {
    const { status = 'Pending' } = req.query;
    const requests = await MedicineRequest.find({
      storeId: req.storeId, status,
    })
      .populate('requestedBy', 'name')
      .sort({ urgency: 1, createdAt: 1 });   // STAT first

    res.json({ success: true, requests });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Get overdue alerts across all patients ── */
exports.getAlerts = async (req, res) => {
  try {
    const now   = new Date();
    const today = todayStr();

    // All active admissions
    const admissions = await IPDAdmission.find({
      storeId: req.storeId, status: 'Active',
    }).select('patientName wardName bedNumber');

    const admissionIds = admissions.map(a => a._id);
    const admMap       = Object.fromEntries(admissions.map(a => [a._id.toString(), a]));

    // Today's MAR sheets
    const sheets = await MARSheet.find({
      storeId: req.storeId,
      admission: { $in: admissionIds },
      date: today,
    });

    // Find overdue doses
    const overdueDoses = [];
    for (const sheet of sheets) {
      const adm = admMap[sheet.admission.toString()];
      for (const dose of sheet.doses) {
        if (dose.status !== 'Pending') continue;
        const [h, m] = (dose.scheduledTime || '00:00').split(':').map(Number);
        const scheduled = new Date();
        scheduled.setHours(h, m, 0, 0);
        if (scheduled < now) {
          const overdueMin = Math.round((now - scheduled) / 60000);
          overdueDoses.push({
            admissionId:  sheet.admission,
            patientName:  adm?.patientName || 'Unknown',
            bedNumber:    adm?.bedNumber   || '—',
            wardName:     adm?.wardName    || '—',
            medicineName: dose.medicineName,
            dosage:       dose.dosage,
            scheduledTime:dose.scheduledTime,
            overdueMin,
            doseId:       dose._id,
            sheetId:      sheet._id,
          });
        }
      }
    }

    // Pending medicine requests
    const pendingRequests = await MedicineRequest.find({
      storeId: req.storeId, status: 'Pending',
    }).countDocuments();

    overdueDoses.sort((a, b) => b.overdueMin - a.overdueMin); // most overdue first

    res.json({
      success: true,
      alerts: {
        overdueDoses,
        pendingRequests,
        totalOverdue: overdueDoses.length,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};