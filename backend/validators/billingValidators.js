const { z } = require('zod');

const billItemSchema = z.object({
  medicine: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid medicine ID'),
  quantity: z.coerce.number().int().min(1,'Quantity must be at least 1').max(10000),
});

exports.createBillSchema = z.object({
  patient:       z.string().regex(/^[a-f\d]{24}$/i, 'Invalid patient ID'),
  items:         z.array(billItemSchema).min(1,'Add at least one medicine').max(100,'Too many items'),
  discount:      z.coerce.number().min(0).max(10000000).default(0),
  tax:           z.coerce.number().min(0).max(10000000).default(0),
  amountPaid:    z.coerce.number().min(0).max(10000000).default(0),
  paymentMethod: z.enum(['Cash','Card','Online','JazzCash','EasyPaisa','Pending']).default('Cash'),
  notes:         z.string().trim().max(1000).optional(),
});

exports.updatePaymentSchema = z.object({
  additionalPayment: z.coerce.number().min(1,'Amount must be at least 1').max(10000000),
  paymentMethod:     z.enum(['Cash','Card','Online','JazzCash','EasyPaisa']).default('Cash'),
});