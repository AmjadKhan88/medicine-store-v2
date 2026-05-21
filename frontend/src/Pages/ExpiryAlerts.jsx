import { useState, useEffect } from 'react';
import { MdWarning, MdError, MdCheckCircle } from 'react-icons/md';
import API from '../utils/api';

export default function ExpiryAlerts() {
  const [data, setData] = useState({ expired: [], expiringSoon: [], expiringIn60: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('expired');

  useEffect(() => {
    API.get('/medicines/expiry-alerts').then(({ data }) => { setData(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const tabs = [
    { id: 'expired', label: 'Expired', count: data.expired.length, icon: <MdError />, cls: 'badge-danger' },
    { id: 'expiringSoon', label: 'Expiring in 30 Days', count: data.expiringSoon.length, icon: <MdWarning />, cls: 'badge-warning' },
    { id: 'expiringIn60', label: 'Expiring in 60 Days', count: data.expiringIn60.length, icon: <MdCheckCircle />, cls: 'badge-info' },
  ];

  const current = data[tab] || [];
  const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Expiry Alerts</h1>
          <p>Monitor medicine expiry dates and take action</p>
        </div>
      </div>

      {data.expired.length > 0 && (
        <div className="alert alert-danger">
          <MdError size={20} />
          <div className="alert-text"><strong>Urgent: {data.expired.length} medicines have expired!</strong>Remove them from inventory immediately to prevent patient harm.</div>
        </div>
      )}

      <div className="flex gap-3" style={{ marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.id} className={`pill${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
            {t.icon}<span>{t.label}</span><span className={`badge ${t.cls}`} style={{ marginLeft:6 }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="flex-center" style={{ height:200 }}><div className="text-muted">Loading...</div></div>
        : current.length === 0 ? <div className="empty-state"><MdCheckCircle size={52} style={{ opacity:0.3 }} /><h3>No medicines in this category</h3><p>All medicines are within safe date ranges</p></div>
        : (
          <div className="table-container">
            <table>
              <thead><tr><th>Medicine</th><th>Category</th><th>Batch</th><th>Stock</th><th>Sale Price</th><th>Expiry Date</th><th>Status</th></tr></thead>
              <tbody>
                {current.map(m => {
                  const days = daysUntil(m.expiryDate);
                  return (
                    <tr key={m._id}>
                      <td>
                        <div style={{ fontWeight:600 }}>{m.name}</div>
                        <div className="text-muted text-sm">{m.genericName} · {m.dosageForm} {m.strength}</div>
                      </td>
                      <td><span className="badge badge-default">{m.category}</span></td>
                      <td className="text-sm">{m.batchNumber||'—'}</td>
                      <td><span className="fw-semibold">{m.stock} {m.unit}</span></td>
                      <td>₨ {m.salePrice?.toLocaleString()}</td>
                      <td className="fw-semibold" style={{ color: days < 0 ? 'var(--danger)' : days <= 30 ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {new Date(m.expiryDate).toLocaleDateString('en-PK')}
                      </td>
                      <td>
                        {days < 0
                          ? <span className="badge badge-danger">Expired {Math.abs(days)}d ago</span>
                          : <span className="badge badge-warning">In {days} days</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
