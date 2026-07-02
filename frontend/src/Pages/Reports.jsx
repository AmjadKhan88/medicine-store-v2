import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  MdDateRange, MdPictureAsPdf, MdFileDownload,
  MdTrendingUp, MdAccountBalance, MdPeople, MdReceipt,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { exportReportPDF, exportReportCSV } from '../utils/reportExport';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

const PKR = (n) => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;

/* ── Date range presets ── */
function getPresetRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { from: today, to: now };
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      const yEnd = new Date(y); yEnd.setHours(23, 59, 59, 999);
      return { from: y, to: yEnd };
    }
    case 'thisWeek': {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay());
      return { from: start, to: now };
    }
    case 'thisMonth':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { from: start, to: end };
    }
    case 'last30':
      return { from: new Date(today.getTime() - 30 * 86400000), to: now };
    case 'thisYear':
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    default:
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
}

const toInputDate = (d) => new Date(d).toISOString().slice(0, 10);

export default function Reports() {
  const [preset, setPreset]       = useState('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [exporting, setExporting]   = useState('');

  // const range = preset === 'custom' && customFrom && customTo
  //   ? { from: new Date(customFrom), to: new Date(customTo) }
  //   : getPresetRange(preset);

  const range = useMemo(() => {
  if (preset === 'custom' && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo) };
  }

  return getPresetRange(preset);
}, [preset, customFrom, customTo]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/dashboard/advanced-report', {
        params: {
          startDate: toInputDate(range.from),
          endDate:   toInputDate(range.to),
        },
      });
      setReportData(data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }, [range.from?.getTime(), range.to?.getTime()]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const presets = [
    { id: 'today',     label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'thisWeek',  label: 'This Week' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'lastMonth', label: 'Last Month' },
    { id: 'last30',    label: 'Last 30 Days' },
    { id: 'thisYear',  label: 'This Year' },
    { id: 'custom',    label: 'Custom Range' },
  ];

  const handlePresetClick = (id) => {
    setPreset(id);
    setShowCustom(id === 'custom');
  };

  /* ── Export handlers ── */
  const handleExport = async (type) => {
    setExporting(type);
    try {
      const { data } = await API.get('/dashboard/report-export', {
        params: { startDate: toInputDate(range.from), endDate: toInputDate(range.to) },
      });

      if (type === 'csv') {
        exportReportCSV(data.bills, data.dateRange);
        toast.success('CSV downloaded!');
      } else {
        exportReportPDF(reportData, data.bills, data.dateRange);
        toast.success('PDF downloaded!');
      }
    } catch (err) {
      toast.error('Export failed');
      console.error(err);
    } finally { setExporting(''); }
  };

  if (loading && !reportData) {
    return <div className="flex-center" style={{ height: 300 }}><div className="text-muted">Loading report...</div></div>;
  }
  if (!reportData) return null;

  const { summary, topPatients = [], topMedicines = [], paymentMethodBreakdown = [], dailyTrend = [], categoryBreakdown = [] } = reportData;

  const chartData = dailyTrend.map(d => ({
    name: `${d._id.day}/${d._id.month}`,
    revenue: d.revenue,
    collected: d.collected,
  }));

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Reports & Analytics</h1>
          <p>
            Showing data from <strong>{range.from?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
            {' '}to <strong>{range.to?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')} disabled={!!exporting}>
            <MdFileDownload size={16} /> {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleExport('pdf')} disabled={!!exporting}>
            <MdPictureAsPdf size={16} /> {exporting === 'pdf' ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* ── Date range picker ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <MdDateRange size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Date Range</span>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {presets.map(p => (
            <button
              key={p.id}
              className={`pill${preset === p.id ? ' active' : ''}`}
              onClick={() => handlePresetClick(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {showCustom && (
          <div className="form-row" style={{ marginTop: 16, marginBottom: 0, maxWidth: 460 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From Date</label>
              <input className="form-control" type="date" value={customFrom}
                onChange={e => setCustomFrom(e.target.value)} max={toInputDate(new Date())} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To Date</label>
              <input className="form-control" type="date" value={customTo}
                onChange={e => setCustomTo(e.target.value)} max={toInputDate(new Date())} />
            </div>
          </div>
        )}
      </div>

      {/* ── Summary stats ── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Bills',      value: summary.totalBills,                cls: 'blue',  icon: <MdReceipt /> },
          { label: 'Total Revenue',    value: PKR(summary.totalRevenue),         cls: 'blue',  icon: <MdTrendingUp /> },
          { label: 'Amount Collected', value: PKR(summary.totalCollected),       cls: 'green', icon: <MdAccountBalance /> },
          { label: 'Outstanding',      value: PKR(summary.totalOutstanding),     cls: 'red',   icon: <MdAccountBalance /> },
          { label: 'Total Discount',   value: PKR(summary.totalDiscount),        cls: 'yellow',icon: <MdTrendingUp /> },
          { label: 'Avg per Bill',     value: PKR(summary.totalBills ? summary.totalRevenue / summary.totalBills : 0), cls: 'purple', icon: <MdReceipt /> },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ fontSize: 18 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue vs Collected chart ── */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue vs Collected</div>
              <div className="text-muted text-sm">Daily breakdown for selected period</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `₨ ${v.toLocaleString()}`} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue"   name="Revenue"   stroke="var(--accent)"  strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="collected" name="Collected" stroke="var(--success)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment method breakdown */}
        <div className="card">
          <div className="card-header"><div className="card-title">Payment Method Breakdown</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={paymentMethodBreakdown.map(p => ({ name: p._id, value: p.amount }))}
                cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} fontSize={11}
              >
                {paymentMethodBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => `₨ ${v.toLocaleString()}`} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category-wise revenue */}
        <div className="card">
          <div className="card-header"><div className="card-title">Revenue by Category</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryBreakdown.map(c => ({ name: c._id, revenue: c.revenue }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `₨ ${v.toLocaleString()}`} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top medicines progress bars */}
        <div className="card">
          <div className="card-header"><div className="card-title">Top Selling Medicines</div></div>
          {topMedicines.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}><p>No sales in this period</p></div>
          ) : (
            topMedicines.slice(0, 6).map((m, i) => {
              const max = topMedicines[0]?.totalRevenue || 1;
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div className="flex-between text-sm" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{m._id}</span>
                    <span className="text-accent fw-bold">{PKR(m.totalRevenue)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(m.totalRevenue / max * 100).toFixed(0)}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Top Patients Table ── */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdPeople /> Top Patients by Spending
            </div>
            <div className="text-muted text-sm">Highest spenders in selected period</div>
          </div>
        </div>
        {topPatients.length === 0 ? (
          <div className="empty-state"><p>No patient billing data in this period</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Patient</th><th>Bills</th>
                  <th>Total Spent</th><th>Paid</th><th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {topPatients.map((p, i) => (
                  <tr key={p._id || i}>
                    <td><span className="badge badge-accent">#{i + 1}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.patientName}</td>
                    <td>{p.billCount}</td>
                    <td className="fw-bold">{PKR(p.totalSpent)}</td>
                    <td className="text-success fw-semibold">{PKR(p.totalPaid)}</td>
                    <td>
                      {p.outstanding > 0
                        ? <span className="badge badge-danger">{PKR(p.outstanding)}</span>
                        : <span className="badge badge-success">Cleared</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}