const { z } = require('zod');

/* ── Reusable field definitions ── */
const name     = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long');
const email    = z.string().trim().email('Invalid email address').max(200, 'Email too long');
const password = z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long');

// phone: optional — accepts undefined, null, or empty string — all treated as no value
const phone = z
  .string()
  .trim()
  .max(20, 'Phone number too long')
  .optional()
  .nullable()                // accept null from frontend
  .transform(v => v || undefined); // convert "" and null to undefined

// optional string: for fields like storeName that may come as "" or not at all
const optionalStr = (max = 200) =>
  z.string().trim().max(max).optional().nullable().transform(v => v || undefined);

/* ── Schemas ── */
exports.registerSchema = z.object({
  name,
  email,
  password,
  phone,
});

exports.loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

exports.forgotPasswordSchema = z.object({
  email,
});

exports.resetPasswordSchema = z.object({
  token:       z.string().min(1, 'Token is required'),
  newPassword: password,
});

exports.changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     password,
});

exports.updateProfileSchema = z.object({
  name:      name.optional(),
  phone,
  storeName: optionalStr(200),
});