const IPDAdmission = require('../models/IPDAdmission');
const MARSheet     = require('../models/MARSheet');
const Patient      = require('../models/Patient');
const Medicine     = require('../models/Medicine');
const Ward         = require('../models/Ward');
const Bill         = require('../models/Bill');

/* ── helpers ── */
const todayStr = () => new Date().toISOString().slice(0, 10);

// Build dose schedule from frequency
const getScheduleTimes = (frequency) => {
  const map = {
    'Once daily':         ['08:00'],
    'Twice daily':        ['08:00', '20:00'],
    'Three times daily':  ['08:00', '14:00', '20:00'],
    'Four times daily':   ['06:00', '12:00', '18:00', '24:00'],
    'Every 6 hours':      ['06:00', '12:00', '18:00', '00:00'],
    'Every 8 hours':      ['06:00', '14:00', '22:00'],
    'Every 4 hours':      ['04:00', '08:00', '12:00', '16:00', '20:00', '00:00'],
    'As needed':          [],
    'Stat (Immediately)': [],
  };
  return map[frequency] || ['08:00'];
};

/* ── GET all admissions ── */
exports.getAll = async (req, res) => {
  try {
    const { status = 'Active', search, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId };
    if (status)  query.status = status;
    if (search)  query.$or = [
      { patientName:     { $regex: search, $options: 'i' } },
      { admissionNumber: { $regex: search, $options: 'i' } },
      { attendingDoctor: { $regex: search, $options: 'i' } },
    ];

    const result = await IPDAdmission.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { admittedAt: -1 },
      populate: [{ path: 'patient', select: 'patientId phone age gender bloodGroup' }],
      lean: true, leanWithId: false,
    });

    res.json({
      success: true,
      admissions:  result.docs,
      total:       result.totalDocs,
      totalPages:  result.totalPages,
      page:        result.page,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET single admission (full detail) ── */
exports.getOne = async (req, res) => {
  try {
    const admission = await IPDAdmission.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('patient', 'name patientId phone age gender bloodGroup allergies medicalHistory')
      .populate('admittedBy',  'name')
      .populate('dischargedBy','name');

    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });
    res.json({ success: true, admission });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CREATE admission ── */
exports.create = async (req, res) => {
  try {
    const {
      patientId, wardId, bedId,
      attendingDoctor, admissionDiagnosis,
      admissionNotes, expectedDischarge,
    } = req.body;

    if (!patientId || !wardId || !bedId)
      return res.status(400).json({ success: false, message: 'Patient, ward and bed are required' });

    const patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const ward = await Ward.findOne({ _id: wardId, storeId: req.storeId });
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

    const bed = ward.beds.id(bedId);
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });

    // Check patient not already admitted
    const existing = await IPDAdmission.findOne({
      storeId: req.storeId, patient: patientId, status: 'Active',
    });
    if (existing) return res.status(400).json({
      success: false,
      message: `${patient.name} already has an active admission (${existing.admissionNumber})`,
    });

    // Add room charge automatically (first day)
    const charges = [];
    if (bed.type) {
      const roomRates = { General: 500, 'Semi-Private': 1500, Private: 3000, ICU: 5000, Emergency: 2000 };
      const rate = roomRates[bed.type] || 500;
      charges.push({
        type: 'Room', description: `${bed.type} Room — Bed ${bed.bedNumber}`,
        quantity: 1, unitPrice: rate, totalPrice: rate, date: new Date(),
        addedBy: req.user._id,
      });
    }

    const admission = await IPDAdmission.create({
      storeId:        req.storeId,
      patient:        patientId,
      patientName:    patient.name,
      ward:           wardId,
      wardName:       ward.name,
      bedId:          bedId,
      bedNumber:      bed.bedNumber,
      attendingDoctor,
      admissionDiagnosis,
      admissionNotes,
      expectedDischarge: expectedDischarge ? new Date(expectedDischarge) : null,
      charges,
      admittedBy: req.user._id,
    });

    // Mark bed as occupied in Ward
    bed.status          = 'Occupied';
    bed.patient         = patientId;
    bed.admittedAt      = new Date();
    bed.expectedDischarge = expectedDischarge ? new Date(expectedDischarge) : null;
    bed.assignedDoctor  = attendingDoctor || null;
    bed.admissionNotes  = admissionNotes  || null;
    bed.admittedBy      = req.user._id;
    await ward.save();

    const populated = await IPDAdmission.findById(admission._id)
      .populate('patient', 'name patientId phone age gender bloodGroup');

    res.status(201).json({
      success: true, admission: populated,
      message: `${patient.name} admitted — ${admission.admissionNumber}`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ADD medicine order ── */
exports.addMedicineOrder = async (req, res) => {
  try {
    const { medicineId, medicineName, genericName, dosage, frequency, route, endDate, notes, orderedBy } = req.body;

    const admission = await IPDAdmission.findOne({ _id: req.params.id, storeId: req.storeId, status: 'Active' });
    if (!admission) return res.status(404).json({ success: false, message: 'Active admission not found' });

    const scheduleTimes = getScheduleTimes(frequency);

    const order = {
      medicine: medicineId || null,
      medicineName: medicineName?.trim(),
      genericName:  genericName?.trim(),
      dosage, frequency, route,
      scheduleTimes,
      startDate: new Date(),
      endDate:   endDate ? new Date(endDate) : null,
      notes, orderedBy, isActive: true,
    };

    admission.medicineOrders.push(order);
    await admission.save();

    // Generate today's MAR doses for this new order
    await generateMARForOrder(admission, order, todayStr(), req.storeId);

    res.json({ success: true, admission, message: `Order added: ${medicineName}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── STOP medicine order ── */
exports.stopMedicineOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const admission = await IPDAdmission.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    const order = admission.medicineOrders.id(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.isActive = false;
    order.endDate  = new Date();
    await admission.save();

    res.json({ success: true, admission, message: `${order.medicineName} order stopped` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ADD charge ── */
exports.addCharge = async (req, res) => {
  try {
    const { type, description, quantity = 1, unitPrice, medicineId } = req.body;
    if (!description || !unitPrice)
      return res.status(400).json({ success: false, message: 'Description and unit price required' });

    const admission = await IPDAdmission.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    const totalPrice = Number(quantity) * Number(unitPrice);

    admission.charges.push({
      type, description, quantity: Number(quantity),
      unitPrice: Number(unitPrice), totalPrice,
      date: new Date(), addedBy: req.user._id,
      medicine: medicineId || null,
    });

    await admission.save();
    res.json({ success: true, admission, message: `Charge added: ${description}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── REMOVE charge ── */
exports.removeCharge = async (req, res) => {
  try {
    const admission = await IPDAdmission.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    admission.charges = admission.charges.filter(c => c._id.toString() !== req.params.chargeId);
    await admission.save();
    res.json({ success: true, admission, message: 'Charge removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET MAR sheet ── */
exports.getMAR = async (req, res) => {
  try {
    const { date = todayStr() } = req.query;
    let sheet = await MARSheet.findOne({
      admission: req.params.id, storeId: req.storeId, date,
    }).populate('doses.administeredBy', 'name');

    // Auto-generate if doesn't exist and it's today
    if (!sheet && date === todayStr()) {
      const admission = await IPDAdmission.findOne({ _id: req.params.id, storeId: req.storeId, status: 'Active' });
      if (admission) {
        sheet = await generateDailyMAR(admission, date, req.storeId);
      }
    }

    res.json({ success: true, sheet: sheet || null });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ADMINISTER dose (nurse action) ── */
exports.administerDose = async (req, res) => {
  try {
    const { doseId } = req.params;
    const { status, notes } = req.body;
    const validStatuses = ['Given', 'Skipped', 'Refused', 'Hold'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const sheet = await MARSheet.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!sheet) return res.status(404).json({ success: false, message: 'MAR sheet not found' });

    const dose = sheet.doses.id(doseId);
    if (!dose) return res.status(404).json({ success: false, message: 'Dose not found' });

    dose.status             = status;
    dose.administeredAt     = new Date();
    dose.administeredBy     = req.user._id;
    dose.administeredByName = req.user.name;
    dose.notes              = notes || '';

    // If Given — deduct stock
    if (status === 'Given' && dose.medicineId) {
      await Medicine.findByIdAndUpdate(
        dose.medicineId,
        { $inc: { stock: -1 } },
      ).catch(() => {}); // don't fail if medicine not found
    }

    await sheet.save();
    await sheet.populate('doses.administeredBy', 'name');

    res.json({ success: true, sheet, message: `Dose marked as ${status}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DISCHARGE patient ── */
exports.discharge = async (req, res) => {
  try {
    const { dischargeDiagnosis, dischargeNotes, dischargeInstructions, discount = 0, amountPaid = 0 } = req.body;

    const admission = await IPDAdmission.findOne({
      _id: req.params.id, storeId: req.storeId, status: 'Active',
    }).populate('patient');
    if (!admission) return res.status(404).json({ success: false, message: 'Active admission not found' });

    // Add final day room charge
    const ward = await Ward.findById(admission.ward);
    if (ward) {
      const bed = ward.beds.id(admission.bedId);
      const roomRates = { General: 500, 'Semi-Private': 1500, Private: 3000, ICU: 5000, Emergency: 2000 };
      const rate = roomRates[bed?.type] || 500;
      const days = Math.max(1, admission.daysAdmitted);

      // Find existing room charges to avoid double-charging
      const existingRoomCharges = admission.charges.filter(c => c.type === 'Room').length;
      if (existingRoomCharges < days) {
        const remaining = days - existingRoomCharges;
        for (let i = 0; i < remaining; i++) {
          admission.charges.push({
            type: 'Room',
            description: `${bed?.type || 'General'} Room — Bed ${admission.bedNumber} (Day ${existingRoomCharges + i + 1})`,
            quantity: 1, unitPrice: rate, totalPrice: rate,
            date: new Date(), addedBy: req.user._id,
          });
        }
      }
    }

    // Update admission
    admission.status              = 'Discharged';
    admission.dischargedAt        = new Date();
    admission.dischargeDiagnosis  = dischargeDiagnosis;
    admission.dischargeNotes      = dischargeNotes;
    admission.dischargeInstructions = dischargeInstructions;
    admission.discount            = Number(discount);
    admission.amountPaid          = Number(amountPaid);
    admission.dischargedBy        = req.user._id;
    // Stop all medicine orders
    admission.medicineOrders.forEach(o => { o.isActive = false; });
    await admission.save();

    // Create final bill linked to billing system
    const patient = admission.patient;
    const billItems = admission.charges
      .filter(c => c.type === 'Medicine' && c.medicine)
      .map(c => ({
        medicine:     c.medicine,
        medicineName: c.description,
        quantity:     c.quantity,
        unitPrice:    c.unitPrice,
        totalPrice:   c.totalPrice,
      }));

    if (billItems.length > 0 || admission.totalCharges > 0) {
      const bill = await Bill.create({
        storeId:       req.storeId,
        patient:       admission.patient._id,
        patientName:   admission.patientName,
        items:         billItems,
        subtotal:      admission.totalCharges,
        discount:      Number(discount),
        tax:           0,
        totalAmount:   Math.max(0, admission.totalCharges - Number(discount)),
        amountPaid:    Number(amountPaid),
        paymentMethod: 'Cash',
        notes:         `IPD Discharge Bill — ${admission.admissionNumber}`,
        createdBy:     req.user._id,
      });

      admission.finalBill = bill._id;
      await admission.save();

      // Update patient totals
      await Patient.findByIdAndUpdate(admission.patient._id, {
        $inc: {
          totalBilled: bill.totalAmount,
          totalPaid:   Number(amountPaid),
        },
      });
    }

    // Free the bed in Ward
    if (ward) {
      const bed = ward.beds.id(admission.bedId);
      if (bed) {
        bed.status          = 'Cleaning';
        bed.patient         = null;
        bed.admittedAt      = null;
        bed.expectedDischarge = null;
        bed.assignedDoctor  = null;
        bed.admissionNotes  = null;
        bed.admittedBy      = null;
        await ward.save();
      }
    }

    res.json({ success: true, admission, message: `${admission.patientName} discharged successfully` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── RECORD payment ── */
exports.recordPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const admission = await IPDAdmission.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    admission.amountPaid += Number(amount);
    await admission.save();
    res.json({ success: true, admission, message: `Payment of ₨${amount} recorded` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET IPD stats ── */
exports.getStats = async (req, res) => {
  try {
    const [active, discharged, todayAdmissions, pendingPayments] = await Promise.all([
      IPDAdmission.countDocuments({ storeId: req.storeId, status: 'Active' }),
      IPDAdmission.countDocuments({ storeId: req.storeId, status: 'Discharged' }),
      IPDAdmission.countDocuments({
        storeId: req.storeId,
        admittedAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      }),
      IPDAdmission.countDocuments({ storeId: req.storeId, status: 'Discharged', paymentStatus: { $ne: 'Paid' } }),
    ]);

    const revenue = await IPDAdmission.aggregate([
      { $match: { storeId: req.storeId, status: 'Discharged' } },
      { $group: { _id: null, total: { $sum: '$totalCharges' }, paid: { $sum: '$amountPaid' } } },
    ]);

    res.json({
      success: true,
      stats: {
        active, discharged, todayAdmissions, pendingPayments,
        totalRevenue: revenue[0]?.total || 0,
        totalPaid:    revenue[0]?.paid  || 0,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════════════
   Internal helpers
════════════════ */
async function generateMARForOrder(admission, order, date, storeId) {
  if (!order.isActive || !order.scheduleTimes?.length) return;
  let sheet = await MARSheet.findOne({ admission: admission._id, storeId, date });
  if (!sheet) {
    sheet = new MARSheet({ storeId, admission: admission._id, patient: admission.patient, date, doses: [] });
  }
  for (const time of order.scheduleTimes) {
    const exists = sheet.doses.some(
      d => d.medicineOrderId?.toString() === order._id?.toString() && d.scheduledTime === time
    );
    if (!exists) {
      sheet.doses.push({
        medicineOrderId: order._id,
        medicineName:    order.medicineName,
        genericName:     order.genericName,
        dosage:          order.dosage,
        route:           order.route,
        scheduledTime:   time,
        status:          'Pending',
      });
    }
  }
  sheet.doses.sort((a, b) => a.scheduledTime?.localeCompare(b.scheduledTime));
  await sheet.save();
  return sheet;
}

async function generateDailyMAR(admission, date, storeId) {
  const activeOrders = admission.medicineOrders.filter(o => o.isActive);
  let sheet = await MARSheet.findOne({ admission: admission._id, storeId, date });
  if (!sheet) {
    sheet = new MARSheet({ storeId, admission: admission._id, patient: admission.patient, date, doses: [] });
  }
  for (const order of activeOrders) {
    if (!order.scheduleTimes?.length) continue;
    for (const time of order.scheduleTimes) {
      const exists = sheet.doses.some(
        d => d.medicineOrderId?.toString() === order._id?.toString() && d.scheduledTime === time
      );
      if (!exists) {
        sheet.doses.push({
          medicineOrderId: order._id,
          medicineName:    order.medicineName,
          genericName:     order.genericName,
          dosage:          order.dosage,
          route:           order.route,
          scheduledTime:   time,
          status:          'Pending',
        });
      }
    }
  }
  sheet.doses.sort((a, b) => a.scheduledTime?.localeCompare(b.scheduledTime));
  await sheet.save();
  return sheet;
}