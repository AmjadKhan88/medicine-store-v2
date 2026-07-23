import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MdAdd, MdClose, MdPeople, MdWhatsapp,
  MdRefresh, MdArrowBack, MdCheck, MdSkipNext,
  MdDelete
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

/* ── helpers ── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtDT   = d => d ? `${fmtDate(d)} ${new Date(d).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}` : '—';

const STATUS_CFG = {
  Draft:       { bg:'#f3f4f6', color:'#6b7280' },
  'In Progress':{ bg:'#dbeafe', color:'#3b82f6' },
  Completed:   { bg:'#d1fae5', color:'#10b981' },
  Cancelled:   { bg:'#fee2e2', color:'#ef4444' },
};

const RECIPIENT_CFG = {
  Pending: { bg:'#fef3c7', color:'#f59e0b' },
  Sent:    { bg:'#d1fae5', color:'#10b981' },
  Failed:  { bg:'#fee2e2', color:'#ef4444' },
  Skipped: { bg:'#f3f4f6', color:'#6b7280' },
};

const FILTER_TYPES = [
  { value:'all',                    label:'All Active Patients'                    },
  { value:'condition',              label:'By Medical Condition'                   },
  { value:'last-visit',             label:'Not Seen in X Days'                    },
  { value:'city',                   label:'By City'                               },
  { value:'blood-group',            label:'By Blood Group'                        },
  { value:'age-range',              label:'By Age Range'                          },
  { value:'outstanding',            label:'Have Outstanding Balance'              },
  { value:'upcoming-appointments',  label:'Upcoming Appointments (next 48h)'      },
  { value:'insured',                label:'Insured Patients'                      },
  { value:'custom',                 label:'Custom Search'                         },
];

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

const TEMPLATE_MESSAGES = {
  'Eid Mubarak': `السلام عليكم {firstName}! 🌙

*عيد مبارك!* Eid Mubarak to you and your family! 🎉

Wishing you good health, happiness, and blessings this Eid.

From all of us at {storeName}.`,

  'Appointment Reminder': `Dear {name},

This is a friendly reminder that you have an appointment scheduled at *{storeName}* tomorrow.

Please arrive 10 minutes early. For any changes, please call us.

Thank you! 🏥`,

  'Health Tip - Diabetes': `Dear {firstName},

*Health Tip for Diabetics 💉*

✅ Check your blood sugar daily
✅ Take your medicine on time
✅ Avoid sugary drinks
✅ Walk 30 minutes daily
✅ Visit your doctor every 3 months

Wishing you good health!
— {storeName}`,

  'Health Tip - Hypertension': `Dear {firstName},

*Keeping Your Blood Pressure in Check ❤️*

✅ Reduce salt in your diet
✅ Avoid stress
✅ Exercise regularly
✅ Take BP medicines on time
✅ Check BP weekly

Stay healthy!
— {storeName}`,

  'Medicine Refill Reminder': `Dear {name},

This is a reminder from *{storeName}* that your medicine prescription may be due for a refill soon.

Please visit us or call to renew your prescription. 💊

Take care!`,

  'Eid ul Adha': `*عيد الأضحى مبارك!* 🐑

Dear {firstName},

Eid ul Adha Mubarak! May Allah accept your prayers and sacrifices.

Wishing you and your family a blessed Eid.

— {storeName}`,

  'Ramadan Mubarak': `رمضان مبارك! 🌙

Dear {firstName},

*Ramadan Mubarak!* Wishing you a blessed and healthy Ramadan.

Health Tip for Ramadan:
- Stay hydrated at Sehri & Iftar
- Take your medicines as prescribed
- Diabetic patients: consult your doctor

— {storeName}`,

  'Winter Health Tip': `Dear {firstName},

*Winter Health Advisory 🧥*

As winter approaches, protect yourself:
✅ Stay warm — especially children & elderly
✅ Wash hands frequently
✅ Get your flu vaccine
✅ Stay hydrated even in cold weather

Stay healthy this winter!
— {storeName}`,

  'Dental Health': `Dear {name},

*Did you know?* 😁

Good dental hygiene prevents many diseases!

✅ Brush twice daily
✅ Floss daily
✅ Visit your dentist every 6 months
✅ Avoid sugary foods

Your health is our priority!
— {storeName}`,
};

/* ════════════════════════════════
   CREATE BROADCAST MODAL
════════════════════════════════ */
function CreateModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);  // 1=audience, 2=message, 3=preview
  const [filter, setFilter] = useState({ type: 'all' });
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form, setForm] = useState({
    title:        '',
    templateType: 'Custom',
    messageTemplate: '',
    channel:      'WhatsApp',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const { data } = await API.post('/broadcast/preview', { filter });
      setPreview(data);
    } catch {}
    finally { setPreviewLoading(false); }
  }, [filter]);

  useEffect(() => { if (step === 1) loadPreview(); }, [filter, step, loadPreview]);
  useEffect(() => { if (step === 3) loadPreview(); }, [step]);

  const applyTemplate = (key) => {
    setForm(p => ({ ...p, messageTemplate: TEMPLATE_MESSAGES[key] || '', templateType: key === 'Custom' ? 'Custom' : key }));
  };

  const handleCreate = async () => {
    if (!form.title || !form.messageTemplate) { toast.error('Title and message required'); return; }
    setSaving(true);
    try {
      const { data } = await API.post('/broadcast', { ...form, filter });
      toast.success(data.message);
      onCreated(data.broadcast._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const STEPS = ['Audience', 'Message', 'Review & Send'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">New Broadcast Campaign</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: step > i + 1 ? '#10b981' : step === i + 1 ? 'var(--accent)' : 'var(--border)',
                    color: step >= i + 1 ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</span>
                  {i < 2 && <div style={{ width: 24, height: 1, background: 'var(--border)' }} />}
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* ── STEP 1: Audience ── */}
        {step === 1 && (
          <div>
            <div className="form-group">
              <label className="form-label">Campaign Title</label>
              <input className="form-control" value={form.title} onChange={fld('title')} placeholder="e.g. Eid Mubarak 2026, Diabetes Health Tips" autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Channel</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['WhatsApp','SMS','Both'].map(c => (
                  <button key={c}
                    onClick={() => setForm(p => ({ ...p, channel: c }))}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                      background: form.channel === c ? (c === 'WhatsApp' ? '#25d366' : 'var(--accent)') : 'var(--bg-tertiary)',
                      color:      form.channel === c ? '#fff' : 'var(--text-muted)',
                      border: `2px solid ${form.channel === c ? (c === 'WhatsApp' ? '#25d366' : 'var(--accent)') : 'var(--border)'}`,
                      fontWeight: 700, fontSize: 13,
                    }}>
                    {c === 'WhatsApp' && '💬 '}{c === 'SMS' && '📱 '}{c === 'Both' && '📢 '}{c}
                  </button>
                ))}
              </div>
              {form.channel === 'WhatsApp' && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  💡 Uses WhatsApp Web — you will manually send each message. No extra cost.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <select className="form-control" value={filter.type}
                onChange={e => setFilter({ type: e.target.value })}>
                {FILTER_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            {/* Dynamic filter fields */}
            {filter.type === 'condition' && (
              <div className="form-group">
                <label className="form-label">Medical Condition Keyword</label>
                <input className="form-control" value={filter.condition || ''}
                  onChange={e => setFilter(p => ({ ...p, condition: e.target.value }))}
                  placeholder="e.g. diabetes, hypertension, asthma" list="conditions-list" />
                <datalist id="conditions-list">
                  {['diabetes','hypertension','asthma','COPD','kidney','heart','thyroid','arthritis'].map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            )}
            {filter.type === 'last-visit' && (
              <div className="form-group">
                <label className="form-label">Not Seen in (days)</label>
                <input className="form-control" type="number" min="30" value={filter.lastVisitDays || 180}
                  onChange={e => setFilter(p => ({ ...p, lastVisitDays: Number(e.target.value) }))}
                  placeholder="180" />
                <div className="form-hint">Patients who haven't had a completed appointment in this many days</div>
              </div>
            )}
            {filter.type === 'city' && (
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-control" value={filter.city || ''}
                  onChange={e => setFilter(p => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Lahore, Karachi, Peshawar" />
              </div>
            )}
            {filter.type === 'blood-group' && (
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {BLOOD_GROUPS.map(g => (
                    <button key={g}
                      onClick={() => setFilter(p => ({ ...p, bloodGroup: g }))}
                      style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: filter.bloodGroup === g ? '#ef4444' : '#fee2e2', color: filter.bloodGroup === g ? '#fff' : '#ef4444', border: `2px solid #ef4444` }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {filter.type === 'age-range' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Min Age</label>
                  <input className="form-control" type="number" min="0" value={filter.ageMin || ''}
                    onChange={e => setFilter(p => ({ ...p, ageMin: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Age</label>
                  <input className="form-control" type="number" min="0" value={filter.ageMax || ''}
                    onChange={e => setFilter(p => ({ ...p, ageMax: Number(e.target.value) }))} />
                </div>
              </div>
            )}
            {filter.type === 'outstanding' && (
              <div className="form-group">
                <label className="form-label">Minimum Outstanding Balance (₨)</label>
                <input className="form-control" type="number" min="1" value={filter.outstandingMin || 1}
                  onChange={e => setFilter(p => ({ ...p, outstandingMin: Number(e.target.value) }))} />
              </div>
            )}
            {filter.type === 'custom' && (
              <div className="form-group">
                <label className="form-label">Search Term</label>
                <input className="form-control" value={filter.customSearch || ''}
                  onChange={e => setFilter(p => ({ ...p, customSearch: e.target.value }))}
                  placeholder="Name, phone, city, patient ID..." />
              </div>
            )}

            {/* Audience preview */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 14 }}>
              {previewLoading ? (
                <div className="text-muted text-sm">Counting recipients...</div>
              ) : preview ? (
                <div>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)' }}>{preview.withPhone}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>Will receive message</div>
                    </div>
                    {preview.withoutPhone > 0 && (
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b' }}>{preview.withoutPhone}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>No phone (skipped)</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-muted)' }}>{preview.total}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>Total matched</div>
                    </div>
                  </div>
                  {preview.sample?.length > 0 && (
                    <div style={{ fontSize: 12 }}>
                      <div className="text-muted" style={{ marginBottom: 4 }}>Sample recipients:</div>
                      {preview.sample.map((p, i) => (
                        <div key={i} style={{ color: 'var(--text-muted)' }}>{p.name} · {p.phone}</div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ── STEP 2: Message ── */}
        {step === 2 && (
          <div>
            {/* Quick templates */}
            <div className="form-group">
              <label className="form-label">Quick Templates</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {Object.keys(TEMPLATE_MESSAGES).map(key => (
                  <button key={key}
                    onClick={() => applyTemplate(key)}
                    className="pill"
                    style={{ fontSize: 11 }}>
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Variable hints */}
            <div style={{ background: '#e0f2fe', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#0369a1' }}>
              <strong>Available variables:</strong>
              &nbsp;{'{name}'} (full name) · {'{firstName}'} (first name only) · {'{storeName}'} (your clinic name) · {'{city}'} · {'{bloodGroup}'} · {'{patientId}'}
            </div>

            <div className="form-group">
              <label className="form-label required">Message Template</label>
              <textarea className="form-control" rows={8} value={form.messageTemplate} onChange={fld('messageTemplate')}
                placeholder="Type your message here. Use {name} to personalize with patient's name..." />
              <div className="form-hint">{form.messageTemplate.length} characters · {form.messageTemplate.split('\n').length} lines</div>
            </div>

            {/* Live preview */}
            {form.messageTemplate && (
              <div style={{ background: '#dcf8c6', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: '#128c7e', fontWeight: 700, marginBottom: 6 }}>
                  💬 WhatsApp Preview — how it looks to the patient:
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#000' }}>
                  {form.messageTemplate
                    .replace(/{name}/gi,       'Muhammad Ali')
                    .replace(/{firstName}/gi,  'Muhammad')
                    .replace(/{storeName}/gi,  'Al-Shifa Medical Store')
                    .replace(/{city}/gi,       'Lahore')
                    .replace(/{bloodGroup}/gi, 'B+')
                    .replace(/{patientId}/gi,  'PT-00042')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Preview & Send ── */}
        {step === 3 && (
          <div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Campaign Summary</div>
              {[
                ['Title',    form.title],
                ['Channel',  form.channel],
                ['Audience', FILTER_TYPES.find(f => f.value === filter.type)?.label],
                ['Recipients', `${preview?.withPhone || 0} patients with phone numbers`],
                ['Skipped',   `${preview?.withoutPhone || 0} patients (no phone)`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                  <span className="text-muted">{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            {form.channel === 'WhatsApp' && (
              <div style={{ background: '#e7f9f0', border: '1px solid #25d366', borderRadius: 10, padding: '12px 14px', marginBottom: 12, fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: '#128c7e', marginBottom: 4 }}>💬 How WhatsApp Sending Works</div>
                <div style={{ color: '#166534', lineHeight: 1.7 }}>
                  After creating this campaign, you'll see each patient with a <strong>"Open in WhatsApp"</strong> button.
                  Click it → WhatsApp Web opens with the pre-filled personalized message → Press Send → Come back and click ✓ Sent.
                  You go through each patient one by one. No extra cost, no API needed.
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Message Preview (first patient)</label>
              <div style={{ background: '#dcf8c6', borderRadius: 12, padding: 14, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {form.messageTemplate
                  .replace(/{name}/gi,       preview?.sample?.[0]?.name || 'Muhammad Ali')
                  .replace(/{firstName}/gi,  (preview?.sample?.[0]?.name || 'Muhammad').split(' ')[0])
                  .replace(/{storeName}/gi,  'Your Clinic')
                  .replace(/{city}/gi,       'Lahore')
                  .replace(/{bloodGroup}/gi, 'B+')
                  .replace(/{patientId}/gi,  preview?.sample?.[0]?.patientId || 'PT-00001')}
              </div>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}>
            {step > 1 ? '← Back' : 'Cancel'}
          </button>
          {step < 3 ? (
            <button className="btn btn-primary"
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 1 && (!form.title || !preview?.withPhone)) ||
                (step === 2 && !form.messageTemplate)
              }>
              Next →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}
              style={{ background: '#25d366' }}>
              {saving ? 'Creating...' : <><MdWhatsapp size={18} /> Create & Start Sending</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   SENDER (WhatsApp queue)
════════════════════════════════ */
function SenderView({ broadcastId, onBack }) {
  const [broadcast, setBroadcast] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [current,   setCurrent]   = useState(0);  // current recipient index
  const [filter,    setFilter]    = useState('Pending');

  const fetch = useCallback(async () => {
    try {
      const { data } = await API.get(`/broadcast/${broadcastId}`);
      setBroadcast(data.broadcast);
      // Find first pending index
      const firstPending = data.broadcast.recipients.findIndex(r => r.status === 'Pending');
      if (firstPending >= 0) setCurrent(firstPending);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [broadcastId]);

  useEffect(() => { fetch(); }, [fetch]);

  const markRecipient = async (recipientId, status) => {
    try {
      await API.patch(`/broadcast/${broadcastId}/recipients/${recipientId}`, { status });
      await fetch();
      // Move to next pending
      const nextPending = broadcast?.recipients?.findIndex((r, i) => i > current && r.status === 'Pending');
      if (nextPending >= 0) setCurrent(nextPending);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const markAllSent = async () => {
    if (!confirm('Mark ALL remaining as sent?')) return;
    try {
      await API.patch(`/broadcast/${broadcastId}/mark-all-sent`);
      toast.success('All marked as sent!');
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openWhatsApp = (recipient) => {
    const phone = recipient.phone?.replace(/[^0-9]/g, '');
    const formattedPhone = phone?.startsWith('0') ? `92${phone.slice(1)}` : `92${phone}`;
    const msg = encodeURIComponent(recipient.personalizedMsg);
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const openSMS = (recipient) => {
    const msg = encodeURIComponent(recipient.personalizedMsg);
    window.open(`sms:${recipient.phone}?body=${msg}`, '_blank');
  };

  if (loading) return <div className="flex-center" style={{ height: 300 }}><div className="text-muted">Loading...</div></div>;
  if (!broadcast) return null;

  const recipients   = broadcast.recipients || [];
  const filtered     = filter ? recipients.filter(r => r.status === filter) : recipients;
  const pending      = recipients.filter(r => r.status === 'Pending');
  const sent         = recipients.filter(r => r.status === 'Sent');
  const currentRec   = pending[0];  // always show first pending
  const progress     = recipients.length > 0 ? Math.round((sent.length / (broadcast.totalCount || 1)) * 100) : 0;
  const sc           = STATUS_CFG[broadcast.status] || STATUS_CFG.Draft;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={onBack}><MdArrowBack /></button>
          <div>
            <h2 style={{ margin: 0 }}>{broadcast.title}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
              <span style={{ background: sc.bg, color: sc.color, padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{broadcast.status}</span>
              <span className="text-muted text-sm">
                {sent.length} sent · {pending.length} remaining · {broadcast.skippedCount || 0} skipped
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pending.length > 0 && (
            <button className="btn btn-secondary" onClick={markAllSent}>
              <MdCheck /> Mark All Sent
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetch}><MdRefresh /></button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span className="text-muted">Sending progress</span>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{sent.length} / {broadcast.totalCount || 0} sent ({progress}%)</span>
        </div>
        <div style={{ height: 10, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? '#10b981' : '#25d366', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Current recipient — big send panel */}
      {currentRec && broadcast.status !== 'Completed' && (
        <div style={{ background: '#e7f9f0', border: '2px solid #25d366', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#128c7e', marginBottom: 12 }}>
            📤 SEND TO — {pending.indexOf(currentRec) + 1} of {pending.length} remaining
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#000' }}>{currentRec.patientName}</div>
              <div style={{ fontSize: 14, color: '#128c7e', fontWeight: 700, marginTop: 3 }}>{currentRec.phone}</div>

              {/* Message preview */}
              <div style={{ background: '#dcf8c6', borderRadius: 12, padding: '12px 14px', marginTop: 12, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 160, overflowY: 'auto' }}>
                {currentRec.personalizedMsg}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
              {/* Open WhatsApp */}
              <button
                style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 20px', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => openWhatsApp(currentRec)}>
                <MdWhatsapp size={22} /> Open in WhatsApp
              </button>

              {broadcast.channel !== 'WhatsApp' && (
                <button
                  style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  onClick={() => openSMS(currentRec)}>
                  📱 Open in SMS
                </button>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-success" style={{ flex: 1 }}
                  onClick={() => markRecipient(currentRec._id, 'Sent')}>
                  <MdCheck size={16} /> Sent ✓
                </button>
                <button className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => markRecipient(currentRec._id, 'Skipped')}>
                  <MdSkipNext size={16} /> Skip
                </button>
              </div>

              <button className="btn btn-ghost btn-sm"
                onClick={() => markRecipient(currentRec._id, 'Failed')}
                style={{ color: 'var(--danger)' }}>
                Mark as Failed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed state */}
      {broadcast.status === 'Completed' && (
        <div style={{ background: '#d1fae5', border: '1px solid #86efac', borderRadius: 14, padding: '20px 24px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#16a34a' }}>Broadcast Complete!</div>
          <div style={{ color: '#166534', marginTop: 6 }}>
            {sent.length} messages sent · {broadcast.failedCount || 0} failed · {broadcast.skippedCount || 0} skipped
          </div>
        </div>
      )}

      {/* Recipients list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Filter pills */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6 }}>
          {['Pending','Sent','Failed','Skipped'].map(s => {
            const count = recipients.filter(r => r.status === s).length;
            const cfg   = RECIPIENT_CFG[s] || {};
            return (
              <button key={s}
                onClick={() => setFilter(filter === s ? '' : s)}
                style={{
                  padding: '4px 10px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: filter === s ? cfg.color : cfg.bg,
                  color:      filter === s ? '#fff'    : cfg.color,
                  border: `1px solid ${cfg.color}`,
                }}>
                {s} ({count})
              </button>
            );
          })}
          <button className={`pill${filter===''?' active':''}`} onClick={() => setFilter('')} style={{ fontSize: 12 }}>
            All ({recipients.length})
          </button>
        </div>

        <table className="table" style={{ fontSize: 12 }}>
          <thead>
            <tr><th>#</th><th>Patient</th><th>Phone</th><th>Status</th><th>Sent At</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const cfg = RECIPIENT_CFG[r.status] || {};
              return (
                <tr key={r._id}>
                  <td className="text-muted">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{r.patientName}</td>
                  <td>{r.phone || <span className="text-muted">No phone</span>}</td>
                  <td>
                    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-muted">{r.sentAt ? fmtDT(r.sentAt) : '—'}</td>
                  <td>
                    {r.status === 'Pending' && r.phone && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm btn-icon" title="Open WhatsApp"
                          onClick={() => openWhatsApp(r)}>
                          <MdWhatsapp size={13} style={{ color: '#25d366' }} />
                        </button>
                        <button className="btn btn-success btn-sm btn-icon" title="Mark Sent"
                          onClick={() => markRecipient(r._id, 'Sent')}>
                          <MdCheck size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Skip"
                          onClick={() => markRecipient(r._id, 'Skipped')}>
                          <MdSkipNext size={13} />
                        </button>
                      </div>
                    )}
                    {r.status === 'Sent' && <span style={{ color: '#10b981', fontSize: 13 }}>✓</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [stats,      setStats]      = useState({});
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [createModal,setCreateModal]= useState(false);
  const [senderView, setSenderView] = useState(null);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/broadcast', { params: { page, limit: 15 } });
      setBroadcasts(data.broadcasts || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {}
    finally { setLoading(false); }
  }, [page]);

  const fetchStats = useCallback(() => {
    API.get('/broadcast/stats').then(({ data }) => setStats(data.stats || {})).catch(() => {});
  }, []);

  useEffect(() => { fetchBroadcasts(); fetchStats(); }, [fetchBroadcasts, fetchStats]);

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await API.delete(`/broadcast/${id}`);
      toast.success('Deleted');
      fetchBroadcasts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCancel = async (id) => {
    try {
      await API.patch(`/broadcast/${id}/cancel`);
      toast.success('Broadcast cancelled');
      fetchBroadcasts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (senderView) {
    return (
      <SenderView
        broadcastId={senderView}
        onBack={() => { setSenderView(null); fetchBroadcasts(); fetchStats(); }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>📲 WhatsApp & SMS Broadcast</h1>
          <p>Send health tips, Eid greetings, reminders to your patient base</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchBroadcasts(); fetchStats(); }}>
            <MdRefresh />
          </button>
          <button className="btn btn-primary"
            style={{ background: '#25d366' }}
            onClick={() => setCreateModal(true)}>
            <MdAdd /> New Broadcast
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Campaigns',   value: stats.total      || 0, color: '#0ea5e9', icon: '📢' },
          { label: 'Completed',         value: stats.completed  || 0, color: '#10b981', icon: '✅' },
          { label: 'In Progress',       value: stats.inProgress || 0, color: '#f59e0b', icon: '⏳' },
          { label: 'Total Messages Sent',value: stats.totalSent || 0, color: '#25d366', icon: '💬' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color + '20', fontSize: 22 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick template ideas */}
      <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #e7f9f0, #f0fdf4)' }}>
        <div style={{ fontWeight: 700, marginBottom: 10, color: '#128c7e' }}>💡 Campaign Ideas for Pakistani Clinics</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { emoji: '🌙', label: 'Eid Mubarak', filter: 'all' },
            { emoji: '💉', label: 'Diabetics Health Tips', filter: 'condition' },
            { emoji: '❤️', label: 'Hypertension Reminders', filter: 'condition' },
            { emoji: '📅', label: 'Appointment Reminders', filter: 'upcoming-appointments' },
            { emoji: '💰', label: 'Outstanding Balance', filter: 'outstanding' },
            { emoji: '👴', label: 'Senior Citizen Tips (60+)', filter: 'age-range' },
            { emoji: '🏙', label: 'Lahore/City Patients', filter: 'city' },
            { emoji: '😴', label: 'Long Absent Patients', filter: 'last-visit' },
          ].map(idea => (
            <button key={idea.label}
              onClick={() => setCreateModal(true)}
              style={{ background: '#fff', border: '1px solid #25d366', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              {idea.emoji} {idea.label}
            </button>
          ))}
        </div>
      </div>

      {/* Broadcasts list */}
      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="text-muted">Loading...</div></div>
      ) : broadcasts.length === 0 ? (
        <div className="empty-state">
          <MdWhatsapp size={56} style={{ opacity: 0.3, marginBottom: 16, color: '#25d366' }} />
          <h3>No broadcasts yet</h3>
          <p>Create your first broadcast to start engaging your patients</p>
          <button className="btn btn-primary" style={{ marginTop: 14, background: '#25d366' }}
            onClick={() => setCreateModal(true)}>
            <MdAdd /> Create First Broadcast
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {broadcasts.map(b => {
            const sc   = STATUS_CFG[b.status] || STATUS_CFG.Draft;
            const prog = b.totalCount > 0 ? Math.round((b.sentCount / b.totalCount) * 100) : 0;
            return (
              <div key={b._id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', background: 'var(--card-bg)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{b.title}</span>
                    <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{b.status}</span>
                    <span style={{ background: '#e7f9f0', color: '#128c7e', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      💬 {b.channel}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {FILTER_TYPES.find(f => f.value === b.filter?.type)?.label || 'All Patients'} ·
                    {b.totalCount || 0} recipients ·
                    Created {fmtDate(b.createdAt)} by {b.createdByName}
                  </div>

                  {/* Progress bar */}
                  {(b.status === 'In Progress' || b.status === 'Completed') && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span className="text-muted">Sent: {b.sentCount || 0} / {b.totalCount || 0}</span>
                        <span style={{ color: '#25d366', fontWeight: 700 }}>{prog}%</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${prog}%`, background: prog === 100 ? '#10b981' : '#25d366', borderRadius: 99 }} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                  {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                    <button className="btn btn-primary btn-sm"
                      style={{ background: '#25d366' }}
                      onClick={() => setSenderView(b._id)}>
                      <MdSend size={13} /> {b.status === 'Draft' ? 'Start Sending' : 'Continue Sending'}
                    </button>
                  )}
                  {b.status === 'Completed' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setSenderView(b._id)}>
                      <MdBarChart size={13} /> View Report
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['Draft','In Progress'].includes(b.status) && (
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleCancel(b._id)}
                        title="Cancel broadcast">
                        <MdClose size={13} style={{ color: '#f59e0b' }} />
                      </button>
                    )}
                    {['Draft','Cancelled'].includes(b.status) && (
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(b._id, b.title)}>
                        <MdDelete size={13} style={{ color: 'var(--danger)' }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: 14 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <CreateModal
          onClose={() => setCreateModal(false)}
          onCreated={(id) => {
            setCreateModal(false);
            fetchBroadcasts();
            fetchStats();
            setSenderView(id);  // immediately open sender
          }}
        />
      )}
    </div>
  );

  function MdSend({ size = 20 }) { return <MdArrowBack size={size} style={{ transform: 'rotate(180deg)' }} />; }
  function MdBarChart({ size = 20 }) { return <MdPeople size={size} />; }
}