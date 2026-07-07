const { z } = require('zod');

exports.createSupplierSchema = z.object({
  name:         z.string().trim().min(2,'Name is required').max(200),
  company:      z.string().trim().max(200).optional(),
  phone:        z.string().trim().min(7,'Valid phone required').max(20),
  phone2:       z.string().trim().max(20).optional(),
  email:        z.string().trim().email().max(200).optional().or(z.literal('')),
  address:      z.string().trim().max(500).optional(),
  city:         z.string().trim().max(100).optional(),
  ntn:          z.string().trim().max(50).optional(),
  bankName:     z.string().trim().max(100).optional(),
  bankAccount:  z.string().trim().max(50).optional(),
  bankIBAN:     z.string().trim().max(50).optional(),
  paymentTerms: z.string().trim().max(200).optional(),
  creditLimit:  z.coerce.number().min(0).max(100000000).default(0),
  notes:        z.string().trim().max(2000).optional(),
});

exports.updateSupplierSchema = exports.createSupplierSchema.partial();

exports.recordPaymentSchema = z.object({
  amount: z.coerce.number().min(1,'Amount must be at least 1').max(100000000),
  note:   z.string().trim().max(500).optional(),
});