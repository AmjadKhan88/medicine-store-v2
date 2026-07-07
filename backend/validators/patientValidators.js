const { z } = require('zod');

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'];

exports.createPatientSchema = z.object({
  name:          z.string().trim().min(2,'Name must be at least 2 characters').max(200),
  age:           z.coerce.number().int().min(0).max(150).optional(),
  gender:        z.enum(['Male','Female','Other']).default('Male'),
  phone:         z.string().trim().max(20).optional(),
  email:         z.string().trim().email('Invalid email').max(200).optional().or(z.literal('')),
  address:       z.string().trim().max(500).optional(),
  city:          z.string().trim().max(100).optional(),
  bloodGroup:    z.enum(BLOOD_GROUPS).default('Unknown'),
  medicalHistory:z.string().trim().max(2000).optional(),
  allergies:     z.array(z.string().trim().max(100)).max(50).optional().default([]),
  doctor:        z.string().trim().max(200).optional(),
});

exports.updatePatientSchema = exports.createPatientSchema.partial();