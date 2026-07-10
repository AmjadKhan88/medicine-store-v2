const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,             // STARTTLS on port 587
  family: 4,                 // force IPv4 — Render has no outbound IPv6 route
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
  },
  pool: true,                // use pooled connections
  maxConnections: 1,
  rateLimit: 1,              // avoid rate limiting
  socketTimeout: 30000,      // 30 seconds
  connectionTimeout: 30000,
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
        Elite<span style="color:${BRAND_COLOR};">HMS</span>
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
      Welcome to EliteHMS, ${name}! 👋
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
      If you did not create a EliteHMS account, you can ignore this email.
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
    from:    `"EliteHMS" <${STORE_EMAIL}>`,
    to:      email,
    subject: '✓ Verify your EliteHMS account',
    html:    baseEmail({ title: 'Verify Email', preview: 'Activate your EliteHMS account', body }),
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
    from:    `"EliteHMS" <${STORE_EMAIL}>`,
    to:      email,
    subject: '🎉 Welcome to EliteHMS — Trial Started!',
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
      Hi ${name}, we received a request to reset your EliteHMS password.
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
    from:    `"EliteHMS" <${STORE_EMAIL}>`,
    to:      email,
    subject: '🔐 Reset your EliteHMS password',
    html:    baseEmail({ title: 'Password Reset', preview: 'Reset your password', body }),
  });
};

