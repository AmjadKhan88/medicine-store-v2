import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  MdAdd, MdClose, MdDownload,
  MdEdit, MdDelete, MdBarChart, MdReceipt,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const fmtPKR  = n => `₨${Math.round(Number(n||0)).toLocaleString()}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const pct     = n => `${n > 0 ? '+' : ''}${n}%`;
const monthISO= () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; };
const yearNow = () => new Date().getFullYear();

const EXPENSE_CATEGORIES = [
  'Rent','Salaries','Utilities','Medicine Purchase','Equipment',
  'Maintenance','Marketing','Transport','Taxes & Fees',
  'Insurance','Office Supplies','Miscellaneous',
];

const CATEGORY_COLORS = {
  Rent:'#ef4444', Salaries:'#f97316', Utilities:'#f59e0b',
  'Medicine Purchase':'#10b981', Equipment:'#0ea5e9',
  Maintenance:'#6366f1', Marketing:'#8b5cf6', Transport:'#ec4899',
  'Taxes & Fees':'#14b8a6', Insurance:'#84cc16',
  'Office Supplies':'#64748b', Miscellaneous:'#94a3b8',
};

const PIE_COLORS = Object.values(CATEGORY_COLORS);

/* ════════════════════════════════
   ADD/EDIT EXPENSE MODAL
════════════════════════════════ */
function ExpenseModal({ existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:       existing?.title       || '',
    category:    existing?.category    || 'Rent',
    amount:      existing?.amount      || '',
    date:        existing?.date ? new Date(existing.date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    paymentMethod: existing?.paymentMethod || 'Cash',
    vendor:      existing?.vendor      || '',
    referenceNo: existing?.referenceNo || '',
    invoiceNo:   existing?.invoiceNo   || '',
    isGSTApplicable: existing?.isGSTApplicable || false,
    gstRate:     existing?.gstRate     || 18,
    ntn:         existing?.ntn         || '',
    isRecurring: existing?.isRecurring || false,
    recurringCycle: existing?.recurringCycle || 'Monthly',
    notes:       existing?.notes       || '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const chk = k => e => setForm(p => ({ ...p, [k]: e.target.checked }));

  const gstAmount = form.isGSTApplicable
    ? Math.round(Number(form.amount || 0) * (Number(form.gstRate) / 100))
    : 0;

  const handle = async () => {
    if (!form.title || !form.category || !form.amount || !form.date) {
      toast.error('Title, category, amount and date are required'); return;
    }
    setSaving(true);
    try {
      if (existing) {
        await API.put(`/accounting/expenses/${existing._id}`, form);
        toast.success('Expense updated');
      } else {
        await API.post('/accounting/expenses', form);
        toast.success(`${form.category} expense added — ${fmtPKR(form.amount)}`);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const QUICK_TITLES = {
    Rent: ['Monthly Rent','Annual Lease','Security Deposit'],
    Salaries: ['Pharmacist Salary','Receptionist Salary','Cleaner Salary','Monthly Payroll'],
    Utilities: ['Electricity Bill','Gas Bill','Water Bill','Internet Bill','Phone Bill'],
    'Medicine Purchase': ['Medicine Stock Purchase','Emergency Purchase'],
    Maintenance: ['AC Repair','Equipment Service','Refrigerator Repair','Pest Control'],
    Marketing: ['Facebook Ads','Pamphlets Printing','Banner Printing'],
    Transport: ['Delivery Charges','Medicine Transport','Fuel'],
    'Taxes & Fees': ['FBR Tax Payment','Drug License Fee','Professional Tax'],
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{existing ? 'Edit Expense' : 'Add Expense'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left */}
          <div>
            <div className="form-group">
              <label className="form-label required">Category</label>
              <select className="form-control" value={form.category} onChange={fld('category')}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required">Title / Description</label>
              <input className="form-control" value={form.title} onChange={fld('title')}
                placeholder="e.g. Monthly Rent — Main Street Branch" autoFocus
                list="expense-titles" />
              <datalist id="expense-titles">
                {(QUICK_TITLES[form.category] || []).map(t => <option key={t} value={t} />)}
              </datalist>
              {/* Quick fill */}
              {QUICK_TITLES[form.category]?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                  {QUICK_TITLES[form.category].slice(0,3).map(t => (
                    <button key={t} className="pill" style={{ fontSize: 10 }}
                      onClick={() => setForm(p => ({ ...p, title: t }))}>{t}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Amount (₨)</label>
                <input className="form-control" type="number" min="0" value={form.amount} onChange={fld('amount')} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label required">Date</label>
                <input className="form-control" type="date" value={form.date} onChange={fld('date')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={form.paymentMethod} onChange={fld('paymentMethod')}>
                  {['Cash','Bank Transfer','Cheque','JazzCash','EasyPaisa','Other'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vendor / Supplier</label>
                <input className="form-control" value={form.vendor} onChange={fld('vendor')} placeholder="Company name" />
              </div>
            </div>
          </div>

          {/* Right */}
          <div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Invoice No.</label>
                <input className="form-control" value={form.invoiceNo} onChange={fld('invoiceNo')} placeholder="INV-001" />
              </div>
              <div className="form-group">
                <label className="form-label">Reference / Cheque No.</label>
                <input className="form-control" value={form.referenceNo} onChange={fld('referenceNo')} />
              </div>
            </div>

            {/* GST */}
            <div className="form-group" style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={form.isGSTApplicable} onChange={chk('isGSTApplicable')} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>GST Applicable (FBR)</span>
              </label>
              {form.isGSTApplicable && (
                <>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>GST Rate %</label>
                      <select className="form-control" value={form.gstRate} onChange={fld('gstRate')}>
                        {[5, 8, 10, 13, 17, 18, 25].map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>Vendor NTN</label>
                      <input className="form-control" value={form.ntn} onChange={fld('ntn')} placeholder="NTN-XXXXXXX" />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                    GST Amount: {fmtPKR(gstAmount)}
                    &nbsp;· Total with GST: {fmtPKR(Number(form.amount || 0) + gstAmount)}
                  </div>
                </>
              )}
            </div>

            {/* Recurring */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.isRecurring} onChange={chk('isRecurring')} />
                <span style={{ fontWeight: 600 }}>Recurring expense</span>
              </label>
              {form.isRecurring && (
                <select className="form-control" style={{ marginTop: 8 }} value={form.recurringCycle} onChange={fld('recurringCycle')}>
                  {['Monthly','Quarterly','Yearly'].map(c => <option key={c}>{c}</option>)}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={fld('notes')} placeholder="Additional notes..." />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving || !form.title || !form.amount}>
            {saving ? 'Saving...' : existing ? 'Update' : `Add Expense — ${fmtPKR(form.amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   P&L SECTION
════════════════════════════════ */
function PnLSection({ period }) {
  const [pnl,     setPnL]     = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [y, m] = period.split('-');
      const { data } = await API.get('/accounting/pnl', { params: { year: y, month: m } });
      setPnL(data.pnl);
    } catch {}
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  const exportExcel = () => {
    if (!pnl) return;
    const wb = XLSX.utils.book_new();

    /* ── P&L Sheet ── */
    const pnlRows = [
      ['MediStore — Profit & Loss Statement'],
      [`Period: ${period}`],
      [''],
      ['REVENUE', '', ''],
      ['Gross Revenue', '', fmtPKR(pnl.grossRevenue)],
      ['Less: Discounts', '', fmtPKR(pnl.totalDiscount)],
      ['Net Revenue', '', fmtPKR(pnl.netRevenue)],
      [''],
      ['COST OF GOODS SOLD (COGS)', '', ''],
      ['Total COGS', '', fmtPKR(pnl.cogs)],
      [''],
      ['GROSS PROFIT', '', fmtPKR(pnl.grossProfit)],
      ['Gross Margin', '', `${pnl.grossMargin}%`],
      [''],
      ['OPERATING EXPENSES', '', ''],
      ...(pnl.expensesByCategory || []).map(e => [e._id, e.count + ' entries', fmtPKR(e.total)]),
      ['Total Expenses', '', fmtPKR(pnl.totalExpenses)],
      [''],
      ['NET PROFIT', '', fmtPKR(pnl.netProfit)],
      ['Net Margin', '', `${pnl.netMargin}%`],
      [''],
      ['PAYMENT COLLECTION', '', ''],
      ...(pnl.paymentBreakdown || []).map(p => [p._id, `${p.count} bills`, fmtPKR(p.amount)]),
      ['Total Collected', '', fmtPKR(pnl.totalCollected)],
      ['Outstanding', '', fmtPKR(pnl.outstanding)],
    ];

    const pnlSheet = XLSX.utils.aoa_to_sheet(pnlRows);
    pnlSheet['!cols'] = [{ width: 30 }, { width: 15 }, { width: 18 }];
    XLSX.utils.book_append_sheet(wb, pnlSheet, 'P&L Statement');

    /* ── Medicine Margins Sheet ── */
    if (pnl.topMedicinesByMargin?.length) {
      const medRows = [
        ['Medicine', 'Qty Sold', 'Revenue', 'Purchase Price', 'COGS', 'Gross Profit', 'Margin %'],
        ...pnl.topMedicinesByMargin.map(m => [
          m.medicineName, m.qtySold, m.revenue, m.purchasePrice,
          m.totalCOGS, m.grossProfit, `${m.margin}%`,
        ]),
      ];
      const medSheet = XLSX.utils.aoa_to_sheet(medRows);
      medSheet['!cols'] = Array(7).fill({ width: 16 });
      XLSX.utils.book_append_sheet(wb, medSheet, 'Medicine Margins');
    }

    XLSX.writeFile(wb, `MediStore_PnL_${period}.xlsx`);
    toast.success('Excel exported!');
  };

  if (loading) return <div className="flex-center" style={{ height: 200 }}><ShortLoader/></div>;
  if (!pnl)    return null;

  const rows = [
    { label: 'Gross Revenue',     value: pnl.grossRevenue,   color: '#0ea5e9', bold: false },
    { label: 'Less: Discounts',   value: -pnl.totalDiscount, color: '#f59e0b', bold: false, negative: true },
    { label: 'Net Revenue',       value: pnl.netRevenue,     color: '#0ea5e9', bold: true,  divider: true },
    { label: 'Cost of Goods Sold',value: -pnl.cogs,          color: '#ef4444', bold: false, negative: true },
    { label: `Gross Profit (${pnl.grossMargin}%)`, value: pnl.grossProfit, color: '#10b981', bold: true, divider: true },
    { label: 'Operating Expenses',value: -pnl.totalExpenses, color: '#f97316', bold: false, negative: true },
    { label: `Net Profit (${pnl.netMargin}%)`,      value: pnl.netProfit,   color: pnl.netProfit >= 0 ? '#16a34a' : '#ef4444', bold: true, divider: true, big: true },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Profit & Loss Statement</div>
        <button className="btn btn-secondary" onClick={exportExcel}>
          <MdDownload /> Export Excel
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* P&L Waterfall */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Income Statement</div>
          {rows.map((r, i) => (
            <div key={i}>
              {r.divider && <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: r.big ? '10px 0' : '6px 0',
                background: r.big ? (pnl.netProfit >= 0 ? '#f0fdf4' : '#fff5f5') : 'transparent',
                borderRadius: r.big ? 8 : 0,
                paddingLeft: r.big ? 8 : 0,
              }}>
                <span style={{ fontSize: r.big ? 15 : 13, fontWeight: r.bold ? 700 : 400, color: r.big ? r.color : 'var(--text-primary)' }}>
                  {r.label}
                </span>
                <span style={{
                  fontSize: r.big ? 18 : 14,
                  fontWeight: r.bold ? 800 : 500,
                  color: r.color,
                }}>
                  {r.negative ? `(${fmtPKR(Math.abs(r.value))})` : fmtPKR(r.value)}
                </span>
              </div>
            </div>
          ))}

          {/* Payment collection */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Payment Collection</div>
            {(pnl.paymentBreakdown || []).map(p => (
              <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                <span className="text-muted">{p._id} ({p.count} bills)</span>
                <span style={{ fontWeight: 600 }}>{fmtPKR(p.amount)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: '#ef4444', fontWeight: 700 }}>
              <span>Outstanding</span>
              <span>{fmtPKR(pnl.outstanding)}</span>
            </div>
          </div>
        </div>

        {/* Expenses pie */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Expenses by Category</div>
          {pnl.expensesByCategory?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pnl.expensesByCategory} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label={({ _id, percent }) => `${_id} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {pnl.expensesByCategory.map((e, i) => (
                      <Cell key={e._id} fill={CATEGORY_COLORS[e._id] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtPKR(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pnl.expensesByCategory.map(e => (
                  <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: CATEGORY_COLORS[e._id] || '#64748b', flexShrink: 0 }} />
                      <span>{e._id} ({e.count})</span>
                    </div>
                    <span style={{ fontWeight: 700 }}>{fmtPKR(e.total)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, padding: '6px 0', fontSize: 13 }}>
                  <span>Total Expenses</span>
                  <span style={{ color: '#ef4444' }}>{fmtPKR(pnl.totalExpenses)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '40px 0' }}>No expenses recorded this period</div>
          )}
        </div>

        {/* Top medicines by gross profit */}
        <div className="card" style={{ gridColumn: '1/-1' }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Top Medicines by Gross Profit</div>
          {!pnl.topMedicinesByMargin?.length ? (
            <div className="text-muted text-sm">No sales data</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Medicine</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                    <th>Purchase Price</th>
                    <th>COGS</th>
                    <th>Gross Profit</th>
                    <th>Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {pnl.topMedicinesByMargin.map((m, i) => (
                    <tr key={m.medicineId || i}>
                      <td className="text-muted">{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{m.medicineName}</td>
                      <td>{m.qtySold}</td>
                      <td style={{ fontWeight: 600 }}>{fmtPKR(m.revenue)}</td>
                      <td className="text-muted">{fmtPKR(m.purchasePrice)}/unit</td>
                      <td className="text-muted">{fmtPKR(m.totalCOGS)}</td>
                      <td style={{ fontWeight: 700, color: m.grossProfit > 0 ? '#10b981' : '#ef4444' }}>{fmtPKR(m.grossProfit)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99, maxWidth: 60 }}>
                            <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, m.margin))}%`, background: m.margin > 30 ? '#10b981' : m.margin > 15 ? '#f59e0b' : '#ef4444', borderRadius: 99 }} />
                          </div>
                          <span style={{ color: m.margin > 30 ? '#10b981' : m.margin > 15 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{m.margin}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   FBR TAX SECTION
════════════════════════════════ */
function FBRSection({ period }) {
  const [fbr,     setFBR]     = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [y, m] = period.split('-');
      const { data } = await API.get('/accounting/fbr', { params: { year: y, month: m } });
      setFBR(data.fbr);
    } catch {}
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  const exportFBR = () => {
    if (!fbr) return;
    const wb = XLSX.utils.book_new();
    const rows = [
      ['MediStore — FBR GST Summary'],
      [`Period: ${period}`],
      ['Generated:', new Date().toLocaleDateString()],
      [''],
      ['GST COMPUTATION', ''],
      ['Output Tax (GST Collected from Customers)', fmtPKR(fbr.outputTax)],
      ['Input Tax (GST Paid to Vendors)', fmtPKR(fbr.inputTax)],
      ['Net Tax Payable to FBR', fmtPKR(fbr.netTaxPayable)],
      [''],
      ['SALES SUMMARY', ''],
      ['Total Revenue (Taxable Sales)', fmtPKR(fbr.totalRevenue)],
      ['Total Bills', fbr.billCount],
      ['Standard GST Rate', `${fbr.stdGSTRate}%`],
      [''],
      ['PURCHASE SUMMARY (WITH GST)', ''],
      ['Total GST-applicable Purchases', fmtPKR(fbr.expenseWithGST)],
      ['Number of Tax Invoices', fbr.gstInvoiceCount],
      [''],
      ['VENDOR-WISE GST (Input Tax Detail)', ''],
      ['Vendor', 'NTN', 'Invoices', 'GST Amount'],
      ...(fbr.gstByVendor || []).map(v => [v._id || 'Unknown', v.ntn || '—', v.invoices, fmtPKR(v.totalGST)]),
      [''],
      ['DISCLAIMER'],
      [fbr.note],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [{ width: 40 }, { width: 20 }, { width: 12 }, { width: 16 }];
    XLSX.utils.book_append_sheet(wb, sheet, 'FBR GST Summary');
    XLSX.writeFile(wb, `MediStore_FBR_GST_${period}.xlsx`);
    toast.success('FBR summary exported!');
  };

  if (loading) return <div className="flex-center" style={{ height: 150 }}><ShortLoader/></div>;
  if (!fbr)    return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>FBR Tax Summary — {period}</div>
          <div className="text-muted text-sm">Pakistan Federal Board of Revenue — GST Computation</div>
        </div>
        <button className="btn btn-secondary" onClick={exportFBR}><MdDownload /> Export for FBR</button>
      </div>

      {/* Key numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Output Tax (Collected)', value: fmtPKR(fbr.outputTax), sub: 'GST charged to customers', color: '#0ea5e9' },
          { label: 'Input Tax (Paid)',        value: fmtPKR(fbr.inputTax),  sub: 'GST paid to vendors',      color: '#10b981' },
          { label: fbr.netTaxPayable > 0 ? 'Net Tax Payable to FBR' : 'Excess Credit',
            value: fmtPKR(fbr.netTaxPayable > 0 ? fbr.netTaxPayable : fbr.excessCredit),
            sub:   fbr.netTaxPayable > 0 ? 'Due to FBR this period' : 'Carry forward credit',
            color: fbr.netTaxPayable > 0 ? '#ef4444' : '#16a34a',
          },
        ].map(s => (
          <div key={s.label} style={{ background: s.color+'10', border: `1px solid ${s.color}30`, borderRadius: 14, padding: '18px 20px' }}>
            <div className="text-muted text-sm" style={{ marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Sales summary */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Sales Summary</div>
          {[
            ['Total Revenue (Taxable)', fmtPKR(fbr.totalRevenue)],
            ['Total Bills Issued',      fbr.billCount],
            ['Standard GST Rate',       `${fbr.stdGSTRate}%`],
            ['Output Tax',              fmtPKR(fbr.outputTax)],
          ].map(([k,v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
              <span className="text-muted">{k}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Purchase summary */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Purchase Summary (GST Input)</div>
          {[
            ['GST-applicable Purchases', fmtPKR(fbr.expenseWithGST)],
            ['Tax Invoices Received',    fbr.gstInvoiceCount],
            ['Input Tax Claimed',        fmtPKR(fbr.inputTax)],
          ].map(([k,v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
              <span className="text-muted">{k}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}

          {/* Vendor breakdown */}
          {fbr.gstByVendor?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>By Vendor</div>
              {fbr.gstByVendor.map(v => (
                <div key={v._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                  <span>{v._id || 'Unknown'}{v.ntn ? ` (${v.ntn})` : ''}</span>
                  <span style={{ fontWeight: 600 }}>{fmtPKR(v.totalGST)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
        ⚠️ {fbr.note}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function Accounting() {
  const [activeTab, setActiveTab]   = useState('pnl');
  const [period,    setPeriod]      = useState(monthISO());
  const [year,      setYear]        = useState(String(yearNow()));
  const [expenses,  setExpenses]    = useState([]);
  const [expTotal,  setExpTotal]    = useState(0);
  const [catTotals, setCatTotals]   = useState([]);
  const [totalExp,  setTotalExp]    = useState(0);
  const [expPages,  setExpPages]    = useState(1);
  const [expPage,   setExpPage]     = useState(1);
  const [expLoading,setExpLoading]  = useState(false);
  const [margins,   setMargins]     = useState([]);
  const [trend,     setTrend]       = useState([]);
  const [stats,     setStats]       = useState({});
  const [expModal,  setExpModal]    = useState(null);  // null | 'new' | existing
  const [catFilter, setCatFilter]   = useState('');

  const fetchExpenses = useCallback(async () => {
    setExpLoading(true);
    try {
      const [y, m] = period.split('-');
      const { data } = await API.get('/accounting/expenses', {
        params: { year: y, month: m, category: catFilter || undefined, page: expPage, limit: 25 },
      });
      setExpenses(data.expenses);
      setExpTotal(data.total);
      setExpPages(data.totalPages);
      setCatTotals(data.categoryTotals);
      setTotalExp(data.totalExpenses);
    } catch {}
    finally { setExpLoading(false); }
  }, [period, catFilter, expPage]);

  const fetchMargins = useCallback(async () => {
    const [y, m] = period.split('-');
    API.get('/accounting/margins', { params: { year: y, month: m } })
      .then(({ data }) => setMargins(data.medicines))
      .catch(() => {});
  }, [period]);

  const fetchTrend = useCallback(async () => {
    API.get('/accounting/trend', { params: { year } })
      .then(({ data }) => setTrend(data.trend))
      .catch(() => {});
  }, [year]);

  const fetchStats = useCallback(() => {
    API.get('/accounting/stats').then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);

  useEffect(() => { fetchStats(); fetchTrend(); }, [fetchStats, fetchTrend]);
  useEffect(() => { fetchExpenses(); fetchMargins(); }, [fetchExpenses, fetchMargins]);
  useEffect(() => { setExpPage(1); }, [period, catFilter]);

  const handleDeleteExpense = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await API.delete(`/accounting/expenses/${id}`);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const exportExpensesExcel = () => {
    const wb   = XLSX.utils.book_new();
    const rows = [
      ['Date','Category','Title','Vendor','Amount (₨)','Payment Method','Invoice No.','GST','Notes'],
      ...expenses.map(e => [
        fmtDate(e.date), e.category, e.title, e.vendor || '—',
        e.amount, e.paymentMethod, e.invoiceNo || '—',
        e.isGSTApplicable ? `${e.gstRate}% = ₨${e.gstAmount}` : 'N/A',
        e.notes || '',
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [12,14,25,18,12,14,14,16,20].map(w => ({ width: w }));
    XLSX.utils.book_append_sheet(wb, sheet, 'Expenses');
    XLSX.writeFile(wb, `MediStore_Expenses_${period}.xlsx`);
    toast.success('Expenses exported!');
  };

  const TABS = [
    { id: 'pnl',      label: 'P&L Statement'   },
    { id: 'expenses', label: 'Expenses'         },
    { id: 'margins',  label: 'Medicine Margins' },
    { id: 'trend',    label: 'Yearly Trend'     },
    { id: 'fbr',      label: '🇵🇰 FBR / Tax'   },
  ];

  const { thisMonth = {}, lastMonth = {}, changes = {} } = stats;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Accounting & Finance</h1>
          <p>Profit & Loss · Expenses · Medicine Margins · FBR Tax</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeTab !== 'trend' ? (
            <input type="month" className="form-control" style={{ width: 160 }}
              value={period} onChange={e => setPeriod(e.target.value)} />
          ) : (
            <select className="form-control" style={{ width: 120 }} value={year} onChange={e => setYear(e.target.value)}>
              {[0,1,2,3].map(i => <option key={i}>{yearNow() - i}</option>)}
            </select>
          )}
          <button className="btn btn-primary" onClick={() => setExpModal('new')}>
            <MdAdd /> Add Expense
          </button>
        </div>
      </div>

      {/* Stats row */}
      {thisMonth.revenue != null && (
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'This Month Revenue', value: fmtPKR(thisMonth.revenue),  change: changes.revenue,  color: '#0ea5e9', icon: '💰' },
            { label: 'This Month Expenses',value: fmtPKR(thisMonth.expenses), change: changes.expenses, color: '#ef4444', icon: '💸', invert: true },
            { label: 'This Month Profit',  value: fmtPKR(thisMonth.profit),   change: changes.profit,   color: thisMonth.profit >= 0 ? '#10b981' : '#ef4444', icon: '📈' },
            { label: 'Collected',          value: fmtPKR(thisMonth.collected),change: null,              color: '#8b5cf6', icon: '💳' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.color+'20', fontSize: 20 }}>{s.icon}</div>
              <div>
                <div className="stat-value" style={{ color: s.color, fontSize: 18 }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
                {s.change != null && (
                  <div style={{ fontSize: 11, marginTop: 2, color: ((s.invert ? -1 : 1) * s.change) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {s.change > 0 ? '↑' : '↓'} {Math.abs(s.change)}% vs last month
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── P&L TAB ── */}
      {activeTab === 'pnl' && <PnLSection period={period} />}

      {/* ── EXPENSES TAB ── */}
      {activeTab === 'expenses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Expenses — {period} — {fmtPKR(totalExp)}
              </div>
              <div className="text-muted text-sm">{expTotal} entries</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={exportExpensesExcel}><MdDownload /> Export</button>
              <button className="btn btn-primary" onClick={() => setExpModal('new')}><MdAdd /> Add</button>
            </div>
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <button className={`pill${catFilter === '' ? ' active' : ''}`} onClick={() => setCatFilter('')}>
              All ({fmtPKR(totalExp)})
            </button>
            {catTotals.map(c => (
              <button key={c._id} className={`pill${catFilter === c._id ? ' active' : ''}`}
                onClick={() => setCatFilter(catFilter === c._id ? '' : c._id)}
                style={{ fontSize: 11, borderColor: CATEGORY_COLORS[c._id] }}>
                {c._id}: {fmtPKR(c.total)}
              </button>
            ))}
          </div>

          {expLoading ? (
            <div className="flex-center" style={{ height: 150 }}><ShortLoader/></div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <MdReceipt size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>No expenses recorded</h3>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setExpModal('new')}>
                <MdAdd /> Add First Expense
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Title</th>
                    <th>Vendor</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>GST</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e._id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                      <td>
                        <span style={{ background: CATEGORY_COLORS[e.category]+'20', color: CATEGORY_COLORS[e.category], padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                          {e.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{e.title}</div>
                        {e.notes && <div className="text-muted" style={{ fontSize: 11 }}>{e.notes.slice(0, 60)}</div>}
                      </td>
                      <td className="text-muted">{e.vendor || '—'}</td>
                      <td className="text-muted" style={{ fontSize: 12 }}>{e.paymentMethod}</td>
                      <td style={{ fontWeight: 700 }}>{fmtPKR(e.amount)}</td>
                      <td style={{ fontSize: 12, color: e.isGSTApplicable ? '#0ea5e9' : 'var(--text-muted)' }}>
                        {e.isGSTApplicable ? fmtPKR(e.gstAmount) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setExpModal(e)}><MdEdit size={13} /></button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeleteExpense(e._id, e.title)}>
                            <MdDelete size={13} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {expPages > 1 && (
            <div className="pagination" style={{ marginTop: 12 }}>
              <button disabled={expPage === 1} onClick={() => setExpPage(p => p - 1)}>‹</button>
              {Array.from({ length: expPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={expPage === p ? 'active' : ''} onClick={() => setExpPage(p)}>{p}</button>
              ))}
              <button disabled={expPage === expPages} onClick={() => setExpPage(p => p + 1)}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ── MEDICINE MARGINS TAB ── */}
      {activeTab === 'margins' && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            Medicine Margin Analysis — {period}
          </div>
          {margins.length === 0 ? (
            <div className="empty-state"><MdBarChart size={48} style={{ opacity:0.3, marginBottom:12 }} /><h3>No sales data for this period</h3></div>
          ) : (
            <>
              {/* Bar chart — top 10 */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Top 10 by Revenue</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={margins.slice(0, 10)} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="medicineName" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v, n) => [fmtPKR(v), n]} />
                    <Legend />
                    <Bar dataKey="revenue"     name="Revenue"     fill="#0ea5e9" radius={[4,4,0,0]} />
                    <Bar dataKey="totalCOGS"   name="COGS"        fill="#ef4444" radius={[4,4,0,0]} />
                    <Bar dataKey="grossProfit" name="Gross Profit" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>#</th><th>Medicine</th><th>Category</th>
                      <th>Qty Sold</th><th>Revenue</th><th>Avg Sale Price</th>
                      <th>Purch. Price</th><th>COGS</th><th>Gross Profit</th><th>Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {margins.map((m, i) => (
                      <tr key={m.medicineId || i}>
                        <td className="text-muted">{i+1}</td>
                        <td style={{ fontWeight:600 }}>{m.medicineName}</td>
                        <td className="text-muted">{m.category}</td>
                        <td>{m.qtySold}</td>
                        <td style={{ fontWeight:600 }}>{fmtPKR(m.revenue)}</td>
                        <td>{fmtPKR(m.avgSalePrice)}</td>
                        <td className="text-muted">{fmtPKR(m.purchasePrice)}</td>
                        <td className="text-muted">{fmtPKR(m.totalCOGS)}</td>
                        <td style={{ fontWeight:700, color: m.grossProfit >= 0 ? '#10b981' : '#ef4444' }}>{fmtPKR(m.grossProfit)}</td>
                        <td>
                          <span style={{ background: m.margin > 30 ? '#d1fae5' : m.margin > 15 ? '#fef3c7' : '#fee2e2', color: m.margin > 30 ? '#10b981' : m.margin > 15 ? '#f59e0b' : '#ef4444', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                            {m.margin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TREND TAB ── */}
      {activeTab === 'trend' && (
        <div>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Yearly Trend — {year}</div>
          {trend.length === 0 ? (
            <div className="text-muted text-sm">No data</div>
          ) : (
            <>
              <div className="card" style={{ marginBottom:16 }}>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trend} margin={{ top:5, right:20, left:10, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize:11 }} />
                    <YAxis tick={{ fontSize:10 }} />
                    <Tooltip formatter={(v,n) => [fmtPKR(v),n]} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue"  name="Revenue"  stroke="#0ea5e9" strokeWidth={2} dot={{ r:3 }} />
                    <Line type="monotone" dataKey="collected"name="Collected" stroke="#8b5cf6" strokeWidth={2} dot={{ r:3 }} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r:3 }} />
                    <Line type="monotone" dataKey="profit"   name="Profit"   stroke="#10b981" strokeWidth={3} dot={{ r:4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly table */}
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <table className="table" style={{ fontSize:12 }}>
                  <thead>
                    <tr><th>Month</th><th>Revenue</th><th>Collected</th><th>Expenses</th><th>Profit</th><th>Bills</th><th>Margin</th></tr>
                  </thead>
                  <tbody>
                    {trend.map(t => {
                      const margin = t.revenue > 0 ? Math.round((t.profit/t.revenue)*100) : 0;
                      return (
                        <tr key={t.month}>
                          <td style={{ fontWeight:600 }}>{t.month}</td>
                          <td>{fmtPKR(t.revenue)}</td>
                          <td>{fmtPKR(t.collected)}</td>
                          <td style={{ color:'#ef4444' }}>{fmtPKR(t.expenses)}</td>
                          <td style={{ fontWeight:700, color: t.profit >= 0 ? '#10b981' : '#ef4444' }}>{fmtPKR(t.profit)}</td>
                          <td>{t.bills}</td>
                          <td><span style={{ color: margin > 20 ? '#10b981' : margin > 0 ? '#f59e0b' : '#ef4444', fontWeight:700 }}>{margin}%</span></td>
                        </tr>
                      );
                    })}
                    {/* Totals */}
                    <tr style={{ fontWeight:800, background:'var(--bg-tertiary)' }}>
                      <td>TOTAL</td>
                      <td>{fmtPKR(trend.reduce((s,t)=>s+t.revenue,0))}</td>
                      <td>{fmtPKR(trend.reduce((s,t)=>s+t.collected,0))}</td>
                      <td style={{ color:'#ef4444' }}>{fmtPKR(trend.reduce((s,t)=>s+t.expenses,0))}</td>
                      <td style={{ color:'#10b981' }}>{fmtPKR(trend.reduce((s,t)=>s+t.profit,0))}</td>
                      <td>{trend.reduce((s,t)=>s+t.bills,0)}</td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FBR TAB ── */}
      {activeTab === 'fbr' && <FBRSection period={period} />}

      {/* Expense modal */}
      {expModal && (
        <ExpenseModal
          existing={expModal !== 'new' ? expModal : null}
          onClose={() => setExpModal(null)}
          onSaved={() => { setExpModal(null); fetchExpenses(); fetchStats(); }}
        />
      )}
    </div>
  );
}