const OTSchedule = require('../models/OTSchedule');
const Patient    = require('../models/Patient');
const { emitToStore } = require('../socket');

const fmtDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : null;

/* ── GET all schedules (with filters) ── */
exports.getAll = async (req, res) => {
  try {
    const { status, date, month, otRoom, search, page = 1, limit = 20 } = req.query;
    const query = { storeId: req.storeId };

    if (status)  query.status  = status;
    if (otRoom)  query.otRoom  = otRoom;
    if (search)  query.$or = [
      { patientName:   { $regex: search, $options: 'i' } },
      { surgeryType:   { $regex: search, $options: 'i' } },
      { scheduleNumber:{ $regex: search, $options: 'i' } },
      { 'team.name':   { $regex: search, $options: 'i' } },
    ];

    // Date filter
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end   = new Date(date); end.setHours(23, 59, 59, 999);
      query.scheduledDate = { $gte: start, $lte: end };
    } else if (month) {
      const [y, m] = month.split('-').map(Number);
      query.scheduledDate = {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m, 0, 23, 59, 59),
      };
    }

    const result = await OTSchedule.paginate(query, {
      page: Number(page), limit: Number(limit),
      sort:  { scheduledDate: 1, startTime: 1 },
      populate: [{ path: 'patient', select: 'patientId phone age gender bloodGroup' }],
      lean: true, leanWithId: false,
    });

    res.json({
      success: true,
      schedules:  result.docs,
      total:      result.totalDocs,
      totalPages: result.totalPages,
      page:       result.page,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET single schedule ── */
exports.getOne = async (req, res) => {
  try {
    const schedule = await OTSchedule.findOne({ _id: req.params.id, storeId: req.storeId })
      .populate('patient',    'name patientId age gender phone bloodGroup allergies medicalHistory')
      .populate('createdBy',   'name')
      .populate('completedBy', 'name');

    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
    res.json({ success: true, schedule });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET OT utilization report ── */
exports.getReport = async (req, res) => {
  try {
    const { month } = req.query;
    const [y, m] = (month || new Date().toISOString().slice(0, 7)).split('-').map(Number);

    const schedules = await OTSchedule.find({
      storeId:       req.storeId,
      scheduledDate: {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m,     0, 23, 59, 59),
      },
    });

    // Per-OT-room stats
    const roomMap = {};
    for (const s of schedules) {
      if (!roomMap[s.otRoom]) {
        roomMap[s.otRoom] = { room: s.otRoom, total: 0, completed: 0, cancelled: 0, totalMinutes: 0, surgeries: [] };
      }
      const r = roomMap[s.otRoom];
      r.total++;
      if (s.status === 'Completed')  r.completed++;
      if (s.status === 'Cancelled')  r.cancelled++;
      r.totalMinutes += s.actualMinutes || s.estimatedMinutes || 0;
      r.surgeries.push({
        date:        fmtDate(s.scheduledDate),
        type:        s.surgeryType,
        patient:     s.patientName,
        status:      s.status,
        minutes:     s.actualMinutes || s.estimatedMinutes || 0,
      });
    }

    // Surgery type breakdown
    const typeBreakdown = {};
    for (const s of schedules.filter(x => x.status === 'Completed')) {
      typeBreakdown[s.surgeryType] = (typeBreakdown[s.surgeryType] || 0) + 1;
    }

    // Surgeon stats
    const surgeonMap = {};
    for (const s of schedules) {
      const surgeon = s.team?.find(t => t.role === 'Surgeon')?.name || 'Unknown';
      if (!surgeonMap[surgeon]) surgeonMap[surgeon] = { name: surgeon, count: 0, minutes: 0 };
      surgeonMap[surgeon].count++;
      surgeonMap[surgeon].minutes += s.actualMinutes || s.estimatedMinutes || 0;
    }

    const totals = {
      scheduled:  schedules.length,
      completed:  schedules.filter(s => s.status === 'Completed').length,
      cancelled:  schedules.filter(s => s.status === 'Cancelled').length,
      postponed:  schedules.filter(s => s.status === 'Postponed').length,
      totalHours: Math.round(schedules.reduce((s, x) => s + (x.actualMinutes || x.estimatedMinutes || 0), 0) / 60 * 10) / 10,
    };

    res.json({
      success: true,
      report: {
        month,
        totals,
        byRoom:    Object.values(roomMap),
        byType:    Object.entries(typeBreakdown)
                     .map(([type, count]) => ({ type, count }))
                     .sort((a, b) => b.count - a.count),
        bySurgeon: Object.values(surgeonMap).sort((a, b) => b.count - a.count),
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET OT rooms + availability for a date ── */
exports.getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date required' });

    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);

    const schedules = await OTSchedule.find({
      storeId: req.storeId,
      scheduledDate: { $gte: start, $lte: end },
      status: { $nin: ['Cancelled', 'Postponed'] },
    }).select('otRoom startTime endTime estimatedMinutes status patientName surgeryType team');

    // Group by room
    const byRoom = {};
    for (const s of schedules) {
      if (!byRoom[s.otRoom]) byRoom[s.otRoom] = [];
      byRoom[s.otRoom].push(s);
    }

    res.json({ success: true, date, bookings: byRoom });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CHECK for conflicts ── */
async function checkConflict(storeId, otRoom, date, startTime, estimatedMinutes, excludeId = null) {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end   = new Date(date); end.setHours(23, 59, 59, 999);

  const existing = await OTSchedule.find({
    storeId, otRoom,
    scheduledDate: { $gte: start, $lte: end },
    status: { $nin: ['Cancelled', 'Postponed'] },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });

  // Convert times to minutes from midnight
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const newStart = toMin(startTime);
  const newEnd   = newStart + (estimatedMinutes || 60);

  for (const s of existing) {
    const sStart = toMin(s.startTime);
    const sEnd   = sStart + (s.estimatedMinutes || 60);
    // Overlap check
    if (newStart < sEnd && newEnd > sStart) {
      return {
        hasConflict: true,
        conflictWith: s,
        message: `OT room ${otRoom} is already booked from ${s.startTime} for ${s.surgeryType} (${s.patientName})`,
      };
    }
  }
  return { hasConflict: false };
}

/* ── CREATE schedule ── */
exports.create = async (req, res) => {
  try {
    const {
      patientId, admissionId, otRoom, surgeryType, surgeryCategory,
      anesthesiaType, priority, scheduledDate, startTime,
      estimatedMinutes, team, preOpNotes, estimatedCost,
    } = req.body;

    if (!patientId || !otRoom || !surgeryType || !scheduledDate || !startTime)
      return res.status(400).json({ success: false, message: 'Patient, OT room, surgery type, date and time are required' });

    const patient = await Patient.findOne({ _id: patientId, storeId: req.storeId });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Conflict check
    const conflict = await checkConflict(req.storeId, otRoom, scheduledDate, startTime, estimatedMinutes);
    if (conflict.hasConflict) {
      return res.status(400).json({ success: false, message: conflict.message });
    }

    // Calculate end time
    const [h, m] = startTime.split(':').map(Number);
    const endMin = h * 60 + m + Number(estimatedMinutes || 60);
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    const schedule = await OTSchedule.create({
      storeId:         req.storeId,
      patient:         patientId,
      patientName:     patient.name,
      admissionId:     admissionId || null,
      otRoom, surgeryType,
      surgeryCategory: surgeryCategory || 'Elective',
      anesthesiaType:  anesthesiaType  || 'General',
      priority:        priority        || 'Routine',
      scheduledDate:   new Date(scheduledDate),
      startTime, endTime,
      estimatedMinutes: Number(estimatedMinutes || 60),
      team:    team    || [],
      preOpNotes,
      estimatedCost:   Number(estimatedCost || 0),
      createdBy: req.user._id,
    });

    // Emit real-time to all staff
    emitToStore(req.storeId, 'ot:scheduled', {
      scheduleId:    schedule._id,
      scheduleNumber:schedule.scheduleNumber,
      patientName:   patient.name,
      surgeryType,
      otRoom,
      date:          fmtDate(scheduledDate),
      startTime,
      priority,
    });

    const populated = await OTSchedule.findById(schedule._id)
      .populate('patient', 'patientId phone age gender bloodGroup');

    res.status(201).json({
      success: true,
      schedule: populated,
      message: `${surgeryType} scheduled for ${patient.name} — ${schedule.scheduleNumber}`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE schedule ── */
exports.update = async (req, res) => {
  try {
    const { otRoom, scheduledDate, startTime, estimatedMinutes } = req.body;

    // Re-check conflict if changing time/room
    if (otRoom || scheduledDate || startTime) {
      const current = await OTSchedule.findOne({ _id: req.params.id, storeId: req.storeId });
      if (!current) return res.status(404).json({ success: false, message: 'Schedule not found' });

      const conflict = await checkConflict(
        req.storeId,
        otRoom         || current.otRoom,
        scheduledDate  || current.scheduledDate,
        startTime      || current.startTime,
        estimatedMinutes || current.estimatedMinutes,
        req.params.id
      );
      if (conflict.hasConflict) {
        return res.status(400).json({ success: false, message: conflict.message });
      }

      // Recalculate end time
      if (startTime || estimatedMinutes) {
        const st  = startTime || current.startTime;
        const dur = Number(estimatedMinutes || current.estimatedMinutes || 60);
        const [h, m] = st.split(':').map(Number);
        const endMin = h * 60 + m + dur;
        req.body.endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
      }
    }

    const schedule = await OTSchedule.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body,
      { new: true }
    ).populate('patient', 'patientId phone age gender bloodGroup');

    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    res.json({ success: true, schedule, message: 'Schedule updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE checklist item ── */
exports.updateChecklist = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { done, notes } = req.body;

    const schedule = await OTSchedule.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    const item = schedule.preOpChecklist.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Checklist item not found' });

    item.done   = done;
    item.doneAt = done ? new Date() : null;
    item.doneBy = done ? req.user.name : null;
    item.notes  = notes || item.notes;

    await schedule.save();
    res.json({ success: true, schedule, message: `Checklist item ${done ? 'completed' : 'unchecked'}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE status ── */
exports.updateStatus = async (req, res) => {
  try {
    const { status, cancellationReason, postponedTo, operativeNotes, postOpNotes, complications, implants, postOpWard, postOpBed, actualCost, recoveryNotes } = req.body;

    const validStatuses = ['Scheduled', 'Pre-Op', 'In-Progress', 'Completed', 'Cancelled', 'Postponed'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const schedule = await OTSchedule.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    const prev = schedule.status;
    schedule.status = status;

    if (status === 'In-Progress' && prev !== 'In-Progress') {
      schedule.actualStartTime = new Date();
    }

    if (status === 'Completed') {
      schedule.actualEndTime  = new Date();
      schedule.completedBy    = req.user._id;
      if (schedule.actualStartTime) {
        schedule.actualMinutes = Math.round((schedule.actualEndTime - schedule.actualStartTime) / 60000);
      }
      if (operativeNotes) schedule.operativeNotes = operativeNotes;
      if (postOpNotes)    schedule.postOpNotes    = postOpNotes;
      if (complications)  schedule.complications  = complications;
      if (implants)       schedule.implants       = implants;
      if (postOpWard)     schedule.postOpWard     = postOpWard;
      if (postOpBed)      schedule.postOpBed      = postOpBed;
      if (actualCost)     schedule.actualCost     = Number(actualCost);
      if (recoveryNotes)  schedule.recoveryNotes  = recoveryNotes;
    }

    if (status === 'Cancelled') schedule.cancellationReason = cancellationReason;
    if (status === 'Postponed') schedule.postponedTo = postponedTo ? new Date(postponedTo) : null;

    await schedule.save();
    await schedule.populate('patient', 'patientId phone age gender bloodGroup');

    emitToStore(req.storeId, 'ot:statusUpdated', {
      scheduleId:    schedule._id,
      scheduleNumber:schedule.scheduleNumber,
      patientName:   schedule.patientName,
      surgeryType:   schedule.surgeryType,
      otRoom:        schedule.otRoom,
      status,
      prev,
    });

    res.json({ success: true, schedule, message: `Status updated to ${status}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ADD team member ── */
exports.addTeamMember = async (req, res) => {
  try {
    const { role, name, phone } = req.body;
    if (!role || !name) return res.status(400).json({ success: false, message: 'Role and name required' });

    const schedule = await OTSchedule.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    schedule.team.push({ role, name, phone });
    await schedule.save();
    res.json({ success: true, schedule, message: `${name} added to OT team` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── REMOVE team member ── */
exports.removeTeamMember = async (req, res) => {
  try {
    const schedule = await OTSchedule.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    schedule.team = schedule.team.filter(m => m._id.toString() !== req.params.memberId);
    await schedule.save();
    res.json({ success: true, schedule, message: 'Team member removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── DELETE schedule ── */
exports.remove = async (req, res) => {
  try {
    const schedule = await OTSchedule.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    if (['In-Progress', 'Completed'].includes(schedule.status))
      return res.status(400).json({ success: false, message: 'Cannot delete a schedule that is in-progress or completed' });

    await OTSchedule.findByIdAndDelete(schedule._id);
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET stats ── */
exports.getStats = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [today, upcoming, thisMonth, allTime] = await Promise.all([
      OTSchedule.find({ storeId: req.storeId, scheduledDate: { $gte: todayStart, $lte: todayEnd } }),
      OTSchedule.countDocuments({ storeId: req.storeId, scheduledDate: { $gt: todayEnd }, status: 'Scheduled' }),
      OTSchedule.find({ storeId: req.storeId, scheduledDate: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }, status: 'Completed' }),
      OTSchedule.countDocuments({ storeId: req.storeId }),
    ]);

    res.json({
      success: true,
      stats: {
        todayTotal:     today.length,
        todayCompleted: today.filter(s => s.status === 'Completed').length,
        todayInProgress:today.filter(s => s.status === 'In-Progress').length,
        todayScheduled: today.filter(s => s.status === 'Scheduled').length,
        upcoming,
        thisMonthDone:  thisMonth.length,
        thisMonthHours: Math.round(thisMonth.reduce((s, x) => s + (x.actualMinutes || x.estimatedMinutes || 0), 0) / 60 * 10) / 10,
        allTime,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};