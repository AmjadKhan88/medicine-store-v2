import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdEdit, MdDelete, MdBed, MdPerson,
  MdCheck, MdClose, MdSearch, MdRefresh,
  MdLocalHotel, MdBarChart, MdInfo,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

/* ── constants ── */
const WARD_TYPES = ['General', 'ICU', 'Pediatric', 'Maternity', 'Surgical', 'Emergency', 'Private'];
const BED_TYPES  = ['General', 'ICU', 'Private', 'Semi-Private', 'Emergency'];

const STATUS_CONFIG = {
  Available:   { color: '#10b981', bg: '#d1fae5', label: 'Available'   },
  Occupied:    { color: '#ef4444', bg: '#fee2e2', label: 'Occupied'    },
  Cleaning:    { color: '#f59e0b', bg: '#fef3c7', label: 'Cleaning'    },
  Maintenance: { color: '#6b7280', bg: '#f3f4f6', label: 'Maintenance' },
  Reserved:    { color: '#8b5cf6', bg: '#ede9fe', label: 'Reserved'    },
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const daysSince = (d) => d
  ? Math.floor((new Date() - new Date(d)) / 86400000)
  : 0;

/* ════════════════════════════════
   ADMIT MODAL
════════════════════════════════ */
function AdmitModal({ ward, bed, onClose, onAdmitted }) {
  const [patients, setPatients]     = useState([]);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [form, setForm] = useState({
    expectedDischarge: '',
    assignedDoctor:    '',
    admissionNotes:    '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (search.length < 2) { setPatients([]); return; }
    API.get('/patients', { params: { search, limit: 6 } })
      .then(({ data }) => setPatients(data.patients || []))
      .catch(() => {});
  }, [search]);

  const handleAdmit = async () => {
    if (!selected) { toast.error('Select a patient'); return; }
    setSaving(true);
    try {
      await API.post(`/wards/${ward._id}/beds/${bed._id}/admit`, {
        patientId: selected._id,
        ...form,
      });
      toast.success(`${selected.name} admitted to bed ${bed.bedNumber}`);
      onAdmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Admission failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Admit Patient</div>
            <div className="text-muted text-sm">
              {ward.name} — Bed {bed.bedNumber} ({bed.type})
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* Patient search */}
        <div className="form-group">
          <label className="form-label required">Select Patient</label>
          {selected ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px',
            }}>
              <div>
                <div style={{ fontWeight: 700 }}>{selected.name}</div>
                <div className="text-muted text-sm">
                  {selected.patientId} · Age {selected.age} · {selected.gender}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm"
                onClick={() => { setSelected(null); setSearch(''); }}>
                Change
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div className="input-group">
                <MdSearch className="input-icon" />
                <input className="form-control" placeholder="Search patient by name..."
                  value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              </div>
              {patients.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--card-bg)', border: '1px solid var(--border)',
                  borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4,
                }}>
                  {patients.map(p => (
                    <div key={p._id}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                      onMouseDown={() => { setSelected(p); setSearch(''); setPatients([]); }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="text-muted text-sm">{p.patientId} · {p.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Assigned Doctor</label>
            <input className="form-control" placeholder="Dr. Ahmed..."
              value={form.assignedDoctor}
              onChange={e => setForm(p => ({ ...p, assignedDoctor: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Expected Discharge</label>
            <input className="form-control" type="date"
              value={form.expectedDischarge}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => setForm(p => ({ ...p, expectedDischarge: e.target.value }))} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Admission Notes</label>
          <textarea className="form-control" rows={2}
            placeholder="Chief complaint, diagnosis, special instructions..."
            value={form.admissionNotes}
            onChange={e => setForm(p => ({ ...p, admissionNotes: e.target.value }))} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdmit}
            disabled={saving || !selected}>
            {saving ? 'Admitting...' : 'Admit Patient'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   BED CARD
════════════════════════════════ */
function BedCard({ bed, ward, onAction }) {
  const cfg = STATUS_CONFIG[bed.status] || STATUS_CONFIG.Available;
  const isOccupied    = bed.status === 'Occupied';
  const isOverdue     = isOccupied && bed.expectedDischarge &&
                        new Date(bed.expectedDischarge) < new Date();
  const days          = daysSince(bed.admittedAt);

  return (
    <div style={{
      border:       `2px solid ${isOverdue ? '#ef4444' : cfg.color}`,
      borderRadius: 14,
      padding:      14,
      background:   isOverdue ? '#fff5f5' : cfg.bg,
      position:     'relative',
      transition:   'transform 0.15s',
      cursor:       'default',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
    >
      {/* Overdue badge */}
      {isOverdue && (
        <div style={{
          position: 'absolute', top: -10, right: 10,
          background: '#ef4444', color: '#fff',
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
        }}>OVERDUE</div>
      )}

      {/* Bed number + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MdBed size={18} style={{ color: cfg.color }} />
          <span style={{ fontWeight: 800, fontSize: 14, color: cfg.color }}>
            {bed.bedNumber}
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px',
          borderRadius: 99, background: cfg.color, color: '#fff',
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Occupied info */}
      {isOccupied && bed.patient && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
            {bed.patient.name}
          </div>
          <div className="text-muted" style={{ fontSize: 11 }}>
            {bed.patient.patientId} · Age {bed.patient.age}
          </div>
          {bed.assignedDoctor && (
            <div className="text-muted" style={{ fontSize: 11 }}>
              Dr. {bed.assignedDoctor}
            </div>
          )}
          <div style={{
            display: 'flex', gap: 8, marginTop: 6,
            fontSize: 11, color: 'var(--text-muted)',
          }}>
            <span>📅 {days}d admitted</span>
            {bed.expectedDischarge && (
              <span style={{ color: isOverdue ? '#ef4444' : 'inherit' }}>
                🏠 {fmtDate(bed.expectedDischarge)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Type */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        {bed.type}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {bed.status === 'Available' && (
          <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 12 }}
            onClick={() => onAction('admit', bed)}>
            <MdPerson size={13} /> Admit
          </button>
        )}
        {bed.status === 'Occupied' && (
          <button className="btn btn-danger btn-sm" style={{ flex: 1, fontSize: 12 }}
            onClick={() => onAction('discharge', bed)}>
            <MdCheck size={13} /> Discharge
          </button>
        )}
        {bed.status === 'Cleaning' && (
          <button className="btn btn-success btn-sm" style={{ flex: 1, fontSize: 12 }}
            onClick={() => onAction('markAvailable', bed)}>
            <MdCheck size={13} /> Mark Clean
          </button>
        )}
        {bed.status === 'Maintenance' && (
          <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 12 }}
            onClick={() => onAction('markAvailable', bed)}>
            <MdCheck size={13} /> Mark Fixed
          </button>
        )}
        {bed.status === 'Reserved' && (
          <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 12 }}
            onClick={() => onAction('markAvailable', bed)}>
            Release
          </button>
        )}
        {/* Mark for maintenance / reserve (non-occupied only) */}
        {bed.status !== 'Occupied' && (
          <select
            style={{
              flex: 1, fontSize: 11, padding: '4px 8px',
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
            value=""
            onChange={e => {
              if (e.target.value) onAction('setStatus', bed, e.target.value);
            }}
          >
            <option value="">Set status…</option>
            {['Available', 'Cleaning', 'Maintenance', 'Reserved']
              .filter(s => s !== bed.status)
              .map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   ADD WARD MODAL
════════════════════════════════ */
function AddWardModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', floor: '', type: 'General',
    totalBeds: 10, bedPrefix: '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.name || !form.totalBeds) { toast.error('Name and beds required'); return; }
    setSaving(true);
    try {
      await API.post('/wards', form);
      toast.success(`Ward "${form.name}" created!`);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div className="modal-title">Add New Ward</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div className="form-group">
          <label className="form-label required">Ward Name</label>
          <input className="form-control" value={form.name}
            onChange={fld('name')} placeholder="e.g. General Ward A" autoFocus />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Ward Type</label>
            <select className="form-control" value={form.type} onChange={fld('type')}>
              {WARD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Floor</label>
            <input className="form-control" value={form.floor}
              onChange={fld('floor')} placeholder="Ground, 1st, 2nd..." />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Total Beds</label>
            <input className="form-control" type="number"
              value={form.totalBeds} onChange={fld('totalBeds')} min={1} max={200} />
          </div>
          <div className="form-group">
            <label className="form-label">Bed Number Prefix</label>
            <input className="form-control" value={form.bedPrefix}
              onChange={fld('bedPrefix')} placeholder="A-, B-, ICU-" />
            <div className="form-hint">
              e.g. "A-" → beds: A-01, A-02...
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{
          background: 'var(--bg-tertiary)', borderRadius: 10,
          padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)',
          marginBottom: 16,
        }}>
          Preview: {form.totalBeds} beds —{' '}
          <strong>{form.bedPrefix || ''}01</strong> to{' '}
          <strong>{form.bedPrefix || ''}{String(form.totalBeds).padStart(2, '0')}</strong>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create Ward'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   REPORT MODAL
════════════════════════════════ */
function ReportModal({ onClose }) {
  const [report, setReport] = useState(null);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/wards/report')
      .then(({ data }) => { setReport(data.report); setTotals(data.totals); })
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">📊 Bed Occupancy Report</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ height: 200 }}>
            <div className="text-muted">Loading report...</div>
          </div>
        ) : (
          <>
            {/* Overall stats */}
            {totals && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12, marginBottom: 24,
              }}>
                {[
                  { label: 'Total Beds',   value: totals.totalBeds,     color: '#0ea5e9' },
                  { label: 'Occupied',     value: totals.totalOccupied,  color: '#ef4444' },
                  { label: 'Available',    value: totals.totalAvailable, color: '#10b981' },
                  { label: 'Occupancy',    value: `${totals.overallRate}%`, color: '#8b5cf6' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: s.color + '12', border: `1px solid ${s.color}30`,
                    borderRadius: 12, padding: '14px 16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Per-ward breakdown */}
            {report?.map(w => (
              <div key={w.wardId} style={{
                border: '1px solid var(--border)', borderRadius: 14,
                marginBottom: 16, overflow: 'hidden',
              }}>
                {/* Ward header */}
                <div style={{
                  background: 'var(--bg-tertiary)', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{w.wardName}</div>
                    <div className="text-muted text-sm">{w.type} · {w.floor}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {Object.entries({
                      Occupied: w.occupied, Available: w.available,
                      Cleaning: w.cleaning, Maintenance: w.maintenance,
                    }).map(([k, v]) => v > 0 && (
                      <span key={k} style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 10px',
                        borderRadius: 99, background: STATUS_CONFIG[k]?.color + '20',
                        color: STATUS_CONFIG[k]?.color,
                      }}>
                        {v} {k}
                      </span>
                    ))}
                    <span style={{
                      fontSize: 12, fontWeight: 800, padding: '2px 10px',
                      borderRadius: 99, background: '#8b5cf620', color: '#8b5cf6',
                    }}>
                      {w.occupancyRate}%
                    </span>
                  </div>
                </div>

                {/* Occupied beds detail */}
                {w.occupiedBeds?.length > 0 && (
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                      ADMITTED PATIENTS
                    </div>
                    {w.occupiedBeds.map(b => (
                      <div key={b.bedNumber} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: 'var(--bg-secondary)',
                        borderRadius: 8, marginBottom: 6, fontSize: 13,
                      }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{
                            fontWeight: 800, color: '#ef4444',
                            background: '#fee2e2', padding: '2px 8px', borderRadius: 6, fontSize: 12,
                          }}>
                            {b.bedNumber}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{b.patient?.name}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              {b.assignedDoctor ? `Dr. ${b.assignedDoctor}` : 'No doctor assigned'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12 }}>
                          <div style={{ fontWeight: 600 }}>{b.daysAdmitted}d admitted</div>
                          {b.expectedDischarge && (
                            <div style={{ color: new Date(b.expectedDischarge) < new Date() ? '#ef4444' : 'var(--text-muted)' }}>
                              Discharge: {fmtDate(b.expectedDischarge)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {w.overdueDischarges > 0 && (
                      <div style={{
                        background: '#fee2e2', color: '#ef4444',
                        borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600,
                      }}>
                        ⚠️ {w.overdueDischarges} patient(s) overdue for discharge
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function WardManagement() {
  const [wards, setWards]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeWard, setActiveWard] = useState(null);

  const [addWardModal, setAddWardModal]   = useState(false);
  const [reportModal, setReportModal]     = useState(false);
  const [admitModal, setAdmitModal]       = useState(null);  // { ward, bed }
  const [filterStatus, setFilterStatus]  = useState('');

  const fetchWards = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/wards');
      setWards(data.wards);
      if (!activeWard && data.wards.length > 0) {
        setActiveWard(data.wards[0]._id);
      }
    } catch { toast.error('Failed to load wards'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWards(); }, [fetchWards]);

  const currentWard = wards.find(w => w._id === activeWard);

  const filteredBeds = currentWard?.beds?.filter(b =>
    filterStatus ? b.status === filterStatus : true
  ) || [];

  const handleBedAction = async (action, bed, value) => {
    try {
      if (action === 'admit') {
        setAdmitModal({ ward: currentWard, bed });
        return;
      }

      if (action === 'discharge') {
        if (!confirm(`Discharge patient from bed ${bed.bedNumber}?`)) return;
        await API.post(`/wards/${currentWard._id}/beds/${bed._id}/discharge`);
        toast.success(`Bed ${bed.bedNumber} — patient discharged`);
      }

      if (action === 'markAvailable') {
        await API.patch(`/wards/${currentWard._id}/beds/${bed._id}/status`, { status: 'Available' });
        toast.success(`Bed ${bed.bedNumber} marked as Available`);
      }

      if (action === 'setStatus') {
        await API.patch(`/wards/${currentWard._id}/beds/${bed._id}/status`, { status: value });
        toast.success(`Bed ${bed.bedNumber} → ${value}`);
      }

      fetchWards();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  /* ── Overall hospital stats ── */
  const hospitalStats = wards.reduce((acc, w) => {
    acc.total       += w.beds?.length    || 0;
    acc.occupied    += w.beds?.filter(b => b.status === 'Occupied').length    || 0;
    acc.available   += w.beds?.filter(b => b.status === 'Available').length   || 0;
    acc.cleaning    += w.beds?.filter(b => b.status === 'Cleaning').length    || 0;
    acc.maintenance += w.beds?.filter(b => b.status === 'Maintenance').length || 0;
    return acc;
  }, { total: 0, occupied: 0, available: 0, cleaning: 0, maintenance: 0 });

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Ward & Bed Management</h1>
          <p>
            {hospitalStats.total} total beds ·
            <span style={{ color: '#ef4444', fontWeight: 700 }}> {hospitalStats.occupied} occupied</span> ·
            <span style={{ color: '#10b981', fontWeight: 700 }}> {hospitalStats.available} available</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setReportModal(true)}>
            <MdBarChart /> Report
          </button>
          <button className="btn btn-secondary" onClick={fetchWards}>
            <MdRefresh /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setAddWardModal(true)}>
            <MdAdd /> Add Ward
          </button>
        </div>
      </div>

      {/* Hospital overview stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {Object.entries({
          'Total Beds':   { value: hospitalStats.total,       color: '#0ea5e9', icon: '🛏' },
          'Occupied':     { value: hospitalStats.occupied,    color: '#ef4444', icon: '🔴' },
          'Available':    { value: hospitalStats.available,   color: '#10b981', icon: '🟢' },
          'Cleaning':     { value: hospitalStats.cleaning,    color: '#f59e0b', icon: '🟡' },
          'Maintenance':  { value: hospitalStats.maintenance, color: '#6b7280', icon: '⚙️' },
          'Occupancy Rate': {
            value: hospitalStats.total > 0
              ? `${Math.round((hospitalStats.occupied / hospitalStats.total) * 100)}%`
              : '0%',
            color: '#8b5cf6', icon: '📊',
          },
        }).map(([label, { value, color, icon }]) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: color + '20', fontSize: 20 }}>{icon}</div>
            <div>
              <div className="stat-value" style={{ color, fontSize: 22 }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex-center" style={{ height: 200 }}>
          <div className="text-muted">Loading wards...</div>
        </div>
      ) : wards.length === 0 ? (
        <div className="empty-state">
          <MdLocalHotel size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
          <h3>No wards created yet</h3>
          <p>Add your first ward to start managing bed occupancy</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }}
            onClick={() => setAddWardModal(true)}>
            <MdAdd /> Add First Ward
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Ward sidebar */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', fontWeight: 700, fontSize: 13,
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1,
            }}>
              Wards ({wards.length})
            </div>
            {wards.map(w => {
              const occ = w.beds?.filter(b => b.status === 'Occupied').length || 0;
              const tot = w.beds?.length || 0;
              const rate = tot > 0 ? Math.round((occ / tot) * 100) : 0;
              return (
                <div key={w._id}
                  onClick={() => { setActiveWard(w._id); setFilterStatus(''); }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    background: activeWard === w._id ? 'var(--accent-light)' : 'transparent',
                    borderLeft: activeWard === w._id ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: activeWard === w._id ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {w.name}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 3 }}>
                    {w.type} · {w.floor || 'No floor'}
                  </div>
                  {/* Mini progress bar */}
                  <div style={{
                    marginTop: 6, height: 4, background: 'var(--border)',
                    borderRadius: 99, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${rate}%`,
                      background: rate > 80 ? '#ef4444' : rate > 50 ? '#f59e0b' : '#10b981',
                      borderRadius: 99, transition: 'width 0.3s',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                    {occ}/{tot} beds · {rate}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bed grid */}
          {currentWard && (
            <div>
              {/* Ward header */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{currentWard.name}</div>
                    <div className="text-muted text-sm">
                      {currentWard.type} · {currentWard.floor || 'No floor specified'}
                    </div>
                  </div>

                  {/* Filter pills */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className={`pill${filterStatus === '' ? ' active' : ''}`}
                      onClick={() => setFilterStatus('')}
                    >
                      All ({currentWard.beds?.length || 0})
                    </button>
                    {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                      const count = currentWard.beds?.filter(b => b.status === status).length || 0;
                      if (count === 0) return null;
                      return (
                        <button key={status}
                          className={`pill${filterStatus === status ? ' active' : ''}`}
                          onClick={() => setFilterStatus(status)}
                          style={{ borderColor: cfg.color, color: filterStatus === status ? '#fff' : cfg.color }}
                        >
                          {cfg.label} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Beds grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 12,
              }}>
                {filteredBeds.map(bed => (
                  <BedCard
                    key={bed._id}
                    bed={bed}
                    ward={currentWard}
                    onAction={handleBedAction}
                  />
                ))}
              </div>

              {filteredBeds.length === 0 && (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <MdBed size={40} style={{ opacity: 0.3 }} />
                  <h3>No beds with status "{filterStatus}"</h3>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {addWardModal && (
        <AddWardModal
          onClose={() => setAddWardModal(false)}
          onCreated={() => { setAddWardModal(false); fetchWards(); }}
        />
      )}

      {reportModal && (
        <ReportModal onClose={() => setReportModal(false)} />
      )}

      {admitModal && (
        <AdmitModal
          ward={admitModal.ward}
          bed={admitModal.bed}
          onClose={() => setAdmitModal(null)}
          onAdmitted={() => { setAdmitModal(null); fetchWards(); }}
        />
      )}
    </div>
  );
}