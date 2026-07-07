const { z } = require('zod');

const ROUTES = ['Oral','Topical','Injection','Inhale','Eye Drops','Ear Drops','Other'];

const prescriptionItemSchema = z.object({
  medicine:     z.string().regex(/^[a-f\d]{24}$/i).optional(),
  medicineName: z.string().trim().min(1,'Medicine name is required').max(200),
  dosage:       z.string().trim().min(1,'Dosage is required').max(100),
  frequency:    z.string().trim().min(1,'Frequency is required').max(100),
  duration:     z.string().trim().min(1,'Duration is required').max(100),
  quantity:     z.coerce.number().int().min(1).max(10000),
  instructions: z.string().trim().max(500).optional(),
  route:        z.enum(ROUTES).default('Oral'),
});

exports.createPrescriptionSchema = z.object({
  patient:    z.string().regex(/^[a-f\d]{24}$/i, 'Invalid patient ID'),
  doctorName: z.string().trim().min(2,'Doctor name is required').max(200),
  diagnosis:  z.string().trim().max(500).optional(),
  items:      z.array(prescriptionItemSchema).min(1,'Add at least one medicine').max(50),
  notes:      z.string().trim().max(2000).optional(),
  validDays:  z.coerce.number().int().min(1).max(365).default(30),
});