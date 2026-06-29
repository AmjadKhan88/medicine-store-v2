const Patient = require('../models/Patient');
const Bill = require('../models/Bill');
const audit = require('../utils/audit');

exports.getAllPatients = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    // const query = { isActive: true };
    const query = { isActive: true, storeId: req.storeId };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { patientId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [patients, total] = await Promise.all([
      Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Patient.countDocuments(query),
    ]);

    res.json({ success: true, patients, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const bills = await Bill.find({ patient: req.params.id }).sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, patient, bills });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPatient = async (req, res) => {
  try {
    // const patient = await Patient.create({ ...req.body, addedBy: req.user._id });
    const patient = await Patient.create({ ...req.body, addedBy: req.user._id, storeId: req.storeId });

    await audit({
      action:     'PATIENT_REGISTERED',
      category:   'Patient',
      summary:    `${req.user.name} registered new patient "${patient.name}" (${patient.patientId}) — ${patient.gender}, Age ${patient.age || '—'}, ${patient.city || '—'}`,
      entityType: 'Patient',
      entityId:   patient._id,
      entityName: patient.name,
      meta: {
        patientId:  patient.patientId,
        age:        patient.age,
        gender:     patient.gender,
        bloodGroup: patient.bloodGroup,
        city:       patient.city,
        doctor:     patient.doctor,
      },
      user: req.user,
      ip:   req.ip,
    });

    res.status(201).json({ success: true, patient, message: 'Patient registered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!patient)
      return res.status(404).json({ success: false, message: 'Patient not found' });

    await audit({
      action:     'PATIENT_UPDATED',
      category:   'Patient',
      summary:    `${req.user.name} updated patient "${patient.name}" (${patient.patientId})`,
      entityType: 'Patient',
      entityId:   patient._id,
      entityName: patient.name,
      meta:       { updatedFields: Object.keys(req.body) },
      user: req.user,
      ip:   req.ip,
    });

    res.json({ success: true, patient, message: 'Patient updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    await Patient.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPatientBalance = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const pendingBills = await Bill.find({
      patient: req.params.id,
      paymentStatus: { $in: ['Pending', 'Partial'] },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      patient: { name: patient.name, patientId: patient.patientId },
      totalBilled: patient.totalBilled,
      totalPaid: patient.totalPaid,
      remainingBalance: patient.remainingBalance,
      pendingBills,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllPatientBalances = async (req, res) => {
  try {
    const patients = await Patient.find({ isActive: true,storeId: req.storeId, $expr: { $gt: ['$totalBilled', '$totalPaid'] } })
      .sort({ createdAt: -1 });
    const data = patients.map(p => ({
      _id: p._id,
      patientId: p.patientId,
      name: p.name,
      phone: p.phone,
      totalBilled: p.totalBilled,
      totalPaid: p.totalPaid,
      remainingBalance: p.remainingBalance,
    }));
    const totalOutstanding = data.reduce((sum, p) => sum + p.remainingBalance, 0);
    res.json({ success: true, patients: data, totalOutstanding });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
