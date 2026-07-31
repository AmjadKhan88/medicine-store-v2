import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdSearch, MdInventory, MdCheckCircle,
  MdLocalShipping, MdPayment, MdDelete, MdVisibility,
  MdWarning,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const PKR     = (n) => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_BADGE = {
  Pending:             'badge-warning',
  Ordered:             'badge-info',
  'Partially Received':'badge-warning',
  Received:            'badge-success',
  Cancelled:           'badge-danger',
};

const PAY_BADGE = {
  Unpaid:  'badge-danger',
  Partial: 'badge-warning',
  Paid:    'badge-success',
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function PurchaseOrders() {
  const [orders, setOrders]         = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]       = useState(true);
  const [stats, setStats]           = useState({});

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [viewOrder, setViewOrder]     = useState(null);
  const [receiveModal, setReceiveModal] = useState(null);
  const [payModal, setPayModal]       = useState(null);
  const [payAmt, setPayAmt]           = useState('');

  // Low-stock medicines for quick reorder suggestion
  const [lowStockMeds, setLowStockMeds] = useState([]);

  /* ── fetch ── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/purchase-orders', {
        params: { page, limit: 15, search, status: statusFilter },
      });
      setOrders(data.orders);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  const fetchStats = async () => {
    try {
      const { data } = await API.get('/purchase-orders/stats');
      setStats(data.stats);
    } catch {}
  };

  const fetchLowStock = async () => {
    try {
      const { data } = await API.get('/medicines/low-stock');
      setLowStockMeds(data.medicines || []);
    } catch {}
  };

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchStats(); fetchLowStock(); }, []);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  /* ── open detail ── */
  const openView = async (id) => {
    try {
      const { data } = await API.get(`/purchase-orders/${id}`);
      setViewOrder(data.order);
    } catch { toast.error('Failed to load order'); }
  };

  /* ── pay ── */
  const handlePayment = async () => {
    if (!payAmt || Number(payAmt) <= 0) return toast.error('Enter valid amount');
    try {
      await API.patch(`/purchase-orders/${payModal._id}/payment`, { amount: payAmt });
      toast.success('Payment recorded!');
      setPayModal(null); setPayAmt('');
      fetchOrders(); fetchStats();
      if (viewOrder?._id === payModal._id) openView(payModal._id);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  /* ── cancel ── */
  const handleCancel = async (id) => {
    if (!confirm('Cancel this purchase order?')) return;
    try {
      await API.patch(`/purchase-orders/${id}/status`, { status: 'Cancelled' });
      toast.success('Order cancelled');
      fetchOrders(); fetchStats();
      if (viewOrder?._id === id) setViewOrder(null);
    } catch { toast.error('Failed'); }
  };

  /* ── delete ── */
  const handleDelete = async (id) => {
    if (!confirm('Delete this order?')) return;
    try {
      await API.delete(`/purchase-orders/${id}`);
      toast.success('Order deleted');
      fetchOrders(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const statusTabs = [
    { id: '',                    label: 'All'               },
    { id: 'Ordered',             label: 'Ordered'           },
    { id: 'Partially Received',  label: 'Partial'           },
    { id: 'Received',            label: 'Received'          },
    { id: 'Cancelled',           label: 'Cancelled'         },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Purchase Orders</h1>
          <p>Manage supplier orders and restock inventory</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
          <MdAdd /> New Purchase Order
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Pending / Ordered', value: (stats.pending || 0) + (stats.ordered || 0), cls: 'blue',   icon: <MdInventory /> },
          { label: 'Partially Received',value: stats.partial || 0,                           cls: 'yellow', icon: <MdLocalShipping /> },
          { label: 'Low Stock Items',   value: lowStockMeds.length,                          cls: 'red',    icon: <MdWarning /> },
          { label: 'Unpaid to Suppliers',value: PKR(stats.totalUnpaid),                      cls: 'red',    icon: <MdPayment /> },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ fontSize: 20 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Low stock alert ── */}
      {lowStockMeds.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <MdWarning size={20} />
          <div className="alert-text">
            <strong>{lowStockMeds.length} medicines are low on stock!</strong>
            {' '}{lowStockMeds.slice(0, 3).map(m => m.name).join(', ')}
            {lowStockMeds.length > 3 && ` and ${lowStockMeds.length - 3} more`}.
            {' '}
            <span
              style={{ textDecoration: 'underline', cursor: 'pointer' }}
              onClick={() => setCreateModal(true)}
            >
              Create a reorder now →
            </span>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="search-box">
            <MdSearch className="search-icon" />
            <input
              placeholder="Search by PO number or supplier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {statusTabs.map(t => (
              <button
                key={t.id}
                className={`pill${statusFilter === t.id ? ' active' : ''}`}
                onClick={() => setStatusFilter(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card">
        {loading ? (
          <div className="flex-center" style={{ height: 200 }}>
            <ShortLoader/>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <MdInventory size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
            <h3>No purchase orders found</h3>
            <p>Create your first reorder when stock runs low</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Expected</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id}>
                    <td>
                      <span className="text-accent fw-bold">{o.poNumber}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.supplier?.name}</div>
                      {o.supplier?.phone && (
                        <div className="text-muted text-sm">{o.supplier.phone}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-default">{o.items?.length} items</span>
                    </td>
                    <td className="fw-bold">{PKR(o.totalAmount)}</td>
                    <td className="text-success">{PKR(o.amountPaid)}</td>
                    <td>
                      {(o.totalAmount - o.amountPaid) > 0
                        ? <span className="text-danger fw-bold">{PKR(o.totalAmount - o.amountPaid)}</span>
                        : <span className="text-success">—</span>}
                    </td>
                    <td className="text-sm">{fmtDate(o.expectedDate)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[o.status] || 'badge-default'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${PAY_BADGE[o.paymentStatus] || 'badge-default'}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-secondary btn-sm btn-icon"
                          onClick={() => openView(o._id)}
                          title="View"
                        >
                          <MdVisibility />
                        </button>
                        {(o.status === 'Ordered' || o.status === 'Partially Received') && (
                          <button
                            className="btn btn-sm btn-icon"
                            style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                            onClick={() => setReceiveModal(o)}
                            title="Receive Stock"
                          >
                            <MdLocalShipping />
                          </button>
                        )}
                        {o.paymentStatus !== 'Paid' && (
                          <button
                            className="btn btn-success btn-sm btn-icon"
                            onClick={() => { setPayModal(o); setPayAmt(''); }}
                            title="Record Payment"
                          >
                            <MdPayment />
                          </button>
                        )}
                        {o.status !== 'Received' && (
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            onClick={() => handleDelete(o._id)}
                            title="Delete"
                          >
                            <MdDelete />
                          </button>
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
              <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          CREATE ORDER MODAL
      ════════════════════════════════════════ */}
      {createModal && (
        <CreateOrderModal
          lowStockMeds={lowStockMeds}
          onClose={() => setCreateModal(false)}
          onCreated={() => { fetchOrders(); fetchStats(); fetchLowStock(); setCreateModal(false); }}
        />
      )}

      {/* ════════════════════════════════════════
          VIEW ORDER MODAL
      ════════════════════════════════════════ */}
      {viewOrder && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewOrder(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">Purchase Order — {viewOrder.poNumber}</div>
                <div className="text-muted text-sm">{fmtDate(viewOrder.createdAt)}</div>
              </div>
              <div className="flex gap-2">
                <span className={`badge ${STATUS_BADGE[viewOrder.status]}`}>{viewOrder.status}</span>
                <button className="btn btn-ghost btn-icon" onClick={() => setViewOrder(null)}>✕</button>
              </div>
            </div>

            {/* Supplier info */}
            <div style={{
              background: 'var(--bg-tertiary)', borderRadius: 10,
              padding: '14px 16px', marginBottom: 16,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            }}>
              <div>
                <div className="text-muted text-sm">Supplier</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{viewOrder.supplier?.name}</div>
                {viewOrder.supplier?.phone && <div className="text-sm">{viewOrder.supplier.phone}</div>}
                {viewOrder.supplier?.email && <div className="text-sm text-muted">{viewOrder.supplier.email}</div>}
              </div>
              <div>
                <div className="text-muted text-sm">Delivery Info</div>
                <div className="text-sm">Expected: <strong>{fmtDate(viewOrder.expectedDate)}</strong></div>
                {viewOrder.receivedDate && (
                  <div className="text-sm text-success">Received: <strong>{fmtDate(viewOrder.receivedDate)}</strong></div>
                )}
                {viewOrder.notes && <div className="text-muted text-sm" style={{ marginTop: 4 }}>Note: {viewOrder.notes}</div>}
              </div>
            </div>

            {/* Items */}
            <div className="table-container" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th style={{ textAlign: 'right' }}>Ordered</th>
                    <th style={{ textAlign: 'right' }}>Received</th>
                    <th style={{ textAlign: 'right' }}>Pending</th>
                    <th style={{ textAlign: 'right' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewOrder.items?.map((item, i) => {
                    const pending = item.orderedQty - item.receivedQty;
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{item.medicineName}</td>
                        <td style={{ textAlign: 'right' }}>{item.orderedQty}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                          {item.receivedQty}
                        </td>
                        <td style={{ textAlign: 'right', color: pending > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          {pending > 0 ? pending : '✓'}
                        </td>
                        <td style={{ textAlign: 'right' }}>{PKR(item.unitCost)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{PKR(item.totalCost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Payment summary */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div className="flex-between" style={{ marginBottom: 6, fontSize: 14 }}>
                <span className="text-muted">Total Order Value</span>
                <span className="fw-bold">{PKR(viewOrder.totalAmount)}</span>
              </div>
              <div className="flex-between" style={{ marginBottom: 6, fontSize: 14 }}>
                <span className="text-muted">Amount Paid</span>
                <span className="text-success fw-bold">{PKR(viewOrder.amountPaid)}</span>
              </div>
              <div className="divider" />
              <div className="flex-between" style={{ fontSize: 15, fontWeight: 800 }}>
                <span>Balance Due</span>
                <span className={(viewOrder.totalAmount - viewOrder.amountPaid) > 0 ? 'text-danger' : 'text-success'}>
                  {(viewOrder.totalAmount - viewOrder.amountPaid) > 0
                    ? PKR(viewOrder.totalAmount - viewOrder.amountPaid)
                    : 'PAID ✓'}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              {(viewOrder.status === 'Ordered' || viewOrder.status === 'Partially Received') && (
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--success)', color: '#fff' }}
                  onClick={() => { setReceiveModal(viewOrder); setViewOrder(null); }}
                >
                  <MdLocalShipping /> Receive Stock
                </button>
              )}
              {viewOrder.paymentStatus !== 'Paid' && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => { setPayModal(viewOrder); setPayAmt(''); setViewOrder(null); }}
                >
                  <MdPayment /> Record Payment
                </button>
              )}
              {viewOrder.status !== 'Received' && (
                <button className="btn btn-danger btn-sm" onClick={() => handleCancel(viewOrder._id)}>
                  Cancel Order
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setViewOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          RECEIVE STOCK MODAL
      ════════════════════════════════════════ */}
      {receiveModal && (
        <ReceiveModal
          order={receiveModal}
          onClose={() => setReceiveModal(null)}
          onReceived={() => { fetchOrders(); fetchStats(); fetchLowStock(); setReceiveModal(null); }}
        />
      )}

      {/* ════════════════════════════════════════
          PAYMENT MODAL
      ════════════════════════════════════════ */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Record Supplier Payment</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 600 }}>{payModal.supplier?.name}</div>
              <div className="text-muted text-sm">PO: {payModal.poNumber}</div>
              <div className="flex-between" style={{ marginTop: 8 }}>
                <span className="text-sm text-muted">Total: <strong>{PKR(payModal.totalAmount)}</strong></span>
                <span className="text-sm text-danger">
                  Due: <strong>{PKR(payModal.totalAmount - payModal.amountPaid)}</strong>
                </span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label required">Amount to Pay (₨)</label>
              <input
                className="form-control"
                type="number"
                value={payAmt}
                onChange={e => setPayAmt(e.target.value)}
                min={1}
                max={payModal.totalAmount - payModal.amountPaid}
                placeholder="Enter amount..."
              />
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

/* ═══════════════════════════════════════════
   CREATE ORDER MODAL  (sub-component)
═══════════════════════════════════════════ */
function CreateOrderModal({ lowStockMeds, onClose, onCreated }) {
  const [supplier, setSupplier] = useState({ name: '', phone: '', email: '', address: '' });
  const [items, setItems]       = useState([]);
  const [expectedDate, setExpectedDate] = useState('');
  const [amountPaid, setAmountPaid]     = useState(0);
  const [notes, setNotes]               = useState('');
  const [saving, setSaving]             = useState(false);

  // Medicine search
  const [medSearch, setMedSearch]   = useState('');
  const [medResults, setMedResults] = useState([]);
  const [showDrop, setShowDrop]     = useState(false);

  useEffect(() => {
    if (medSearch.length > 1) {
      API.get('/medicines', { params: { search: medSearch, limit: 8 } })
        .then(({ data }) => { setMedResults(data.medicines); setShowDrop(true); });
    } else { setShowDrop(false); }
  }, [medSearch]);

  // Pre-fill low stock medicines
  const prefillLowStock = () => {
    const preItems = lowStockMeds.map(m => ({
      medicine:    m._id,
      medicineName:m.name,
      orderedQty:  m.minStock * 2,
      unitCost:    m.purchasePrice || 0,
    }));
    setItems(preItems);
    toast.success(`${preItems.length} low-stock medicines added`);
  };

  const addMedicine = (med) => {
    setMedSearch(''); setShowDrop(false);
    if (items.find(i => i.medicine === med._id)) {
      toast('Already in list'); return;
    }
    setItems(prev => [...prev, {
      medicine:     med._id,
      medicineName: med.name,
      orderedQty:   10,
      unitCost:     med.purchasePrice || 0,
    }]);
  };

  const updateItem = (id, key, val) =>
    setItems(prev => prev.map(i => i.medicine === id ? { ...i, [key]: val } : i));

  const removeItem = (id) => setItems(prev => prev.filter(i => i.medicine !== id));

  const subtotal = items.reduce((s, i) => s + (Number(i.unitCost) * Number(i.orderedQty)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplier.name) return toast.error('Supplier name is required');
    if (items.length === 0) return toast.error('Add at least one medicine');
    setSaving(true);
    try {
      await API.post('/purchase-orders', {
        supplier, items, expectedDate, amountPaid, notes,
      });
      toast.success('Purchase order created!');
      onCreated();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const fld = (k) => (e) => setSupplier(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">New Purchase Order</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Supplier ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>
              SUPPLIER INFORMATION
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Supplier / Company Name</label>
                <input className="form-control" value={supplier.name} onChange={fld('name')}
                  placeholder="Al-Habib Pharmaceuticals" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={supplier.phone} onChange={fld('phone')}
                  placeholder="0300-1234567" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={supplier.email} onChange={fld('email')}
                  placeholder="supplier@email.com" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-control" value={supplier.address} onChange={fld('address')}
                  placeholder="Supplier address..." />
              </div>
              <div className="form-group">
                <label className="form-label">Expected Delivery Date</label>
                <input className="form-control" type="date" value={expectedDate}
                  onChange={e => setExpectedDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)} />
              </div>
            </div>
          </div>

          {/* ── Medicines ── */}
          <div style={{ marginBottom: 20 }}>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)' }}>
                ORDER ITEMS
              </div>
              {lowStockMeds.length > 0 && (
                <button type="button" className="btn btn-sm"
                  style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning)' }}
                  onClick={prefillLowStock}>
                  <MdWarning size={14} /> Auto-fill {lowStockMeds.length} Low Stock Items
                </button>
              )}
            </div>

            {/* Search medicine */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <div className="input-group">
                <MdSearch className="input-icon" />
                <input className="form-control" placeholder="Search medicine to add..."
                  value={medSearch} onChange={e => setMedSearch(e.target.value)} />
              </div>
              {showDrop && medResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--card-bg)', border: '1px solid var(--border)',
                  borderRadius: 10, zIndex: 200, boxShadow: 'var(--shadow-lg)', marginTop: 4,
                }}>
                  {medResults.map(m => (
                    <div key={m._id}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border-light)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                      onMouseDown={() => addMedicine(m)}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div className="text-muted text-sm">
                          Stock: {m.stock} {m.unit} · Purchase: {PKR(m.purchasePrice)}
                        </div>
                      </div>
                      {m.isLowStock && (
                        <span className="badge badge-warning">Low Stock</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <div style={{
                border: '2px dashed var(--border)', borderRadius: 10,
                padding: '30px', textAlign: 'center', color: 'var(--text-muted)',
              }}>
                Search and add medicines above, or use Auto-fill for low stock items
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th style={{ textAlign: 'right' }}>Order Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Cost (₨)</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.medicine}>
                        <td style={{ fontWeight: 600 }}>{item.medicineName}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number" min={1} value={item.orderedQty}
                            onChange={e => updateItem(item.medicine, 'orderedQty', e.target.value)}
                            style={{
                              width: 70, textAlign: 'right', padding: '5px 8px',
                              border: '1.5px solid var(--border)', borderRadius: 6,
                              background: 'var(--input-bg)', color: 'var(--text-primary)',
                              fontFamily: 'var(--font-main)',
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number" min={0} value={item.unitCost}
                            onChange={e => updateItem(item.medicine, 'unitCost', e.target.value)}
                            style={{
                              width: 90, textAlign: 'right', padding: '5px 8px',
                              border: '1.5px solid var(--border)', borderRadius: 6,
                              background: 'var(--input-bg)', color: 'var(--text-primary)',
                              fontFamily: 'var(--font-main)',
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {PKR(Number(item.unitCost) * Number(item.orderedQty))}
                        </td>
                        <td>
                          <button type="button" className="btn btn-danger btn-sm btn-icon"
                            onClick={() => removeItem(item.medicine)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Summary ── */}
          <div style={{
            background: 'var(--bg-tertiary)', borderRadius: 10, padding: 16, marginBottom: 16,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
          }}>
            <div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Advance Payment (₨)</label>
                <input className="form-control" type="number" min={0} max={subtotal}
                  value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                  placeholder="0" />
              </div>
              <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Delivery instructions, special notes..." />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
              <div className="flex-between text-sm">
                <span className="text-muted">Order Total</span>
                <span className="fw-bold" style={{ fontSize: 18 }}>{PKR(subtotal)}</span>
              </div>
              <div className="flex-between text-sm">
                <span className="text-muted">Advance Paid</span>
                <span className="text-success fw-bold">{PKR(amountPaid)}</span>
              </div>
              <div className="divider" />
              <div className="flex-between text-sm">
                <span className="text-muted">Balance Due</span>
                <span className="text-danger fw-bold" style={{ fontSize: 16 }}>
                  {PKR(subtotal - Number(amountPaid))}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : '📦 Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RECEIVE STOCK MODAL  (sub-component)
═══════════════════════════════════════════ */
function ReceiveModal({ order, onClose, onReceived }) {
  const [receivedItems, setReceivedItems] = useState(
    order.items.map(item => ({
      medicineId:  item.medicine?._id || item.medicine,
      medicineName:item.medicineName,
      orderedQty:  item.orderedQty,
      alreadyReceived: item.receivedQty,
      receivedQty: item.orderedQty - item.receivedQty,  // default: fill remaining
    }))
  );
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const updateQty = (id, val) =>
    setReceivedItems(prev => prev.map(i => i.medicineId === id ? { ...i, receivedQty: val } : i));

  const handleReceive = async () => {
    setSaving(true);
    try {
      await API.patch(`/purchase-orders/${order._id}/receive`, {
        receivedItems: receivedItems.map(i => ({
          medicineId:  i.medicineId,
          receivedQty: Number(i.receivedQty),
        })),
        receivedDate,
      });
      toast.success('Stock received and inventory updated!');
      onReceived();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">Receive Stock — {order.poNumber}</div>
            <div className="text-muted text-sm">From: {order.supplier?.name}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div
          className="alert alert-info"
          style={{ marginBottom: 16 }}
        >
          <MdLocalShipping size={18} />
          <div className="alert-text">
            Enter the actual quantity received for each item. Stock will be added to inventory automatically.
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Received Date</label>
          <input className="form-control" type="date" value={receivedDate}
            onChange={e => setReceivedDate(e.target.value)} style={{ maxWidth: 200 }} />
        </div>

        <div className="table-container" style={{ marginBottom: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th style={{ textAlign: 'right' }}>Ordered</th>
                <th style={{ textAlign: 'right' }}>Already Received</th>
                <th style={{ textAlign: 'right' }}>Remaining</th>
                <th style={{ textAlign: 'right' }}>Receiving Now</th>
              </tr>
            </thead>
            <tbody>
              {receivedItems.map(item => {
                const remaining = item.orderedQty - item.alreadyReceived;
                return (
                  <tr key={item.medicineId}>
                    <td style={{ fontWeight: 600 }}>{item.medicineName}</td>
                    <td style={{ textAlign: 'right' }}>{item.orderedQty}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)' }}>
                      {item.alreadyReceived}
                    </td>
                    <td style={{ textAlign: 'right', color: remaining > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {remaining > 0 ? remaining : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {remaining > 0 ? (
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={item.receivedQty}
                          onChange={e => updateQty(item.medicineId, e.target.value)}
                          style={{
                            width: 80, textAlign: 'right', padding: '5px 8px',
                            border: '1.5px solid var(--accent)', borderRadius: 6,
                            background: 'var(--input-bg)', color: 'var(--text-primary)',
                            fontFamily: 'var(--font-main)', fontWeight: 700,
                          }}
                        />
                      ) : (
                        <span className="badge badge-success">Complete</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{
          background: 'var(--success-bg)', border: '1px solid var(--success)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13,
          color: 'var(--success)',
        }}>
          <strong>✓ After confirming:</strong> The received quantities will be added to each medicine's stock automatically.
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff' }}
            onClick={handleReceive} disabled={saving}>
            <MdCheckCircle /> {saving ? 'Updating Stock...' : 'Confirm & Update Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}