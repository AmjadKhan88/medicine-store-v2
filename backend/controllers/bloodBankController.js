const BloodUnit  = require('../models/BloodUnit');
const BloodDonor = require('../models/BloodDonor');
const Patient    = require('../models/Patient');
const { emitToStore } = require('../socket');

const BLOOD_GROUPS   = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const MIN_STOCK      = { default: 2 };  // alert when below this per blood group

/* ── Emit low stock alert ── */
async function checkAndEmitLowStock(storeId) {
  const counts = await BloodUnit.aggregate([
    { $match: { storeId, status: 'Available' } },
    { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map(c => [c._id, c.count]));
  const criticalGroups = BLOOD_GROUPS.filter(g => (countMap[g] || 0) < 2);
  if (criticalGroups.length > 0) {
    emitToStore(storeId, 'bloodBank:criticalStock', { criticalGroups, counts: countMap });
  }
}

/* ════════ BLOOD UNITS ════════ */

/* ── GET inventory summary ── */
exports.getInventory = async (req, res) => {
  try {
    // Auto-expire units
    await BloodUnit.updateMany(
      { storeId: req.storeId, status: 'Available', expiryDate: { $lt: new Date() } },
      { $set: { status: 'Expired' } }
    );

    // Count by blood group + component
    const [byGroup, byComponent, expiringSoon, recent] = await Promise.all([
      BloodUnit.aggregate([
        { $match: { storeId: req.storeId, status: 'Available' } },
        { $group: { _id: { group: '$bloodGroup', component: '$component' }, count: { $sum: 1 }, totalVolume: { $sum: '$volume' } } },
        { $sort: { '_id.group': 1 } },
      ]),
      BloodUnit.aggregate([
        { $match: { storeId: req.storeId, status: 'Available' } },
        { $group: { _id: '$component', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      BloodUnit.find({
        storeId: req.storeId,
        status:  'Available',
        expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 86400000) },
      }).sort({ expiryDate: 1 }).limit(20),
      BloodUnit.find({ storeId: req.storeId })
        .populate('donor', 'name donorId')
        .populate('issuedTo', 'name patientId')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    // Build blood group summary
    const groupSummary = {};
    BLOOD_GROUPS.forEach(g => { groupSummary[g] = { group: g, available: 0, components: {} }; });
    for (const item of byGroup) {
      const g = item._id.group;
      const c = item._id.component;
      if (!groupSummary[g]) groupSummary[g] = { group: g, available: 0, components: {} };
      groupSummary[g].available += item.count;
      groupSummary[g].components[c] = item.count;
    }

    // Stats
    const stats = await BloodUnit.aggregate([
      { $match: { storeId: req.storeId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusMap = Object.fromEntries(stats.map(s => [s._id, s.count]));

    res.json({
      success: true,
      inventory: {
        byGroup:      Object.values(groupSummary),
        byComponent,
        expiringSoon,
        recentActivity: recent,
        stats: {
          available:  statusMap.Available  || 0,
          reserved:   statusMap.Reserved   || 0,
          issued:     statusMap.Issued     || 0,
          expired:    statusMap.Expired    || 0,
          discarded:  statusMap.Discarded  || 0,
          total:      Object.values(statusMap).reduce((s, v) => s + v, 0),
        },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET all blood units (with filters) ── */
exports.getUnits = async (req, res) => {
  try {
    const { bloodGroup, component, status, search, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId };

    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (component)  query.component  = component;
    if (status)     query.status     = status;
    if (search)     query.$or = [
      { bagId:       { $regex: search, $options: 'i' } },
      { location:    { $regex: search, $options: 'i' } },
      { externalSource: { $regex: search, $options: 'i' } },
      { issuedToName:{ $regex: search, $options: 'i' } },
    ];

    const result = await BloodUnit.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { expiryDate: 1, createdAt: -1 },
      populate: [
        { path: 'donor',    select: 'name donorId' },
        { path: 'issuedTo', select: 'name patientId' },
        { path: 'reservedFor', select: 'name patientId' },
      ],
      lean: true, leanWithId: false,
    });

    res.json({
      success: true,
      units:      result.docs,
      total:      result.totalDocs,
      totalPages: result.totalPages,
      page:       result.page,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ADD blood unit ── */
exports.addUnit = async (req, res) => {
  try {
    const {
      bloodGroup, component, volume, bagType,
      collectionDate, expiryDate, processedDate,
      source, donorId, externalSource,
      hivTested, hbvTested, hcvTested, malariasTested, syphilisTested,
      allTestsClear, location, temperature, cost,
    } = req.body;

    if (!bloodGroup || !collectionDate || !expiryDate)
      return res.status(400).json({ success: false, message: 'Blood group, collection date and expiry date are required' });

    // If donor-sourced, find donor
    let donor = null;
    if (source === 'Donor' && donorId) {
      donor = await BloodDonor.findOne({ _id: donorId, storeId: req.storeId });
      if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    const unit = await BloodUnit.create({
      storeId: req.storeId,
      bloodGroup, component: component || 'Whole Blood',
      volume:   Number(volume || 450),
      bagType:  bagType || 'Single',
      collectionDate: new Date(collectionDate),
      expiryDate:     new Date(expiryDate),
      processedDate:  processedDate ? new Date(processedDate) : null,
      source: source || 'Donor',
      donor:  donor?._id || null,
      externalSource: externalSource || '',
      hivTested:      !!hivTested,
      hbvTested:      !!hbvTested,
      hcvTested:      !!hcvTested,
      malariasTested: !!malariasTested,
      syphilisTested: !!syphilisTested,
      allTestsClear:  !!allTestsClear,
      location: location || '',
      temperature: temperature || '2-6°C',
      cost: Number(cost || 0),
      addedBy: req.user._id,
    });

    // Update donor record
    if (donor) {
      donor.donationHistory.push({
        date:      new Date(collectionDate),
        bagId:     unit.bagId,
        bloodUnit: unit._id,
        volume:    Number(volume || 450),
        component: component || 'Whole Blood',
      });
      donor.totalDonations   = donor.donationHistory.length;
      donor.lastDonationDate = new Date(collectionDate);
      // Next eligible: 56 days after donation
      const eligible = new Date(collectionDate);
      eligible.setDate(eligible.getDate() + 56);
      donor.eligibleFrom = eligible;
      await donor.save();
    }

    // Emit inventory update
    emitToStore(req.storeId, 'bloodBank:unitAdded', {
      bagId: unit.bagId, bloodGroup, component, status: 'Available',
    });

    await checkAndEmitLowStock(req.storeId);

    const populated = await BloodUnit.findById(unit._id).populate('donor', 'name donorId');
    res.status(201).json({ success: true, unit: populated, message: `Blood unit ${unit.bagId} added` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ISSUE blood to patient ── */
exports.issueUnit = async (req, res) => {
  try {
    const { patientId, requestedBy, issuanceNotes, crossMatchDone } = req.body;

    const unit = await BloodUnit.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!unit) return res.status(404).json({ success: false, message: 'Blood unit not found' });

    if (!['Available','Reserved'].includes(unit.status))
      return res.status(400).json({ success: false, message: `Cannot issue — unit is ${unit.status}` });

    if (!unit.allTestsClear)
      return res.status(400).json({ success: false, message: 'Cannot issue — screening tests not cleared' });

    let patient = null;
    if (patientId) {
      patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
      if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    unit.status         = 'Issued';
    unit.issuedTo       = patient?._id || null;
    unit.issuedToName   = patient?.name || 'Unknown';
    unit.issuedAt       = new Date();
    unit.issuedBy       = req.user._id;
    unit.issuedByName   = req.user.name;
    unit.issuanceNotes  = issuanceNotes || '';
    unit.requestedBy    = requestedBy   || '';
    unit.crossMatchDone = !!crossMatchDone;
    await unit.save();

    await checkAndEmitLowStock(req.storeId);

    emitToStore(req.storeId, 'bloodBank:unitIssued', {
      bagId:       unit.bagId,
      bloodGroup:  unit.bloodGroup,
      component:   unit.component,
      patientName: patient?.name || 'Unknown',
      issuedBy:    req.user.name,
    });

    res.json({ success: true, unit, message: `${unit.bagId} issued to ${patient?.name || 'patient'}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── RESERVE blood unit ── */
exports.reserveUnit = async (req, res) => {
  try {
    const { patientId } = req.body;
    const unit = await BloodUnit.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!unit) return res.status(404).json({ success: false, message: 'Blood unit not found' });
    if (unit.status !== 'Available')
      return res.status(400).json({ success: false, message: `Unit is ${unit.status}` });

    const patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    unit.status      = 'Reserved';
    unit.reservedFor = patient._id;
    unit.reservedAt  = new Date();
    unit.reservedBy  = req.user._id;
    await unit.save();

    res.json({ success: true, unit, message: `${unit.bagId} reserved for ${patient.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── RELEASE reservation ── */
exports.releaseReservation = async (req, res) => {
  try {
    const unit = await BloodUnit.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!unit) return res.status(404).json({ success: false, message: 'Blood unit not found' });

    unit.status      = 'Available';
    unit.reservedFor = null;
    unit.reservedAt  = null;
    unit.reservedBy  = null;
    await unit.save();

    res.json({ success: true, unit, message: `Reservation released — ${unit.bagId} now available` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DISCARD unit ── */
exports.discardUnit = async (req, res) => {
  try {
    const { reason } = req.body;
    const unit = await BloodUnit.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!unit) return res.status(404).json({ success: false, message: 'Blood unit not found' });
    if (unit.status === 'Issued') return res.status(400).json({ success: false, message: 'Cannot discard — unit already issued' });

    unit.status        = 'Discarded';
    unit.discardReason = reason || '';
    unit.discardedAt   = new Date();
    unit.discardedBy   = req.user._id;
    await unit.save();

    res.json({ success: true, unit, message: `${unit.bagId} discarded` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE unit info ── */
exports.updateUnit = async (req, res) => {
  try {
    const unit = await BloodUnit.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body,
      { new: true }
    );
    if (!unit) return res.status(404).json({ success: false, message: 'Blood unit not found' });
    res.json({ success: true, unit, message: 'Unit updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ DONORS ════════ */

/* ── GET all donors ── */
exports.getDonors = async (req, res) => {
  try {
    const { bloodGroup, search, eligible, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId, isActive: true };

    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (search) query.$or = [
      { name:    { $regex: search, $options: 'i' } },
      { phone:   { $regex: search, $options: 'i' } },
      { cnic:    { $regex: search, $options: 'i' } },
      { donorId: { $regex: search, $options: 'i' } },
    ];

    const result = await BloodDonor.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { lastDonationDate: -1, createdAt: -1 },
      lean: true, leanWithId: false,
    });

    // Filter eligible donors post-query
    let donors = result.docs;
    if (eligible === 'true') {
      donors = donors.filter(d => {
        if (!d.isEligible || d.hasDisease) return false;
        if (!d.lastDonationDate) return true;
        const days = Math.floor((new Date() - new Date(d.lastDonationDate)) / 86400000);
        return days >= 56;
      });
    }

    res.json({
      success: true,
      donors,
      total:      result.totalDocs,
      totalPages: result.totalPages,
      page:       result.page,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET single donor ── */
exports.getDonor = async (req, res) => {
  try {
    const donor = await BloodDonor.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('donationHistory.bloodUnit', 'bagId status');
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    res.json({ success: true, donor });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ADD donor ── */
exports.addDonor = async (req, res) => {
  try {
    const { name, gender, age, cnic, phone, email, address, occupation, bloodGroup, medicalHistory, hasDisease, ineligibleReason } = req.body;
    if (!name || !bloodGroup) return res.status(400).json({ success: false, message: 'Name and blood group required' });

    const donor = await BloodDonor.create({
      storeId: req.storeId,
      name: name.trim(),
      gender, age: Number(age || 0),
      cnic: cnic?.trim(), phone: phone?.trim(),
      email: email?.trim(), address: address?.trim(),
      occupation: occupation?.trim(),
      bloodGroup, medicalHistory,
      hasDisease: !!hasDisease,
      isEligible: !hasDisease,
      ineligibleReason: hasDisease ? ineligibleReason : '',
    });

    res.status(201).json({ success: true, donor, message: `Donor ${donor.donorId} registered` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE donor ── */
exports.updateDonor = async (req, res) => {
  try {
    const donor = await BloodDonor.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body,
      { new: true }
    );
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    res.json({ success: true, donor, message: 'Donor updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ REPORTS & STATS ════════ */

/* ── GET stats ── */
exports.getStats = async (req, res) => {
  try {
    const [unitStats, donorStats, criticalGroups] = await Promise.all([
      BloodUnit.aggregate([
        { $match: { storeId: req.storeId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      BloodDonor.aggregate([
        { $match: { storeId: req.storeId, isActive: true } },
        { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      ]),
      BloodUnit.aggregate([
        { $match: { storeId: req.storeId, status: 'Available' } },
        { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap = Object.fromEntries(unitStats.map(s => [s._id, s.count]));
    const criticalMap = Object.fromEntries(criticalGroups.map(c => [c._id, c.count]));
    const criticalAlerts = BLOOD_GROUPS.filter(g => (criticalMap[g] || 0) < 2);

    const expiringSoon = await BloodUnit.countDocuments({
      storeId:    req.storeId,
      status:     'Available',
      expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 86400000) },
    });

    res.json({
      success: true,
      stats: {
        units: {
          available: statusMap.Available || 0,
          reserved:  statusMap.Reserved  || 0,
          issued:    statusMap.Issued    || 0,
          expired:   statusMap.Expired   || 0,
          discarded: statusMap.Discarded || 0,
          expiringSoon,
        },
        donors: {
          total:    donorStats.reduce((s, d) => s + d.count, 0),
          byGroup:  Object.fromEntries(donorStats.map(d => [d._id, d.count])),
        },
        criticalAlerts,
        availableByGroup: criticalMap,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};