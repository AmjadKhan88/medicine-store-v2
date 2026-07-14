const OPDQueue = require('../models/OPDQueue');
const Patient  = require('../models/Patient');
const { emitToStore } = require('../socket');

const todayStr = () => new Date().toISOString().slice(0, 10);

/* ── get or create today's queue ── */
async function getOrCreateQueue(storeId, prefix = 'A') {
  const date = todayStr();
  let queue = await OPDQueue.findOne({ storeId, date });
  if (!queue) {
    queue = await OPDQueue.create({ storeId, date, prefix, tokens: [] });
  }
  return queue;
}

/* ── emit queue update to all store sockets ── */
function emitQueueUpdate(storeId, queue) {
  emitToStore(storeId, 'opd:update', {
    currentlyServing: queue.currentlyServing,
    stats:            queue.stats,
    tokens:           queue.tokens.map(t => ({
      _id:          t._id,
      displayToken: t.displayToken,
      tokenNumber:  t.tokenNumber,
      patientName:  t.patientName,
      doctorName:   t.doctorName,
      department:   t.department,
      priority:     t.priority,
      status:       t.status,
      registeredAt: t.registeredAt,
      calledAt:     t.calledAt,
      waitMinutes:  t.waitMinutes,
    })),
  });
}

/* ── GET today's queue ── */
exports.getToday = async (req, res) => {
  try {
    const { date = todayStr() } = req.query;
    let queue = await OPDQueue.findOne({ storeId: req.storeId, date });
    if (!queue) {
      queue = await getOrCreateQueue(req.storeId);
    }
    res.json({ success: true, queue });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET queue by date (history) ── */
exports.getByDate = async (req, res) => {
  try {
    const queue = await OPDQueue.findOne({ storeId: req.storeId, date: req.params.date });
    if (!queue) return res.status(404).json({ success: false, message: 'No queue for this date' });
    res.json({ success: true, queue });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET public display (no auth) ── */
exports.getDisplay = async (req, res) => {
  try {
    const { storeId } = req.params;
    const queue = await OPDQueue.findOne({ storeId, date: todayStr() });
    if (!queue) return res.json({ success: true, queue: null });

    // Only return what the display screen needs
    const waiting = queue.tokens
      .filter(t => t.status === 'Waiting')
      .slice(0, 10)
      .map(t => ({ displayToken: t.displayToken, patientName: t.patientName, priority: t.priority }));

    res.json({
      success: true,
      currentlyServing: queue.currentlyServing,
      waiting,
      stats: queue.stats,
      isOpen: queue.isOpen,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── REGISTER token (receptionist) ── */
exports.registerToken = async (req, res) => {
  try {
    const { patientName, patientId, phone, doctorName, department, priority, notes } = req.body;
    if (!patientName) return res.status(400).json({ success: false, message: 'Patient name required' });

    const queue = await getOrCreateQueue(req.storeId);
    if (!queue.isOpen) return res.status(400).json({ success: false, message: 'Queue is closed for today' });

    const tokenNumber  = queue.tokens.length + 1;
    const displayToken = `${queue.prefix}-${String(tokenNumber).padStart(3, '0')}`;

    // Verify patient if ID provided
    let patient = null;
    if (patientId) {
      patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
    }

    queue.tokens.push({
      tokenNumber,
      displayToken,
      patientName: patientName.trim(),
      patient:     patient?._id || null,
      phone:       phone?.trim() || patient?.phone || '',
      doctorName:  doctorName?.trim() || '',
      department:  department?.trim() || 'General OPD',
      priority:    priority || 'Normal',
      notes:       notes?.trim() || '',
      registeredAt: new Date(),
      status: 'Waiting',
    });

    await queue.save();
    const newToken = queue.tokens[queue.tokens.length - 1];

    // Emit real-time update
    emitQueueUpdate(req.storeId, queue);
    emitToStore(req.storeId, 'opd:tokenAdded', {
      displayToken,
      patientName,
      priority,
      department,
      position: queue.tokens.filter(t => t.status === 'Waiting').length,
    });

    res.status(201).json({
      success: true,
      token:   newToken,
      queue:   { stats: queue.stats, currentlyServing: queue.currentlyServing },
      message: `Token ${displayToken} registered for ${patientName}`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CALL next token (doctor/receptionist) ── */
exports.callNext = async (req, res) => {
  try {
    const queue = await getOrCreateQueue(req.storeId);

    // Priority order: Urgent first, then VIP, then Normal — all FIFO within each
    const priority = ['Urgent', 'VIP', 'Normal'];
    let next = null;

    for (const p of priority) {
      next = queue.tokens.find(t => t.status === 'Waiting' && t.priority === p);
      if (next) break;
    }

    if (!next) {
      return res.status(400).json({ success: false, message: 'No patients waiting in queue' });
    }

    const now = new Date();
    next.status    = 'Called';
    next.calledAt  = now;
    next.waitMinutes = Math.round((now - new Date(next.registeredAt)) / 60000);
    next.servedBy  = req.user._id;
    queue.currentlyServing = next.displayToken;

    await queue.save();

    emitQueueUpdate(req.storeId, queue);
    emitToStore(req.storeId, 'opd:called', {
      displayToken: next.displayToken,
      patientName:  next.patientName,
      doctorName:   next.doctorName,
      department:   next.department,
    });

    res.json({
      success: true,
      token:   next,
      message: `Calling ${next.displayToken} — ${next.patientName}`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CALL specific token ── */
exports.callToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const queue = await OPDQueue.findOne({ storeId: req.storeId, date: todayStr() });
    if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });

    const token = queue.tokens.id(tokenId);
    if (!token) return res.status(404).json({ success: false, message: 'Token not found' });
    if (token.status !== 'Waiting') {
      return res.status(400).json({ success: false, message: `Token is already ${token.status}` });
    }

    const now = new Date();
    token.status     = 'Called';
    token.calledAt   = now;
    token.waitMinutes = Math.round((now - new Date(token.registeredAt)) / 60000);
    token.servedBy   = req.user._id;
    queue.currentlyServing = token.displayToken;

    await queue.save();
    emitQueueUpdate(req.storeId, queue);
    emitToStore(req.storeId, 'opd:called', {
      displayToken: token.displayToken,
      patientName:  token.patientName,
      doctorName:   token.doctorName,
    });

    res.json({ success: true, token, message: `Calling ${token.displayToken}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE token status (done / skipped / no-show / in-consultation) ── */
exports.updateStatus = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['In-Consultation', 'Done', 'Skipped', 'No-Show', 'Waiting'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const queue = await OPDQueue.findOne({ storeId: req.storeId, date: todayStr() });
    if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });

    const token = queue.tokens.id(tokenId);
    if (!token) return res.status(404).json({ success: false, message: 'Token not found' });

    const now = new Date();
    const prev = token.status;
    token.status = status;

    if (notes) token.notes = notes;

    if (status === 'In-Consultation') {
      token.consultationStartAt = now;
      queue.currentlyServing = token.displayToken;
    }

    if (status === 'Done') {
      token.consultationEndAt = now;
      if (token.consultationStartAt) {
        token.consultMinutes = Math.round((now - new Date(token.consultationStartAt)) / 60000);
      }
      // Clear currentlyServing if this was the one
      if (queue.currentlyServing === token.displayToken) {
        queue.currentlyServing = null;
      }
    }

    if (status === 'Skipped' || status === 'No-Show') {
      if (queue.currentlyServing === token.displayToken) {
        queue.currentlyServing = null;
      }
    }

    // Re-queue: move back to Waiting
    if (status === 'Waiting' && prev !== 'Waiting') {
      token.calledAt    = null;
      token.waitMinutes = null;
      token.calledAt    = null;
    }

    await queue.save();
    emitQueueUpdate(req.storeId, queue);

    res.json({ success: true, token, queue: { stats: queue.stats }, message: `Token ${token.displayToken} → ${status}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CLOSE / OPEN queue ── */
exports.toggleQueue = async (req, res) => {
  try {
    const queue = await getOrCreateQueue(req.storeId);
    queue.isOpen = !queue.isOpen;
    await queue.save();
    emitToStore(req.storeId, 'opd:queueToggled', { isOpen: queue.isOpen });
    res.json({ success: true, isOpen: queue.isOpen, message: queue.isOpen ? 'Queue opened' : 'Queue closed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── RESET queue (clear all) ── */
exports.resetQueue = async (req, res) => {
  try {
    const queue = await getOrCreateQueue(req.storeId);
    queue.tokens = [];
    queue.currentlyServing = null;
    queue.isOpen = true;
    await queue.save();
    emitQueueUpdate(req.storeId, queue);
    res.json({ success: true, message: 'Queue reset for today' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── STATS (last 7 days) ── */
exports.getStats = async (req, res) => {
  try {
    const days   = 7;
    const dates  = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    }).reverse();

    const queues = await OPDQueue.find({ storeId: req.storeId, date: { $in: dates } });
    const queueMap = Object.fromEntries(queues.map(q => [q.date, q]));

    const trend = dates.map(date => {
      const q = queueMap[date];
      if (!q) return { date, total: 0, done: 0, avgWait: 0 };
      return {
        date,
        total:   q.tokens.length,
        done:    q.tokens.filter(t => t.status === 'Done').length,
        avgWait: q.stats.avgWaitMinutes,
      };
    });

    // Today peak hours
    const today = queues.find(q => q.date === todayStr());
    const peakHours = today
      ? Array.from({ length: 24 }, (_, h) => {
          const count = today.tokens.filter(t => new Date(t.registeredAt).getHours() === h).length;
          return { hour: h, count };
        }).filter(h => h.count > 0)
      : [];

    res.json({ success: true, trend, peakHours, todayStats: today?.stats || {} });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};