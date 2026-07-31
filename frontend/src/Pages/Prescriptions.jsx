import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdAdd, MdSearch, MdPictureAsPdf, MdReceipt,
  MdCancel, MdVisibility, MdMedicalServices,
   MdCheckCircle,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { printPrescriptionPDF } from '../utils/prescriptionPDF';
import ShortLoader from '../Components/ShortLoader';

const STATUS_BADGE = {
  Active:    'badge-success',
  Dispensed: 'badge-accent',
  Cancelled: 'badge-danger',
  Expired:   'badge-warning',
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

export default function Prescriptions() {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [search, setSearch]               = useState('');
  const [status, setStatus]               = useState('');
  const [loading, setLoading]             = useState(true);
  const [stats, setStats]                 = useState({});
  const [viewRx, setViewRx]               = useState(null);
  const [converting, setConverting]       = useState('');

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/prescriptions', {
        params: { page, limit: 15, search, status },
      });
      setPrescriptions(data.prescriptions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load prescriptions'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);
  useEffect(() => {
    API.get('/prescriptions/stats').then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [search, status]);

  const openView = async (id) => {
    try {
      const { data } = await API.get(`/prescriptions/${id}`);
      setViewRx(data.prescription);
    } catch { toast.error('Failed to load prescription'); }
  };

  const handlePrint = async (rx) => {
    let full = rx;
    if (!rx.patient?.patientId) {
      try { const { data } = await API.get(`/prescriptions/${rx._id}`); full = data.prescription; }
      catch {}
    }
    printPrescriptionPDF(full);
  };

  const handleConvert = async (id) => {
    if (!confirm('Convert this prescription to an invoice? Stock will be deducted.')) return;
    setConverting(id);
    try {
      const { data } = await API.post(`/prescriptions/${id}/convert-to-bill`);
      toast.success(data.message);
      fetchPrescriptions();
      if (viewRx?._id === id) setViewRx(null);
      navigate('/billing');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
    } finally { setConverting(''); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this prescription?')) return;
    try {
      await API.patch(`/prescriptions/${id}/cancel`);
      toast.success('Prescription cancelled');
      fetchPrescriptions();
      if (viewRx?._id === id) setViewRx(null);
    } catch { toast.error('Failed'); }
  };

  const statusTabs = [
    { id: '',          label: 'All'       },
    { id: 'Active',    label: 'Active'    },
    { id: 'Dispensed', label: 'Dispensed' },
    { id: 'Expired',   label: 'Expired'   },
    { id: 'Cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Prescriptions</h1>
          <p>{total} total prescriptions</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/app/prescriptions/create')}>
          <MdAdd /> Write Prescription
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total',        value: stats.total     || 0, cls: 'blue'   },
          { label: 'Active',       value: stats.active    || 0, cls: 'green'  },
          { label: 'Dispensed',    value: stats.dispensed || 0, cls: 'purple' },
          { label: 'Expiring (7d)',value: stats.expiring  || 0, cls: 'yellow' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}><MdMedicalServices /></div>
            <div>
              <div className="stat-value" style={{ fontSize: 24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <div className="search-box">
            <MdSearch className="search-icon" />
            <input placeholder="Search by Rx number, patient, doctor, diagnosis..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {statusTabs.map(t => (
            <button key={t.id} className={`pill${status === t.id ? ' active' : ''}`}
              onClick={() => setStatus(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex-center" style={{ height: 200 }}>
            <ShortLoader/>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="empty-state">
            <MdMedicalServices size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
            <h3>No prescriptions found</h3>
            <p>Write your first prescription to get started</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Rx Number</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Diagnosis</th>
                  <th>Medicines</th>
                  <th>Date</th>
                  <th>Valid Until</th>
                  <th>Linked Bill</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map(rx => (
                  <tr key={rx._id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{rx.rxNumber}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{rx.patientName}</div>
                      <div className="text-muted text-sm">{rx.patient?.patientId}</div>
                    </td>
                    <td className="text-sm">Dr. {rx.doctorName}</td>
                    <td className="text-sm">{rx.diagnosis || '—'}</td>
                    <td>
                      <span className="badge badge-default">{rx.items?.length} medicines</span>
                    </td>
                    <td className="text-sm">{fmtDate(rx.createdAt)}</td>
                    <td className="text-sm" style={{ color: rx.status === 'Expired' ? 'var(--danger)' : 'inherit' }}>
                      {fmtDate(rx.validUntil)}
                    </td>
                    <td>
                      {rx.linkedBill
                        ? <span className="badge badge-accent">{rx.linkedBill.billNumber}</span>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[rx.status] || 'badge-default'}`}>
                        {rx.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm btn-icon"
                          onClick={() => openView(rx._id)} title="View">
                          <MdVisibility />
                        </button>
                        <button className="btn btn-secondary btn-sm btn-icon"
                          onClick={() => handlePrint(rx)} title="Print PDF">
                          <MdPictureAsPdf />
                        </button>
                        {rx.status === 'Active' && (
                          <>
                            <button
                              className="btn btn-sm btn-icon"
                              style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                              onClick={() => handleConvert(rx._id)}
                              disabled={converting === rx._id}
                              title="Convert to Invoice"
                            >
                              {converting === rx._id ? '...' : <MdReceipt />}
                            </button>
                            <button className="btn btn-danger btn-sm btn-icon"
                              onClick={() => handleCancel(rx._id)} title="Cancel">
                              <MdCancel />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {/* ── View Prescription Modal ── */}
      {viewRx && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewRx(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">{viewRx.rxNumber}</div>
                <div className="text-muted text-sm">{fmtDate(viewRx.createdAt)}</div>
              </div>
              <div className="flex gap-2">
                <span className={`badge ${STATUS_BADGE[viewRx.status]}`}>{viewRx.status}</span>
                <button className="btn btn-primary btn-sm" onClick={() => handlePrint(viewRx)}>
                  <MdPictureAsPdf size={15} /> Print PDF
                </button>
                <button className="btn btn-ghost btn-icon" onClick={() => setViewRx(null)}>✕</button>
              </div>
            </div>

            {/* Patient + Doctor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14 }}>
                <div className="text-muted text-sm" style={{ marginBottom: 4 }}>Patient</div>
                <div style={{ fontWeight: 700 }}>{viewRx.patientName}</div>
                <div className="text-muted text-sm">{viewRx.patient?.patientId} · {viewRx.patient?.phone}</div>
                {viewRx.patient?.age && <div className="text-sm">Age: {viewRx.patient.age} · {viewRx.patient.gender}</div>}
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14 }}>
                <div className="text-muted text-sm" style={{ marginBottom: 4 }}>Doctor & Dates</div>
                <div style={{ fontWeight: 700 }}>Dr. {viewRx.doctorName}</div>
                {viewRx.diagnosis && <div className="text-sm">Dx: {viewRx.diagnosis}</div>}
                <div className="text-sm text-muted">Valid until: {fmtDate(viewRx.validUntil)}</div>
              </div>
            </div>

            {/* Medicines */}
            <div className="table-container" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Medicine</th><th>Dosage</th>
                    <th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {viewRx.items?.map((item, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.medicineName}</td>
                      <td>{item.dosage}</td>
                      <td>{item.frequency}</td>
                      <td>{item.duration}</td>
                      <td><span className="badge badge-accent">{item.quantity}</span></td>
                      <td className="text-sm text-muted">{item.instructions || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {viewRx.notes && (
              <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13 }}>
                <strong>Notes:</strong> {viewRx.notes}
              </div>
            )}

            {viewRx.linkedBill && (
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                <MdCheckCircle size={18} />
                <div className="alert-text">
                  Dispensed — Linked to Invoice <strong>{viewRx.linkedBill.billNumber}</strong>
                </div>
              </div>
            )}

            <div className="modal-footer">
              {viewRx.status === 'Active' && (
                <>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleConvert(viewRx._id)}
                    disabled={converting === viewRx._id}
                  >
                    <MdReceipt />
                    {converting === viewRx._id ? 'Converting...' : 'Convert to Invoice'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleCancel(viewRx._id)}>
                    <MdCancel /> Cancel Rx
                  </button>
                </>
              )}
              <button className="btn btn-secondary" onClick={() => setViewRx(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}