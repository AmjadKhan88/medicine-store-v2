import { useState, useEffect } from 'react';
import {
  MdAdd, MdSupportAgent, MdReply, MdClose,
  MdCheckCircle,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

const STATUS_BADGE = {
  Open:        'badge-danger',
  'In Progress':'badge-warning',
  Resolved:    'badge-success',
  Closed:      'badge-default',
};

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

/* ── Single ticket thread ── */
function TicketThread({ ticket, onReply, onClose }) {
  const [reply, setReply]     = useState('');
  const [sending, setSending] = useState(false);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await API.post(`/support/${ticket._id}/reply`, { message: reply });
      setReply('');
      toast.success('Reply sent!');
      onReply();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{ticket.subject}</div>
            <div className="text-muted text-sm">{ticket.category} · {fmtDateTime(ticket.createdAt)}</div>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${STATUS_BADGE[ticket.status]}`}>{ticket.status}</span>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
          </div>
        </div>

        {/* Original message */}
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div className="text-muted text-sm" style={{ marginBottom: 6 }}>Your original message</div>
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>{ticket.message}</div>
        </div>

        {/* Replies */}
        {ticket.replies?.map((r, i) => (
          <div key={i} style={{
            display:       'flex',
            flexDirection: r.sentBy === 'store' ? 'row-reverse' : 'row',
            gap:           10,
            marginBottom:  12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: r.sentBy === 'admin' ? 'var(--accent)' : 'var(--bg-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>
              {r.sentBy === 'admin' ? '👑' : '🏪'}
            </div>
            <div style={{
              maxWidth:     '75%',
              padding:      '10px 14px',
              borderRadius: r.sentBy === 'store' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background:   r.sentBy === 'store' ? 'var(--accent)' : 'var(--card-bg)',
              color:        r.sentBy === 'store' ? '#fff' : 'var(--text-primary)',
              border:       r.sentBy === 'store' ? 'none' : '1px solid var(--border)',
              fontSize:     14,
            }}>
              <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 4, opacity: 0.7 }}>
                {r.sentBy === 'admin' ? 'MediStore Support' : 'You'} · {fmtDateTime(r.createdAt)}
              </div>
              {r.message}
            </div>
          </div>
        ))}

        {ticket.replies?.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 13 }}>
            Waiting for a response from our support team. We typically reply within 24 hours.
          </div>
        )}

        {ticket.status !== 'Closed' && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <textarea className="form-control" rows={3}
              value={reply} onChange={e => setReply(e.target.value)}
              placeholder="Add more information or reply to the support team..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="btn btn-primary btn-sm"
                onClick={handleReply} disabled={!reply.trim() || sending}>
                <MdReply /> {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN SUPPORT CENTER PAGE
══════════════════════════════════════════ */
export default function SupportCenter() {
  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newModal, setNewModal]   = useState(false);
  const [viewTicket, setViewTicket] = useState(null);
  const [form, setForm]           = useState({
    subject: '', message: '', category: 'Other', priority: 'Medium',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/support');
      setTickets(data.tickets);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSubmitting(true);
    try {
      await API.post('/support', form);
      toast.success('Ticket submitted! We will respond within 24 hours.');
      setNewModal(false);
      setForm({ subject: '', message: '', category: 'Other', priority: 'Medium' });
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  const openTickets    = tickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
  const closedTickets  = tickets.filter(t => t.status === 'Closed' || t.status === 'Resolved');

  return (
    <div style={{ maxWidth: 780 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Support Center</h1>
          <p>Get help from the MediStore team</p>
        </div>
        <button className="btn btn-primary" onClick={() => setNewModal(true)}>
          <MdAdd /> New Ticket
        </button>
      </div>

      {/* Help banner */}
      <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ fontSize: 32, flexShrink: 0 }}>💬</div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>How can we help?</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Submit a support ticket for billing issues, technical problems, or feature requests.
            Our team typically responds within <strong>24 hours</strong>.
          </div>
        </div>
      </div>

      {/* Active tickets */}
      {openTickets.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Active Tickets ({openTickets.length})</div>
          </div>
          {openTickets.map(t => (
            <div key={t._id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-light)', gap: 12, cursor: 'pointer' }}
              onClick={() => setViewTicket(t)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.subject}</div>
                <div className="text-muted text-sm" style={{ marginTop: 3 }}>
                  {t.category} · {t.replies?.length || 0} replies · Updated {fmtDateTime(t.updatedAt)}
                </div>
                {t.replies?.length > 0 && t.replies[t.replies.length - 1].sentBy === 'admin' && (
                  <div style={{ marginTop: 6, fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                    ✉️ New reply from support team
                  </div>
                )}
              </div>
              <div className="flex gap-2" style={{ flexShrink: 0 }}>
                <span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span>
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); setViewTicket(t); }}>
                  <MdReply /> View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved tickets */}
      {closedTickets.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Resolved / Closed ({closedTickets.length})</div>
          </div>
          {closedTickets.map(t => (
            <div key={t._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MdCheckCircle style={{ color: 'var(--success)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>{t.subject}</div>
                  <div className="text-muted text-sm">{t.category} · {fmtDateTime(t.updatedAt)}</div>
                </div>
              </div>
              <span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><ShortLoader/></div>
      ) : tickets.length === 0 && (
        <div className="empty-state">
          <MdSupportAgent size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
          <h3>No support tickets yet</h3>
          <p>Submit a ticket if you need help with anything</p>
        </div>
      )}

      {/* New Ticket Modal */}
      {newModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNewModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Submit Support Ticket</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setNewModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label required">Subject</label>
              <input className="form-control" value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="Brief description of your issue" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {['Billing','Technical','Feature Request','Bug Report','Account','Other'].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-control" value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  {['Low','Medium','High','Urgent'].map(p => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label required">Describe your issue</label>
              <textarea className="form-control" rows={5} value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Please describe the issue in detail. Include any error messages, steps to reproduce, etc." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setNewModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                <MdSupportAgent /> {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View ticket */}
      {viewTicket && (
        <TicketThread
          ticket={viewTicket}
          onClose={() => setViewTicket(null)}
          onReply={() => { fetchTickets(); setViewTicket(prev => tickets.find(t => t._id === prev._id) || prev); }}
        />
      )}
    </div>
  );
}