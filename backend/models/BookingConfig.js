const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  time:     { type: String, required: true },    // "09:00 AM"
  label:    { type: String },                    // optional display label
  isActive: { type: Boolean, default: true },
});

const doctorScheduleSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  specialization: { type: String, trim: true },    // "General Physician", "Cardiologist"
  qualification:  { type: String, trim: true },    // "MBBS, FCPS"
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  availableDays:  [{ type: Number }],              // 0=Sun, 1=Mon ... 6=Sat
  timeSlots:      [timeSlotSchema],
  maxPerSlot:     { type: Number, default: 1 },    // max concurrent bookings per slot
  consultFee:     { type: Number, default: 0 },
  isActive:       { type: Boolean, default: true },
  photo:          { type: String },                // URL
  bio:            { type: String },
});

const bookingConfigSchema = new mongoose.Schema({
  storeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  /* ── Public URL ── */
  slug:       { type: String, unique: true, lowercase: true, trim: true },  // "al-shifa-clinic"

  /* ── Branding ── */
  clinicName: { type: String, trim: true },
  tagline:    { type: String, trim: true },
  address:    { type: String, trim: true },
  phone:      { type: String, trim: true },
  email:      { type: String, trim: true },
  logo:       { type: String },

  /* ── Settings ── */
  isEnabled:          { type: Boolean, default: false },
  allowSameDayBooking:{ type: Boolean, default: true  },
  advanceBookingDays: { type: Number,  default: 30    },  // how far ahead patients can book
  cancellationHours:  { type: Number,  default: 2     },  // must cancel at least X hours before

  /* ── Appointment types offered ── */
  appointmentTypes: [{
    type: String,
    enum: ['Checkup','Follow-up','Consultation','Procedure','Lab Test','Other'],
  }],

  /* ── Message templates ── */
  confirmationMessage:{ type: String },  // sent to patient after booking
  reminderMessage:    { type: String },  // sent 24h before

  /* ── Doctors ── */
  doctors: [doctorScheduleSchema],

  /* ── Stats ── */
  totalBookings:     { type: Number, default: 0 },
  totalCancellations:{ type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('BookingConfig', bookingConfigSchema);