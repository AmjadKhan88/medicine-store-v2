const { z } = require('zod');

exports.addStaffSchema = z.object({
  name:     z.string().trim().min(2,'Name is required').max(200),
  email:    z.string().trim().email('Invalid email').max(200),
  password: z.string().min(6,'Password must be at least 6 characters').max(100),
  role:     z.enum(['doctor','pharmacist','nurse', 'receptionist', 'lab_technician']),
  phone:    z.string().trim().max(20).optional(),
});

exports.updateStaffSchema = z.object({
  name:  z.string().trim().min(2).max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  role:  z.enum(['doctor','pharmacist','nurse', 'receptionist', 'lab_technician']).optional(),
});