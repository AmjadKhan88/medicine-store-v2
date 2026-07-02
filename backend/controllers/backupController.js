const Medicine      = require('../models/Medicine');
const Patient       = require('../models/Patient');
const Bill          = require('../models/Bill');
const PurchaseOrder = require('../models/PurchaseOrder');
const AuditLog      = require('../models/AuditLog');

/* ══════════════════════════════════════
   EXPORT — full JSON backup
══════════════════════════════════════ */
exports.exportBackup = async (req, res) => {
  try {
    const storeId = req.storeId;

    const [medicines, patients, bills, purchaseOrders] = await Promise.all([
      Medicine.find({ storeId, isActive: true }).lean(),
      Patient.find({ storeId, isActive: true }).lean(),
      Bill.find({ storeId }).lean(),
      PurchaseOrder.find({ storeId }).lean(),
    ]);

    const backup = {
      meta: {
        version:     '1.0',
        exportedAt:  new Date().toISOString(),
        exportedBy:  req.user.name,
        storeId:     String(storeId),
        counts: {
          medicines:      medicines.length,
          patients:       patients.length,
          bills:          bills.length,
          purchaseOrders: purchaseOrders.length,
        },
      },
      medicines,
      patients,
      bills,
      purchaseOrders,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="MediStore_Backup_${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.json(backup);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════
   EXPORT — medicines only (for Excel on frontend)
══════════════════════════════════════ */
exports.exportMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({ storeId: req.storeId, isActive: true })
      .select('-__v -storeId -addedBy -substitutes')
      .lean();
    res.json({ success: true, medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════
   EXPORT — patients only (for Excel on frontend)
══════════════════════════════════════ */
exports.exportPatients = async (req, res) => {
  try {
    const patients = await Patient.find({ storeId: req.storeId, isActive: true })
      .select('-__v -storeId -addedBy')
      .lean();
    res.json({ success: true, patients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════
   IMPORT — restore from JSON backup
══════════════════════════════════════ */
exports.importBackup = async (req, res) => {
  try {
    const { backup, options = {} } = req.body;
    // options.medicines, options.patients, options.bills, options.purchaseOrders
    // = true/false (which collections to restore)

    if (!backup?.meta)
      return res.status(400).json({ success: false, message: 'Invalid backup file format' });

    const storeId = req.storeId;
    const results = { imported: {}, skipped: {}, errors: [] };

    /* ── Medicines ── */
    if (options.medicines && backup.medicines?.length) {
      let imported = 0, skipped = 0;
      for (const med of backup.medicines) {
        try {
          const { _id, createdAt, updatedAt, ...rest } = med;
          await Medicine.findOneAndUpdate(
            { name: rest.name, storeId },
            { ...rest, storeId, isActive: true },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          imported++;
        } catch { skipped++; }
      }
      results.imported.medicines = imported;
      results.skipped.medicines  = skipped;
    }

    /* ── Patients ── */
    if (options.patients && backup.patients?.length) {
      let imported = 0, skipped = 0;
      for (const pat of backup.patients) {
        try {
          const { _id, createdAt, updatedAt, ...rest } = pat;
          await Patient.findOneAndUpdate(
            { patientId: rest.patientId, storeId },
            { ...rest, storeId, isActive: true },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          imported++;
        } catch { skipped++; }
      }
      results.imported.patients = imported;
      results.skipped.patients  = skipped;
    }

    /* ── Bills ── */
    if (options.bills && backup.bills?.length) {
      let imported = 0, skipped = 0;
      for (const bill of backup.bills) {
        try {
          const exists = await Bill.findOne({ billNumber: bill.billNumber, storeId });
          if (exists) { skipped++; continue; }
          const { _id, createdAt, updatedAt, ...rest } = bill;
          await Bill.create({ ...rest, storeId });
          imported++;
        } catch { skipped++; }
      }
      results.imported.bills = imported;
      results.skipped.bills  = skipped;
    }

    // Log the restore action
    await AuditLog.create({
      action:          'MEDICINE_ADDED',
      category:        'Medicine',
      summary:         `${req.user.name} restored a backup — medicines: ${results.imported.medicines || 0}, patients: ${results.imported.patients || 0}, bills: ${results.imported.bills || 0}`,
      performedBy:     req.user._id,
      performedByName: req.user.name,
      storeId,
      meta: { results, backupDate: backup.meta.exportedAt },
    }).catch(() => {});

    res.json({ success: true, results, message: 'Backup restored successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════
   STATS — how many records exist
══════════════════════════════════════ */
exports.getBackupStats = async (req, res) => {
  try {
    const storeId = req.storeId;
    const [medicines, patients, bills, purchaseOrders] = await Promise.all([
      Medicine.countDocuments({ storeId, isActive: true }),
      Patient.countDocuments({ storeId, isActive: true }),
      Bill.countDocuments({ storeId }),
      PurchaseOrder.countDocuments({ storeId }),
    ]);
    res.json({ success: true, stats: { medicines, patients, bills, purchaseOrders } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};