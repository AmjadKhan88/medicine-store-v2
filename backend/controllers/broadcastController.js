const Broadcast   = require('../models/Broadcast');
const Patient     = require('../models/Patient');
const Appointment = require('../models/Appointment');

/* ── Build patient query from filter ── */
async function buildPatientList(storeId, filter) {
  const base = { storeId, isActive: true, phone: { $exists: true, $nin: ['', null] } };
  const query = { ...base };

  switch (filter.type) {
    case 'all':
      break;

    case 'condition':
      if (filter.condition) {
        query.$or = [
          { medicalHistory: { $regex: filter.condition, $options: 'i' } },
          { allergies:      { $regex: filter.condition, $options: 'i' } },
        ];
      }
      break;

    case 'city':
      if (filter.city) query.city = { $regex: filter.city, $options: 'i' };
      break;

    case 'blood-group':
      if (filter.bloodGroup) query.bloodGroup = filter.bloodGroup;
      break;

    case 'age-range':
      if (filter.ageMin != null || filter.ageMax != null) {
        query.age = {};
        if (filter.ageMin != null) query.age.$gte = Number(filter.ageMin);
        if (filter.ageMax != null) query.age.$lte = Number(filter.ageMax);
      }
      break;

    case 'outstanding':
      // patients where totalBilled - totalPaid > threshold
      const threshold = Number(filter.outstandingMin || 1);
      query.$expr = { $gt: [{ $subtract: ['$totalBilled', '$totalPaid'] }, threshold] };
      break;

    case 'insured':
      query.isInsured = true;
      break;

    case 'custom':
      if (filter.customSearch) {
        query.$or = [
          { name:      { $regex: filter.customSearch, $options: 'i' } },
          { phone:     { $regex: filter.customSearch, $options: 'i' } },
          { patientId: { $regex: filter.customSearch, $options: 'i' } },
          { city:      { $regex: filter.customSearch, $options: 'i' } },
        ];
      }
      break;

    default:
      break;
  }

  let patients = await Patient.find(query)
    .select('name phone patientId city bloodGroup age medicalHistory')
    .limit(1000)
    .lean();

  // Post-filter: last-visit requires Appointment lookup
  if (filter.type === 'last-visit' && filter.lastVisitDays) {
    const cutoff = new Date(Date.now() - Number(filter.lastVisitDays) * 86400000);
    const recentlySeenIds = await Appointment.distinct('patient', {
      storeId,
      date:   { $gte: cutoff },
      status: 'Completed',
    });
    const recentSet = new Set(recentlySeenIds.map(id => id.toString()));
    patients = patients.filter(p => !recentSet.has(p._id.toString()));
  }

  // Post-filter: upcoming appointments
  if (filter.type === 'upcoming-appointments') {
    const next48h = new Date(Date.now() + 48 * 3600000);
    const appts = await Appointment.find({
      storeId,
      date:   { $gte: new Date(), $lte: next48h },
      status: 'Scheduled',
    }).select('patient').lean();
    const upcoming = new Set(appts.map(a => a.patient.toString()));
    patients = patients.filter(p => upcoming.has(p._id.toString()));
  }

  return patients;
}

/* ── Personalize message ── */
function personalize(template, patient, storeName) {
  return template
    .replace(/{name}/gi,      patient.name || 'Patient')
    .replace(/{firstName}/gi, (patient.name || '').split(' ')[0] || 'Patient')
    .replace(/{city}/gi,      patient.city || '')
    .replace(/{bloodGroup}/gi,patient.bloodGroup || '')
    .replace(/{storeName}/gi, storeName || 'our clinic')
    .replace(/{patientId}/gi, patient.patientId || '');
}

/* ── GET all broadcasts ── */
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await Broadcast.paginate({ storeId: req.storeId }, {
      page: Number(page), limit: Number(limit),
      sort: { createdAt: -1 }, lean: true, leanWithId: false,
    });
    res.json({ success: true, broadcasts: result.docs, total: result.totalDocs, totalPages: result.totalPages });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET single broadcast ── */
