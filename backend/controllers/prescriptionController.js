const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const Bill = require('../models/Bill');

/* ── Get all prescriptions ── */
exports.getAll = async (req, res) => {
  try {
    const { search, status, patientId, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId };

    if (status) query.status = status;
    if (patientId) query.patient = patientId;
    if (search) query.$or = [
      { rxNumber: { $regex: search, $options: 'i' } },
      { patientName: { $regex: search, $options: 'i' } },
      { doctorName: { $regex: search, $options: 'i' } },
      { diagnosis: { $regex: search, $options: 'i' } },
    ];

    const result = await Prescription.paginate(query, {
      page: Number(page),
      limit: Number(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'patient', select: 'patientId phone' },
        { path: 'createdBy', select: 'name' },
        { path: 'linkedBill', select: 'billNumber' },
      ],
      lean: true,
      leanWithId: false,
    });

    res.json({
      success: true,
      prescriptions: result.docs,
      total: result.totalDocs,
      totalPages: result.totalPages,
      page: result.page,
      hasNext: result.hasNextPage,
      hasPrev: result.hasPrevPage,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Get single prescription ── */
exports.getOne = async (req, res) => {
  try {
    const rx = await Prescription.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('patient', 'name patientId phone age gender bloodGroup city')
      .populate('createdBy', 'name')
      .populate('linkedBill', 'billNumber totalAmount paymentStatus');

    if (!rx)
      return res.status(404).json({ success: false, message: 'Prescription not found' });

    res.json({ success: true, prescription: rx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Create prescription ── */
exports.create = async (req, res) => {
  try {
    const {
      patient: patientId, doctorName, diagnosis,
      items, notes, validDays = 30,
    } = req.body;

    if (!items?.length)
      return res.status(400).json({ success: false, message: 'Add at least one medicine' });

    const patient = await Patient.findById(patientId);
    if (!patient)
      return res.status(404).json({ success: false, message: 'Patient not found' });

    // Resolve medicine names for any items with medicine IDs
    const builtItems = [];
    for (const item of items) {
      let medicineName = item.medicineName;
      if (item.medicine && !medicineName) {
        const med = await Medicine.findById(item.medicine);
        medicineName = med?.name || 'Unknown Medicine';
      }
      builtItems.push({ ...item, medicineName });
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + Number(validDays));

    const rx = await Prescription.create({
      storeId: req.storeId,
      patient: patientId,
      patientName: patient.name,
      doctorName,
      diagnosis,
      items: builtItems,
      notes,
      validUntil,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, prescription: rx, message: 'Prescription created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Update prescription ── */
exports.update = async (req, res) => {
  try {
    const rx = await Prescription.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!rx)
      return res.status(404).json({ success: false, message: 'Prescription not found' });

    res.json({ success: true, prescription: rx, message: 'Prescription updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Cancel prescription ── */
exports.cancel = async (req, res) => {
  try {
    const rx = await Prescription.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { status: 'Cancelled' },
      { new: true }
    );
    if (!rx)
      return res.status(404).json({ success: false, message: 'Prescription not found' });

    res.json({ success: true, message: 'Prescription cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Convert prescription to bill ── */
exports.convertToBill = async (req, res) => {
  try {
    const rx = await Prescription.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!rx)
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    if (rx.status === 'Dispensed')
      return res.status(400).json({ success: false, message: 'Already dispensed' });
    if (rx.status === 'Cancelled')
      return res.status(400).json({ success: false, message: 'Prescription is cancelled' });

    const patient = await Patient.findById(rx.patient);
    if (!patient)
      return res.status(404).json({ success: false, message: 'Patient not found' });

    // Build bill items from prescription — only items with a linked medicine
    const billItems = [];
    let subtotal = 0;

    for (const item of rx.items) {
      if (!item.medicine) continue; // skip free-text medicines without DB link

      const medicine = await Medicine.findById(item.medicine);
      if (!medicine || medicine.stock < item.quantity) continue;

      const totalPrice = medicine.salePrice * item.quantity;
      subtotal += totalPrice;

      billItems.push({
        medicine: medicine._id,
        medicineName: medicine.name,
        quantity: item.quantity,
        unitPrice: medicine.salePrice,
        totalPrice,
      });

      // Deduct stock
      medicine.stock -= item.quantity;
      await medicine.save();
    }

    if (billItems.length === 0)
      return res.status(400).json({
        success: false,
        message: 'No medicines with sufficient stock found in this prescription. Add medicines from inventory first.',
      });

    const bill = await Bill.create({
      storeId: req.storeId,
      patient: rx.patient,
      patientName: rx.patientName,
      items: billItems,
      subtotal,
      discount: 0,
      tax: 0,
      totalAmount: subtotal,
      amountPaid: 0,
      paymentMethod: 'Pending',
      notes: `Generated from Prescription ${rx.rxNumber}`,
      createdBy: req.user._id,
    });

    // Update patient totals
    patient.totalBilled += subtotal;
    await patient.save();

    // Mark prescription as dispensed + link bill
    rx.status = 'Dispensed';
    rx.linkedBill = bill._id;
    await rx.save();

    res.json({
      success: true,
      bill,
      prescription: rx,
      message: `Invoice ${bill.billNumber} created from ${rx.rxNumber}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Patient prescription history ── */
exports.getPatientHistory = async (req, res) => {
  try {
    const rxList = await Prescription.find({
      storeId: req.storeId,
      patient: req.params.patientId,
    })
      .populate('linkedBill', 'billNumber totalAmount')
      .sort({ createdAt: -1 });

    res.json({ success: true, prescriptions: rxList });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Stats ── */
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    const [total, active, dispensed, expiring] = await Promise.all([
      Prescription.countDocuments({ storeId: req.storeId }),
      Prescription.countDocuments({ storeId: req.storeId, status: 'Active' }),
      Prescription.countDocuments({ storeId: req.storeId, status: 'Dispensed' }),
      Prescription.countDocuments({
        storeId: req.storeId,
        status: 'Active',
        validUntil: { $gte: today, $lte: new Date(today.getTime() + 7 * 86400000) },
      }),
    ]);
    res.json({ success: true, stats: { total, active, dispensed, expiring } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};