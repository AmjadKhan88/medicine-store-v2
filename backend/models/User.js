const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },

  // Role within their store
  role: {
    type: String,
    enum: ['admin', 'doctor', 'pharmacist'],
    default: 'admin', // first user who registers is always admin/owner
  },

  // Every user belongs to exactly one store (tenant)
  // Admin's storeId = their own _id (set after registration)
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // points to the admin/owner user
  },
  storeName: { type: String, trim: true },
  // Email verification
  isEmailVerified: { type: Boolean, default: false },
  emailVerifyToken: { type: String },
  emailVerifyExpires: { type: Date },

  // Password reset
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },

  // Onboarding
  onboardingComplete: { type: Boolean, default: false },
  onboardingStep: { type: Number, default: 0 },

  phone: { type: String, trim: true },
  isActive: { type: Boolean, default: true },

// Invite system
  inviteToken:  { type: String },
  inviteExpires:{ type: Date },

  /* ── Refresh tokens ── */
  refreshTokens: [{
    token:     { type: String, required: true },   // hashed
    expiresAt: { type: Date,   required: true },
    device:    { type: String, default: 'unknown' }, // user-agent snippet
    createdAt: { type: Date,   default: Date.now  },
  }],

  /* ── 2FA ── */
  twoFactorEnabled:     { type: Boolean, default: false },
  twoFactorSecret:      { type: String,  select: false  },  // TOTP secret (base32)
  twoFactorSetupPending:{ type: Boolean, default: false  },  // true until first verify
  twoFactorRecoveryCodes:[{ type: String }],                 // hashed recovery codes
  twoFactorForced:      { type: Boolean, default: false  },  // admin forces 2FA on account

}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (pwd) {
  return bcrypt.compare(pwd, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.inviteToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);