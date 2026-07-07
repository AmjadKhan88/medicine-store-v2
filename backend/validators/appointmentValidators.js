const { z } = require('zod');

const TYPES    = ['Checkup','Follow-up','Emergency','Consultation','Procedure','Lab Test','Other'];
const STATUSES = ['Scheduled','Completed','Cancelled','No-Show'];

exports.createAppointmentSchema = z.object({
  patient:    z.string().regex(/^[a-f\d]{24}$/i, 'Invalid patient ID'),
  doctorName: z.string().trim().min(2,'Doctor name is required').max(200),
  date:       z.string().min(1,'Date is required'),
  timeSlot:   z.string().trim().max(20).optional(),
  type:       z.enum(TYPES).default('Checkup'),
  notes:      z.string().trim().max(1000).optional(),
});

exports.updateAppointmentSchema = exports.createAppointmentSchema.partial();

exports.completeVisitSchema = z.object({
  visitNotes:  z.string().trim().max(5000).optional(),
  diagnosis:   z.string().trim().max(500).optional(),
  vitalSigns:  z.object({
    bp:          z.string().trim().max(20).optional(),
    pulse:       z.coerce.number().min(0).max(300).optional(),
    temperature: z.coerce.number().min(0).max(50).optional(),
    weight:      z.coerce.number().min(0).max(500).optional(),
    sugar:       z.coerce.number().min(0).max(1000).optional(),
  }).optional(),
  medicinesGiven: z.array(z.object({
    medicine:     z.string().regex(/^[a-f\d]{24}$/i).optional(),
    medicineName: z.string().trim().max(200),
    dosage:       z.string().trim().max(100).optional(),
    quantity:     z.coerce.number().int().min(0).max(10000).default(0),
  })).max(50).optional(),
  followUpDate:      z.string().optional(),
  linkedPrescription:z.string().regex(/^[a-f\d]{24}$/i).optional().or(z.literal('')).or(z.null()),
  linkedBill:        z.string().regex(/^[a-f\d]{24}$/i).optional().or(z.literal('')).or(z.null()),
});