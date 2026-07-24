const Feedback    = require('../models/Feedback');
const Patient     = require('../models/Patient');
const Appointment = require('../models/Appointment');
const User        = require('../models/User');
const crypto      = require('crypto');
const { emitToStore } = require('../socket');

/* ── Generate feedback link for an appointment ── */
exports.generateLink = async (req, res) => {
  try {
    const { appointmentId, patientId, doctorName, visitDate, expiryDays = 7 } = req.body;

    if (!patientId) return res.status(400).json({ success: false, message: 'Patient ID required' });

    const patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Check if feedback already exists for this appointment
    if (appointmentId) {
      const existing = await Feedback.findOne({ storeId: req.storeId, appointment: appointmentId });
      if (existing) {
        const link = `${process.env.FRONTEND_URL}/feedback/${existing.feedbackToken}`;
        return res.json({ success: true, link, feedback: existing, message: 'Feedback link already exists' });
      }
    }

    const token   = crypto.randomBytes(32).toString('hex');
    const expiry  = new Date();
    expiry.setDate(expiry.getDate() + Number(expiryDays));

    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findOne({ _id: appointmentId, storeId: req.storeId });
    }

    const feedback = await Feedback.create({
      storeId:      req.storeId,
      feedbackToken:token,
      patient:      patientId,
      patientName:  patient.name,
      appointment:  appointmentId || null,
      doctorName:   doctorName || appointment?.doctorName || '',
      visitDate:    visitDate ? new Date(visitDate) : (appointment?.date || new Date()),
      expiresAt:    expiry,
      sentAt:       new Date(),
    });

    const link = `${process.env.FRONTEND_URL}/feedback/${token}`;
    res.status(201).json({ success: true, link, feedback, message: `Feedback link generated for ${patient.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET public feedback form data (no auth) ── */
exports.getPublicForm = async (req, res) => {
  try {
    const { token } = req.params;
    const feedback = await Feedback.findOne({ feedbackToken: token })
      .populate('patient', 'name');

    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback link not found or invalid' });
    if (feedback.expiresAt && feedback.expiresAt < new Date())
      return res.status(410).json({ success: false, message: 'This feedback link has expired' });
    if (feedback.status !== 'Pending')
      return res.status(400).json({ success: false, message: 'Feedback already submitted. Thank you!' });

    // Get store name for branding
    const store = await User.findById(feedback.storeId).select('storeName name');

    res.json({
      success: true,
      form: {
        patientName: feedback.patientName,
        doctorName:  feedback.doctorName,
        visitDate:   feedback.visitDate,
        storeName:   store?.storeName || store?.name || 'Our Clinic',
        feedbackId:  feedback._id,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── SUBMIT feedback (public, no auth) ── */
exports.submit = async (req, res) => {
  try {
    const { token } = req.params;
    const {
      overallRating, doctorRating, staffRating,
      cleanlinessRating, waitTimeRating,
      review, isAnonymous,
    } = req.body;

    if (!overallRating) return res.status(400).json({ success: false, message: 'Overall rating required' });
    if (overallRating < 1 || overallRating > 5) return res.status(400).json({ success: false, message: 'Rating must be 1-5' });

    const feedback = await Feedback.findOne({ feedbackToken: token });
    if (!feedback) return res.status(404).json({ success: false, message: 'Invalid feedback link' });
    if (feedback.status !== 'Pending')
      return res.status(400).json({ success: false, message: 'Feedback already submitted. Thank you!' });
    if (feedback.expiresAt && feedback.expiresAt < new Date())
      return res.status(410).json({ success: false, message: 'This feedback link has expired' });

    feedback.overallRating     = Number(overallRating);
    feedback.doctorRating      = doctorRating     ? Number(doctorRating)      : undefined;
    feedback.staffRating       = staffRating      ? Number(staffRating)       : undefined;
    feedback.cleanlinessRating = cleanlinessRating? Number(cleanlinessRating) : undefined;
    feedback.waitTimeRating    = waitTimeRating   ? Number(waitTimeRating)    : undefined;
    feedback.review      = review?.trim() || '';
    feedback.isAnonymous = !!isAnonymous;
    feedback.status      = 'Submitted';
    feedback.submittedAt = new Date();

    // Auto-flag negative feedback (1-2 stars)
    if (Number(overallRating) <= 2) {
      feedback.isFlagged = true;
      feedback.flagReason = `Low rating: ${overallRating}/5 star${Number(overallRating) > 1 ? 's' : ''}`;
      feedback.status = 'Flagged';

      // Real-time alert to owner
      emitToStore(feedback.storeId, 'feedback:negative', {
        feedbackId:  feedback._id,
        patientName: feedback.isAnonymous ? 'Anonymous Patient' : feedback.patientName,
        doctorName:  feedback.doctorName,
        rating:      Number(overallRating),
        review:      review?.trim() || '',
      });
    }

    await feedback.save();
    res.json({ success: true, message: 'Thank you for your feedback! Your response has been recorded.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET all feedback (admin) ── */
exports.getAll = async (req, res) => {
  try {
    const { status, doctorName, rating, flagged, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId, status: { $ne: 'Pending' } };

    if (status)     query.status = status;
    if (doctorName) query.doctorName = { $regex: doctorName, $options: 'i' };
    if (flagged === 'true') query.isFlagged = true;
    if (rating) {
      const r = Number(rating);
      query.overallRating = r;
    }

    const result = await Feedback.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { submittedAt: -1 },
      populate: [{ path: 'patient', select: 'name patientId phone' }],
      lean: true, leanWithId: false,
    });

    res.json({
      success:    true,
      feedback:   result.docs,
      total:      result.totalDocs,
      totalPages: result.totalPages,
      page:       result.page,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── RESPOND to feedback (admin) ── */
exports.respond = async (req, res) => {
  try {
    const { response } = req.body;
    if (!response?.trim()) return res.status(400).json({ success: false, message: 'Response text required' });

    const feedback = await Feedback.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      {
        response,
        respondedBy:     req.user._id,
        respondedByName: req.user.name,
        respondedAt:     new Date(),
        status:          'Responded',
        isFlagged:       false,
      },
      { new: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, feedback, message: 'Response saved' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── FLAG / UNFLAG feedback ── */
exports.flag = async (req, res) => {
  try {
    const { reason, unflag } = req.body;
    const update = unflag
      ? { isFlagged: false, flagReason: '', status: 'Submitted' }
      : { isFlagged: true, flagReason: reason || 'Manually flagged', flaggedBy: req.user._id, flaggedAt: new Date(), status: 'Flagged' };

    const feedback = await Feedback.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      update,
      { new: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, feedback, message: unflag ? 'Flag removed' : 'Feedback flagged' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE feedback ── */
exports.remove = async (req, res) => {
  try {
    await Feedback.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ success: true, message: 'Feedback deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── STATS & REPORT ── */
exports.getStats = async (req, res) => {
  try {
    const submitted = { storeId: req.storeId, status: { $in: ['Submitted','Flagged','Responded'] } };

    const [overall, byDoctor, byRating, monthlyTrend, recentNeg] = await Promise.all([
      /* Overall averages */
      Feedback.aggregate([
        { $match: submitted },
        { $group: {
          _id: null,
          avgOverall:     { $avg: '$overallRating'     },
          avgDoctor:      { $avg: '$doctorRating'      },
          avgStaff:       { $avg: '$staffRating'       },
          avgCleanliness: { $avg: '$cleanlinessRating' },
          avgWaitTime:    { $avg: '$waitTimeRating'    },
          total:          { $sum: 1 },
          flagged:        { $sum: { $cond: ['$isFlagged', 1, 0] } },
        }},
      ]),

      /* By doctor */
      Feedback.aggregate([
        { $match: { ...submitted, doctorName: { $ne: '' } } },
        { $group: {
          _id:            '$doctorName',
          avgRating:      { $avg: '$overallRating' },
          doctorAvg:      { $avg: '$doctorRating'  },
          count:          { $sum: 1 },
          negative:       { $sum: { $cond: [{ $lte: ['$overallRating', 2] }, 1, 0] } },
        }},
        { $sort: { avgRating: -1 } },
      ]),

      /* By star count */
      Feedback.aggregate([
        { $match: submitted },
        { $group: { _id: '$overallRating', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),

      /* Monthly trend — last 6 months */
      Feedback.aggregate([
        { $match: { ...submitted, submittedAt: { $gte: new Date(Date.now() - 180 * 86400000) } } },
        { $group: {
          _id: { year: { $year: '$submittedAt' }, month: { $month: '$submittedAt' } },
          avgRating: { $avg: '$overallRating' },
          count:     { $sum: 1 },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      /* Recent negative */
      Feedback.find({ storeId: req.storeId, overallRating: { $lte: 2 } })
        .sort({ submittedAt: -1 }).limit(5).lean(),
    ]);

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const trend = monthlyTrend.map(m => ({
      label:     MONTH_NAMES[m._id.month - 1],
      avgRating: Math.round(m.avgRating * 10) / 10,
      count:     m.count,
    }));

    const ratingMap = Object.fromEntries(byRating.map(r => [r._id, r.count]));
    const totalSubmitted = Object.values(ratingMap).reduce((s, v) => s + v, 0);

    res.json({
      success: true,
      stats: {
        overall:   overall[0] || { avgOverall:0, total:0, flagged:0 },
        byDoctor,
        byRating:  [5,4,3,2,1].map(r => ({
          stars:   r,
          count:   ratingMap[r] || 0,
          percent: totalSubmitted > 0 ? Math.round(((ratingMap[r] || 0) / totalSubmitted) * 100) : 0,
        })),
        trend,
        recentNegative: recentNeg,
        totalSubmitted,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};