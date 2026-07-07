const { z } = require('zod');

const name     = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long');
const email    = z.string().trim().email('Invalid email address').max(200);
const password = z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long');
const phone    = z.string().trim().max(20).optional();

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
  storeName: z.string().trim().max(200).optional(),
});