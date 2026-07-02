const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
  },
});

const BASE_URL    = process.env.FRONTEND_URL || 'http://localhost:5173';
const STORE_EMAIL = process.env.EMAIL_USER   || 'amjadfast87@gmail.com';
const BRAND_COLOR = '#0ea5e9';

/* ── Base HTML wrapper ── */
function baseEmail({ title, preview, body }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#0f172a;padding:28px 36px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
        Medi<span style="color:${BRAND_COLOR};">Store</span>
      </div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">
        Professional Medicine Management
      </div>
    </div>
    <!-- Body -->
    <div style="padding:36px;">
      ${body}
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;text-align:center;">
      <div style="font-size:12px;color:#94a3b8;">
        © ${new Date().getFullYear()} MediStore · Pakistan
      </div>
      <div style="font-size:11px;color:#cbd5e1;margin-top:4px;">
        This email was sent to you because you registered on MediStore.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/* ── Send verification email ── */
exports.sendVerificationEmail = async ({ email, name, token }) => {
  const link = `${BASE_URL}/verify-email?token=${token}`;

  const body = `
    <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">
      Welcome to MediStore, ${name}! 👋
    </h2>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
      You're almost ready to start managing your pharmacy professionally.
      Please verify your email address to activate your account and start your <strong>14-day free trial</strong>.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${link}"
         style="background:${BRAND_COLOR};color:#fff;text-decoration:none;
                padding:14px 36px;border-radius:10px;font-weight:700;
                font-size:16px;display:inline-block;">
        ✓ Verify My Email
      </a>
    </div>

    <p style="color:#94a3b8;font-size:13px;text-align:center;">
      This link expires in <strong>24 hours</strong>.<br/>
      If you did not create a MediStore account, you can ignore this email.
    </p>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin-top:24px;">
      <div style="font-weight:700;color:${BRAND_COLOR};font-size:13px;margin-bottom:8px;">
        Your Free Trial Includes:
      </div>
      <div style="font-size:13px;color:#0369a1;line-height:2;">
        ✓ 50 medicines &nbsp;·&nbsp; ✓ 20 patients &nbsp;·&nbsp; ✓ 50 bills/month<br/>
        ✓ PDF invoices &nbsp;·&nbsp; ✓ Expiry alerts &nbsp;·&nbsp; ✓ All features
      </div>
    </div>`;

  await transporter.sendMail({
    from:    `"MediStore" <${STORE_EMAIL}>`,
    to:      email,
    subject: '✓ Verify your MediStore account',
    html:    baseEmail({ title: 'Verify Email', preview: 'Activate your MediStore account', body }),
  });
};

/* ── Resend verification ── */
exports.sendWelcomeEmail = async ({ email, name }) => {
  const body = `
    <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">
      Your account is verified! 🎉
    </h2>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Welcome aboard, <strong>${name}</strong>. Your 14-day free trial has started.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${BASE_URL}" style="background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
        Go to Dashboard →
      </a>
    </div>`;

  await transporter.sendMail({
    from:    `"MediStore" <${STORE_EMAIL}>`,
    to:      email,
    subject: '🎉 Welcome to MediStore — Trial Started!',
    html:    baseEmail({ title: 'Welcome', preview: 'Your account is ready', body }),
  });
};

/* ── Password reset email ── */
exports.sendPasswordResetEmail = async ({ email, name, token }) => {
  const link = `${BASE_URL}/reset-password?token=${token}`;

  const body = `
    <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">
      Reset Your Password
    </h2>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Hi ${name}, we received a request to reset your MediStore password.
      Click the button below to set a new password.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${link}" style="background:#ef4444;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center;">
      This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.
    </p>`;

  await transporter.sendMail({
    from:    `"MediStore" <${STORE_EMAIL}>`,
    to:      email,
    subject: '🔐 Reset your MediStore password',
    html:    baseEmail({ title: 'Password Reset', preview: 'Reset your password', body }),
  });
};

exports.transporter = transporter;