/* ══════════════════════════════════════
   INVOICE EMAIL — send to patient
══════════════════════════════════════ */
exports.sendInvoiceEmail = async ({ email, patientName, bill, storeName, storePhone }) => {
  const store    = storeName  || 'EliteHMS Pharmacy';
  const phone    = storePhone || '';
  const balance  = (bill.totalAmount || 0) - (bill.amountPaid || 0);
  const isPaid   = balance <= 0;

  const itemsHTML = (bill.items || []).map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;">${item.medicineName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:right;">Rs. ${item.unitPrice?.toLocaleString()}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:right;font-weight:700;">Rs. ${item.totalPrice?.toLocaleString()}</td>
    </tr>`).join('');

  const body = `
    <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 4px;">
      Invoice from ${store}
    </h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px;">
      Dear <strong>${patientName}</strong>, please find your invoice details below.
    </p>

    <!-- Invoice meta -->
    <div style="display:flex;justify-content:space-between;background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Invoice Number</div>
        <div style="font-weight:800;font-size:16px;color:#0ea5e9;">${bill.billNumber}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Date</div>
        <div style="font-weight:700;font-size:14px;">${new Date(bill.createdAt || Date.now()).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Status</div>
        <div style="font-weight:700;font-size:14px;color:${isPaid ? '#10b981' : '#f59e0b'};">${isPaid ? '✓ PAID' : 'PARTIAL / PENDING'}</div>
      </div>
    </div>

    <!-- Items table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="background:#0f172a;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#fff;font-weight:700;border-radius:6px 0 0 0;">Medicine</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#fff;font-weight:700;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#fff;font-weight:700;">Unit Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#fff;font-weight:700;border-radius:0 6px 0 0;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
    </table>

    <!-- Totals -->
    <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:20px;">
      ${bill.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px;"><span style="color:#64748b;">Discount</span><span style="color:#f59e0b;">— Rs. ${bill.discount?.toLocaleString()}</span></div>` : ''}
      ${bill.tax > 0 ? `<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px;"><span style="color:#64748b;">Tax</span><span>Rs. ${bill.tax?.toLocaleString()}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;border-top:2px solid #e2e8f0;padding-top:10px;margin-top:6px;">
        <span>Total</span><span>Rs. ${bill.totalAmount?.toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:6px;">
        <span style="color:#64748b;">Amount Paid</span>
        <span style="color:#10b981;font-weight:700;">Rs. ${bill.amountPaid?.toLocaleString()}</span>
      </div>
      ${balance > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:4px;padding:10px;background:#fee2e2;border-radius:8px;margin-top:8px;">
        <span style="color:#dc2626;font-weight:700;">Remaining Balance</span>
        <span style="color:#dc2626;font-weight:800;">Rs. ${balance.toLocaleString()}</span>
      </div>` : `
      <div style="margin-top:8px;padding:10px;background:#d1fae5;border-radius:8px;text-align:center;color:#059669;font-weight:700;">
        ✓ Fully Paid — Thank you!
      </div>`}
    </div>

    ${balance > 0 ? `
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:14px;margin-bottom:20px;font-size:13px;color:#92400e;">
      <strong>Payment Reminder:</strong> Please clear your outstanding balance of
      <strong>Rs. ${balance.toLocaleString()}</strong> at your earliest convenience.
      Contact us at ${phone}.
    </div>` : ''}

    <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:20px;">
      ${store}${phone ? ` · ${phone}` : ''}
    </p>`;

  await transporter.sendMail({
    from:    `"${store}" <${STORE_EMAIL}>`,
    to:      email,
    subject: `Invoice ${bill.billNumber} from ${store}`,
    html:    baseEmail({ title: `Invoice ${bill.billNumber}`, preview: `Your invoice from ${store}`, body }),
  });
};

/* ══════════════════════════════════════
   PAYMENT CONFIRMATION EMAIL
══════════════════════════════════════ */
exports.sendPaymentConfirmationEmail = async ({ email, patientName, bill, paymentAmount, paymentMethod, storeName, storePhone }) => {
  const store   = storeName  || 'EliteHMS Pharmacy';
  const phone   = storePhone || '';
  const balance = (bill.totalAmount || 0) - (bill.amountPaid || 0);

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:70px;height:70px;background:#d1fae5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:32px;">
        ✓
      </div>
      <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 6px;">Payment Received!</h2>
      <p style="color:#64748b;font-size:15px;margin:0;">
        Dear <strong>${patientName}</strong>, your payment has been recorded successfully.
      </p>
    </div>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Invoice</div>
          <div style="font-weight:700;font-size:15px;color:#0ea5e9;">${bill.billNumber}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Payment Received</div>
          <div style="font-weight:800;font-size:18px;color:#059669;">Rs. ${Number(paymentAmount).toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Payment Method</div>
          <div style="font-weight:700;">${paymentMethod}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Date</div>
          <div style="font-weight:700;">${new Date().toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })}</div>
        </div>
      </div>
    </div>

    <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px;">
        <span style="color:#64748b;">Total Bill Amount</span>
        <span>Rs. ${bill.totalAmount?.toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px;">
        <span style="color:#64748b;">Total Paid (including this)</span>
        <span style="color:#059669;font-weight:700;">Rs. ${bill.amountPaid?.toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;border-top:2px solid #e2e8f0;padding-top:10px;margin-top:4px;">
        <span>Remaining Balance</span>
        <span style="color:${balance > 0 ? '#dc2626' : '#059669'};">
          ${balance > 0 ? `Rs. ${balance.toLocaleString()}` : 'CLEARED ✓'}
        </span>
      </div>
    </div>

    <p style="color:#94a3b8;font-size:13px;text-align:center;">
      Thank you for your payment. Get well soon! 💊<br/>
      ${store}${phone ? ` · ${phone}` : ''}
    </p>`;

  await transporter.sendMail({
    from:    `"${store}" <${STORE_EMAIL}>`,
    to:      email,
    subject: `✓ Payment of Rs. ${Number(paymentAmount).toLocaleString()} received — ${bill.billNumber}`,
    html:    baseEmail({ title: 'Payment Received', preview: 'Payment confirmation', body }),
  });
};

/* ══════════════════════════════════════
   STAFF INVITATION EMAIL
══════════════════════════════════════ */
exports.sendStaffInvitationEmail = async ({ email, staffName, role, storeName, adminName, tempPassword }) => {
  const store = storeName || 'EliteHMS Pharmacy';
  const link  = `${BASE_URL}/login`;

  const rolePerms = {
    doctor:     ['Add and edit medicines', 'Add and edit patients', 'Create invoices', 'View reports'],
    pharmacist: ['Create invoices', 'View medicines list', 'View patient list'],
  };

  const permsHTML = (rolePerms[role] || []).map(p =>
    `<div style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px;color:#475569;">
      <span style="color:#0ea5e9;">✓</span> ${p}
    </div>`).join('');

  const body = `
    <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 6px;">
      You've been added to ${store}
    </h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px;">
      Hi <strong>${staffName}</strong>, <strong>${adminName}</strong> has added you
      as a <strong style="color:#0ea5e9;text-transform:capitalize;">${role}</strong>
      on MediStore.
    </p>

    <!-- Credentials box -->
    <div style="background:#0f172a;border-radius:12px;padding:24px;margin-bottom:20px;">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">Your Login Credentials</div>
      <div style="margin-bottom:12px;">
        <div style="font-size:11px;color:#64748b;margin-bottom:3px;">Email</div>
        <div style="font-size:15px;font-weight:700;color:#38bdf8;">${email}</div>
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;color:#64748b;margin-bottom:3px;">Temporary Password</div>
        <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:2px;background:#1e293b;padding:10px 14px;border-radius:8px;font-family:monospace;">${tempPassword}</div>
      </div>
      <div style="font-size:12px;color:#f59e0b;">
        ⚠️ Please change your password after first login.
      </div>
    </div>

    <!-- Permissions -->
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:#0ea5e9;margin-bottom:10px;text-transform:capitalize;">
        As a ${role}, you can:
      </div>
      ${permsHTML}
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="${link}" style="background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:13px 36px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
        Log In to MediStore →
      </a>
    </div>

    <p style="color:#94a3b8;font-size:13px;text-align:center;">
      ${store} is using EliteHMS for pharmacy management.
    </p>`;

  await transporter.sendMail({
    from:    `"${store} via EliteHMS" <${STORE_EMAIL}>`,
    to:      email,
    subject: `You've been added to ${store} on EliteHMS`,
    html:    baseEmail({ title: 'Staff Invitation', preview: `You've been added to ${store}`, body }),
  });
};

/* ══════════════════════════════════════
   WEEKLY EXPIRY DIGEST — to admin
══════════════════════════════════════ */
exports.sendExpiryDigestEmail = async ({ email, adminName, storeName, expired, expiringSoon, lowStock }) => {
  const store       = storeName || 'EliteHMS Pharmacy';
  const hasUrgent   = expired.length > 0;
  const totalIssues = expired.length + expiringSoon.length + lowStock.length;

  const medTable = (medicines, statusColor, statusLabel) => {
    if (!medicines.length) return '<p style="color:#94a3b8;font-size:13px;">None</p>';
    return `
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:700;">Medicine</th>
            <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;font-weight:700;">Stock</th>
            <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;font-weight:700;">Expiry</th>
            <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;font-weight:700;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${medicines.slice(0, 8).map(m => `
          <tr>
            <td style="padding:8px 10px;font-size:13px;font-weight:600;">${m.name}</td>
            <td style="padding:8px 10px;font-size:13px;text-align:center;">${m.stock} ${m.unit}</td>
            <td style="padding:8px 10px;font-size:13px;text-align:center;">${m.expiryDate ? new Date(m.expiryDate).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—'}</td>
            <td style="padding:8px 10px;text-align:center;">
              <span style="background:${statusColor}20;color:${statusColor};font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;">${statusLabel}</span>
            </td>
          </tr>`).join('')}
          ${medicines.length > 8 ? `<tr><td colspan="4" style="padding:8px 10px;font-size:12px;color:#94a3b8;text-align:center;">...and ${medicines.length - 8} more</td></tr>` : ''}
        </tbody>
      </table>`;
  };

  const body = `
    <div style="background:${hasUrgent ? '#fee2e2' : '#fef3c7'};border:1px solid ${hasUrgent ? '#fca5a5' : '#fcd34d'};border-radius:12px;padding:18px;margin-bottom:24px;">
      <div style="font-size:16px;font-weight:800;color:${hasUrgent ? '#dc2626' : '#92400e'};margin-bottom:4px;">
        ${hasUrgent ? '🚨 Urgent Action Required' : '⚠️ Weekly Pharmacy Alert'}
      </div>
      <div style="font-size:14px;color:${hasUrgent ? '#b91c1c' : '#78350f'};">
        Hi <strong>${adminName}</strong>, here is your weekly summary for <strong>${store}</strong>.
        You have <strong>${totalIssues} issue${totalIssues !== 1 ? 's' : ''}</strong> that need attention.
      </div>
    </div>

    <!-- Summary badges -->
    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:100px;background:#fee2e2;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#dc2626;">${expired.length}</div>
        <div style="font-size:12px;color:#dc2626;font-weight:600;">Expired</div>
      </div>
      <div style="flex:1;min-width:100px;background:#fef3c7;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#d97706;">${expiringSoon.length}</div>
        <div style="font-size:12px;color:#d97706;font-weight:600;">Expiring Soon</div>
      </div>
      <div style="flex:1;min-width:100px;background:#ede9fe;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#7c3aed;">${lowStock.length}</div>
        <div style="font-size:12px;color:#7c3aed;font-weight:600;">Low Stock</div>
      </div>
    </div>

    ${expired.length > 0 ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:14px;font-weight:800;color:#dc2626;margin-bottom:10px;">
        💊 Expired Medicines (${expired.length}) — Remove Immediately
      </div>
      ${medTable(expired, '#dc2626', 'EXPIRED')}
    </div>` : ''}

    ${expiringSoon.length > 0 ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:14px;font-weight:800;color:#d97706;margin-bottom:10px;">
        ⏰ Expiring Within 30 Days (${expiringSoon.length})
      </div>
      ${medTable(expiringSoon, '#d97706', 'EXPIRING SOON')}
    </div>` : ''}

    ${lowStock.length > 0 ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:14px;font-weight:800;color:#7c3aed;margin-bottom:10px;">
        📦 Low Stock Items (${lowStock.length})
      </div>
      ${medTable(lowStock, '#7c3aed', 'LOW STOCK')}
    </div>` : ''}

    ${totalIssues === 0 ? `
    <div style="text-align:center;padding:30px;background:#f0fdf4;border-radius:12px;">
      <div style="font-size:36px;margin-bottom:10px;">✅</div>
      <div style="font-weight:700;color:#059669;">All clear this week!</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">No expired medicines, no low stock issues.</div>
    </div>` : ''}

    <div style="text-align:center;margin:28px 0;">
      <a href="${BASE_URL}/app/expiry-alerts" style="background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;">
        View Full Report in EliteHMS →
      </a>
    </div>

    <p style="color:#94a3b8;font-size:12px;text-align:center;">
      This is your automated weekly digest. Log in to EliteHMS to take action.<br/>
      ${store}
    </p>`;

  await transporter.sendMail({
    from:    `"MediStore Alerts" <${STORE_EMAIL}>`,
    to:      email,
    subject: `${hasUrgent ? '🚨' : '⚠️'} Weekly Pharmacy Alert — ${totalIssues} issue${totalIssues !== 1 ? 's' : ''} | ${store}`,
    html:    baseEmail({ title: 'Weekly Digest', preview: `${totalIssues} issues need attention in ${store}`, body }),
  });
};

exports.transporter = transporter;