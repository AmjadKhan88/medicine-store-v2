const Medicine          = require('../models/Medicine');
const Bill              = require('../models/Bill');
const PurchaseOrder     = require('../models/PurchaseOrder');
const Patient           = require('../models/Patient');
const Prescription      = require('../models/Prescription');
const ExpiryDestruction = require('../models/ExpiryDestruction');
const User              = require('../models/User');

/* ── Schedule H / Controlled drug keywords (Pakistan DRAP list) ── */
const CONTROLLED_KEYWORDS = [
  'tramadol','codeine','morphine','fentanyl','oxycodone','hydrocodone',
  'methadone','buprenorphine','nalbuphine',
  'alprazolam','diazepam','clonazepam','lorazepam','midazolam','triazolam',
  'zolpidem','zopiclone','nitrazepam',
  'phenobarbitone','phenobarbital','butalbital',
  'pseudoephedrine','ephedrine',
  'ketamine','dextromethorphan',
  'methylphenidate','amphetamine',
  'cannabis','cannabidiol',
];

const isControlledMedicine = (name = '', generic = '') => {
  const lower = `${name} ${generic}`.toLowerCase();
  return CONTROLLED_KEYWORDS.some(k => lower.includes(k));
};

const getDateRange = (from, to, month, year) => {
  let start, end;
  if (month && year) {
    start = new Date(Number(year), Number(month) - 1, 1);
    end   = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
  } else if (year && !month) {
    start = new Date(Number(year), 0, 1);
    end   = new Date(Number(year), 11, 31, 23, 59, 59, 999);
  } else if (from && to) {
    start = new Date(from);
    end   = new Date(to); end.setHours(23, 59, 59, 999);
  } else {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return { start, end };
};

/* ════════════════════════════════
   1. CONTROLLED MEDICINES REGISTER
   DRAP Form-10 equivalent
════════════════════════════════ */
exports.getControlledRegister = async (req, res) => {
  try {
    const { from, to, month, year, page = 1, limit = 30 } = req.query;
    const { start, end } = getDateRange(from, to, month, year);

    /* ── Get all bills in range ── */
    const bills = await Bill.find({
      storeId:   req.storeId,
      createdAt: { $gte: start, $lte: end },
    }).populate('patient', 'name cnic phone patientId').lean();

    /* ── Get medicines that are controlled (requiresPrescription OR keyword match) ── */
    const medIds = [...new Set(bills.flatMap(b => b.items.map(i => i.medicine?.toString())))].filter(Boolean);
    const meds   = await Medicine.find({ _id: { $in: medIds }, storeId: req.storeId })
      .select('name genericName requiresPrescription batchNumber manufacturer strength dosageForm')
      .lean();
    const medMap = Object.fromEntries(meds.map(m => [m._id.toString(), m]));

    /* ── Filter to controlled/prescription items ── */
    const entries = [];
    for (const bill of bills) {
      for (const item of bill.items) {
        const med = medMap[item.medicine?.toString()];
        if (!med) continue;
        const controlled = med.requiresPrescription || isControlledMedicine(med.name, med.genericName);
        if (!controlled) continue;

        entries.push({
          date:         bill.createdAt,
          billNumber:   bill.billNumber,
          patientName:  bill.patientName,
          patientId:    bill.patient?.patientId || '',
          patientCNIC:  bill.patient?.cnic || '—',
          patientPhone: bill.patient?.phone || '—',
          medicineName: item.medicineName,
          genericName:  med.genericName || '',
          strength:     med.strength || '',
          dosageForm:   med.dosageForm || '',
          batchNumber:  med.batchNumber || '—',
          manufacturer: med.manufacturer || '—',
          quantity:     item.quantity,
          unit:         'Pcs',
          unitPrice:    item.unitPrice,
          totalPrice:   item.totalPrice,
          isControlled: isControlledMedicine(med.name, med.genericName),
          requiresPrescription: med.requiresPrescription,
        });
      }
    }

    /* ── Paginate in memory ── */
    const totalEntries = entries.length;
    const pageNum      = Number(page);
    const limitNum     = Number(limit);
    const paginated    = entries.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const totals = {
      totalTransactions: entries.length,
      totalQuantity:     entries.reduce((s, e) => s + e.quantity, 0),
      totalValue:        entries.reduce((s, e) => s + e.totalPrice, 0),
      uniqueMedicines:   [...new Set(entries.map(e => e.medicineName))].length,
      uniquePatients:    [...new Set(entries.map(e => e.patientName))].length,
    };

    res.json({ success: true, entries: paginated, total: totalEntries, totalPages: Math.ceil(totalEntries / limitNum), page: pageNum, totals, period: { start, end } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════════════════════════════
   2. BATCH TRACKING REPORT
════════════════════════════════ */
exports.getBatchReport = async (req, res) => {
  try {
    const { batchNumber, medicineName, from, to } = req.query;

    /* ── Find medicines matching batch/name ── */
    const medQuery = { storeId: req.storeId };
    if (batchNumber)  medQuery.batchNumber  = { $regex: batchNumber,  $options: 'i' };
    if (medicineName) medQuery.name         = { $regex: medicineName, $options: 'i' };

    const medicines = await Medicine.find(medQuery)
      .select('name genericName batchNumber manufacturer expiryDate manufacturingDate stock dosageForm strength requiresPrescription')
      .lean();

    if (!medicines.length) {
      return res.json({ success: true, batches: [], total: 0, message: 'No medicines found matching the criteria' });
    }

    const medIds = medicines.map(m => m._id);
    const { start, end } = getDateRange(from, to, null, null);

    /* ── Find all sales for these medicines ── */
    const billsQuery = {
      storeId:  req.storeId,
      'items.medicine': { $in: medIds },
    };
    if (from || to) billsQuery.createdAt = { $gte: start, $lte: end };

    const bills = await Bill.find(billsQuery)
      .populate('patient', 'name cnic phone patientId')
      .lean();

    /* ── Build batch-wise report ── */
    const batchMap = {};
    for (const med of medicines) {
      const key = `${med.batchNumber || 'UNKNOWN'}_${med._id}`;
      if (!batchMap[key]) {
        batchMap[key] = {
          medicine:    med,
          batchNumber: med.batchNumber || '—',
          medicineName:med.name,
          genericName: med.genericName,
          manufacturer:med.manufacturer,
          expiryDate:  med.expiryDate,
          manufacturingDate:med.manufacturingDate,
          strength:    med.strength,
          dosageForm:  med.dosageForm,
          currentStock:med.stock,
          isExpired:   med.expiryDate < new Date(),
          requiresPrescription: med.requiresPrescription,
          isControlled:isControlledMedicine(med.name, med.genericName),
          distributions: [],
          totalDistributed: 0,
        };
      }
    }

    /* ── Attach distributions ── */
    for (const bill of bills) {
      for (const item of bill.items) {
        const med = medicines.find(m => m._id.toString() === item.medicine?.toString());
        if (!med) continue;
        const key = `${med.batchNumber || 'UNKNOWN'}_${med._id}`;
        if (!batchMap[key]) continue;

        batchMap[key].distributions.push({
          date:        bill.createdAt,
          billNumber:  bill.billNumber,
          patientName: bill.patientName,
          patientCNIC: bill.patient?.cnic || '—',
          patientPhone:bill.patient?.phone || '—',
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
        });
        batchMap[key].totalDistributed += item.quantity;
      }
    }

    /* ── Also check PurchaseOrders for batch origin ── */
    const poQuery = { storeId: req.storeId, 'items.medicine': { $in: medIds } };
    const pos     = await PurchaseOrder.find(poQuery).lean();

    const purchaseMap = {};
    for (const po of pos) {
      for (const item of po.items) {
        const med = medicines.find(m => m._id.toString() === item.medicine?.toString());
        if (!med) continue;
        const key = `${med.batchNumber || 'UNKNOWN'}_${med._id}`;
        if (!purchaseMap[key]) purchaseMap[key] = [];
        purchaseMap[key].push({
          poNumber:      po.poNumber,
          supplierName:  po.supplier?.name,
          receivedDate:  po.receivedDate || po.createdAt,
          orderedQty:    item.orderedQty,
          receivedQty:   item.receivedQty,
          unitCost:      item.unitCost,
        });
      }
    }

    const batches = Object.values(batchMap).map(b => ({
      ...b,
      purchases: purchaseMap[`${b.batchNumber}_${b.medicine._id}`] || [],
    }));

    res.json({ success: true, batches, total: batches.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════════════════════════════
   3. EXPIRY DESTRUCTION RECORDS
════════════════════════════════ */
exports.getDestructions = async (req, res) => {
  try {
    const { from, to, month, year, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId };

    if (from || to || month || year) {
      const { start, end } = getDateRange(from, to, month, year);
      query.destructionDate = { $gte: start, $lte: end };
    }

    const result = await ExpiryDestruction.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { destructionDate: -1 }, lean: true, leanWithId: false,
    });

    const totals = await ExpiryDestruction.aggregate([
      { $match: { storeId: req.storeId } },
      { $group: {
        _id: null,
        totalItems:    { $sum: 1 },
        totalQuantity: { $sum: '$quantityDestroyed' },
        totalValue:    { $sum: '$purchaseValue' },
        controlled:    { $sum: { $cond: ['$isControlled', 1, 0] } },
      }},
    ]);

    res.json({
      success:    true,
      records:    result.docs,
      total:      result.totalDocs,
      totalPages: result.totalPages,
      page:       result.page,
      totals:     totals[0] || { totalItems:0, totalQuantity:0, totalValue:0, controlled:0 },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.addDestruction = async (req, res) => {
  try {
    const {
      medicineId, medicineName, genericName, batchNumber, manufacturer,
      expiryDate, dosageForm, strength,
      quantityDestroyed, unit, purchaseValue,
      destructionDate, destructionMethod, reason, destructionLocation,
      pharmacistName, pharmacistLicense, witnessName, witnessDesignation,
      drapRefNumber, requiresDrapNotification, notes,
    } = req.body;

    if (!medicineName || !quantityDestroyed || !expiryDate)
      return res.status(400).json({ success: false, message: 'Medicine name, quantity and expiry date required' });

    let med = null;
    if (medicineId) med = await Medicine.findOne({ _id: medicineId, storeId: req.storeId });

    const record = await ExpiryDestruction.create({
      storeId:       req.storeId,
      medicine:      medicineId || null,
      medicineName:  medicineName.trim(),
      genericName:   genericName  || med?.genericName  || '',
      batchNumber:   batchNumber  || med?.batchNumber  || '',
      manufacturer:  manufacturer || med?.manufacturer || '',
      expiryDate:    new Date(expiryDate),
      dosageForm:    dosageForm   || med?.dosageForm   || '',
      strength:      strength     || med?.strength     || '',
      quantityDestroyed: Number(quantityDestroyed),
      unit:          unit || 'Pcs',
      purchaseValue: Number(purchaseValue || 0),
      destructionDate:  destructionDate ? new Date(destructionDate) : new Date(),
      destructionMethod:destructionMethod || 'Incineration',
      reason:        reason  || 'Expired',
      destructionLocation: destructionLocation || '',
      pharmacistName:pharmacistName || req.user.name,
      pharmacistLicense: pharmacistLicense || '',
      witnessName:   witnessName || '',
      witnessDesignation: witnessDesignation || '',
      isControlled:  isControlledMedicine(medicineName, genericName || ''),
      requiresDrapNotification: !!requiresDrapNotification,
      drapRefNumber: drapRefNumber || '',
      notes:         notes || '',
      recordedBy:    req.user._id,
      recordedByName:req.user.name,
    });

    // If medicine found, reduce its stock
    if (med) {
      med.stock = Math.max(0, med.stock - Number(quantityDestroyed));
      await med.save();
    }

    res.status(201).json({ success: true, record, message: `Destruction record added for ${medicineName}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateDestruction = async (req, res) => {
  try {
    const record = await ExpiryDestruction.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body, { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, record, message: 'Record updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteDestruction = async (req, res) => {
  try {
    await ExpiryDestruction.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Auto-populate from expired medicines in inventory ── */
exports.getExpiredMedicines = async (req, res) => {
  try {
    const expired = await Medicine.find({
      storeId:    req.storeId,
      isActive:   true,
      stock:      { $gt: 0 },
      expiryDate: { $lt: new Date() },
    }).select('name genericName batchNumber manufacturer expiryDate stock dosageForm strength purchasePrice').lean();

    res.json({ success: true, medicines: expired, total: expired.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════════════════════════════
   4. SUPPLIER PURCHASE RECORDS
════════════════════════════════ */
exports.getSupplierRecords = async (req, res) => {
  try {
    const { supplierName, from, to, month, year, status, page = 1, limit = 20 } = req.query;
    const { start, end } = getDateRange(from, to, month, year);

    const query = { storeId: req.storeId, createdAt: { $gte: start, $lte: end } };
    if (supplierName) query['supplier.name'] = { $regex: supplierName, $options: 'i' };
    if (status)       query.status = status;

    const result = await PurchaseOrder.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { createdAt: -1 }, lean: true, leanWithId: false,
    });

    /* ── Supplier summary ── */
    const supplierSummary = await PurchaseOrder.aggregate([
      { $match: { storeId: req.storeId, createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id:          '$supplier.name',
        totalOrders:  { $sum: 1 },
        totalValue:   { $sum: '$totalAmount' },
        totalPaid:    { $sum: '$amountPaid'  },
        lastOrder:    { $max: '$createdAt'   },
      }},
      { $sort: { totalValue: -1 } },
    ]);

    const totals = {
      orders:     result.totalDocs,
      totalValue: supplierSummary.reduce((s, x) => s + x.totalValue, 0),
      totalPaid:  supplierSummary.reduce((s, x) => s + x.totalPaid, 0),
      suppliers:  supplierSummary.length,
    };

    res.json({
      success:        true,
      orders:         result.docs,
      total:          result.totalDocs,
      totalPages:     result.totalPages,
      page:           result.page,
      supplierSummary,
      totals,
      period:         { start, end },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════════════════════════════
   5. COMPLIANCE REPORT (aggregated)
   One-click PDF-ready data
════════════════════════════════ */
exports.getComplianceReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const { start, end } = getDateRange(null, null, month, year);

    const store = await User.findById(req.storeId).select('name storeName phone email').lean();

    /* ── All data in parallel ── */
    const [
      billAgg,
      controlledBills,
      expiryDestructions,
      purchaseOrders,
      expiredMeds,
      allMeds,
    ] = await Promise.all([
      /* Total sales summary */
      Bill.aggregate([
        { $match: { storeId: req.storeId, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalBills: { $sum: 1 }, totalRevenue: { $sum: '$totalAmount' }, totalItems: { $sum: { $size: '$items' } } } },
      ]),

      /* Controlled medicines sold */
      (async () => {
        const bills = await Bill.find({ storeId: req.storeId, createdAt: { $gte: start, $lte: end } }).lean();
        const mids  = [...new Set(bills.flatMap(b => b.items.map(i => i.medicine?.toString())))];
        const meds  = await Medicine.find({ _id: { $in: mids }, storeId: req.storeId, requiresPrescription: true }).lean();
        const medSet= new Set(meds.map(m => m._id.toString()));
        let count = 0, qty = 0;
        for (const bill of bills) {
          for (const item of bill.items) {
            if (medSet.has(item.medicine?.toString())) { count++; qty += item.quantity; }
          }
        }
        return { count, qty, uniqueMeds: meds.length };
      })(),

      /* Expiry destructions this period */
      ExpiryDestruction.find({ storeId: req.storeId, destructionDate: { $gte: start, $lte: end } }).lean(),

      /* Purchase orders this period */
      PurchaseOrder.find({ storeId: req.storeId, createdAt: { $gte: start, $lte: end } }).lean(),

      /* Currently expired in stock */
      Medicine.find({ storeId: req.storeId, isActive: true, stock: { $gt: 0 }, expiryDate: { $lt: new Date() } }).lean(),

      /* Inventory summary */
      Medicine.aggregate([
        { $match: { storeId: req.storeId, isActive: true } },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          controlled: { $sum: { $cond: ['$requiresPrescription', 1, 0] } },
          expired: { $sum: { $cond: [{ $lt: ['$expiryDate', new Date()] }, 1, 0] } },
          expiringSoon: { $sum: { $cond: [{ $and: [{ $gte: ['$expiryDate', new Date()] }, { $lte: ['$expiryDate', new Date(Date.now() + 30*86400000)] }] }, 1, 0] } },
          totalValue: { $sum: { $multiply: ['$stock', '$purchasePrice'] } },
        }},
      ]),
    ]);

    const inv = allMeds[0] || { total:0, controlled:0, expired:0, expiringSoon:0, totalValue:0 };

    res.json({
      success: true,
      report: {
        store: {
          name:      store?.storeName || store?.name,
          phone:     store?.phone,
          email:     store?.email,
          reportFor: `${new Date(start).toLocaleDateString('en-PK', { month:'long', year:'numeric' })}`,
          generatedAt: new Date(),
        },
        period: { start, end, month: Number(month), year: Number(year) },
        sales: {
          totalBills:   billAgg[0]?.totalBills   || 0,
          totalRevenue: billAgg[0]?.totalRevenue || 0,
          totalItems:   billAgg[0]?.totalItems   || 0,
        },
        controlled: {
          transactions: controlledBills.count,
          totalQty:     controlledBills.qty,
          uniqueMeds:   controlledBills.uniqueMeds,
        },
        inventory: inv,
        destructions: {
          total:    expiryDestructions.length,
          quantity: expiryDestructions.reduce((s, d) => s + d.quantityDestroyed, 0),
          value:    expiryDestructions.reduce((s, d) => s + (d.purchaseValue || 0), 0),
          records:  expiryDestructions,
        },
        purchases: {
          total:      purchaseOrders.length,
          totalValue: purchaseOrders.reduce((s, p) => s + p.totalAmount, 0),
          suppliers:  [...new Set(purchaseOrders.map(p => p.supplier?.name))].filter(Boolean),
        },
        alerts: {
          expiredInStock:   expiredMeds.length,
          expiredMedicines: expiredMeds.map(m => ({ name:m.name, batch:m.batchNumber, qty:m.stock, expiry:m.expiryDate })),
        },
        complianceStatus: {
          hasControlledRegister: true,
          hasDestructionRecords: expiryDestructions.length > 0,
          hasPurchaseRecords:    purchaseOrders.length > 0,
          hasExpiredStock:       expiredMeds.length > 0,    // WARNING — needs action
          score: Math.round(
            ((expiryDestructions.length > 0 ? 25 : 0) +
             (purchaseOrders.length > 0 ? 25 : 0) +
             (expiredMeds.length === 0 ? 25 : 0) + 25) // always has sales register
          ),
        },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Dashboard stats ── */
exports.getStats = async (req, res) => {
  try {
    const now    = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [controlled, destructions, expiredStock, expiringSoon] = await Promise.all([
      (async () => {
        const meds = await Medicine.find({ storeId: req.storeId, requiresPrescription: true }).lean();
        return meds.length;
      })(),
      ExpiryDestruction.countDocuments({ storeId: req.storeId, destructionDate: { $gte: mStart } }),
      Medicine.countDocuments({ storeId: req.storeId, isActive: true, stock: { $gt: 0 }, expiryDate: { $lt: now } }),
      Medicine.countDocuments({ storeId: req.storeId, isActive: true, stock: { $gt: 0 }, expiryDate: { $gte: now, $lte: new Date(Date.now() + 30*86400000) } }),
    ]);

    res.json({ success: true, stats: { controlledMedicines: controlled, destructionsThisMonth: destructions, expiredInStock: expiredStock, expiringSoon } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};