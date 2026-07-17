const DoctorOrder  = require('../models/DoctorOrder');
const NursingNote  = require('../models/NursingNote');
const IPDAdmission = require('../models/IPDAdmission');
const { emitToStore } = require('../socket');

/* ════════ DOCTOR ORDERS ════════ */

/* ── GET orders for an admission ── */
exports.getOrders = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { status, type, page = 1, limit = 50 } = req.query;
    const query = { storeId: req.storeId, admission: admissionId };
    if (status) query.status  = status;
    if (type)   query.orderType = type;

    const result = await DoctorOrder.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'orderedBy',   select: 'name' },
        { path: 'completedBy', select: 'name' },
      ],
      lean: true, leanWithId: false,
    });

    res.json({
      success: true,
      orders:     result.docs,
      total:      result.totalDocs,
      totalPages: result.totalPages,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET all pending orders across all patients (nurse view) ── */
exports.getPendingOrders = async (req, res) => {
  try {
    const orders = await DoctorOrder.find({
      storeId: req.storeId,
      status:  { $in: ['Pending', 'Acknowledged', 'In-Progress'] },
      isActive: true,
    })
      .populate('orderedBy', 'name')
      .sort({ priority: 1, createdAt: 1 })   // STAT first
      .limit(100)
      .lean();

    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CREATE order (doctor) ── */
exports.createOrder = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const {
      orderType, priority, title, details,
      frequency, duration, startDate, endDate,
    } = req.body;

    if (!orderType || !title)
      return res.status(400).json({ success: false, message: 'Order type and title required' });

    const admission = await IPDAdmission.findOne({
      _id: admissionId, storeId: req.storeId, status: 'Active',
    });
    if (!admission)
      return res.status(404).json({ success: false, message: 'Active admission not found' });

    const order = await DoctorOrder.create({
      storeId:      req.storeId,
      admission:    admissionId,
      patient:      admission.patient,
      patientName:  admission.patientName,
      wardName:     admission.wardName,
      bedNumber:    admission.bedNumber,
      orderType, priority: priority || 'Routine',
      title: title.trim(),
      details:   details   || '',
      frequency: frequency || '',
      duration:  duration  || '',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate:   endDate   ? new Date(endDate)   : null,
      orderedBy:     req.user._id,
      orderedByName: req.user.name,
    });

    // Emit to nurses immediately
    emitToStore(req.storeId, 'orders:new', {
      orderId:     order._id,
      orderType,
      priority,
      title,
      patientName: admission.patientName,
      bedNumber:   admission.bedNumber,
      wardName:    admission.wardName,
      orderedBy:   req.user.name,
      createdAt:   order.createdAt,
    });

    res.status(201).json({ success: true, order, message: `Order created: ${title}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE order (doctor can edit before acknowledgement) ── */
exports.updateOrder = async (req, res) => {
  try {
    const order = await DoctorOrder.findOne({
      _id: req.params.orderId, storeId: req.storeId,
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (['Completed','Cancelled'].includes(order.status))
      return res.status(400).json({ success: false, message: `Cannot edit a ${order.status} order` });

    // Store original details for audit trail
    if (req.body.details && req.body.details !== order.details) {
      order.originalDetails = order.details;
      order.modifiedBy      = req.user.name;
      order.modifiedAt      = new Date();
    }

    const { title, details, frequency, duration, endDate, priority } = req.body;
    if (title)    order.title    = title;
    if (details)  order.details  = details;
    if (frequency)order.frequency= frequency;
    if (duration) order.duration = duration;
    if (priority) order.priority = priority;
    if (endDate)  order.endDate  = new Date(endDate);

    // Reset to pending if already acknowledged (nurse needs to re-read)
    if (order.status === 'Acknowledged') {
      order.status = 'Pending';
      order.acknowledgement = null;
    }

    await order.save();

    // Notify nurses of update
    emitToStore(req.storeId, 'orders:updated', {
      orderId:     order._id,
      title:       order.title,
      patientName: order.patientName,
      bedNumber:   order.bedNumber,
      modifiedBy:  req.user.name,
    });

    res.json({ success: true, order, message: 'Order updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ACKNOWLEDGE order (nurse) ── */
exports.acknowledgeOrder = async (req, res) => {
  try {
    const { notes } = req.body;
    const order = await DoctorOrder.findOne({
      _id: req.params.orderId, storeId: req.storeId,
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'Pending')
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` });

    order.status         = 'Acknowledged';
    order.acknowledgement = {
      acknowledgedBy:     req.user._id,
      acknowledgedByName: req.user.name,
      acknowledgedAt:     new Date(),
      notes:              notes || '',
    };
    await order.save();

    // Notify doctor
    emitToStore(req.storeId, 'orders:acknowledged', {
      orderId:            order._id,
      title:              order.title,
      patientName:        order.patientName,
      acknowledgedByName: req.user.name,
    });

    res.json({ success: true, order, message: `Order acknowledged by ${req.user.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── COMPLETE order (nurse) ── */
exports.completeOrder = async (req, res) => {
  try {
    const { completionNotes } = req.body;
    const order = await DoctorOrder.findOne({
      _id: req.params.orderId, storeId: req.storeId,
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (['Completed','Cancelled'].includes(order.status))
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` });

    order.status          = 'Completed';
    order.isActive        = false;
    order.completedBy     = req.user._id;
    order.completedByName = req.user.name;
    order.completedAt     = new Date();
    order.completionNotes = completionNotes || '';

    // Auto-acknowledge if not yet acknowledged
    if (!order.acknowledgement) {
      order.acknowledgement = {
        acknowledgedBy:     req.user._id,
        acknowledgedByName: req.user.name,
        acknowledgedAt:     new Date(),
      };
    }

    await order.save();

    emitToStore(req.storeId, 'orders:completed', {
      orderId:          order._id,
      title:            order.title,
      patientName:      order.patientName,
      completedByName:  req.user.name,
    });

    res.json({ success: true, order, message: `Order completed: ${order.title}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CANCEL order (doctor or admin) ── */
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await DoctorOrder.findOne({
      _id: req.params.orderId, storeId: req.storeId,
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'Completed')
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed order' });

    order.status              = 'Cancelled';
    order.isActive            = false;
    order.cancelledBy         = req.user._id;
    order.cancelledByName     = req.user.name;
    order.cancelledAt         = new Date();
    order.cancellationReason  = reason || '';
    await order.save();

    emitToStore(req.storeId, 'orders:cancelled', {
      orderId:          order._id,
      title:            order.title,
      patientName:      order.patientName,
      cancelledByName:  req.user.name,
      reason,
    });

    res.json({ success: true, order, message: `Order cancelled: ${order.title}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── BULK acknowledge all pending (nurse — "I've read all orders") ── */
exports.acknowledgeAll = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const result = await DoctorOrder.updateMany(
      { storeId: req.storeId, admission: admissionId, status: 'Pending' },
      {
        $set: {
          status: 'Acknowledged',
          acknowledgement: {
            acknowledgedBy:     req.user._id,
            acknowledgedByName: req.user.name,
            acknowledgedAt:     new Date(),
            notes:              'Bulk acknowledged',
          },
        },
      }
    );

    res.json({ success: true, count: result.modifiedCount, message: `${result.modifiedCount} orders acknowledged` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ NURSING NOTES ════════ */

/* ── GET notes for an admission ── */
exports.getNotes = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { type, page = 1, limit = 30 } = req.query;
    const query = { storeId: req.storeId, admission: admissionId };
    if (type) query.noteType = type;

    const result = await NursingNote.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { isPinned: -1, createdAt: -1 },
      populate: [
        { path: 'writtenBy',  select: 'name' },
        { path: 'reviewedBy', select: 'name' },
      ],
      lean: true, leanWithId: false,
    });

    res.json({
      success: true,
      notes:      result.docs,
      total:      result.totalDocs,
      totalPages: result.totalPages,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET shift handovers ── */
exports.getHandovers = async (req, res) => {
  try {
    const { wardName, page = 1, limit = 10 } = req.query;
    const query = { storeId: req.storeId, noteType: 'Shift Handover' };
    if (wardName) query['shiftHandover.wardCovered'] = wardName;

    const result = await NursingNote.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort: { createdAt: -1 },
      populate: [{ path: 'writtenBy', select: 'name' }],
      lean: true, leanWithId: false,
    });

    res.json({ success: true, handovers: result.docs, total: result.totalDocs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CREATE note ── */
exports.createNote = async (req, res) => {
  try {
    const {
      noteType, admissionId, patientName, wardName, bedNumber,
      title, content, tags, shiftHandover, incidentReport, isPrivate, isPinned,
    } = req.body;

    if (!noteType || !title || !content)
      return res.status(400).json({ success: false, message: 'Type, title and content required' });

    let admission = null;
    let patient   = null;
    if (admissionId) {
      admission = await IPDAdmission.findOne({ _id: admissionId, storeId: req.storeId });
      if (admission) patient = admission.patient;
    }

    const note = await NursingNote.create({
      storeId:      req.storeId,
      noteType,
      admission:    admission?._id   || null,
      patient:      patient          || null,
      patientName:  admission?.patientName || patientName || '',
      wardName:     admission?.wardName    || wardName    || '',
      bedNumber:    admission?.bedNumber   || bedNumber   || '',
      title:        title.trim(),
      content,
      tags:         tags || [],
      shiftHandover:shiftHandover || null,
      incidentReport: incidentReport || null,
      isPrivate:    !!isPrivate,
      isPinned:     !!isPinned,
      writtenBy:     req.user._id,
      writtenByName: req.user.name,
    });

    // Emit handover notification
    if (noteType === 'Shift Handover') {
      emitToStore(req.storeId, 'nursing:handover', {
        noteId:         note._id,
        shiftType:      shiftHandover?.shiftType,
        outgoingNurse:  shiftHandover?.outgoingNurse,
        incomingNurse:  shiftHandover?.incomingNurse,
        wardCovered:    shiftHandover?.wardCovered,
        writtenBy:      req.user.name,
      });
    }

    if (noteType === 'Incident Report') {
      emitToStore(req.storeId, 'nursing:incident', {
        noteId:       note._id,
        title,
        severity:     incidentReport?.severity,
        writtenBy:    req.user.name,
        patientName:  admission?.patientName || patientName,
      });
    }

    res.status(201).json({ success: true, note, message: `${noteType} saved` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE note ── */
exports.updateNote = async (req, res) => {
  try {
    const { title, content, tags, isPinned, reviewNotes } = req.body;
    const note = await NursingNote.findOne({ _id: req.params.noteId, storeId: req.storeId });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    if (title)       note.title    = title;
    if (content)     note.content  = content;
    if (tags)        note.tags     = tags;
    if (isPinned !== undefined) note.isPinned = isPinned;
    if (reviewNotes) {
      note.reviewedBy     = req.user._id;
      note.reviewedByName = req.user.name;
      note.reviewedAt     = new Date();
      note.reviewNotes    = reviewNotes;
    }

    await note.save();
    res.json({ success: true, note, message: 'Note updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE note ── */
exports.deleteNote = async (req, res) => {
  try {
    const note = await NursingNote.findOne({ _id: req.params.noteId, storeId: req.storeId });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    // Only author or admin can delete
    if (note.writtenBy.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    await NursingNote.findByIdAndDelete(note._id);
    res.json({ success: true, message: 'Note deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET stats ── */
exports.getStats = async (req, res) => {
  try {
    const [pending, unacknowledged, todayOrders] = await Promise.all([
      DoctorOrder.countDocuments({ storeId: req.storeId, status: 'Pending', isActive: true }),
      DoctorOrder.countDocuments({ storeId: req.storeId, status: { $in: ['Pending','Acknowledged'] }, isActive: true }),
      DoctorOrder.countDocuments({ storeId: req.storeId, createdAt: { $gte: new Date().setHours(0,0,0,0) } }),
    ]);

    res.json({ success: true, stats: { pending, unacknowledged, todayOrders } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};