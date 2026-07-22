import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MdAdd, MdClose, MdEdit, MdCheck, MdDelete,
   MdPerson, MdPrint, MdWhatsapp,
   MdAttachMoney,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

/* ── helpers ── */
const fmtPKR  = n => `₨${Math.round(Number(n || 0)).toLocaleString()}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const monthISO= () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; };
const yearNow = () => new Date().getFullYear();

const MONTHS_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ALLOWANCE_TYPES = ['House Rent Allowance','Medical Allowance','Transport Allowance','Food Allowance','Utility Allowance','Children Education','Special Allowance','Performance Bonus','Other'];

const STATUS_CFG = {
  Draft:     { bg: '#f3f4f6', color: '#6b7280' },
  Processed: { bg: '#dbeafe', color: '#3b82f6' },
  Paid:      { bg: '#d1fae5', color: '#10b981' },
};

/* ════════════════════════════════
   PAYSLIP PRINT COMPONENT
════════════════════════════════ */
function Payslip({ record, storeName, onClose }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `*Payslip — ${record.employeeName}*\n` +
      `Month: ${MONTHS_NAMES[record.month - 1]} ${record.year}\n` +
      `Basic Salary: ${fmtPKR(record.basicSalary)}\n` +
      `Gross Salary: ${fmtPKR(record.grossSalary)}\n` +
      `Deductions: ${fmtPKR(record.totalDeductions)}\n` +
      `*Net Salary: ${fmtPKR(record.netSalary)}*\n` +
      `Status: ${record.status}\n\n` +
      `— ${storeName || 'MediStore'}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener');
  };

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="modal-header no-print">
            <div className="modal-title">Payslip Preview</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={handleWhatsApp}>
                <MdWhatsapp size={16} style={{ color: '#25d366' }} /> WhatsApp
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <MdPrint /> Print
              </button>
              <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
            </div>
          </div>

          {/* Payslip content */}
          <div ref={printRef} id="payslip-content" style={{ padding: '24px 28px', fontFamily: 'sans-serif' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{storeName || 'MediStore'}</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Salary Payslip</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                {MONTHS_NAMES[record.month - 1]} {record.year}
              </div>
            </div>

            {/* Employee info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 16, fontSize: 13 }}>
              {[
                ['Employee Name', record.employeeName],
                ['Designation',   record.designation || '—'],
                ['Employee Code', record.employeeCode || '—'],
                ['Days Worked',   `${record.daysWorked} / ${record.workingDaysInMonth}`],
                ['Days Absent',   record.daysAbsent || 0],
                ['Payment Method',record.paymentMethod || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                  <span style={{ color: '#555' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Earnings & Deductions table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Earnings */}
              <div>
                <div style={{ fontWeight: 800, background: '#1e3a5f', color: '#fff', padding: '6px 10px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  Earnings
                </div>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee' }}>Basic Salary</td>
                      <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 600 }}>{fmtPKR(record.basicSalary)}</td>
                    </tr>
                    {(record.allowances || []).map((a, i) => (
                      <tr key={i}>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', color: '#555' }}>{a.type}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmtPKR(a.amount)}</td>
                      </tr>
                    ))}
                    {record.overtimePay > 0 && (
                      <tr>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', color: '#555' }}>Overtime ({record.overtime}h)</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmtPKR(record.overtimePay)}</td>
                      </tr>
                    )}
                    {record.bonuses > 0 && (
                      <tr>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', color: '#555' }}>Bonus{record.bonusNote ? ` (${record.bonusNote})` : ''}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmtPKR(record.bonuses)}</td>
                      </tr>
                    )}
                    <tr style={{ background: '#f0f9ff' }}>
                      <td style={{ padding: '6px', fontWeight: 800 }}>Gross Salary</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 800 }}>{fmtPKR(record.grossSalary)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions */}
              <div>
                <div style={{ fontWeight: 800, background: '#7f1d1d', color: '#fff', padding: '6px 10px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  Deductions
                </div>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <tbody>
                    {record.absenceDeduction > 0 && (
                      <tr>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', color: '#555' }}>Absence ({record.daysAbsent} days)</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmtPKR(record.absenceDeduction)}</td>
                      </tr>
                    )}
                    {record.eobiDeduction > 0 && (
                      <tr>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', color: '#555' }}>EOBI (Employee)</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmtPKR(record.eobiDeduction)}</td>
                      </tr>
                    )}
                    {record.incomeTax > 0 && (
                      <tr>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', color: '#555' }}>Income Tax</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmtPKR(record.incomeTax)}</td>
                      </tr>
                    )}
                    {record.advanceDeducted > 0 && (
                      <tr>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', color: '#555' }}>Advance Recovery</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmtPKR(record.advanceDeducted)}</td>
                      </tr>
                    )}
                    {(record.customDeductions || []).map((d, i) => (
                      <tr key={i}>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', color: '#555' }}>{d.type}</td>
                        <td style={{ padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmtPKR(d.amount)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#fff5f5' }}>
                      <td style={{ padding: '6px', fontWeight: 800 }}>Total Deductions</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 800 }}>{fmtPKR(record.totalDeductions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net salary */}
            <div style={{ background: '#1e3a5f', color: '#fff', borderRadius: 8, padding: '14px 16px', marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>NET SALARY</span>
              <span style={{ fontSize: 26, fontWeight: 900 }}>{fmtPKR(record.netSalary)}</span>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 11, color: '#777' }}>
              <div>
                <div style={{ borderTop: '1px solid #333', paddingTop: 4, marginTop: 20 }}>Employee Signature</div>
              </div>
              <div>
                <div style={{ borderTop: '1px solid #333', paddingTop: 4, marginTop: 20, textAlign: 'right' }}>Authorized Signature</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, color: '#aaa', marginTop: 12 }}>
              This is a computer-generated payslip. Generated by MediStore on {fmtDate(new Date())}.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #payslip-content, #payslip-content * { visibility: visible; }
          #payslip-content { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}

/* ════════════════════════════════
   EMPLOYEE PROFILE MODAL
════════════════════════════════ */
function ProfileModal({ existing, employees, onClose, onSaved }) {
  const [form, setForm] = useState({
    userId:       existing?.user?._id || existing?.user || '',
    basicSalary:  existing?.basicSalary || '',
    allowances:   existing?.allowances  || [],
    designation:  existing?.designation || '',
    department:   existing?.department  || '',
    employeeCode: existing?.employeeCode|| '',
    joiningDate:  existing?.joiningDate ? new Date(existing.joiningDate).toISOString().slice(0,10) : '',
    employmentType: existing?.employmentType || 'Full-Time',
    cnic:         existing?.cnic || '',
    bankName:     existing?.bankName || '',
    accountTitle: existing?.accountTitle || '',
    accountNumber:existing?.accountNumber || '',
    deductEOBI:       existing?.deductEOBI      || false,
    deductIncomeTax:  existing?.deductIncomeTax || false,
    annualLeaveBalance: existing?.annualLeaveBalance || 18,
    notes:        existing?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const chk = k => e => setForm(p => ({ ...p, [k]: e.target.checked }));

  const addAllowance = () => setForm(p => ({ ...p, allowances: [...p.allowances, { type: 'House Rent Allowance', amount: '', isFixed: true, percent: 0 }] }));
  const removeAllowance = i => setForm(p => ({ ...p, allowances: p.allowances.filter((_, j) => j !== i) }));
  const updateAllowance = (i, k, v) => setForm(p => ({ ...p, allowances: p.allowances.map((a, j) => j === i ? { ...a, [k]: v } : a) }));

  // Gross preview
  const grossPreview = Number(form.basicSalary || 0) + (form.allowances || []).reduce((s, a) => {
    return s + (a.isFixed ? Number(a.amount || 0) : Number(form.basicSalary || 0) * Number(a.percent || 0) / 100);
  }, 0);

  const handle = async () => {
    if (!form.userId || !form.basicSalary) { toast.error('Employee and basic salary required'); return; }
    setSaving(true);
    try {
      if (existing) {
        await API.put(`/payroll/profiles/${existing._id}`, form);
        toast.success('Profile updated');
      } else {
        await API.post('/payroll/profiles', form);
        toast.success('Employee profile created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">{existing ? 'Edit Employee Profile' : 'Add Employee Salary Profile'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left */}
          <div>
            {!existing && (
              <div className="form-group">
                <label className="form-label required">Employee</label>
                <select className="form-control" value={form.userId} onChange={fld('userId')}>
                  <option value="">Select employee...</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.role})</option>)}
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-control" value={form.designation} onChange={fld('designation')} placeholder="Senior Pharmacist" />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-control" value={form.department} onChange={fld('department')} placeholder="Pharmacy" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Employee Code</label>
                <input className="form-control" value={form.employeeCode} onChange={fld('employeeCode')} placeholder="EMP-001" />
              </div>
              <div className="form-group">
                <label className="form-label">Joining Date</label>
                <input className="form-control" type="date" value={form.joiningDate} onChange={fld('joiningDate')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">CNIC</label>
                <input className="form-control" value={form.cnic} onChange={fld('cnic')} placeholder="XXXXX-XXXXXXX-X" />
              </div>
              <div className="form-group">
                <label className="form-label">Employment Type</label>
                <select className="form-control" value={form.employmentType} onChange={fld('employmentType')}>
                  {['Full-Time','Part-Time','Contract','Intern'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Bank */}
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>Bank Details</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input className="form-control" value={form.bankName} onChange={fld('bankName')} placeholder="HBL, MCB, UBL..." />
              </div>
              <div className="form-group">
                <label className="form-label">Account Title</label>
                <input className="form-control" value={form.accountTitle} onChange={fld('accountTitle')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Account / IBAN</label>
              <input className="form-control" value={form.accountNumber} onChange={fld('accountNumber')} placeholder="PK36ALFH..." />
            </div>
          </div>

          {/* Right */}
          <div>
            {/* Salary */}
            <div className="form-group">
              <label className="form-label required">Basic Salary (₨)</label>
              <input className="form-control" type="number" min="0" value={form.basicSalary} onChange={fld('basicSalary')} placeholder="0" autoFocus />
            </div>

            {/* Allowances */}
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>Allowances</div>
            {form.allowances.map((a, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'end' }}>
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Type</label>
                  <select className="form-control" style={{ fontSize: 12 }} value={a.type}
                    onChange={e => updateAllowance(i, 'type', e.target.value)}>
                    {ALLOWANCE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 10 }}>Amount (₨)</label>
                  <input className="form-control" type="number" style={{ fontSize: 12 }} value={a.amount}
                    onChange={e => updateAllowance(i, 'amount', e.target.value)} placeholder="0" />
                </div>
                <button className="btn btn-danger btn-sm btn-icon" style={{ alignSelf: 'flex-end' }}
                  onClick={() => removeAllowance(i)}>
                  <MdDelete size={13} />
                </button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }} onClick={addAllowance}>
              <MdAdd size={14} /> Add Allowance
            </button>

            {/* Deductions */}
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>Deductions</div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, marginBottom: 8 }}>
                <input type="checkbox" checked={form.deductEOBI} onChange={chk('deductEOBI')} />
                <span>EOBI — Employee Share (₨570/month)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.deductIncomeTax} onChange={chk('deductIncomeTax')} />
                <span>Income Tax (Auto-calculated per FBR slabs)</span>
              </label>
            </div>

            {/* Gross preview */}
            <div style={{ background: 'var(--accent-light)', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span className="text-muted">Basic Salary</span>
                <span>{fmtPKR(form.basicSalary || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span className="text-muted">Total Allowances</span>
                <span>{fmtPKR(grossPreview - Number(form.basicSalary || 0))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: 'var(--accent)', borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
                <span>Gross Salary</span>
                <span>{fmtPKR(grossPreview)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving || !form.basicSalary}>
            {saving ? 'Saving...' : existing ? 'Update Profile' : 'Create Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   ADVANCE MODAL
════════════════════════════════ */
function AdvanceModal({ employees, onClose, onSaved }) {
  const [form, setForm] = useState({ employeeId: '', amount: '', date: new Date().toISOString().slice(0,10), reason: '', monthlyDeduction: '', approvedBy: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handle = async () => {
    if (!form.employeeId || !form.amount || !form.reason) { toast.error('Employee, amount and reason required'); return; }
    setSaving(true);
    try {
      await API.post('/payroll/advances', form);
      toast.success('Advance recorded');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">Record Advance</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div className="form-group">
          <label className="form-label required">Employee</label>
          <select className="form-control" value={form.employeeId} onChange={fld('employeeId')}>
            <option value="">Select employee...</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
          </select>
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

        <div className="form-group">
          <label className="form-label required">Reason</label>
          <input className="form-control" value={form.reason} onChange={fld('reason')} placeholder="Medical emergency, personal need, etc." />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Monthly Recovery (₨)</label>
            <input className="form-control" type="number" min="0" value={form.monthlyDeduction} onChange={fld('monthlyDeduction')} placeholder="Deduct this monthly" />
          </div>
          <div className="form-group">
            <label className="form-label">Approved By</label>
            <input className="form-control" value={form.approvedBy} onChange={fld('approvedBy')} placeholder="Manager name" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-control" rows={2} value={form.notes} onChange={fld('notes')} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving || !form.amount || !form.reason}>
            {saving ? 'Saving...' : `Record Advance — ${fmtPKR(form.amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   ADJUST RECORD MODAL
════════════════════════════════ */
function AdjustModal({ record, onClose, onAdjusted }) {
  const [form, setForm] = useState({
    daysAbsent:  record.daysAbsent || 0,
    overtime:    record.overtime   || 0,
    bonuses:     record.bonuses    || 0,
    bonusNote:   record.bonusNote  || '',
    notes:       record.notes      || '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handle = async () => {
    setSaving(true);
    try {
      await API.put(`/payroll/records/${record._id}`, form);
      toast.success('Record adjusted');
      onAdjusted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Adjust Payroll</div>
            <div className="text-muted text-sm">{record.employeeName} — {MONTHS_NAMES[record.month - 1]} {record.year}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Days Absent</label>
            <input className="form-control" type="number" min="0" max={record.workingDaysInMonth}
              value={form.daysAbsent} onChange={fld('daysAbsent')} />
            <div className="form-hint">Working days: {record.workingDaysInMonth}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Overtime Hours</label>
            <input className="form-control" type="number" min="0" value={form.overtime} onChange={fld('overtime')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Bonus (₨)</label>
            <input className="form-control" type="number" min="0" value={form.bonuses} onChange={fld('bonuses')} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Bonus Note</label>
            <input className="form-control" value={form.bonusNote} onChange={fld('bonusNote')} placeholder="Eid bonus, etc." />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-control" value={form.notes} onChange={fld('notes')} placeholder="Any remarks..." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving}>
            {saving ? 'Saving...' : 'Save Adjustments'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function Payroll() {
  const [activeTab,    setActiveTab]    = useState('payroll');
  const [period,       setPeriod]       = useState(monthISO());
  const [year,         setYear]         = useState(String(yearNow()));

  const [payrollData,  setPayrollData]  = useState({ records: [], totals: {} });
  const [profiles,     setProfiles]     = useState([]);
  const [advances,     setAdvances]     = useState([]);
  const [annualData,   setAnnualData]   = useState(null);
  const [employees,    setEmployees]    = useState([]);
  const [stats,        setStats]        = useState({});
  const [loading,      setLoading]      = useState(false);

  const [profileModal, setProfileModal] = useState(null);
  const [advanceModal, setAdvanceModal] = useState(false);
  const [adjustModal,  setAdjustModal]  = useState(null);
  const [payslipModal, setPayslipModal] = useState(null);

  const storeName = JSON.parse(localStorage.getItem('medistore_user') || '{}')?.storeName || 'MediStore';

  const [month, year2] = period.split('-').map(Number);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/payroll', { params: { month, year: year2 } });
      setPayrollData({ records: data.records || [], totals: data.totals || {} });
    } catch {}
    finally { setLoading(false); }
  }, [month, year2]);

  const fetchProfiles = useCallback(async () => {
    API.get('/payroll/profiles').then(({ data }) => setProfiles(data.profiles || [])).catch(() => {});
  }, []);

  const fetchEmployees = useCallback(async () => {
    API.get('/staff').then(({ data }) => setEmployees(data.staff || [])).catch(() => {});
  }, []);

  const fetchAdvances = useCallback(async () => {
    API.get('/payroll/advances').then(({ data }) => setAdvances(data.advances || [])).catch(() => {});
  }, []);

  const fetchStats = useCallback(() => {
    API.get('/payroll/stats').then(({ data }) => setStats(data.stats || {})).catch(() => {});
  }, []);

  const fetchAnnual = useCallback(async () => {
    API.get('/payroll/annual', { params: { year } })
      .then(({ data }) => setAnnualData(data))
      .catch(() => {});
  }, [year]);

  useEffect(() => { fetchStats(); fetchProfiles(); fetchEmployees(); fetchAdvances(); }, [fetchStats, fetchProfiles, fetchEmployees, fetchAdvances]);
  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);
  useEffect(() => { if (activeTab === 'annual') fetchAnnual(); }, [activeTab, fetchAnnual]);

  const handleGenerate = async () => {
    if (!confirm(`Generate payroll for ${MONTHS_NAMES[month - 1]} ${year2}? This will create draft records for all active employees.`)) return;
    try {
      const { data } = await API.post('/payroll/generate', { month, year: year2, workingDaysInMonth: 26 });
      toast.success(data.message);
      fetchPayroll(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleMarkPaid = async (record) => {
    const method = prompt('Payment method? (Cash/Bank Transfer/JazzCash/EasyPaisa)') || 'Cash';
    if (!method) return;
    try {
      await API.patch(`/payroll/records/${record._id}/paid`, { paymentMethod: method });
      toast.success(`${record.employeeName} — salary paid`);
      fetchPayroll(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleMarkAllPaid = async () => {
    if (!confirm(`Mark ALL processed salaries as paid for ${MONTHS_NAMES[month - 1]} ${year2}?`)) return;
    try {
      const { data } = await API.patch('/payroll/mark-all-paid', { month, year: year2, paymentMethod: 'Cash' });
      toast.success(data.message);
      fetchPayroll(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteAdvance = async (id) => {
    if (!confirm('Delete this advance record?')) return;
    try {
      await API.delete(`/payroll/advances/${id}`);
      toast.success('Advance deleted');
      fetchAdvances();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const TABS = [
    { id: 'payroll',  label: 'Monthly Payroll'   },
    { id: 'employees',label: 'Employee Profiles'  },
    { id: 'advances', label: `Advances (${advances.filter(a => a.status !== 'Fully Repaid').length})`},
    { id: 'annual',   label: 'Annual Summary'     },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Salary & Payroll</h1>
          <p>
            {stats.totalEmployees || 0} employees ·
            {stats.pendingCount > 0 && <span style={{ color: '#f59e0b', fontWeight: 700 }}> {stats.pendingCount} unpaid</span>}
            {stats.totalAdvancesOutstanding > 0 && <span className="text-muted"> · Advances: {fmtPKR(stats.totalAdvancesOutstanding)}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeTab === 'payroll' && (
            <input type="month" className="form-control" style={{ width: 160 }}
              value={period} onChange={e => setPeriod(e.target.value)} />
          )}
          {activeTab === 'annual' && (
            <select className="form-control" style={{ width: 120 }} value={year} onChange={e => setYear(e.target.value)}>
              {[0, 1, 2].map(i => <option key={i}>{yearNow() - i}</option>)}
            </select>
          )}
          {activeTab === 'advances' && (
            <button className="btn btn-secondary" onClick={() => setAdvanceModal(true)}>
              <MdAdd /> Record Advance
            </button>
          )}
          {activeTab === 'employees' && (
            <button className="btn btn-primary" onClick={() => setProfileModal('new')}>
              <MdAdd /> Add Profile
            </button>
          )}
          {activeTab === 'payroll' && (
            <>
              <button className="btn btn-secondary" onClick={handleMarkAllPaid}
                disabled={!payrollData.records.filter(r => r.status !== 'Paid').length}>
                <MdCheck /> Mark All Paid
              </button>
              <button className="btn btn-primary" onClick={handleGenerate}
                disabled={!!payrollData.records.length}>
                <MdAdd /> Generate Payroll
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Employees',   value: stats.totalEmployees    || 0,                    color: '#0ea5e9', icon: '👥' },
          { label: 'This Month Total',  value: fmtPKR(stats.thisMonthPayroll || 0),             color: '#8b5cf6', icon: '💰' },
          { label: 'Paid',              value: stats.paidCount         || 0,                    color: '#10b981', icon: '✅' },
          { label: 'Pending',           value: stats.pendingCount      || 0,                    color: '#f59e0b', icon: '⏳' },
          { label: 'Advances Outstanding',value: fmtPKR(stats.totalAdvancesOutstanding || 0),  color: '#ef4444', icon: '💸' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color + '20', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color: s.color, fontSize: typeof s.value === 'string' ? 15 : 24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PAYROLL TAB ── */}
      {activeTab === 'payroll' && (
        <div>
          {/* Period summary */}
          {payrollData.records.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total Gross',      value: fmtPKR(payrollData.totals.grossSalary),    color: '#0ea5e9' },
                { label: 'Total Deductions', value: fmtPKR(payrollData.totals.totalDeductions), color: '#ef4444' },
                { label: 'Total Net',        value: fmtPKR(payrollData.totals.netSalary),       color: '#10b981' },
                { label: 'Total Bonuses',    value: fmtPKR(payrollData.totals.bonuses),         color: '#f59e0b' },
                { label: 'Advance Deducted', value: fmtPKR(payrollData.totals.advanceDeducted), color: '#8b5cf6' },
              ].map(s => (
                <div key={s.label} style={{ background: s.color + '12', border: `1px solid ${s.color}30`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex-center" style={{ height: 200 }}><div className="text-muted">Loading...</div></div>
          ) : payrollData.records.length === 0 ? (
            <div className="empty-state">
              <MdAttachMoney size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
              <h3>No payroll for {MONTHS_NAMES[month - 1]} {year2}</h3>
              {profiles.length > 0 ? (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleGenerate}>
                  <MdAdd /> Generate Payroll
                </button>
              ) : (
                <p>Add employee profiles first, then generate payroll.</p>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Basic</th>
                    <th>Allowances</th>
                    <th>Gross</th>
                    <th>Absent</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.records.map(r => {
                    const sc = STATUS_CFG[r.status] || STATUS_CFG.Draft;
                    const allowTotal = (r.allowances || []).reduce((s, a) => s + a.amount, 0);
                    return (
                      <tr key={r._id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{r.employeeName}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{r.designation} {r.employeeCode && `· ${r.employeeCode}`}</div>
                        </td>
                        <td>{fmtPKR(r.basicSalary)}</td>
                        <td>{fmtPKR(allowTotal)}</td>
                        <td style={{ fontWeight: 600 }}>{fmtPKR(r.grossSalary)}</td>
                        <td style={{ color: r.daysAbsent > 0 ? '#ef4444' : 'inherit' }}>{r.daysAbsent}</td>
                        <td style={{ color: '#ef4444' }}>{fmtPKR(r.totalDeductions)}</td>
                        <td style={{ fontWeight: 800, fontSize: 15, color: '#10b981' }}>{fmtPKR(r.netSalary)}</td>
                        <td>
                          <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{r.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {r.status !== 'Paid' && (
                              <button className="btn btn-secondary btn-sm" title="Adjust" onClick={() => setAdjustModal(r)}>
                                <MdEdit size={13} />
                              </button>
                            )}
                            {r.status !== 'Paid' && (
                              <button className="btn btn-success btn-sm" title="Mark Paid" onClick={() => handleMarkPaid(r)}>
                                <MdCheck size={13} />
                              </button>
                            )}
                            <button className="btn btn-secondary btn-sm" title="Payslip" onClick={() => setPayslipModal(r)}>
                              <MdPrint size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── EMPLOYEES TAB ── */}
      {activeTab === 'employees' && (
        <div>
          {profiles.length === 0 ? (
            <div className="empty-state">
              <MdPerson size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
              <h3>No employee profiles</h3>
              <p>Add salary profiles for your staff members</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setProfileModal('new')}>
                <MdAdd /> Add First Profile
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 14 }}>
              {profiles.map(p => {
                const user = p.user;
                const allowTotal = (p.allowances || []).reduce((s, a) => s + (a.isFixed ? a.amount : p.basicSalary * a.percent / 100), 0);
                const grossSalary = p.basicSalary + allowTotal;
                return (
                  <div key={p._id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 16, background: 'var(--card-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>{user?.name}</div>
                        <div className="text-muted text-sm">{p.designation || user?.role} · {p.employeeCode || '—'}</div>
                        {p.joiningDate && <div className="text-muted" style={{ fontSize: 11 }}>Since {fmtDate(p.joiningDate)}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent)' }}>{fmtPKR(grossSalary)}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>Gross/month</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      {[
                        { label: 'Basic',     value: fmtPKR(p.basicSalary) },
                        { label: 'Allowances',value: fmtPKR(allowTotal)    },
                        { label: 'EOBI',      value: p.deductEOBI ? '₨570' : '—' },
                        { label: 'Income Tax',value: p.deductIncomeTax ? 'Auto' : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '6px 10px' }}>
                          <div className="text-muted" style={{ fontSize: 10 }}>{label}</div>
                          <div style={{ fontWeight: 700, fontSize: 13, marginTop: 1 }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {p.allowances?.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                        {p.allowances.map(a => `${a.type}: ${fmtPKR(a.amount)}`).join(' · ')}
                      </div>
                    )}

                    {p.bankName && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                        🏦 {p.bankName} — {p.accountTitle || '—'}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setProfileModal(p)}>
                        <MdEdit size={13} /> Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ADVANCES TAB ── */}
      {activeTab === 'advances' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 700 }}>Staff Advances</div>
            <button className="btn btn-primary btn-sm" onClick={() => setAdvanceModal(true)}>
              <MdAdd /> Record Advance
            </button>
          </div>

          {advances.length === 0 ? (
            <div className="empty-state">
              <MdAttachMoney size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>No advances recorded</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {advances.map(a => {
                const remaining  = Math.max(0, a.amount - a.amountRepaid);
                const progress   = a.amount > 0 ? Math.round((a.amountRepaid / a.amount) * 100) : 0;
                const statusColor = a.status === 'Fully Repaid' ? '#10b981' : a.status === 'Partially Repaid' ? '#f59e0b' : '#ef4444';
                return (
                  <div key={a._id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', background: 'var(--card-bg)', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{a.employeeName}</div>
                      <div className="text-muted text-sm">{a.reason}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {fmtDate(a.date)} · Approved by: {a.approvedBy || '—'}
                        {a.monthlyDeduction > 0 && ` · Deducting ${fmtPKR(a.monthlyDeduction)}/month`}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span className="text-muted">Balance:</span>
                        <span style={{ fontWeight: 700, color: statusColor }}>{fmtPKR(remaining)} / {fmtPKR(a.amount)}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: statusColor, borderRadius: 99 }} />
                      </div>
                      <div style={{ fontSize: 11, color: statusColor, marginTop: 3, fontWeight: 700 }}>{a.status}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeleteAdvance(a._id)}>
                        <MdDelete size={14} style={{ color: 'var(--danger)' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ANNUAL SUMMARY TAB ── */}
      {activeTab === 'annual' && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Annual Summary — {year}</div>
          {!annualData ? (
            <div className="text-muted text-sm">Loading...</div>
          ) : annualData.employees?.length === 0 ? (
            <div className="empty-state"><MdBarChart size={48} style={{ opacity: 0.3, marginBottom: 12 }} /><h3>No payroll data for {year}</h3></div>
          ) : (
            <>
              {/* Grand totals */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Total Gross',      value: fmtPKR(annualData.grandTotals.gross),      color: '#0ea5e9' },
                  { label: 'Total Deductions', value: fmtPKR(annualData.grandTotals.deductions),  color: '#ef4444' },
                  { label: 'Total Net Paid',   value: fmtPKR(annualData.grandTotals.net),         color: '#10b981' },
                  { label: 'Total Tax',        value: fmtPKR(annualData.grandTotals.tax),         color: '#8b5cf6' },
                  { label: 'Total EOBI',       value: fmtPKR(annualData.grandTotals.eobi),        color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.color + '12', border: `1px solid ${s.color}30`, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Per-employee */}
              {annualData.employees.map(e => (
                <div key={e.employee._id} className="card" style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{e.employeeName}</div>
                      <div className="text-muted text-sm">{e.designation}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, color: '#10b981', fontSize: 18 }}>{fmtPKR(e.totals.net)}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>Annual Net</div>
                      {e.totals.tax > 0 && (
                        <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700 }}>Tax: {fmtPKR(e.totals.tax)}</div>
                      )}
                    </div>
                  </div>
                  {/* Monthly breakdown */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {MONTHS_NAMES.map((mName, i) => {
                      const rec = e.months.find(m => m.month === i + 1);
                      return (
                        <div key={mName} style={{ flex: 1, minWidth: 60, textAlign: 'center', background: rec ? (rec.status === 'Paid' ? '#d1fae5' : '#fef3c7') : 'var(--bg-tertiary)', borderRadius: 6, padding: '4px 2px' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{mName.slice(0, 3)}</div>
                          <div style={{ fontSize: 11, fontWeight: rec ? 700 : 400, color: rec ? (rec.status === 'Paid' ? '#10b981' : '#f59e0b') : 'var(--text-muted)' }}>
                            {rec ? fmtPKR(rec.net).replace('₨', '') : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }}>
                    {[
                      { label: 'Gross', value: fmtPKR(e.totals.gross), color: '#0ea5e9' },
                      { label: 'Tax',   value: fmtPKR(e.totals.tax),   color: '#8b5cf6' },
                      { label: 'EOBI',  value: fmtPKR(e.totals.eobi),  color: '#f59e0b' },
                      { label: 'Advances Deducted', value: fmtPKR(e.totals.advances), color: '#ef4444' },
                      { label: 'Bonuses', value: fmtPKR(e.totals.bonuses), color: '#10b981' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <span className="text-muted">{label}: </span>
                        <span style={{ fontWeight: 700, color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {profileModal && (
        <ProfileModal
          existing={profileModal !== 'new' ? profileModal : null}
          employees={employees.filter(e => !profiles.find(p => p.user?._id?.toString() === e._id?.toString() || p.user?.toString() === e._id?.toString()))}
          onClose={() => setProfileModal(null)}
          onSaved={() => { setProfileModal(null); fetchProfiles(); fetchStats(); }}
        />
      )}
      {advanceModal && (
        <AdvanceModal
          employees={employees}
          onClose={() => setAdvanceModal(false)}
          onSaved={() => { setAdvanceModal(false); fetchAdvances(); fetchStats(); }}
        />
      )}
      {adjustModal && (
        <AdjustModal
          record={adjustModal}
          onClose={() => setAdjustModal(null)}
          onAdjusted={() => { setAdjustModal(null); fetchPayroll(); }}
        />
      )}
      {payslipModal && (
        <Payslip
          record={payslipModal}
          storeName={storeName}
          onClose={() => setPayslipModal(null)}
        />
      )}
    </div>
  );

  function MdBarChart({ size = 20 }) {
    return <MdAttachMoney size={size} />;
  }
}