exports.getOne = async (req, res) => {
  try {
    const broadcast = await Broadcast.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('recipients.patient', 'name patientId phone');
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    res.json({ success: true, broadcast });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── PREVIEW audience before creating ── */
exports.previewAudience = async (req, res) => {
  try {
    const { filter } = req.body;
    const patients = await buildPatientList(req.storeId, filter || { type: 'all' });
    const withPhone    = patients.filter(p => p.phone);
    const withoutPhone = patients.filter(p => !p.phone);

    res.json({
      success: true,
      total:       patients.length,
      withPhone:   withPhone.length,
      withoutPhone:withoutPhone.length,
      sample:      withPhone.slice(0, 5).map(p => ({ name: p.name, phone: p.phone, patientId: p.patientId })),
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CREATE broadcast ── */
exports.create = async (req, res) => {
  try {
    const { title, filter, messageTemplate, channel, templateType, scheduledAt } = req.body;

    if (!title || !messageTemplate)
      return res.status(400).json({ success: false, message: 'Title and message template required' });

    const patients = await buildPatientList(req.storeId, filter || { type: 'all' });
    const storeName = req.user.storeName || req.user.name;

    const recipients = patients.map(p => ({
      patient:         p._id,
      patientName:     p.name,
      phone:           p.phone || '',
      personalizedMsg: personalize(messageTemplate, p, storeName),
      status:          p.phone ? 'Pending' : 'Skipped',
      channel:         channel || 'WhatsApp',
    }));

    const broadcast = await Broadcast.create({
      storeId:        req.storeId,
      title,
      filter:         filter || { type: 'all' },
      messageTemplate,
      channel:        channel || 'WhatsApp',
      templateType:   templateType || 'Custom',
      recipients,
      totalCount:     recipients.filter(r => r.status !== 'Skipped').length,
      skippedCount:   recipients.filter(r => r.status === 'Skipped').length,
      scheduledAt:    scheduledAt ? new Date(scheduledAt) : null,
      createdBy:      req.user._id,
      createdByName:  req.user.name,
    });

    res.status(201).json({
      success: true,
      broadcast,
      message: `Broadcast created — ${recipients.filter(r => r.status !== 'Skipped').length} recipients`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── MARK recipient as sent/failed ── */
exports.markRecipient = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { status } = req.body;   // 'Sent' | 'Failed' | 'Skipped'

    const broadcast = await Broadcast.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });

    const recipient = broadcast.recipients.id(recipientId);
    if (!recipient) return res.status(404).json({ success: false, message: 'Recipient not found' });

    recipient.status = status;
    if (status === 'Sent') recipient.sentAt = new Date();

    // Recalculate counts
    broadcast.sentCount    = broadcast.recipients.filter(r => r.status === 'Sent').length;
    broadcast.failedCount  = broadcast.recipients.filter(r => r.status === 'Failed').length;
    broadcast.skippedCount = broadcast.recipients.filter(r => r.status === 'Skipped').length;

    // Check if completed
    const remaining = broadcast.recipients.filter(r => r.status === 'Pending').length;
    if (remaining === 0 && broadcast.status === 'In Progress') {
      broadcast.status      = 'Completed';
      broadcast.completedAt = new Date();
    }

    if (broadcast.status === 'Draft') {
      broadcast.status    = 'In Progress';
      broadcast.startedAt = new Date();
    }

    await broadcast.save();
    res.json({ success: true, broadcast, remaining, message: `Recipient marked as ${status}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── BULK mark all pending as sent (when user finishes manually) ── */
exports.markAllSent = async (req, res) => {
  try {
    const broadcast = await Broadcast.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });

    broadcast.recipients.forEach(r => {
      if (r.status === 'Pending') {
        r.status  = 'Sent';
        r.sentAt  = new Date();
      }
    });

    broadcast.sentCount    = broadcast.recipients.filter(r => r.status === 'Sent').length;
    broadcast.status       = 'Completed';
    broadcast.completedAt  = new Date();

    await broadcast.save();
    res.json({ success: true, broadcast, message: `All messages marked as sent` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CANCEL broadcast ── */
exports.cancel = async (req, res) => {
  try {
    const broadcast = await Broadcast.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { status: 'Cancelled' },
      { new: true }
    );
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    res.json({ success: true, broadcast, message: 'Broadcast cancelled' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE draft broadcast ── */
exports.remove = async (req, res) => {
  try {
    const broadcast = await Broadcast.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!broadcast) return res.status(404).json({ success: false, message: 'Not found' });
    if (broadcast.status === 'Completed')
      return res.status(400).json({ success: false, message: 'Cannot delete completed broadcast' });
    await Broadcast.findByIdAndDelete(broadcast._id);
    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET stats ── */
exports.getStats = async (req, res) => {
  try {
    const [total, completed, inProgress, totalSent] = await Promise.all([
      Broadcast.countDocuments({ storeId: req.storeId }),
      Broadcast.countDocuments({ storeId: req.storeId, status: 'Completed' }),
      Broadcast.countDocuments({ storeId: req.storeId, status: 'In Progress' }),
      Broadcast.aggregate([
        { $match: { storeId: req.storeId } },
        { $group: { _id: null, sent: { $sum: '$sentCount' } } },
      ]),
    ]);
    res.json({ success: true, stats: {
      total, completed, inProgress,
      totalSent: totalSent[0]?.sent || 0,
    }});
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};