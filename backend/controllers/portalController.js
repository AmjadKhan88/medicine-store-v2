const crypto       = require('crypto');
const Patient      = require('../models/Patient');
const Bill         = require('../models/Bill');
const Prescription = require('../models/Prescription');
const LabTest      = require('../models/LabTest');
const Appointment  = require('../models/Appointment');

/* ── Generate portal token for a patient ── */
exports.generateToken = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id:     req.params.id,
      storeId: req.storeId,
    });
    if (!patient)
      return res.status(404).json({ success: false, message: 'Patient not found' });

    // Generate a secure random token
    const token = crypto.randomBytes(24).toString('hex');
    patient.portalToken   = token;
    patient.portalEnabled = true;
    await patient.save();

    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/${token}`;

    res.json({ success: true, token, link, message: 'Portal link generated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Revoke portal access ── */
exports.revokeToken = async (req, res) => {
  try {
    await Patient.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $unset: { portalToken: 1 }, portalEnabled: false }
    );
    res.json({ success: true, message: 'Portal access revoked' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════
   PUBLIC PORTAL — no auth, token only
═══════════════════════════════════════════ */

/* ── Load portal data by token ── */
exports.getPortalData = async (req, res) => {
  try {
    const { token } = req.params;

    const patient = await Patient.findOne({
      portalToken:   token,
      portalEnabled: true,
    }).select('-addedBy -__v -storeId -portalToken');

    if (!patient)
      return res.status(404).json({
        success: false,
        code:    'INVALID_TOKEN',
        message: 'This portal link is invalid or has been disabled.',
      });

    // Update last viewed timestamp
    await Patient.findByIdAndUpdate(patient._id, { portalLastViewed: new Date() });

    // Fetch all patient data in parallel
    const [bills, prescriptions, labTests, appointments] = await Promise.allSettled([
      Bill.find({ patient: patient._id })
        .select('billNumber totalAmount amountPaid paymentStatus paymentMethod items createdAt discount tax')
        .sort({ createdAt: -1 }),

      Prescription.find({ patient: patient._id, status: { $ne: 'Cancelled' } })
        .select('rxNumber doctorName diagnosis items status validUntil createdAt notes')
        .sort({ createdAt: -1 }),

      LabTest.find({ patient: patient._id })
        .select('-file.data')
        .sort({ createdAt: -1 }),

      Appointment.find({ patient: patient._id })
        .select('date timeSlot type status doctorName diagnosis vitalSigns visitNotes medicinesGiven followUpDate')
        .sort({ date: -1 })
        .limit(20),
    ]);

    // Get store profile for branding
    const User = require('../models/User');
    const admin = await User.findById(patient.storeId || null)
      .select('name storeName phone email').catch(() => null);

    res.json({
      success: true,
      patient,
      bills:         bills.status         === 'fulfilled' ? bills.value         : [],
      prescriptions: prescriptions.status === 'fulfilled' ? prescriptions.value : [],
      labTests:      labTests.status      === 'fulfilled' ? labTests.value      : [],
      appointments:  appointments.status  === 'fulfilled' ? appointments.value  : [],
      store: admin ? {
        name:  admin.storeName || admin.name || 'MediStore Pharmacy',
        phone: admin.phone     || '',
        email: admin.email     || '',
      } : { name: 'MediStore Pharmacy', phone: '', email: '' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Download invoice PDF via portal ── */
exports.getPortalBill = async (req, res) => {
  try {
    const { token, billId } = req.params;

    // Verify token
    const patient = await Patient.findOne({ portalToken: token, portalEnabled: true });
    if (!patient)
      return res.status(403).json({ success: false, message: 'Invalid portal link' });

    const bill = await Bill.findOne({ _id: billId, patient: patient._id })
      .populate('patient', 'name patientId phone');
    if (!bill)
      return res.status(404).json({ success: false, message: 'Invoice not found' });

    res.json({ success: true, bill });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};