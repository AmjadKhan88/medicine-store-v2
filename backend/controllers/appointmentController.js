const Appointment = require('../models/Appointment');
const Patient     = require('../models/Patient');
const { emitAppointmentCreated, emitAppointmentUpdated } = require('../socket');

/* ── Get all appointments (with date range + filters) ── */
exports.getAll = async (req, res) => {
  try {
    const { startDate, endDate, status, doctorName, patientId, page = 1, limit = 30 } = req.query;
    const query = { storeId: req.storeId };

    if (status)     query.status     = status;
    if (doctorName) query.doctorName = { $regex: doctorName, $options: 'i' };
    if (patientId)  query.patient    = patientId;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('patient',             'patientId phone age gender')
        .populate('linkedPrescription',  'rxNumber')
        .populate('linkedBill',          'billNumber')
        .populate('createdBy',           'name')
        .sort({ date: 1 })
        .skip(skip).limit(Number(limit)),
      Appointment.countDocuments(query),
    ]);

    res.json({ success: true, appointments, total, totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Today's appointments ── */
exports.getToday = async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      storeId: req.storeId,
      date:    { $gte: start, $lte: end },
    })
      .populate('patient', 'patientId phone age gender')
      .sort({ date: 1 });

    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Calendar view — grouped by date ── */
exports.getCalendar = async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = Number(year)  || new Date().getFullYear();
    const m = Number(month) || new Date().getMonth() + 1;

    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59);

    const appointments = await Appointment.find({
      storeId: req.storeId,
      date:    { $gte: start, $lte: end },
    })
      .populate('patient', 'patientId')
      .sort({ date: 1 });

    // Group by day number
    const grouped = {};
    appointments.forEach(a => {
      const day = new Date(a.date).getDate();
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push({
        _id:         a._id,
        patientName: a.patientName,
        timeSlot:    a.timeSlot,
        type:        a.type,
        status:      a.status,
        doctorName:  a.doctorName,
      });
    });

    res.json({ success: true, grouped, year: y, month: m });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Get single ── */
exports.getOne = async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('patient',            'name patientId phone age gender bloodGroup medicalHistory allergies')
      .populate('linkedPrescription', 'rxNumber items')
      .populate('linkedBill',         'billNumber totalAmount paymentStatus')
      .populate('createdBy',          'name');

    if (!appt)
      return res.status(404).json({ success: false, message: 'Appointment not found' });

    res.json({ success: true, appointment: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Create appointment ── */
exports.create = async (req, res) => {
  try {
    const { patient: patientId, doctorName, date, timeSlot, type, notes } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient)
      return res.status(404).json({ success: false, message: 'Patient not found' });

    const appt = await Appointment.create({
      storeId:    req.storeId,
      patient:    patientId,
      patientName:patient.name,
      doctorName,
      date:       new Date(date),
      timeSlot,
      type:       type || 'Checkup',
      visitNotes: notes,
      createdBy:  req.user._id,
    });

    try { emitAppointmentCreated(req.storeId, appt); } catch {}

    res.status(201).json({ success: true, appointment: appt, message: 'Appointment scheduled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Complete a visit (record visit details) ── */
exports.completeVisit = async (req, res) => {
  try {
    const {
      visitNotes, diagnosis, vitalSigns,
      medicinesGiven, followUpDate,
      linkedPrescription, linkedBill,
    } = req.body;

    const appt = await Appointment.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      {
        status: 'Completed',
        visitNotes,
        diagnosis,
        vitalSigns,
        medicinesGiven:  medicinesGiven  || [],
        followUpDate:    followUpDate    || null,
        linkedPrescription: linkedPrescription || null,
        linkedBill:         linkedBill         || null,
      },
      { new: true }
    );

    if (!appt)
      return res.status(404).json({ success: false, message: 'Appointment not found' });

    try { emitAppointmentUpdated(req.storeId, appt); } catch {}

    res.json({ success: true, appointment: appt, message: 'Visit recorded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Update appointment (reschedule / edit) ── */
exports.update = async (req, res) => {
  try {
    const appt = await Appointment.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!appt)
      return res.status(404).json({ success: false, message: 'Appointment not found' });

    res.json({ success: true, appointment: appt, message: 'Appointment updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Cancel appointment ── */
exports.cancel = async (req, res) => {
  try {
    const appt = await Appointment.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { status: 'Cancelled' },
      { new: true }
    );
    if (!appt)
      return res.status(404).json({ success: false, message: 'Appointment not found' });

    try { emitAppointmentUpdated(req.storeId, appt); } catch {}

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Patient visit history ── */
exports.getPatientHistory = async (req, res) => {
  try {
    const visits = await Appointment.find({
      storeId: req.storeId,
      patient: req.params.patientId,
      status:  'Completed',
    })
      .populate('linkedPrescription', 'rxNumber')
      .populate('linkedBill',         'billNumber totalAmount')
      .sort({ date: -1 });

    res.json({ success: true, visits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Stats ── */
exports.getStats = async (req, res) => {
  try {
    const today     = new Date(); today.setHours(0,0,0,0);
    const todayEnd  = new Date(); todayEnd.setHours(23,59,59,999);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0,0,0,0);

    const [todayTotal, todayCompleted, weekTotal, totalPatients] = await Promise.all([
      Appointment.countDocuments({ storeId: req.storeId, date: { $gte: today, $lte: todayEnd } }),
      Appointment.countDocuments({ storeId: req.storeId, date: { $gte: today, $lte: todayEnd }, status: 'Completed' }),
      Appointment.countDocuments({ storeId: req.storeId, date: { $gte: weekStart } }),
      Appointment.distinct('patient', { storeId: req.storeId }).then(ids => ids.length),
    ]);

    res.json({ success: true, stats: { todayTotal, todayCompleted, weekTotal, totalPatients } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};