import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import API from '../utils/api';

const COLORS = ['#0ea5e9','#10b981','#f59e0b','#ef4444','#6366f1','#ec4899'];
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Reports() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/dashboard').then(({ data }) => { setDashboard(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-center" style={{ height:300 }}><div className="text-muted">Loading reports...</div></div>;
  if (!dashboard) return null;

  const { stats, monthlyRevenue = [], topMedicines = [], categoryDist = [] } = dashboard;
  const fmtPKR = (n) => `₨ ${Number(n||0).toLocaleString()}`;

  const chartData = monthlyRevenue.map(m => ({ name: months[m._id.month-1], revenue: m.revenue, bills: m.count }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Reports & Analytics</h1><p>Business insights and performance metrics</p></div>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Today Revenue', value: fmtPKR(stats.todaySales?.total), sub: `${stats.todaySales?.count} bills` },
          { label: 'Month Revenue', value: fmtPKR(stats.monthlySales?.total), sub: `${stats.monthlySales?.count} bills` },
          { label: 'Month Collected', value: fmtPKR(stats.monthlySales?.paid), sub: 'Received payments' },
          { label: 'Outstanding', value: fmtPKR(stats.totalOutstanding), sub: `${stats.pendingBills} pending` },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${['blue','green','green','red'][i]}`}>📊</div>
            <div><div className="stat-value" style={{ fontSize:18 }}>{s.value}</div><div className="stat-label">{s.label}</div><div className="stat-sub">{s.sub}</div></div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><div className="card-title">Revenue Trend</div><div className="text-muted text-sm">Monthly</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:12, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v=>`₨${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v=>[`₨ ${v.toLocaleString()}`,'Revenue']} contentStyle={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:8, fontSize:13 }} />
              <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill:'var(--accent)', r:4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Bills per Month</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:12, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:8, fontSize:13 }} />
              <Bar dataKey="bills" fill="var(--success)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Category Distribution</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryDist.map(c=>({name:c._id,value:c.count}))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {categoryDist.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:8, fontSize:13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Top Medicines by Revenue</div></div>
          {topMedicines.length === 0 ? <div className="empty-state" style={{ padding:40 }}><p>No sales data yet</p></div> : (
            topMedicines.map((m, i) => {
              const max = topMedicines[0]?.totalRevenue || 1;
              return (
                <div key={i} style={{ marginBottom:12 }}>
                  <div className="flex-between text-sm" style={{ marginBottom:4 }}><span style={{ fontWeight:600 }}>{m._id}</span><span className="text-accent fw-bold">₨ {m.totalRevenue?.toLocaleString()}</span></div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width:`${(m.totalRevenue/max*100).toFixed(0)}%`, background:COLORS[i] }} /></div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
