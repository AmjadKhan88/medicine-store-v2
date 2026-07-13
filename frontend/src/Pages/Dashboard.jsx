import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdMedicalServices, MdPeople, MdWarning, MdTrendingUp, MdAccountBalance, MdInventory, MdReceipt, MdArrowForward } from 'react-icons/md';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import API from '../utils/api';
import { useSocketEvent } from '../hooks/useSocketEvent';
import {useWindowWidth} from '../hooks/useWindowWidth';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveStats, setLiveStats] = useState({});
  const navigate = useNavigate();
  const width = useWindowWidth();

  useEffect(() => {
    API.get('/dashboard').then(({ data }) => { setData(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // socket listener for dashboard updates:
  useSocketEvent('dashboard:update', (data) => {
    setLiveStats(prev => ({ ...prev, ...data }));
  }, []);

  // socket listener for live bill feed:
  const [recentBills, setRecentBills] = useState([]);
  useSocketEvent('bill:created', (bill) => {
    setRecentBills(prev => [bill, ...prev.slice(0, 4)]);
  }, []);

  //socket listener for stock updates in the dashboard:
  useSocketEvent('stock:low', (med) => {
    // If dashboard shows low stock count, increment it
    setLiveStats(prev => ({ ...prev, lowStockCount: (prev.lowStockCount || 0) + 1 }));
  }, []);

  
  // Example: Instead of showing stats.todayRevenue, show liveStats.todayRevenue ?? stats.todayRevenue
  // Add a helper:
  const getStat = (key, fetchedValue) => liveStats[key] ?? fetchedValue;

 

  if (loading) return <div className="flex-center" style={{ height: 300 }}><div className="text-muted">Loading dashboard...</div></div>;
  if (!data) return null;

  const { stats, monthlyRevenue = [], topMedicines = [], categoryDist = [] } = data;

  const chartData = monthlyRevenue.map(m => ({
    name: months[(m._id.month - 1)],
    revenue: m.revenue,
    count: m.count,
  }));

  const fmtPKR = (n) => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;

  const statCards = [
    { label: 'Total Medicines', value: stats.totalMedicines, icon: <MdMedicalServices />, cls: 'blue', sub: `${stats.lowStockMedicines} low stock`, link: '/app/medicines' },
    { label: 'Total Patients', value: stats.totalPatients, icon: <MdPeople />, cls: 'green', sub: 'Registered patients', link: '/app/patients' },
    { label: 'Expired Medicines', value: stats.expiredMedicines, icon: <MdWarning />, cls: 'red', sub: `${stats.expiringSoon} expiring soon`, link: '/app/expiry-alerts' },
    { label: "Today's Revenue", value: fmtPKR(stats.todaySales?.total), icon: <MdTrendingUp />, cls: 'blue', sub: `${stats.todaySales?.count || 0} bills today`, link: '/app/billing' },
    { label: 'Monthly Revenue', value: fmtPKR(stats.monthlySales?.total), icon: <MdBarChart2 />, cls: 'green', sub: `${stats.monthlySales?.count || 0} bills this month`, link: '/app/reports' },
    { label: 'Pending Balance', value: fmtPKR(stats.totalOutstanding), icon: <MdAccountBalance />, cls: 'yellow', sub: `${stats.pendingBills} pending bills`, link: '/app/patient-balance' },
    { label: 'Low Stock Items', value: stats.lowStockMedicines, icon: <MdInventory />, cls: 'red', sub: 'Need restocking', link: '/app/medicines?status=lowstock' },
    { label: 'Pending Bills', value: stats.pendingBills, icon: <MdReceipt />, cls: 'yellow', sub: 'Awaiting payment', link: '/app/billing?status=Pending' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{fontSize: width < 460 ? 13 : 16}}>Dashboard</h1>
          <p style={{fontSize: width < 460 ? 10 : 13}}>Overview of your medicine store operations</p>
        </div>
        <button className="btn btn-primary" style={{fontSize: width < 460 ? 10 : 14}} onClick={() => navigate('/app/billing/create')}>
          <MdReceipt /> New Invoice
        </button>
      </div>

      {(stats.expiredMedicines > 0 || stats.expiringSoon > 0) && (
        <div className={`alert ${stats.expiredMedicines > 0 ? 'alert-danger' : 'alert-warning'}`} style={{ cursor: 'pointer' }} onClick={() => navigate('/app/expiry-alerts')}>
          <MdWarning size={width < 460 ? 15 :20} />
          <div className="alert-text" style={{fontSize: width < 460 ? 11 : ''}}>
            <strong>{stats.expiredMedicines > 0 ? `${stats.expiredMedicines} expired medicines!` : `${stats.expiringSoon} medicines expiring soon!`}</strong>
            Click to review and take action immediately.
          </div>
          <MdArrowForward />
        </div>
      )}

      <div className="stat-grid" style={{padding: width < 460 ? 10 : 20}}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate(s.link)}>
            <div className={`stat-icon ${s.cls}`} >{s.icon}</div>
            <div>
              <div className="stat-value" style={{fontSize: width < 460 ? 14 : ''}}>{s.value}</div>
              <div className="stat-label" style={{fontSize: width < 460 ? 11 : ''}}>{s.label}</div>
              <div className="stat-sub" style={{fontSize: width < 460 ? 11 : ''}}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Monthly Revenue</div><div className="text-muted text-sm">Last 6 months</div></div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₨${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`₨ ${v.toLocaleString()}`, 'Revenue']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Medicine Categories</div><div className="text-muted text-sm">Distribution by type</div></div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryDist.map(c => ({ name: c._id, value: c.count }))} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {categoryDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">Top Selling Medicines</div>
        </div>
        {topMedicines.length === 0 ? (
          <div className="empty-state"><p>No sales data yet</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>#</th><th>Medicine</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
              <tbody>
                {topMedicines.map((m, i) => (
                  <tr key={i}>
                    <td><span className="badge badge-accent">#{i + 1}</span></td>
                    <td><strong>{m._id}</strong></td>
                    <td>{m.totalQty} units</td>
                    <td className="text-success fw-bold">₨ {m.totalRevenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {recentBills.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
                animation: 'socketPulse 2s ease-out infinite',
              }} />
              Live Activity
            </div>
          </div>
          {recentBills.map((bill, i) => (
            <div key={bill._id || i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13,
              animation: i === 0 ? 'slideInLeft 0.3s ease' : 'none',
            }}>
              <div>
                <span style={{ fontWeight: 700 }}>{bill.billNumber}</span>
                <span className="text-muted" style={{ marginLeft: 8 }}>{bill.patientName}</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                ₨{bill.totalAmount?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <style>{`
          @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes socketPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
          }
        `}
      </style>

    </div>
  );
}

function MdBarChart2({ size = 20 }) {
  return <MdTrendingUp size={size} />;
}