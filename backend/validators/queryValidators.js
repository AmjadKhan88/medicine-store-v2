const { z } = require('zod');

/* ── Reusable pagination schema ── */
exports.paginationSchema = z.object({
  page:   z.coerce.number().int().min(1).max(10000).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
}).passthrough(); // allow other query params

/* ── Medicine list query ── */
exports.medicineQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  search:   z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  status:   z.enum(['expiring','expired','lowstock','']).optional(),
});

/* ── Patient list query ── */
exports.patientQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
});

/* ── Billing list query ── */
exports.billingQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.enum(['Paid','Partial','Pending','']).optional(),
});