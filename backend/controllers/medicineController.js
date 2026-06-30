const audit = require('../utils/audit');
const Medicine = require('../models/Medicine');

exports.getAllMedicines = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    // const query = { isActive: true };
    const query = { isActive: true, storeId: req.storeId };

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
      Medicine.find(query).populate('addedBy', 'name').populate('substitutes', 'name genericName stock salePrice unit dosageForm').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Medicine.countDocuments(query),
    ]);

    res.json({ success: true, medicines, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id).populate('addedBy', 'name email').populate('substitutes', 'name genericName stock salePrice unit dosageForm');

    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMedicine = async (req, res) => {
  try {
    // const medicine = await Medicine.create({ ...req.body, addedBy: req.user._id });
    const medicine = await Medicine.create({ ...req.body, addedBy: req.user._id, storeId: req.storeId });

    await audit({
      action:     'MEDICINE_ADDED',
      category:   'Medicine',
      summary:    `${req.user.name} added medicine "${medicine.name}" — ${medicine.dosageForm} ${medicine.strength}, stock: ${medicine.stock} ${medicine.unit}`,
      entityType: 'Medicine',
      entityId:   medicine._id,
      entityName: medicine.name,
      meta: {
        category:      medicine.category,
        dosageForm:    medicine.dosageForm,
        strength:      medicine.strength,
        stock:         medicine.stock,
        purchasePrice: medicine.purchasePrice,
        salePrice:     medicine.salePrice,
        expiryDate:    medicine.expiryDate,
      },
      user: req.user,
      ip:   req.ip,
    });

    res.status(201).json({ success: true, medicine, message: 'Medicine added successfully' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Duplicate batch number or barcode' });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const old      = await Medicine.findById(req.params.id);
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!medicine)
      return res.status(404).json({ success: false, message: 'Medicine not found' });

    await audit({
      action:     'MEDICINE_UPDATED',
      category:   'Medicine',
      summary:    `${req.user.name} updated medicine "${medicine.name}"`,
      entityType: 'Medicine',
      entityId:   medicine._id,
      entityName: medicine.name,
      meta: {
        changes: Object.keys(req.body).reduce((acc, key) => {
          if (String(old[key]) !== String(req.body[key])) {
            acc[key] = { from: old[key], to: req.body[key] };
          }
          return acc;
        }, {}),
      },
      user: req.user,
      ip:   req.ip,
    });

    res.json({ success: true, medicine, message: 'Medicine updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    );
    if (!medicine)
      return res.status(404).json({ success: false, message: 'Medicine not found' });

    await audit({
      action:     'MEDICINE_DELETED',
      category:   'Medicine',
      summary:    `${req.user.name} deleted medicine "${medicine.name}"`,
      entityType: 'Medicine',
      entityId:   medicine._id,
      entityName: medicine.name,
      meta:       { stock: medicine.stock, salePrice: medicine.salePrice },
      user: req.user,
      ip:   req.ip,
    });

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
    const { quantity, type } = req.body;
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine)
      return res.status(404).json({ success: false, message: 'Medicine not found' });

    const oldStock = medicine.stock;
    if (type === 'add') medicine.stock += Number(quantity);
    else                medicine.stock  = Number(quantity);
    await medicine.save();

    await audit({
      action:     'STOCK_UPDATED',
      category:   'Stock',
      summary:    `${req.user.name} manually updated stock of "${medicine.name}" — ${oldStock} → ${medicine.stock} ${medicine.unit}`,
      entityType: 'Medicine',
      entityId:   medicine._id,
      entityName: medicine.name,
      meta:       { oldStock, newStock: medicine.stock, type, quantity: Number(quantity) },
      user: req.user,
      ip:   req.ip,
    });

    res.json({ success: true, medicine, message: 'Stock updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Get substitutes for a medicine (manual + auto-matched) ── */
exports.getSubstitutes = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine)
      return res.status(404).json({ success: false, message: 'Medicine not found' });

    const now = new Date();

    // 1. Manually linked substitutes (highest priority)
    const manualSubs = await Medicine.find({
      _id:      { $in: medicine.substitutes || [] },
      isActive: true,
      storeId:  req.storeId,
      stock:    { $gt: 0 },
      expiryDate: { $gt: now },
    });

    // 2. Auto-matched by same genericName (different brand, same drug)
    const sameGeneric = medicine.genericName
      ? await Medicine.find({
          _id:         { $ne: medicine._id, $nin: medicine.substitutes || [] },
          genericName: { $regex: `^${medicine.genericName}$`, $options: 'i' },
          isActive:    true,
          storeId:     req.storeId,
          stock:       { $gt: 0 },
          expiryDate:  { $gt: now },
        }).limit(5)
      : [];

    // 3. Auto-matched by same category + dosage form (broader fallback)
    const sameCategory = await Medicine.find({
      _id:        { $ne: medicine._id, $nin: [...(medicine.substitutes || []), ...sameGeneric.map(m => m._id)] },
      category:   medicine.category,
      dosageForm: medicine.dosageForm,
      isActive:   true,
      storeId:    req.storeId,
      stock:      { $gt: 0 },
      expiryDate: { $gt: now },
    }).limit(5);

    res.json({
      success: true,
      medicine: { _id: medicine._id, name: medicine.name, genericName: medicine.genericName },
      manual:        manualSubs,
      sameGeneric,
      sameCategory,
      hasAlternatives: manualSubs.length + sameGeneric.length + sameCategory.length > 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Link/unlink substitutes manually ── */
exports.updateSubstitutes = async (req, res) => {
  try {
    const { substitutes } = req.body; // array of medicine IDs
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { substitutes },
      { new: true }
    ).populate('substitutes', 'name genericName stock salePrice unit');

    if (!medicine)
      return res.status(404).json({ success: false, message: 'Medicine not found' });

    res.json({ success: true, medicine, message: 'Substitutes updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Bulk check: find substitutes for multiple medicine names at once
       (used by CreateBill when an item search returns 0 stock items) ── */
exports.findAlternativesByName = async (req, res) => {
  try {
    const { name, genericName, category } = req.query;
    const now = new Date();

    const query = {
      isActive:   true,
      storeId:    req.storeId,
      stock:      { $gt: 0 },
      expiryDate: { $gt: now },
    };

    const orConditions = [];
    if (genericName) orConditions.push({ genericName: { $regex: genericName, $options: 'i' } });
    if (category)    orConditions.push({ category });
    if (name)        orConditions.push({ name: { $regex: name, $options: 'i' } });

    if (orConditions.length === 0)
      return res.json({ success: true, alternatives: [] });

    query.$or = orConditions;

    const alternatives = await Medicine.find(query).limit(6);
    res.json({ success: true, alternatives });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};