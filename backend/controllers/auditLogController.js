const AuditLog = require('../models/AuditLog');

/* ── Get paginated logs with filters ── */
exports.getLogs = async (req, res) => {
  try {
    const {
      page = 1, limit = 30,
      category, action, entityId,
      search, startDate, endDate,
    } = req.query;

    // const query = {};
    const query = { storeId: req.storeId };

    if (category)  query.category = category;
    if (action)    query.action   = action;
    if (entityId)  query.entityId = entityId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { summary:         { $regex: search, $options: 'i' } },
        { entityName:      { $regex: search, $options: 'i' } },
        { performedByName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      logs,
      total,
      page:       Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Stats for the summary cards ── */
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLogs,
      todayLogs,
      byCategory,
      recentActions,
    ] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
      AuditLog.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({ success: true, stats: { totalLogs, todayLogs, byCategory, recentActions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Logs for a specific entity (e.g. one medicine's full history) ── */
exports.getEntityLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({ entityId: req.params.entityId })
      .populate('performedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Clear logs older than N days (admin only) ── */
exports.clearOldLogs = async (req, res) => {
  try {
    const { days = 90 } = req.body;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(days));
    const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
    res.json({ success: true, deleted: result.deletedCount, message: `${result.deletedCount} logs cleared` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};