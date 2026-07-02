import { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import {
  MdStar, MdCheckCircle, MdWarning, MdPayment,
  MdWhatsapp, MdPhone, MdAccountBalance, MdClose,
  MdRefresh, MdArrowUpward,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

const PKR = (n) => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;

const PLAN_COLORS = {
  trial:  { accent: '#6366f1', bg: '#ede9fe', badge: '#6366f1' },
  free:   { accent: '#94a3b8', bg: '#f1f5f9', badge: '#64748b' },
  basic:  { accent: '#0ea5e9', bg: '#e0f2fe', badge: '#0284c7' },
  pro:    { accent: '#8b5cf6', bg: '#f3e8ff', badge: '#7c3aed' },
};

const PAYMENT_INFO = {
  jazzcash:  { label: 'JazzCash',  number:import.meta.env.VITE_JAZZCASH_NUMBER  || '0306-9534618', color: '#E61F7F' },
  easypaisa: { label: 'EasyPaisa', number:import.meta.env.VITE_EASYPAISA_NUMBER || '0348-4637804', color: '#35A820' },
  bank:      { label: 'Bank Transfer', number: 'See details below',                        color: '#0f172a' },
};

/* ── Usage bar ── */
function UsageBar({ label, used, limit, percent }) {
  const color = percent >= 100 ? 'var(--danger)' : percent >= 80 ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>
          {used} / {limit === -1 ? '∞' : limit}
          {limit !== -1 && <span className="text-muted" style={{ fontWeight: 400 }}> ({percent}%)</span>}
        </span>
      </div>
      {limit !== -1 && (
        <div style={{ height: 7, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(percent, 100)}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
        </div>
      )}
      {limit === -1 && (
        <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>✓ Unlimited</div>
      )}
    </div>
  );
}

/* ── Plan card ── */
function PlanCard({ planKey, plan, currentPlan, onSelect }) {
  const clr       = PLAN_COLORS[planKey];
  const isCurrent = planKey === currentPlan;
  const canUpgrade = ['basic', 'pro'].includes(planKey) && !isCurrent;

  return (
    <div style={{
      border: `2px solid ${isCurrent ? clr.accent : 'var(--border)'}`,
      borderRadius: 16, padding: 24, background: isCurrent ? clr.bg : 'var(--card-bg)',
      position: 'relative', transition: 'var(--transition)',
    }}>
      {plan.badge && (
        <div style={{
          position: 'absolute', top: -12, right: 16,
          background: clr.badge, color: '#fff',
          fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 99,
        }}>
          {plan.badge}
        </div>
      )}

      <div style={{ fontWeight: 800, fontSize: 18, color: clr.accent, marginBottom: 4 }}>{plan.name}</div>
      <div style={{ fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', marginBottom: 16 }}>
        {plan.price === 0 ? 'Free' : `${PKR(plan.price)}/mo`}
      </div>

      {plan.features.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
          <MdCheckCircle size={14} style={{ color: clr.accent, flexShrink: 0 }} /> {f}
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        {isCurrent ? (
          <div style={{ background: clr.bg, color: clr.accent, fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, textAlign: 'center', border: `1px solid ${clr.accent}` }}>
            ✓ Current Plan
          </div>
        ) : canUpgrade ? (
          <button
            onClick={() => onSelect(planKey)}
            style={{
              width: '100%', padding: '10px', background: clr.accent, color: '#fff',
              border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
            }}
          >
            <MdArrowUpward size={14} style={{ marginRight: 4 }} />
            Upgrade to {plan.name}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ── Payment Modal ── */
function PaymentModal({ plan, planData, onClose, onSubmitted }) {
  const [method, setMethod]      = useState('jazzcash');
  const [txnId, setTxnId]        = useState('');
  const [amount, setAmount]      = useState(planData.price);
  const [notes, setNotes]        = useState('');
  const [step, setStep]          = useState(1); // 1=pay, 2=confirm
  const [submitting, setSubmitting] = useState(false);

  const payInfo = PAYMENT_INFO[method];

  const handleSubmit = async () => {
    if (!txnId.trim()) { toast.error('Enter your transaction ID'); return; }
    setSubmitting(true);
    try {
      await API.post('/subscription/pay', { plan, paymentMethod: method, transactionId: txnId, amount, notes });
      toast.success('Payment submitted! Activation within 24 hours.');
      onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Upgrade to {planData.name}</div>
            <div className="text-muted text-sm">{PKR(planData.price)} / month</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {step === 1 && (
          <>
            {/* Step 1: Choose method and pay */}
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              STEP 1 — Choose Payment Method
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {Object.entries(PAYMENT_INFO).map(([key, info]) => (
                <button key={key} onClick={() => setMethod(key)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${method === key ? info.color : 'var(--border)'}`,
                    background: method === key ? info.color + '15' : 'var(--card-bg)',
                    fontWeight: 700, fontSize: 12, color: method === key ? info.color : 'var(--text-muted)',
                    fontFamily: 'var(--font-main)',
                  }}>
                  {info.label}
                </button>
              ))}
            </div>

            {/* Payment details */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                STEP 2 — Send {PKR(planData.price)} to:
              </div>

              {(method === 'jazzcash' || method === 'easypaisa') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: PAYMENT_INFO[method].color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MdPhone size={20} style={{ color: PAYMENT_INFO[method].color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{PAYMENT_INFO[method].number}</div>
                    <div className="text-muted text-sm">{PAYMENT_INFO[method].label} Number</div>
                  </div>
                </div>
              )}

              {method === 'bank' && (
                <div style={{ fontSize: 13, lineHeight: 2 }}>
                  <div><strong>Bank:</strong> {import.meta.env.VITE_BANK_NAME || 'Bank UBL'}</div>
                  <div><strong>Account Title:</strong> {import.meta.env.VITE_BANK_ACCOUNT_TITLE || 'Amjad ullah'}</div>
                  <div><strong>IBAN:</strong> <code>{import.meta.env.VITE_BANK_IBAN || 'PK50UNIL010900034169'}</code></div>
                </div>
              )}

              <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--warning-bg)', borderRadius: 8, fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                ⚠️ Use your store email as reference/description when paying
              </div>
            </div>

            <button className="btn btn-primary w-full" onClick={() => setStep(2)}>
              I've Made the Payment →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            {/* Step 2: Enter transaction ID */}
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              STEP 3 — Enter Payment Details
            </div>

            <div className="form-group">
              <label className="form-label required">Transaction ID / Reference Number</label>
              <input className="form-control" value={txnId} onChange={e => setTxnId(e.target.value)}
                placeholder="e.g. TXN123456789 or IMPS/UBL/JCZ reference" />
              <div className="form-hint">Found in your JazzCash/EasyPaisa SMS or bank receipt</div>
            </div>

            <div className="form-group">
              <label className="form-label">Amount Paid (₨)</label>
              <input className="form-control" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Additional Notes (optional)</label>
              <textarea className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any extra info for verification..." />
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#16a34a' }}>
              ✓ Your account will be activated within <strong>24 hours</strong> after payment verification.
              WhatsApp us at {PAYMENT_INFO.jazzcash.number} for faster support.
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !txnId.trim()}>
                <MdPayment /> {submitting ? 'Submitting...' : 'Submit Payment Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
export default function SubscriptionPage() {
  const {
    subscription, usage, plans, limits,
    isActive, plan, daysLeft, isTrial,
    usagePercent, pendingRequest, refresh,
  } = useSubscription();

  const [upgradeTarget, setUpgradeTarget] = useState(null);

  const handleCancelRequest = async () => {
    if (!confirm('Cancel your pending payment request?')) return;
    try {
      await API.delete('/subscription/pay');
      toast.success('Request cancelled');
      refresh();
    } catch { toast.error('Failed'); }
  };

  const clr = PLAN_COLORS[plan] || PLAN_COLORS.trial;

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Subscription & Billing</h1>
          <p>Manage your plan, view usage and upgrade</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh}><MdRefresh /> Refresh</button>
      </div>

      {/* ── Current plan status ── */}
      <div className="card" style={{ marginBottom: 20, border: `2px solid ${clr.accent}`, background: clr.bg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <MdStar size={22} style={{ color: clr.accent }} />
              <div style={{ fontWeight: 800, fontSize: 20, color: clr.accent }}>
                {plans[plan]?.name || 'Free Trial'} Plan
              </div>
              <span style={{ background: clr.accent, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99 }}>
                {isActive ? 'ACTIVE' : 'EXPIRED'}
              </span>
            </div>
            {isTrial && (
              <div style={{ fontSize: 14, color: daysLeft <= 3 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {daysLeft > 0
                  ? <><strong>{daysLeft} days</strong> remaining in your free trial</>
                  : <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Trial expired — please upgrade</span>}
              </div>
            )}
            {!isTrial && plan !== 'free' && subscription?.currentPeriodEnd && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Renews on <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                {' '}· {daysLeft} days remaining
              </div>
            )}
          </div>

          {(plan === 'trial' || plan === 'free' || plan === 'basic') && (
            <button
              className="btn btn-primary"
              onClick={() => setUpgradeTarget(plan === 'basic' ? 'pro' : 'basic')}
            >
              <MdArrowUpward /> Upgrade Now
            </button>
          )}
        </div>
      </div>

      {/* ── Pending payment request ── */}
      {pendingRequest && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <MdPayment size={20} />
          <div className="alert-text" style={{ flex: 1 }}>
            <strong>Payment request pending review</strong> — {pendingRequest.plan} plan · {PKR(pendingRequest.amount)} via {pendingRequest.paymentMethod} · TXN: {pendingRequest.transactionId}
            <div className="text-muted text-sm" style={{ marginTop: 2 }}>Submitted {new Date(pendingRequest.createdAt).toLocaleDateString('en-PK')} · Activation within 24 hours</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleCancelRequest}>Cancel</button>
        </div>
      )}

      {/* ── Expired warning ── */}
      {!isActive && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <MdWarning size={20} />
          <div className="alert-text">
            <strong>Your subscription has expired.</strong> You can only view existing data. Upgrade to continue adding medicines, patients, and bills.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* ── Usage meters ── */}
        <div className="card">
          <div className="card-header"><div className="card-title">Current Usage</div></div>
          <UsageBar label="Medicines"       used={usage.medicines     || 0} limit={limits.medicines     ?? 50} percent={usagePercent('medicines')} />
          <UsageBar label="Patients"        used={usage.patients      || 0} limit={limits.patients      ?? 20} percent={usagePercent('patients')} />
          <UsageBar label="Staff Members"   used={usage.staff         || 0} limit={limits.staff         ?? 1}  percent={usagePercent('staff')} />
          <UsageBar label="Bills This Month"used={usage.billsPerMonth || 0} limit={limits.billsPerMonth ?? 50} percent={usagePercent('billsPerMonth')} />
        </div>

        {/* ── Payment history ── */}
        <div className="card">
          <div className="card-header"><div className="card-title">Payment History</div></div>
          {subscription?.payments?.length > 0 ? (
            subscription.payments.slice().reverse().map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.plan} Plan</div>
                  <div className="text-muted text-sm">{p.method} · {p.transactionId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>{PKR(p.amount)}</div>
                  <div className="text-muted text-sm">{p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-PK') : '—'}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted text-sm">No payments yet — currently on {isTrial ? 'free trial' : 'free plan'}</div>
          )}
        </div>
      </div>

      {/* ── Plan comparison ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Available Plans</div>
          <div className="text-muted text-sm">All prices in PKR per month</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {Object.entries(plans).filter(([k]) => k !== 'trial').map(([key, p]) => (
            <PlanCard key={key} planKey={key} plan={p} currentPlan={plan} onSelect={setUpgradeTarget} />
          ))}
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {upgradeTarget && plans[upgradeTarget] && (
        <PaymentModal
          plan={upgradeTarget}
          planData={plans[upgradeTarget]}
          onClose={() => setUpgradeTarget(null)}
          onSubmitted={() => { setUpgradeTarget(null); refresh(); }}
        />
      )}
    </div>
  );
}