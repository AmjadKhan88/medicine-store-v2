const Bill = require('../models/Bill');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');

exports.getAllBills = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20, startDate, endDate } = req.query;
    const query = {};
    if (search) query.$or = [
      { billNumber: { $regex: search, $options: 'i' } },
      { patientName: { $regex: search, $options: 'i' } },
    ];
    if (status) query.paymentStatus = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [bills, total] = await Promise.all([
      Bill.find(query).populate('patient', 'patientId phone').populate('createdBy', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Bill.countDocuments(query),
    ]);
    res.json({ success: true, bills, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('patient')
      .populate('createdBy', 'name email');
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    res.json({ success: true, bill });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { patient: patientId, items, discount = 0, tax = 0, amountPaid = 0, paymentMethod = 'Cash', notes } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Validate and build items, deduct stock
    const billItems = [];
    let subtotal = 0;

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) return res.status(404).json({ success: false, message: `Medicine ${item.medicine} not found` });
      if (medicine.stock < item.quantity)
        return res.status(400).json({ success: false, message: `Insufficient stock for ${medicine.name}` });

      const totalPrice = medicine.salePrice * item.quantity;
      subtotal += totalPrice;
      billItems.push({ medicine: medicine._id, medicineName: medicine.name, quantity: item.quantity, unitPrice: medicine.salePrice, totalPrice });

      // Deduct stock
      medicine.stock -= item.quantity;
      await medicine.save();
    }

    const totalAmount = subtotal - discount + tax;

    const bill = await Bill.create({
      patient: patientId, patientName: patient.name,
      items: billItems, subtotal, discount, tax, totalAmount,
      amountPaid, paymentMethod, notes, createdBy: req.user._id,
    });

    // Update patient totals
    patient.totalBilled += totalAmount;
    patient.totalPaid += amountPaid;
    await patient.save();

    res.status(201).json({ success: true, bill, message: 'Bill created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const { additionalPayment, paymentMethod } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    const payment = Number(additionalPayment);
    if (bill.amountPaid + payment > bill.totalAmount)
      return res.status(400).json({ success: false, message: 'Payment exceeds bill amount' });

    bill.amountPaid += payment;
    if (paymentMethod) bill.paymentMethod = paymentMethod;
    await bill.save();

    // Update patient paid amount
    await Patient.findByIdAndUpdate(bill.patient, { $inc: { totalPaid: payment } });

    res.json({ success: true, bill, message: 'Payment updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    // Restore stock
    for (const item of bill.items) {
      await Medicine.findByIdAndUpdate(item.medicine, { $inc: { stock: item.quantity } });
    }

    // Revert patient totals
    await Patient.findByIdAndUpdate(bill.patient, {
      $inc: { totalBilled: -bill.totalAmount, totalPaid: -bill.amountPaid },
    });

    await Bill.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Bill deleted and stock restored' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
