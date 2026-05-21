const Medicine = require('../models/Medicine');

exports.getAllMedicines = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { genericName: { $regex: search, $options: 'i' } },
      { batchNumber: { $regex: search, $options: 'i' } },
    ];
    if (category) query.category = category;

    const now = new Date();
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    if (status === 'expired') query.expiryDate = { $lt: now };
    else if (status === 'expiring') query.expiryDate = { $gte: now, $lte: thirtyDays };
    else if (status === 'lowstock') query.$expr = { $lte: ['$stock', '$minStock'] };

    const skip = (Number(page) - 1) * Number(limit);
    const [medicines, total] = await Promise.all([
      Medicine.find(query).populate('addedBy', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Medicine.countDocuments(query),
    ]);

    res.json({ success: true, medicines, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id).populate('addedBy', 'name email');
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, medicine, message: 'Medicine added successfully' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Duplicate batch number or barcode' });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, medicine, message: 'Medicine updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, message: 'Medicine deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getExpiryAlert = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    const sixtyDays = new Date(); sixtyDays.setDate(sixtyDays.getDate() + 60);

    const [expired, expiringSoon, expiringIn60] = await Promise.all([
      Medicine.find({ isActive: true, expiryDate: { $lt: now } }),
      Medicine.find({ isActive: true, expiryDate: { $gte: now, $lte: thirtyDays } }),
      Medicine.find({ isActive: true, expiryDate: { $gt: thirtyDays, $lte: sixtyDays } }),
    ]);

    res.json({ success: true, expired, expiringSoon, expiringIn60 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const medicines = await Medicine.find({ isActive: true, $expr: { $lte: ['$stock', '$minStock'] } });
    res.json({ success: true, medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { quantity, type } = req.body; // type: 'add' | 'set'
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    if (type === 'add') medicine.stock += Number(quantity);
    else medicine.stock = Number(quantity);
    await medicine.save();
    res.json({ success: true, medicine, message: 'Stock updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
