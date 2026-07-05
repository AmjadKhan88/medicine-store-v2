const emailService = require('../utils/emailService');
const Patient = require('../models/Patient');
const Bill = require('../models/Bill');
const Medicine = require('../models/Medicine');
const audit = require('../utils/audit');
const {
  emitBillCreated, emitPaymentUpdated,
  emitStockUpdated, emitLowStock, emitDashboardUpdate,
} = require('../socket');

exports.getAllBills = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20, startDate, endDate } = req.query;
    // const query = {};
    const query = { storeId: req.storeId };
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
    const {
      patient: patientId, items, discount = 0,
      tax = 0, amountPaid = 0, paymentMethod = 'Cash', notes,
    } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient)
      return res.status(404).json({ success: false, message: 'Patient not found' });

    const billItems = [];
    let subtotal = 0;

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);
      if (!medicine)
        return res.status(404).json({ success: false, message: `Medicine ${item.medicine} not found` });
      if (medicine.stock < item.quantity)
        return res.status(400).json({ success: false, message: `Insufficient stock for ${medicine.name}` });

      const totalPrice = medicine.salePrice * item.quantity;
      subtotal += totalPrice;
      billItems.push({
        medicine: medicine._id,
        medicineName: medicine.name,
        quantity: item.quantity,
        unitPrice: medicine.salePrice,
        totalPrice,
      });

      medicine.stock -= item.quantity;
      await medicine.save();

      // Log each medicine sale
      await audit({
        action: 'STOCK_UPDATED',
        category: 'Stock',
        summary: `${item.quantity} × "${medicine.name}" sold to ${patient.name} — stock: ${medicine.stock + item.quantity} → ${medicine.stock} ${medicine.unit}`,
        entityType: 'Medicine',
        entityId: medicine._id,
        entityName: medicine.name,
        meta: {
          soldQty: item.quantity,
          stockBefore: medicine.stock + item.quantity,
          stockAfter: medicine.stock,
          patientName: patient.name,
          unitPrice: medicine.salePrice,
          totalPrice,
        },
        user: req.user,
        ip: req.ip,
      });
    }

    const totalAmount = subtotal - discount + tax;

    const bill = await Bill.create({
      storeId: req.storeId,
      patient: patientId,
      patientName: patient.name,
      items: billItems,
      subtotal,
      discount,
      tax,
      totalAmount,
      amountPaid,
      paymentMethod,
      notes,
      createdBy: req.user._id,
    });

    patient.totalBilled += totalAmount;
    patient.totalPaid += amountPaid;
    await patient.save();

    // Log bill creation
    await audit({
      action: 'BILL_CREATED',
      category: 'Billing',
      summary: `Invoice ${bill.billNumber} created for ${patient.name} — total: ₨${totalAmount.toLocaleString()}, paid: ₨${Number(amountPaid).toLocaleString()}`,
      entityType: 'Bill',
      entityId: bill._id,
      entityName: bill.billNumber,
      meta: {
        patientName: patient.name,
        patientId: patient.patientId,
        itemCount: billItems.length,
        totalAmount,
        amountPaid,
        paymentMethod,
        balance: totalAmount - amountPaid,
      },
      user: req.user,
      ip: req.ip,
    });

    // Send invoice email to patient if they have an email
    try {
      const patientFull = await Patient.findById(patientId);
      if (patientFull?.email) {
        // Get store profile — stored in User model as storeName
        const storeOwner = await require('../models/User').findOne({ _id: req.storeId });
        await emailService.sendInvoiceEmail({
          email: patientFull.email,
          patientName: patient.name,
          bill: { ...bill.toJSON(), billNumber: bill.billNumber, items: billItems, createdAt: bill.createdAt },
          storeName: storeOwner?.storeName || 'MediStore Pharmacy',
          storePhone: storeOwner?.phone || '',
        });
      }
    } catch (emailErr) {
      console.error('[Email] Invoice email failed:', emailErr.message);
      // Don't fail the request if email fails
    }

    // Emit real-time events
    try {
      emitBillCreated(req.storeId, bill);

      // Check and emit any low stock after deducting
      for (const item of billItems) {
        const updatedMed = await Medicine.findById(item.medicine);
        if (updatedMed) {
          emitStockUpdated(req.storeId, updatedMed);
          if (updatedMed.stock <= updatedMed.minStock) {
            emitLowStock(req.storeId, updatedMed);
          }
        }
      }

      // Quick dashboard stats push
      const [todayBillCount, totalPatients, lowStockCount] = await Promise.all([
        Bill.countDocuments({
          storeId: req.storeId,
          createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
        }),
        Patient.countDocuments({ storeId: req.storeId, isActive: true }),
        Medicine.countDocuments({
          storeId: req.storeId,
          isActive: true,
          $expr: { $lte: ['$stock', '$minStock'] },
        }),
      ]);

      emitDashboardUpdate(req.storeId, { todayBillCount, totalPatients, lowStockCount });
    } catch (socketErr) {
      console.error('[Socket] Emit error:', socketErr.message);
    }

    res.status(201).json({ success: true, bill, message: 'Bill created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const { additionalPayment, paymentMethod } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill)
      return res.status(404).json({ success: false, message: 'Bill not found' });

    const payment = Number(additionalPayment);
    if (bill.amountPaid + payment > bill.totalAmount)
      return res.status(400).json({ success: false, message: 'Payment exceeds bill amount' });

    bill.amountPaid += payment;
    if (paymentMethod) bill.paymentMethod = paymentMethod;
    await bill.save();

    await Patient.findByIdAndUpdate(bill.patient, { $inc: { totalPaid: payment } });

    await audit({
      action: 'PAYMENT_RECORDED',
      category: 'Billing',
      summary: `Payment of ₨${payment.toLocaleString()} recorded for ${bill.patientName} — Invoice ${bill.billNumber} (${bill.paymentStatus})`,
      entityType: 'Bill',
      entityId: bill._id,
      entityName: bill.billNumber,
      meta: {
        patientName: bill.patientName,
        paymentAmount: payment,
        paymentMethod: bill.paymentMethod,
        totalPaid: bill.amountPaid,
        totalAmount: bill.totalAmount,
        remainingBalance: bill.totalAmount - bill.amountPaid,
        paymentStatus: bill.paymentStatus,
      },
      user: req.user,
      ip: req.ip,
    });

    // Send payment confirmation email
    try {
      const patientFull = await Patient.findById(bill.patient);
      if (patientFull?.email) {
        const storeOwner = await require('../models/User').findOne({ _id: req.storeId });
        await emailService.sendPaymentConfirmationEmail({
          email: patientFull.email,
          patientName: bill.patientName,
          bill,
          paymentAmount: additionalPayment,
          paymentMethod: bill.paymentMethod,
          storeName: storeOwner?.storeName || 'MediStore Pharmacy',
          storePhone: storeOwner?.phone || '',
        });
      }
    } catch (emailErr) {
      console.error('[Email] Payment confirmation email failed:', emailErr.message);
    }

    res.json({ success: true, bill, message: 'Payment updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill)
      return res.status(404).json({ success: false, message: 'Bill not found' });

    // Restore stock
    for (const item of bill.items) {
      await Medicine.findByIdAndUpdate(item.medicine, { $inc: { stock: item.quantity } });

      await audit({
        action: 'STOCK_UPDATED',
        category: 'Stock',
        summary: `Stock restored — ${item.quantity} × "${item.medicineName}" returned to inventory (Invoice ${bill.billNumber} deleted)`,
        entityType: 'Medicine',
        entityId: item.medicine,
        entityName: item.medicineName,
        meta: { restoredQty: item.quantity, reason: 'Bill deleted', billNumber: bill.billNumber },
        user: req.user,
        ip: req.ip,
      });
    }

    await Patient.findByIdAndUpdate(bill.patient, {
      $inc: { totalBilled: -bill.totalAmount, totalPaid: -bill.amountPaid },
    });

    await audit({
      action: 'BILL_DELETED',
      category: 'Billing',
      summary: `Invoice ${bill.billNumber} deleted for ${bill.patientName} — ₨${bill.totalAmount.toLocaleString()} reversed, stock restored`,
      entityType: 'Bill',
      entityId: bill._id,
      entityName: bill.billNumber,
      meta: {
        patientName: bill.patientName,
        totalAmount: bill.totalAmount,
        amountPaid: bill.amountPaid,
        itemCount: bill.items.length,
      },
      user: req.user,
      ip: req.ip,
    });

    await Bill.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Bill deleted and stock restored' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
