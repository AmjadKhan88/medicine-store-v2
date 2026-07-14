const Ward    = require('../models/Ward');
const Patient = require('../models/Patient');

/* ────────── helpers ────────── */
const genBeds = (count, type = 'General', prefix = '') =>
  Array.from({ length: count }, (_, i) => ({
    bedNumber: `${prefix}${String(i + 1).padStart(2, '0')}`,
    type,
    status: 'Available',
  }));

/* ────────── GET all wards ────────── */
exports.getAll = async (req, res) => {
  try {
    const wards = await Ward.find({ storeId: req.storeId, isActive: true })
      .populate('beds.patient', 'name patientId phone age gender')
      .sort({ createdAt: 1 });
    res.json({ success: true, wards });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ────────── GET single ward ────────── */
exports.getOne = async (req, res) => {
  try {
    const ward = await Ward.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('beds.patient', 'name patientId phone age gender bloodGroup');
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });
    res.json({ success: true, ward });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ────────── CREATE ward ────────── */
exports.create = async (req, res) => {
  try {
    const { name, floor, type, totalBeds, notes, bedPrefix } = req.body;
    if (!name || !totalBeds)
      return res.status(400).json({ success: false, message: 'Name and total beds required' });

    const ward = await Ward.create({
      storeId: req.storeId,
      name: name.trim(),
      floor: floor?.trim(),
      type:  type || 'General',
      totalBeds: Number(totalBeds),
      notes,
      beds: genBeds(Number(totalBeds), type || 'General', bedPrefix || ''),
    });

    res.status(201).json({ success: true, ward, message: `Ward "${name}" created with ${totalBeds} beds` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ────────── UPDATE ward info ────────── */
exports.update = async (req, res) => {
  try {
    const { name, floor, type, notes } = req.body;
    const ward = await Ward.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { name, floor, type, notes },
      { new: true }
    );
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });
    res.json({ success: true, ward, message: 'Ward updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ────────── DELETE ward ────────── */
exports.remove = async (req, res) => {
  try {
    const ward = await Ward.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

    const hasOccupied = ward.beds.some(b => b.status === 'Occupied');
    if (hasOccupied)
      return res.status(400).json({ success: false, message: 'Cannot delete ward with occupied beds. Discharge patients first.' });

    ward.isActive = false;
    await ward.save();
    res.json({ success: true, message: 'Ward deactivated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ────────── ADMIT patient to bed ────────── */
exports.admitPatient = async (req, res) => {
  try {
    const { bedId } = req.params;
    const { patientId, expectedDischarge, assignedDoctor, admissionNotes } = req.body;

    if (!patientId) return res.status(400).json({ success: false, message: 'Patient ID required' });

    const ward = await Ward.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

    const bed = ward.beds.id(bedId);
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });

    if (bed.status === 'Occupied')
      return res.status(400).json({ success: false, message: `Bed ${bed.bedNumber} is already occupied` });

    if (bed.status === 'Maintenance')
      return res.status(400).json({ success: false, message: `Bed ${bed.bedNumber} is under maintenance` });

    // Check patient exists and belongs to this store
    const patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Check if patient is already admitted somewhere
    const alreadyAdmitted = await Ward.findOne({
      storeId:  req.storeId,
      'beds.patient':  patientId,
      'beds.status':   'Occupied',
    });
    if (alreadyAdmitted) {
      return res.status(400).json({
        success: false,
        message: `${patient.name} is already admitted in another bed`,
      });
    }

    bed.status          = 'Occupied';
    bed.patient         = patientId;
    bed.admittedAt      = new Date();
    bed.expectedDischarge = expectedDischarge ? new Date(expectedDischarge) : null;
    bed.assignedDoctor  = assignedDoctor || null;
    bed.admissionNotes  = admissionNotes || null;
    bed.admittedBy      = req.user._id;

    await ward.save();
    await ward.populate('beds.patient', 'name patientId phone age gender');

    res.json({ success: true, ward, message: `${patient.name} admitted to bed ${bed.bedNumber}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ────────── DISCHARGE patient ────────── */
exports.dischargePatient = async (req, res) => {
  try {
    const { bedId } = req.params;

    const ward = await Ward.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('beds.patient', 'name');
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

    const bed = ward.beds.id(bedId);
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
    if (bed.status !== 'Occupied')
      return res.status(400).json({ success: false, message: 'Bed is not occupied' });

    const patientName = bed.patient?.name || 'Patient';

    // Reset bed — mark for cleaning
    bed.status          = 'Cleaning';
    bed.patient         = null;
    bed.admittedAt      = null;
    bed.expectedDischarge = null;
    bed.assignedDoctor  = null;
    bed.admissionNotes  = null;
    bed.admittedBy      = null;

    await ward.save();
    res.json({ success: true, ward, message: `${patientName} discharged. Bed ${bed.bedNumber} marked for cleaning.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ────────── UPDATE bed status ────────── */
exports.updateBedStatus = async (req, res) => {
  try {
    const { bedId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Available', 'Cleaning', 'Maintenance', 'Reserved'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const ward = await Ward.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

    const bed = ward.beds.id(bedId);
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });

    if (bed.status === 'Occupied')
      return res.status(400).json({ success: false, message: 'Discharge patient before changing bed status' });

    bed.status = status;
    await ward.save();
    res.json({ success: true, ward, message: `Bed ${bed.bedNumber} marked as ${status}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ────────── OCCUPANCY REPORT ────────── */
exports.getReport = async (req, res) => {
  try {
    const wards = await Ward.find({ storeId: req.storeId, isActive: true })
      .populate('beds.patient', 'name patientId age gender');

    const report = wards.map(w => {
      const occupied = w.beds.filter(b => b.status === 'Occupied');
      const overdue  = occupied.filter(b =>
        b.expectedDischarge && new Date(b.expectedDischarge) < new Date()
      );

      return {
        wardId:      w._id,
        wardName:    w.name,
        floor:       w.floor,
        type:        w.type,
        totalBeds:   w.beds.length,
        available:   w.beds.filter(b => b.status === 'Available').length,
        occupied:    occupied.length,
        cleaning:    w.beds.filter(b => b.status === 'Cleaning').length,
        maintenance: w.beds.filter(b => b.status === 'Maintenance').length,
        reserved:    w.beds.filter(b => b.status === 'Reserved').length,
        occupancyRate: w.beds.length > 0
          ? Math.round((occupied.length / w.beds.length) * 100) : 0,
        overdueDischarges: overdue.length,
        occupiedBeds: occupied.map(b => ({
          bedNumber:        b.bedNumber,
          patient:          b.patient,
          admittedAt:       b.admittedAt,
          expectedDischarge:b.expectedDischarge,
          assignedDoctor:   b.assignedDoctor,
          daysAdmitted: b.admittedAt
            ? Math.floor((new Date() - new Date(b.admittedAt)) / 86400000)
            : 0,
        })),
      };
    });

    const totals = {
      totalBeds:    report.reduce((s, w) => s + w.totalBeds,   0),
      totalOccupied:report.reduce((s, w) => s + w.occupied,    0),
      totalAvailable:report.reduce((s, w) => s + w.available,  0),
      totalCleaning: report.reduce((s, w) => s + w.cleaning,   0),
      overallRate:   0,
    };
    totals.overallRate = totals.totalBeds > 0
      ? Math.round((totals.totalOccupied / totals.totalBeds) * 100) : 0;

    res.json({ success: true, report, totals });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};