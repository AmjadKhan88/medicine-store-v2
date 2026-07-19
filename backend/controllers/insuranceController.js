const InsurancePanel = require('../models/InsurancePanel');
const InsuranceClaim = require('../models/InsuranceClaim');
const Patient        = require('../models/Patient');
const Bill           = require('../models/Bill');
const { emitToStore }= require('../socket');

/* ════════ PANELS ════════ */

exports.getPanels = async (req, res) => {
  try {
    const { search, type, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId, isActive: true };
    if (type)   query.type = type;
    if (search) query.$or  = [
      { name:       { $regex: search, $options: 'i' } },
      { shortCode:  { $regex: search, $options: 'i' } },
      { policyNumber:{ $regex: search, $options: 'i' } },
    ];

    const result = await InsurancePanel.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { name: 1 }, lean: true, leanWithId: false,
    });

    res.json({ success: true, panels: result.docs, total: result.totalDocs, totalPages: result.totalPages });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getPanel = async (req, res) => {
  try {
    const panel = await InsurancePanel.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!panel) return res.status(404).json({ success: false, message: 'Panel not found' });
    res.json({ success: true, panel });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createPanel = async (req, res) => {
  try {
    const { name, shortCode, type, category, coverageType, coveragePercent,
      patientCoPayPercent, maxClaimPerBill, annualLimitPerPatient, allowedServices,
      contactPerson, phone, email, address, city, website,
      policyNumber, agreementDate, expiryDate, paymentTerms,
      claimSubmissionMethod, claimPortalUrl, ntn, secp, notes } = req.body;

    if (!name || !type)
      return res.status(400).json({ success: false, message: 'Name and type required' });

    const panel = await InsurancePanel.create({
      storeId: req.storeId,
      name: name.trim(), shortCode: shortCode?.trim() || '',
      type, category: category || 'Health Insurance',
      coverageType:        coverageType        || 'Partial',
      coveragePercent:     Number(coveragePercent     || 80),
      patientCoPayPercent: Number(patientCoPayPercent || 20),
      maxClaimPerBill:     Number(maxClaimPerBill     || 0),
      annualLimitPerPatient:Number(annualLimitPerPatient || 0),
      allowedServices:     allowedServices || ['Medicine','Consultation','Lab Tests'],
      contactPerson, phone, email, address, city, website,
      policyNumber, paymentTerms: paymentTerms || 'Net 30',
      agreementDate: agreementDate ? new Date(agreementDate) : null,
      expiryDate:    expiryDate    ? new Date(expiryDate)    : null,
      claimSubmissionMethod: claimSubmissionMethod || 'Email',
      claimPortalUrl, ntn, secp, notes,
    });

    res.status(201).json({ success: true, panel, message: `Panel "${name}" created` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updatePanel = async (req, res) => {
  try {
    const panel = await InsurancePanel.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body, { new: true }
    );
    if (!panel) return res.status(404).json({ success: false, message: 'Panel not found' });
    res.json({ success: true, panel, message: 'Panel updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deletePanel = async (req, res) => {
  try {
    const claimCount = await InsuranceClaim.countDocuments({ storeId: req.storeId, panel: req.params.id });
    if (claimCount > 0)
      return res.status(400).json({ success: false, message: `Cannot delete — ${claimCount} claims exist for this panel` });
    await InsurancePanel.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ success: true, message: 'Panel deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Link patient to panel ── */
exports.linkPatient = async (req, res) => {
  try {
    const { patientId, panelId, policyNo, expiryDate } = req.body;
    const panel = await InsurancePanel.findOne({ _id: panelId, storeId: req.storeId });
    if (!panel) return res.status(404).json({ success: false, message: 'Panel not found' });

    const patient = await Patient.findOneAndUpdate(
      { _id: patientId, storeId: req.storeId },
      {
        insurancePanel:          panelId,
        insurancePanelName:      panel.name,
        insurancePolicyNo:       policyNo || '',
        insuranceCoveragePercent:panel.coveragePercent,
        insuranceExpiryDate:     expiryDate ? new Date(expiryDate) : null,
        isInsured:               true,
      },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Update panel patient count
    await InsurancePanel.findByIdAndUpdate(panelId, { $inc: { totalPatients: 0 } });

    res.json({ success: true, patient, message: `${patient.name} linked to ${panel.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── Unlink patient ── */
exports.unlinkPatient = async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.patientId, storeId: req.storeId },
      { insurancePanel: null, insurancePanelName: '', insurancePolicyNo: '', isInsured: false },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, patient, message: 'Patient unlinked from panel' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ CLAIMS ════════ */

exports.getClaims = async (req, res) => {
  try {
    const { panelId, status, search, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId };
    if (panelId) query.panel  = panelId;
    if (status)  query.status = status;
    if (search)  query.$or = [
      { claimNumber: { $regex: search, $options: 'i' } },
      { patientName: { $regex: search, $options: 'i' } },
      { billNumber:  { $regex: search, $options: 'i' } },
    ];

    const result = await InsuranceClaim.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'panel',   select: 'name shortCode type' },
        { path: 'patient', select: 'patientId phone' },
      ],
      lean: true, leanWithId: false,
    });

    res.json({ success: true, claims: result.docs, total: result.totalDocs, totalPages: result.totalPages, page: result.page });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getClaim = async (req, res) => {
  try {
    const claim = await InsuranceClaim.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('panel',   'name shortCode type coveragePercent paymentTerms claimSubmissionMethod')
      .populate('patient', 'name patientId phone insurancePolicyNo')
      .populate('bill',    'billNumber totalAmount items');
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    res.json({ success: true, claim });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CREATE claim (from bill) ── */
exports.createClaim = async (req, res) => {
  try {
    const {
      panelId, patientId, billId, admissionId,
      claimAmount, patientPortion,
      preAuthRequired, preAuthNumber, preAuthDate, preAuthAmount,
      submissionNotes, items,
    } = req.body;

    if (!panelId || !patientId || !claimAmount)
      return res.status(400).json({ success: false, message: 'Panel, patient and claim amount required' });

    const [panel, patient] = await Promise.all([
      InsurancePanel.findOne({ _id: panelId, storeId: req.storeId }),
      Patient.findOne({ _id: patientId, storeId: req.storeId }),
    ]);
    if (!panel)   return res.status(404).json({ success: false, message: 'Panel not found' });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    let bill = null;
    let totalBillAmount = Number(claimAmount) / (panel.coveragePercent / 100);
    if (billId) {
      bill = await Bill.findOne({ _id: billId, storeId: req.storeId });
      if (bill) totalBillAmount = bill.totalAmount;
    }

    const claim = await InsuranceClaim.create({
      storeId:    req.storeId,
      panel:      panelId,
      panelName:  panel.name,
      patient:    patientId,
      patientName:patient.name,
      patientPolicyNumber: patient.insurancePolicyNo || '',
      bill:       billId   || null,
      billNumber: bill?.billNumber || '',
      admission:  admissionId || null,
      totalBillAmount: Math.round(totalBillAmount),
      claimAmount:     Number(claimAmount),
      patientPortion:  Number(patientPortion || (totalBillAmount - Number(claimAmount))),
      approvedAmount:  0,
      paidAmount:      0,
      items:           items || (bill ? bill.items.map(i => ({
        description:  i.medicineName,
        quantity:     i.quantity,
        unitPrice:    i.unitPrice,
        totalPrice:   i.totalPrice,
        serviceType:  'Medicine',
        isApproved:   true,
        approvedAmount: Math.round(i.totalPrice * (panel.coveragePercent / 100)),
      })) : []),
      preAuthRequired: !!preAuthRequired,
      preAuthNumber:   preAuthNumber || '',
      preAuthDate:     preAuthDate ? new Date(preAuthDate) : null,
      preAuthAmount:   Number(preAuthAmount || 0),
      submissionNotes: submissionNotes || '',
      createdBy:       req.user._id,
      createdByName:   req.user.name,
    });

    // Update panel totals
    await InsurancePanel.findByIdAndUpdate(panelId, {
      $inc: { totalClaims: 1, totalClaimed: Number(claimAmount) },
    });

    res.status(201).json({ success: true, claim, message: `Claim ${claim.claimNumber} created` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE claim status ── */
exports.updateClaimStatus = async (req, res) => {
  try {
    const { status, approvedAmount, paidAmount, rejectionReason,
      approvalNotes, appealNotes, panelClaimRef, chequeNumber } = req.body;

    const validStatuses = ['Draft','Submitted','Under Review','Approved','Partially Approved','Rejected','Paid','Appealed'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const claim = await InsuranceClaim.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    const now = new Date();
    claim.status = status;

    if (status === 'Submitted' && !claim.submittedAt) {
      claim.submittedAt = now;
    }
    if (['Approved','Partially Approved'].includes(status)) {
      claim.approvedAt     = now;
      claim.approvedAmount = Number(approvedAmount || claim.claimAmount);
      if (approvalNotes) claim.approvalNotes = approvalNotes;
    }
    if (status === 'Rejected') {
      claim.rejectedAt      = now;
      claim.rejectionReason = rejectionReason || '';
    }
    if (status === 'Paid') {
      claim.paidAt    = now;
      claim.paidAmount= Number(paidAmount || claim.approvedAmount);
      if (chequeNumber) claim.chequeNumber = chequeNumber;
    }
    if (status === 'Appealed' && appealNotes) {
      claim.appealNotes = appealNotes;
    }
    if (panelClaimRef) claim.panelClaimRef = panelClaimRef;

    await claim.save();

    // Update panel totals on approval/payment
    if (['Approved','Partially Approved'].includes(status)) {
      await InsurancePanel.findByIdAndUpdate(claim.panel, {
        $inc: { totalApproved: Number(approvedAmount || 0) },
      });
    }
    if (status === 'Paid') {
      await InsurancePanel.findByIdAndUpdate(claim.panel, {
        $inc: { totalPaid: Number(paidAmount || 0) },
      });
      // Notify
      emitToStore(req.storeId, 'insurance:paid', {
        claimNumber: claim.claimNumber,
        patientName: claim.patientName,
        paidAmount:  claim.paidAmount,
        panelName:   claim.panelName,
      });
    }

    res.json({ success: true, claim, message: `Claim ${claim.claimNumber} → ${status}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE draft claim ── */
exports.deleteClaim = async (req, res) => {
  try {
    const claim = await InsuranceClaim.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    if (claim.status !== 'Draft')
      return res.status(400).json({ success: false, message: 'Only draft claims can be deleted' });
    await InsuranceClaim.findByIdAndDelete(claim._id);
    await InsurancePanel.findByIdAndUpdate(claim.panel, { $inc: { totalClaims: -1, totalClaimed: -claim.claimAmount } });
    res.json({ success: true, message: 'Claim deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CALCULATE coverage for a bill ── */
exports.calculateCoverage = async (req, res) => {
  try {
    const { panelId, billAmount, services } = req.body;
    const panel = await InsurancePanel.findOne({ _id: panelId, storeId: req.storeId });
    if (!panel) return res.status(404).json({ success: false, message: 'Panel not found' });

    let coverableAmount = Number(billAmount || 0);

    // Cap at max claim limit
    if (panel.maxClaimPerBill > 0 && coverableAmount > panel.maxClaimPerBill) {
      coverableAmount = panel.maxClaimPerBill;
    }

    const insurancePortion = Math.round(coverableAmount * (panel.coveragePercent / 100));
    const patientPortion   = Math.round(Number(billAmount) - insurancePortion);

    res.json({
      success: true,
      calculation: {
        totalBill:        Number(billAmount),
        coverableAmount,
        insurancePortion,
        patientPortion,
        coveragePercent:  panel.coveragePercent,
        panelName:        panel.name,
        coverageType:     panel.coverageType,
        maxClaimPerBill:  panel.maxClaimPerBill,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── PANEL REPORT ── */
exports.getPanelReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = { storeId: req.storeId };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to)   query.createdAt.$lte = new Date(to);
    }

    const [byPanel, byStatus, panels] = await Promise.all([
      InsuranceClaim.aggregate([
        { $match: query },
        { $group: {
          _id:          '$panel',
          panelName:    { $first: '$panelName' },
          totalClaims:  { $sum: 1 },
          totalClaimed: { $sum: '$claimAmount' },
          totalApproved:{ $sum: '$approvedAmount' },
          totalPaid:    { $sum: '$paidAmount' },
          patients:     { $addToSet: '$patient' },
        }},
        { $addFields: { uniquePatients: { $size: '$patients' } } },
        { $sort: { totalClaimed: -1 } },
      ]),
      InsuranceClaim.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$claimAmount' } } },
        { $sort: { count: -1 } },
      ]),
      InsurancePanel.find({ storeId: req.storeId, isActive: true }).lean(),
    ]);

    const totals = {
      claims:   byPanel.reduce((s, p) => s + p.totalClaims,   0),
      claimed:  byPanel.reduce((s, p) => s + p.totalClaimed,  0),
      approved: byPanel.reduce((s, p) => s + p.totalApproved, 0),
      paid:     byPanel.reduce((s, p) => s + p.totalPaid,     0),
      pending:  0,
    };
    totals.pending = totals.claimed - totals.paid;

    // Panel patient counts from Patient model
    const panelPatientCounts = await Patient.aggregate([
      { $match: { storeId: req.storeId, isInsured: true, insurancePanel: { $exists: true, $ne: null } } },
      { $group: { _id: '$insurancePanel', count: { $sum: 1 } } },
    ]);
    const patientCountMap = Object.fromEntries(panelPatientCounts.map(p => [p._id.toString(), p.count]));

    res.json({
      success: true,
      report: {
        byPanel: byPanel.map(p => ({
          ...p,
          registeredPatients: patientCountMap[p._id?.toString()] || 0,
        })),
        byStatus,
        totals,
        panels,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── STATS ── */
exports.getStats = async (req, res) => {
  try {
    const [panels, claims, pendingClaims, paidThisMonth] = await Promise.all([
      InsurancePanel.countDocuments({ storeId: req.storeId, isActive: true }),
      InsuranceClaim.countDocuments({ storeId: req.storeId }),
      InsuranceClaim.countDocuments({ storeId: req.storeId, status: { $in: ['Submitted','Under Review'] } }),
      InsuranceClaim.aggregate([
        { $match: { storeId: req.storeId, status: 'Paid', paidAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } },
      ]),
    ]);

    const totalOutstanding = await InsuranceClaim.aggregate([
      { $match: { storeId: req.storeId, status: { $in: ['Approved','Partially Approved'] } } },
      { $group: { _id: null, total: { $sum: '$outstandingFromInsurance' } } },
    ]);

    const insuredPatients = await Patient.countDocuments({ storeId: req.storeId, isInsured: true });

    res.json({
      success: true,
      stats: {
        panels,
        totalClaims:    claims,
        pendingClaims,
        insuredPatients,
        paidThisMonth:  paidThisMonth[0]?.total || 0,
        outstanding:    totalOutstanding[0]?.total || 0,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};