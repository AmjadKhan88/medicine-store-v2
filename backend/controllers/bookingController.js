const BookingConfig = require('../models/BookingConfig');
const Appointment   = require('../models/Appointment');
const Patient       = require('../models/Patient');
const User          = require('../models/User');
const crypto        = require('crypto');
const { emitToStore } = require('../socket');

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const todayStr  = () => new Date().toISOString().slice(0, 10);

/* ════════ PUBLIC ROUTES (no auth) ════════ */

/* ── GET public booking page config by slug ── */
exports.getPublicConfig = async (req, res) => {
  try {
    const { slug } = req.params;
    const config = await BookingConfig.findOne({ slug: slug.toLowerCase(), isEnabled: true });
    if (!config) return res.status(404).json({ success: false, message: 'Booking page not found or not active' });

    const activeDoctors = config.doctors.filter(d => d.isActive);

    res.json({
      success: true,
      config: {
        clinicName:          config.clinicName,
        tagline:             config.tagline,
        address:             config.address,
        phone:               config.phone,
        logo:                config.logo,
        advanceBookingDays:  config.advanceBookingDays,
        allowSameDayBooking: config.allowSameDayBooking,
        appointmentTypes:    config.appointmentTypes,
        cancellationHours:   config.cancellationHours,
        doctors: activeDoctors.map(d => ({
          _id:            d._id,
          name:           d.name,
          specialization: d.specialization,
          qualification:  d.qualification,
          availableDays:  d.availableDays,
          consultFee:     d.consultFee,
          bio:            d.bio,
          photo:          d.photo,
        })),
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET available time slots for a doctor on a date ── */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { slug, doctorId, date } = req.query;
    if (!slug || !doctorId || !date)
      return res.status(400).json({ success: false, message: 'slug, doctorId and date required' });

    const config = await BookingConfig.findOne({ slug: slug.toLowerCase(), isEnabled: true });
    if (!config) return res.status(404).json({ success: false, message: 'Booking page not found' });

    const doctor = config.doctors.id(doctorId);
    if (!doctor || !doctor.isActive)
      return res.status(404).json({ success: false, message: 'Doctor not found' });

    const selectedDate = new Date(date);
    const dayOfWeek    = selectedDate.getDay();

    // Check doctor available on this day
    if (!doctor.availableDays.includes(dayOfWeek)) {
      return res.json({ success: true, slots: [], message: `Dr. ${doctor.name} is not available on ${DAY_NAMES[dayOfWeek]}` });
    }

    // Get already booked appointments for this doctor on this date
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(date); endOfDay.setHours(23, 59, 59, 999);

    const booked = await Appointment.find({
      storeId:    config.storeId,
      doctorName: doctor.name,
      date:       { $gte: startOfDay, $lte: endOfDay },
      status:     { $ne: 'Cancelled' },
    }).select('timeSlot').lean();

    const bookedSlots = {};
    booked.forEach(a => {
      bookedSlots[a.timeSlot] = (bookedSlots[a.timeSlot] || 0) + 1;
    });

    // Build slot availability
    const now = new Date();
    const slots = doctor.timeSlots
      .filter(s => s.isActive)
      .map(slot => {
        // Check if slot is in the past (for today)
        const isToday = date === todayStr();
        let isPast = false;
        if (isToday) {
          const [timePart, meridiem] = slot.time.split(' ');
          const [hours, minutes]     = timePart.split(':').map(Number);
          let h = hours;
          if (meridiem === 'PM' && h !== 12) h += 12;
          if (meridiem === 'AM' && h === 12) h = 0;
          const slotTime = new Date();
          slotTime.setHours(h, minutes, 0, 0);
          isPast = slotTime <= now;
        }

        const bookedCount   = bookedSlots[slot.time] || 0;
        const isAvailable   = !isPast && bookedCount < (doctor.maxPerSlot || 1);

        return {
          _id:       slot._id,
          time:      slot.time,
          label:     slot.label || slot.time,
          isAvailable,
          isPast,
          bookedCount,
          maxPerSlot: doctor.maxPerSlot || 1,
        };
      });

    res.json({ success: true, slots, doctorName: doctor.name, date });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── SUBMIT booking (public) ── */
exports.submitBooking = async (req, res) => {
  try {
    const {
      slug, doctorId, date, timeSlot,
      patientName, patientPhone,
      appointmentType, notes,
    } = req.body;

    if (!slug || !doctorId || !date || !timeSlot || !patientName || !patientPhone)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const config = await BookingConfig.findOne({ slug: slug.toLowerCase(), isEnabled: true });
    if (!config) return res.status(404).json({ success: false, message: 'Booking page not found' });

    const doctor = config.doctors.id(doctorId);
    if (!doctor || !doctor.isActive)
      return res.status(404).json({ success: false, message: 'Doctor not found' });

    // Validate date / day
    const selectedDate = new Date(date);
    const dayOfWeek    = selectedDate.getDay();
    if (!doctor.availableDays.includes(dayOfWeek))
      return res.status(400).json({ success: false, message: `Dr. ${doctor.name} is not available on this day` });

    // Check slot still available
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(date); endOfDay.setHours(23, 59, 59, 999);
    const bookedCount = await Appointment.countDocuments({
      storeId:    config.storeId,
      doctorName: doctor.name,
      date:       { $gte: startOfDay, $lte: endOfDay },
      timeSlot,
      status:     { $ne: 'Cancelled' },
    });
    if (bookedCount >= (doctor.maxPerSlot || 1))
      return res.status(409).json({ success: false, message: 'This slot is no longer available. Please choose another time.' });

    // Find or create patient record (by phone)
    let patient = await Patient.findOne({ storeId: config.storeId, phone: patientPhone });
    let isNewPatient = false;
    if (!patient) {
      const count  = await Patient.countDocuments({ storeId: config.storeId });
      patient = await Patient.create({
        storeId:   config.storeId,
        patientId: `PT-${String(count + 1).padStart(6, '0')}`,
        name:      patientName.trim(),
        phone:     patientPhone.trim(),
      });
      isNewPatient = true;
    }

    const bookingToken = crypto.randomBytes(16).toString('hex');
    const cancelToken  = crypto.randomBytes(24).toString('hex');

    const appointment = await Appointment.create({
      storeId:         config.storeId,
      patient:         patient._id,
      patientName:     patientName.trim(),
      doctorName:      doctor.name,
      date:            new Date(date),
      timeSlot,
      type:            appointmentType || 'Checkup',
      status:          'Scheduled',
      isOnlineBooking: true,
      bookerName:      patientName.trim(),
      bookerPhone:     patientPhone.trim(),
      bookingToken,
      cancelToken,
      appointmentNotes: notes?.trim() || '',
    });

    // Update booking stats
    await BookingConfig.findByIdAndUpdate(config._id, { $inc: { totalBookings: 1 } });

    // Emit to clinic staff
    emitToStore(config.storeId, 'appointment:created', {
      appointmentId:   appointment._id,
      patientName:     patientName,
      doctorName:      doctor.name,
      date,
      timeSlot,
      isOnlineBooking: true,
    });

    const cancelLink = `${process.env.FRONTEND_URL}/book/${slug}/cancel/${cancelToken}`;
    const confirmationMsg = (config.confirmationMessage || `Your appointment with Dr. {doctor} on {date} at {time} has been confirmed. To cancel: {cancelLink}`)
      .replace(/{doctor}/g, doctor.name)
      .replace(/{date}/g,   selectedDate.toLocaleDateString('en-PK', { weekday:'long', day:'numeric', month:'long' }))
      .replace(/{time}/g,   timeSlot)
      .replace(/{clinic}/g, config.clinicName || 'our clinic')
      .replace(/{cancelLink}/g, cancelLink);

    res.status(201).json({
      success: true,
      booking: {
        appointmentId: appointment._id,
        bookingToken,
        patientName:   patientName.trim(),
        doctorName:    doctor.name,
        date,
        timeSlot,
        clinicName:    config.clinicName,
        clinicAddress: config.address,
        clinicPhone:   config.phone,
        consultFee:    doctor.consultFee,
        isNewPatient,
        cancelLink,
        confirmationMsg,
      },
      message: `Appointment confirmed with Dr. ${doctor.name} on ${date} at ${timeSlot}`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── CANCEL booking (public) ── */
exports.cancelBooking = async (req, res) => {
  try {
    const { cancelToken } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findOne({ cancelToken });
    if (!appointment) return res.status(404).json({ success: false, message: 'Booking not found or already cancelled' });
    if (appointment.status === 'Cancelled')
      return res.status(400).json({ success: false, message: 'This appointment is already cancelled' });

    // Check cancellation window
    const config = await BookingConfig.findOne({ storeId: appointment.storeId });
    if (config?.cancellationHours) {
      const hoursUntilAppt = (new Date(appointment.date) - new Date()) / 3600000;
      if (hoursUntilAppt < config.cancellationHours)
        return res.status(400).json({
          success: false,
          message: `Appointments can only be cancelled at least ${config.cancellationHours} hours in advance`,
        });
    }

    appointment.status          = 'Cancelled';
    appointment.cancelledAt     = new Date();
    appointment.cancelledReason = reason || 'Cancelled by patient';
    await appointment.save();

    await BookingConfig.findOneAndUpdate(
      { storeId: appointment.storeId },
      { $inc: { totalCancellations: 1 } }
    );

    emitToStore(appointment.storeId, 'appointment:updated', {
      appointmentId: appointment._id,
      status:        'Cancelled',
      patientName:   appointment.patientName,
    });

    res.json({ success: true, message: 'Appointment cancelled successfully. We hope to see you soon!' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET cancel confirmation (public — verify token is valid) ── */
exports.getCancelInfo = async (req, res) => {
  try {
    const { cancelToken } = req.params;
    const appointment = await Appointment.findOne({ cancelToken })
      .select('patientName doctorName date timeSlot status storeId');
    if (!appointment) return res.status(404).json({ success: false, message: 'Booking not found' });

    const config = await BookingConfig.findOne({ storeId: appointment.storeId }).select('clinicName cancellationHours');

    res.json({
      success: true,
      appointment: {
        patientName: appointment.patientName,
        doctorName:  appointment.doctorName,
        date:        appointment.date,
        timeSlot:    appointment.timeSlot,
        status:      appointment.status,
        clinicName:  config?.clinicName || 'Our Clinic',
        cancellationHours: config?.cancellationHours || 2,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ════════ ADMIN ROUTES (auth required) ════════ */

/* ── GET or create booking config ── */
exports.getConfig = async (req, res) => {
  try {
    let config = await BookingConfig.findOne({ storeId: req.storeId });
    if (!config) {
      // Auto-generate slug from store name
      const store  = await User.findById(req.storeId);
      const slug   = (store?.storeName || store?.name || 'clinic')
        .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        .slice(0, 50);

      const slugExists = await BookingConfig.findOne({ slug });
      const finalSlug  = slugExists ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

      config = await BookingConfig.create({
        storeId:      req.storeId,
        slug:         finalSlug,
        clinicName:   store?.storeName || 'My Clinic',
        appointmentTypes: ['Checkup','Follow-up','Consultation'],
        confirmationMessage: `Dear {patientName}, your appointment with Dr. {doctor} on {date} at {time} at {clinic} is confirmed. To cancel: {cancelLink}`,
      });
    }
    res.json({ success: true, config });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE config ── */
exports.updateConfig = async (req, res) => {
  try {
    const allowed = [
      'slug','clinicName','tagline','address','phone','email','logo',
      'isEnabled','allowSameDayBooking','advanceBookingDays','cancellationHours',
      'appointmentTypes','confirmationMessage','reminderMessage',
    ];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    // Validate slug uniqueness if changing
    if (update.slug) {
      const existing = await BookingConfig.findOne({ slug: update.slug.toLowerCase(), storeId: { $ne: req.storeId } });
      if (existing) return res.status(400).json({ success: false, message: 'This URL slug is already taken. Please choose another.' });
      update.slug = update.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    }

    const config = await BookingConfig.findOneAndUpdate(
      { storeId: req.storeId },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json({ success: true, config, message: 'Booking configuration updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── ADD doctor to booking config ── */
exports.addDoctor = async (req, res) => {
  try {
    const {
      name, specialization, qualification, userId,
      availableDays, timeSlots, maxPerSlot, consultFee, bio,
    } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Doctor name required' });

    const config = await BookingConfig.findOneAndUpdate(
      { storeId: req.storeId },
      {
        $push: {
          doctors: {
            name: name.trim(), specialization, qualification,
            userId: userId || null,
            availableDays: availableDays || [0,1,2,3,4,5,6],
            timeSlots:     timeSlots     || [],
            maxPerSlot:    Number(maxPerSlot || 1),
            consultFee:    Number(consultFee || 0),
            bio:           bio?.trim() || '',
            isActive:      true,
          },
        },
      },
      { new: true, upsert: true }
    );
    res.json({ success: true, config, message: `Dr. ${name} added` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── UPDATE doctor ── */
exports.updateDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const config = await BookingConfig.findOne({ storeId: req.storeId });
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });

    const doctor = config.doctors.id(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    Object.assign(doctor, req.body);
    await config.save();
    res.json({ success: true, config, message: 'Doctor updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── REMOVE doctor ── */
exports.removeDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const config = await BookingConfig.findOneAndUpdate(
      { storeId: req.storeId },
      { $pull: { doctors: { _id: doctorId } } },
      { new: true }
    );
    res.json({ success: true, config, message: 'Doctor removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET online booking stats ── */
exports.getStats = async (req, res) => {
  try {
    const config = await BookingConfig.findOne({ storeId: req.storeId }).select('totalBookings totalCancellations slug isEnabled');

    const [todayCount, pendingCount, thisMonthCount] = await Promise.all([
      Appointment.countDocuments({
        storeId: req.storeId,
        isOnlineBooking: true,
        date: { $gte: new Date().setHours(0,0,0,0) },
      }),
      Appointment.countDocuments({
        storeId: req.storeId,
        isOnlineBooking: true,
        status: 'Scheduled',
      }),
      Appointment.countDocuments({
        storeId: req.storeId,
        isOnlineBooking: true,
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        totalBookings:     config?.totalBookings     || 0,
        totalCancellations:config?.totalCancellations|| 0,
        slug:              config?.slug,
        isEnabled:         config?.isEnabled,
        todayCount,
        pendingCount,
        thisMonthCount,
        publicUrl: config?.slug ? `${process.env.FRONTEND_URL}/book/${config.slug}` : null,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};