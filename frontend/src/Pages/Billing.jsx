import { useState, useEffect, useCallback } from 'react';
import PermissionGate from '../Components/PermissionGate';
import { useNavigate } from 'react-router-dom';
import {
  MdAdd, MdSearch, MdReceipt, MdPayment,
  MdDelete, MdVisibility, MdEmail, MdPictureAsPdf
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { generateInvoicePDF } from '../utils/invoicePDF';

const STATUS_COLORS = {
  Paid: 'badge-success',
  Partial: 'badge-warning',
  Pending: 'badge-danger',
};

export default function Billing() {
  const [bills, setBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewBill, setViewBill] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [pdfLoading, setPdfLoading] = useState('');
  const [emailingSent, setEmailingSent] = useState(false);
  const [emailingId, setEmailingId] = useState('');
  const navigate = useNavigate();

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/billing', {
        params: { page, limit: 15, search, status },
      });
      setBills(data.bills);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load bills'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetchBills(); }, [fetchBills]);
  useEffect(() => { setPage(1); }, [search, status]);

  /* ── Open detailed bill view ── */
  const openView = async (id) => {
    try {
      const { data } = await API.get(`/billing/${id}`);
      setViewBill(data.bill);
    } catch { toast.error('Failed to load invoice'); }
  };

  /* ── Download PDF for a single bill ── */
  const handlePDF = async (id, inline = false) => {
    setPdfLoading(id);
    try {
      // If we already have full bill in viewBill use it, else fetch
      let bill = inline && viewBill?._id === id ? viewBill : null;
      if (!bill) {
        const { data } = await API.get(`/billing/${id}`);
        bill = data.bill;
      }
      const doc = generateInvoicePDF(bill);
      const filename = `Invoice_${bill.billNumber}_${bill.patientName?.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      toast.success('Invoice PDF downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('PDF generation failed');
    } finally { setPdfLoading(''); }
  };

  /* ── Record payment ── */
  const handlePayment = async () => {
    if (!payAmt || Number(payAmt) <= 0) return toast.error('Enter valid amount');
    try {
      await API.patch(`/billing/${payModal._id}/payment`, {
        additionalPayment: payAmt,
        paymentMethod: payMethod,
      });
      toast.success('Payment recorded!');
      setPayModal(null);
      setPayAmt('');
      fetchBills();
      // Refresh view modal if open
      if (viewBill?._id === payModal._id) {
        const { data } = await API.get(`/billing/${payModal._id}`);
        setViewBill(data.bill);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Payment failed'); }
  };

  /* ── Delete bill ── */
  const handleDelete = async (id) => {
    if (!confirm('Delete this bill? Stock will be restored.')) return;
    try {
      await API.delete(`/billing/${id}`);
      toast.success('Bill deleted');
      fetchBills();
      if (viewBill?._id === id) setViewBill(null);
    } catch { toast.error('Delete failed'); }
  };

  /* ── Send Email ── */
  const handleEmailInvoice = async (bill) => {
    if (!bill.patient?.email && !bill.patientEmail) {
      toast.error('This patient has no email address. Add it from the Patients page.');
      return;
    }
    setEmailingId(bill._id);
    try {
      await API.post(`/billing/${bill._id}/email`);
      toast.success('Invoice emailed to patient!');
      setEmailingSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally { setEmailingId(''); }
  };

  const fmtPKR = (n) => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK') : '—';

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Billing & Invoices</h1>
          <p>{total} total invoices</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/app/billing/create')}>
          <MdAdd /> Create Invoice
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="search-box">
            <MdSearch className="search-icon" />
            <input
              placeholder="Search by bill no., patient name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['', 'Paid', 'Partial', 'Pending'].map(s => (
              <button
                key={s}
                className={`pill${status === s ? ' active' : ''}`}
                onClick={() => setStatus(s)}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card">
        {loading ? (
          <div className="flex-center" style={{ height: 200 }}>
            <div className="text-muted">Loading...</div>
          </div>
        ) : bills.length === 0 ? (
          <div className="empty-state">
            <MdReceipt size={52} style={{ opacity: 0.3 }} />
            <h3>No invoices found</h3>
            <p>Create your first invoice</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => {
                  const balance = (b.totalAmount || 0) - (b.amountPaid || 0);
                  return (
                    <tr key={b._id}>
                      <td>
                        <span className="text-accent fw-bold">{b.billNumber}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.patientName}</div>
                        <div className="text-muted text-sm">{b.patient?.patientId}</div>
                      </td>
                      <td className="text-sm">{fmtDate(b.createdAt)}</td>
                      <td className="fw-bold">{fmtPKR(b.totalAmount)}</td>
                      <td className="text-success">{fmtPKR(b.amountPaid)}</td>
                      <td>
                        {balance > 0
                          ? <span className="text-danger fw-bold">{fmtPKR(balance)}</span>
                          : <span className="text-success">—</span>}
                      </td>
                      <td>
                        <span className="badge badge-default">{b.paymentMethod}</span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[b.paymentStatus] || 'badge-default'}`}>
                          {b.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          {/* View */}
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            onClick={() => openView(b._id)}
                            title="View Invoice"
                          >
                            <MdVisibility />
                          </button>
                          {/* PDF */}
                          <button
                            className="btn btn-sm btn-icon"
                            style={{ background: 'var(--info-bg)', color: 'var(--info)' }}
                            onClick={() => handlePDF(b._id)}
                            disabled={pdfLoading === b._id}
                            title="Download PDF"
                          >
                            {pdfLoading === b._id
                              ? <span style={{ fontSize: 10 }}>...</span>
                              : <MdPictureAsPdf />}
                          </button>
                          {/* Pay */}
                          {b.paymentStatus !== 'Paid' && (
                            <button
                              className="btn btn-success btn-sm btn-icon"
                              onClick={() => { setPayModal(b); setPayAmt(''); }}
                              title="Record Payment"
                            >
                              <MdPayment />
                            </button>
                          )}
                          {/* Delete */}
                          <PermissionGate permission="deleteBill">
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(b._id)}><MdDelete /></button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          VIEW INVOICE MODAL
      ══════════════════════════════════════════ */}
      {viewBill && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewBill(null)}>
          <div className="modal modal-lg">
            {/* Modal header */}
            <div className="modal-header">
              <div>
                <div className="modal-title">Invoice — {viewBill.billNumber}</div>
                <div className="text-muted text-sm">
                  {new Date(viewBill.createdAt).toLocaleDateString('en-PK', { dateStyle: 'full' })}
                </div>
              </div>
              <div className="flex gap-2">
                {/* PDF button inside modal */}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handlePDF(viewBill._id, true)}
                  disabled={pdfLoading === viewBill._id}
                >
                  <MdPictureAsPdf size={16} />
                  {pdfLoading === viewBill._id ? 'Generating...' : 'Download PDF'}
                </button>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => handleEmailInvoice(viewBill)}
                  disabled={emailingId === viewBill._id}
                >
                  <MdEmail size={15} />
                  {emailingId === viewBill._id ? 'Sending...' : 'Email to Patient'}
                </button>
                <button className="btn btn-ghost btn-icon" onClick={() => setViewBill(null)}>✕</button>
              </div>
            </div>

            {/* Patient info */}
            <div className="flex-between" style={{
              background: 'var(--bg-tertiary)', borderRadius: 10,
              padding: '14px 16px', marginBottom: 16,
            }}>
              <div>
                <div style={{ fontWeight: 700 }}>{viewBill.patientName}</div>
                <div className="text-muted text-sm">
                  {viewBill.patient?.patientId} · {viewBill.patient?.phone}
                </div>
              </div>
              <span className={`badge ${STATUS_COLORS[viewBill.paymentStatus]}`}>
                {viewBill.paymentStatus}
              </span>
            </div>

            {/* Items table */}
            <div className="table-container" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewBill.items?.map((item, i) => (
                    <tr key={i}>
                      <td>{item.medicineName}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>₨ {item.unitPrice?.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₨ {item.totalPrice?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{
              padding: 16, background: 'var(--bg-tertiary)',
              borderRadius: 10, marginBottom: 16,
            }}>
              {[
                ['Subtotal', viewBill.subtotal, false],
                ['Discount', viewBill.discount > 0 ? -viewBill.discount : null, false],
                ['Tax', viewBill.tax > 0 ? viewBill.tax : null, false],
              ].map(([l, v]) => v != null ? (
                <div key={l} className="flex-between" style={{ marginBottom: 6, fontSize: 14 }}>
                  <span className="text-muted">{l}</span>
                  <span>{l === 'Discount' ? `— ₨ ${Math.abs(v).toLocaleString()}` : `₨ ${v?.toLocaleString()}`}</span>
                </div>
              ) : null)}

              <div className="divider" />

              <div className="flex-between" style={{ fontWeight: 800, fontSize: 17 }}>
                <span>Total</span>
                <span>₨ {viewBill.totalAmount?.toLocaleString()}</span>
              </div>
              <div className="flex-between" style={{ color: 'var(--success)', marginTop: 6, fontSize: 14 }}>
                <span>Amount Paid</span>
                <span>₨ {viewBill.amountPaid?.toLocaleString()}</span>
              </div>

              {(viewBill.totalAmount - viewBill.amountPaid) > 0 ? (
                <div className="flex-between" style={{ color: 'var(--danger)', fontWeight: 700, marginTop: 4, fontSize: 14 }}>
                  <span>Remaining Balance</span>
                  <span>₨ {(viewBill.totalAmount - viewBill.amountPaid).toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex-between" style={{ color: 'var(--success)', fontWeight: 700, marginTop: 4, fontSize: 14 }}>
                  <span>Balance</span><span>CLEARED ✓</span>
                </div>
              )}
            </div>

            {viewBill.notes && (
              <div className="text-muted text-sm">Notes: {viewBill.notes}</div>
            )}

            {/* Action row */}
            <div className="modal-footer">
              {viewBill.paymentStatus !== 'Paid' && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => { setPayModal(viewBill); setPayAmt(''); }}
                >
                  <MdPayment /> Record Payment
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setViewBill(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          PAYMENT MODAL
      ══════════════════════════════════════════ */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Record Payment</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setPayModal(null)}>✕</button>
            </div>

            <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-tertiary)', borderRadius: 10 }}>
              <div style={{ fontWeight: 600 }}>{payModal.patientName}</div>
              <div className="text-muted text-sm">Bill: {payModal.billNumber}</div>
              <div className="flex-between" style={{ marginTop: 8 }}>
                <span className="text-sm text-muted">
                  Total: <strong>₨ {payModal.totalAmount?.toLocaleString()}</strong>
                </span>
                <span className="text-sm text-danger">
                  Remaining: <strong>₨ {(payModal.totalAmount - payModal.amountPaid).toLocaleString()}</strong>
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Payment Amount (₨)</label>
              <input
                className="form-control"
                type="number"
                value={payAmt}
                onChange={e => setPayAmt(e.target.value)}
                max={payModal.totalAmount - payModal.amountPaid}
                min={1}
                placeholder="Enter amount..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-control" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                <option>Cash</option>
                <option>Card</option>
                <option>Online</option>
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handlePayment}>
                <MdPayment /> Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

