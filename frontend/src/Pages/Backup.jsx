import { useState, useEffect, useRef } from 'react';
import {
  MdCloudDownload, MdCloudUpload, MdTableChart,
  MdMedicalServices, MdPeople, MdReceipt,
  MdShoppingCart, MdCheckCircle, MdWarning,
  MdLock, MdHistory,
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { usePermissions } from '../hooks/usePermissions';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

/* ── Excel helpers ── */
function downloadExcel(rows, sheetName, filename) {
  const ws  = XLSX.utils.json_to_sheet(rows);
  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Auto column widths
  const cols = Object.keys(rows[0] || {}).map(k => ({
    wch: Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length), 10),
  }));
  ws['!cols'] = cols;

  XLSX.writeFile(wb, filename);
}

function flattenMedicineForExcel(m) {
  return {
    'Name':               m.name,
    'Generic Name':       m.genericName || '',
    'Category':           m.category,
    'Dosage Form':        m.dosageForm,
    'Strength':           m.strength || '',
    'Unit':               m.unit,
    'Manufacturer':       m.manufacturer || '',
    'Batch Number':       m.batchNumber || '',
    'Purchase Price':     m.purchasePrice,
    'Sale Price':         m.salePrice,
    'Stock':              m.stock,
    'Min Stock':          m.minStock,
    'Expiry Date':        m.expiryDate ? new Date(m.expiryDate).toLocaleDateString('en-PK') : '',
    'Location':           m.location || '',
    'Requires Rx':        m.requiresPrescription ? 'Yes' : 'No',
  };
}

function flattenPatientForExcel(p) {
  return {
    'Patient ID':        p.patientId,
    'Name':              p.name,
    'Age':               p.age || '',
    'Gender':            p.gender || '',
    'Phone':             p.phone || '',
    'Email':             p.email || '',
    'City':              p.city || '',
    'Address':           p.address || '',
    'Blood Group':       p.bloodGroup || '',
    'Doctor':            p.doctor || '',
    'Total Billed':      p.totalBilled || 0,
    'Total Paid':        p.totalPaid || 0,
    'Outstanding':       (p.totalBilled || 0) - (p.totalPaid || 0),
    'Medical History':   p.medicalHistory || '',
    'Allergies':         (p.allergies || []).join(', '),
  };
}

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
export default function Backup() {
  const { isAdmin } = usePermissions();
  const fileInputRef = useRef(null);

  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [exporting, setExporting]     = useState('');
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importFile, setImportFile]   = useState(null);
  const [importOptions, setImportOptions] = useState({
    medicines: true, patients: true, bills: false, purchaseOrders: false,
  });
  const [lastBackup, setLastBackup] = useState(() => {
    return localStorage.getItem('medistore_last_backup') || null;
  });

  if (!isAdmin) return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <MdLock size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
      <h3>Admin Access Required</h3>
      <p>Only the store owner can manage backups</p>
    </div>
  );

  useEffect(() => {
    API.get('/backup/stats')
      .then(({ data }) => setStats(data.stats))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  /* ══════════════════════════════════════
     JSON BACKUP EXPORT
  ══════════════════════════════════════ */
  const handleFullBackup = async () => {
    setExporting('json');
    try {
      const { data } = await API.get('/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `MediStore_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      localStorage.setItem('medistore_last_backup', now);
      setLastBackup(now);
      toast.success('Full backup downloaded!');
    } catch { toast.error('Backup failed'); }
    finally { setExporting(''); }
  };

  /* ══════════════════════════════════════
     EXCEL EXPORTS
  ══════════════════════════════════════ */
  const handleExcelMedicines = async () => {
    setExporting('excel_med');
    try {
      const { data } = await API.get('/backup/export/medicines');
      if (!data.medicines?.length) { toast('No medicines to export'); return; }
      const rows = data.medicines.map(flattenMedicineForExcel);
      downloadExcel(
        rows, 'Medicines',
        `MediStore_Medicines_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast.success(`${rows.length} medicines exported to Excel!`);
    } catch { toast.error('Excel export failed'); }
    finally { setExporting(''); }
  };

  const handleExcelPatients = async () => {
    setExporting('excel_pat');
    try {
      const { data } = await API.get('/backup/export/patients');
      if (!data.patients?.length) { toast('No patients to export'); return; }
      const rows = data.patients.map(flattenPatientForExcel);
      downloadExcel(
        rows, 'Patients',
        `MediStore_Patients_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast.success(`${rows.length} patients exported to Excel!`);
    } catch { toast.error('Excel export failed'); }
    finally { setExporting(''); }
  };

  /* Export both sheets in one workbook */
  const handleExcelFull = async () => {
    setExporting('excel_full');
    try {
      const [medRes, patRes] = await Promise.all([
        API.get('/backup/export/medicines'),
        API.get('/backup/export/patients'),
      ]);

      const medRows = (medRes.data.medicines || []).map(flattenMedicineForExcel);
      const patRows = (patRes.data.patients  || []).map(flattenPatientForExcel);

      const wb = XLSX.utils.book_new();

      if (medRows.length) {
        const ws1 = XLSX.utils.json_to_sheet(medRows);
        ws1['!cols'] = Object.keys(medRows[0]).map(k => ({
          wch: Math.max(k.length, ...medRows.map(r => String(r[k] ?? '').length), 10),
        }));
        XLSX.utils.book_append_sheet(wb, ws1, 'Medicines');
      }

      if (patRows.length) {
        const ws2 = XLSX.utils.json_to_sheet(patRows);
        ws2['!cols'] = Object.keys(patRows[0]).map(k => ({
          wch: Math.max(k.length, ...patRows.map(r => String(r[k] ?? '').length), 10),
        }));
        XLSX.utils.book_append_sheet(wb, ws2, 'Patients');
      }

      XLSX.writeFile(wb, `MediStore_Full_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Full Excel exported with both sheets!');
    } catch { toast.error('Excel export failed'); }
    finally { setExporting(''); }
  };

  /* ══════════════════════════════════════
     JSON IMPORT / RESTORE
  ══════════════════════════════════════ */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a .json backup file');
      return;
    }
    setImportFile(file);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!importFile) { toast.error('Select a backup file first'); return; }
    if (!Object.values(importOptions).some(Boolean)) {
      toast.error('Select at least one collection to restore');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const text   = await importFile.text();
      const backup = JSON.parse(text);

      const { data } = await API.post('/backup/import', {
        backup, options: importOptions,
      });

      setImportResult(data.results);
      toast.success('Restore completed!');

      // Refresh stats
      const statsRes = await API.get('/backup/stats');
      setStats(statsRes.data.stats);
    } catch (err) {
      if (err instanceof SyntaxError) toast.error('Invalid JSON file');
      else toast.error(err.response?.data?.message || 'Restore failed');
    } finally { setImporting(false); }
  };

  const statCards = [
    { label: 'Medicines',       value: stats?.medicines,      icon: <MdMedicalServices />, cls: 'blue'   },
    { label: 'Patients',        value: stats?.patients,       icon: <MdPeople />,          cls: 'green'  },
    { label: 'Bills',           value: stats?.bills,          icon: <MdReceipt />,         cls: 'yellow' },
    { label: 'Purchase Orders', value: stats?.purchaseOrders, icon: <MdShoppingCart />,    cls: 'purple' },
  ];

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Data Backup & Restore</h1>
          <p>Export your data for safekeeping or migrate to another device</p>
        </div>
      </div>

      {/* Last backup reminder */}
      {lastBackup ? (
        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          <MdCheckCircle size={18} />
          <div className="alert-text">
            Last backup: <strong>{fmtDate(lastBackup)}</strong>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <MdWarning size={18} />
          <div className="alert-text">
            <strong>No backup taken yet.</strong> We recommend backing up your data regularly.
          </div>
        </div>
      )}

      {/* Current data stats */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Current Data Summary</div>
          <span className="badge badge-accent">Live</span>
        </div>
        {loading ? (
          <ShortLoader/>
        ) : (
          <div className="stat-grid" style={{ marginBottom: 0 }}>
            {statCards.map((s, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                <div>
                  <div className="stat-value" style={{ fontSize: 24 }}>{s.value ?? '—'}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 1: Full JSON Backup ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdCloudDownload style={{ color: 'var(--accent)' }} /> Full JSON Backup
            </div>
            <div className="text-muted text-sm" style={{ marginTop: 3 }}>
              Exports all medicines, patients, bills and purchase orders into one file.
              Use this for disaster recovery or moving to a new server.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            📦 Includes: <strong>Medicines · Patients · Bills · Purchase Orders</strong><br />
            <span className="text-muted">Format: .json — can be reimported to restore all data</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleFullBackup}
            disabled={exporting === 'json'}
          >
            <MdCloudDownload />
            {exporting === 'json' ? 'Preparing...' : 'Download Full Backup (.json)'}
          </button>
        </div>
      </div>

      {/* ── SECTION 2: Excel Export ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdTableChart style={{ color: 'var(--success)' }} /> Export to Excel
            </div>
            <div className="text-muted text-sm" style={{ marginTop: 3 }}>
              Export medicines or patients as .xlsx spreadsheet — open directly in Excel or Google Sheets.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Medicines Excel */}
          <div style={{ flex: 1, minWidth: 200, border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div className="stat-icon blue" style={{ width: 36, height: 36, fontSize: 16 }}>
                <MdMedicalServices />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Medicines List</div>
                <div className="text-muted text-sm">{stats?.medicines || 0} records</div>
              </div>
            </div>
            <div className="text-muted text-sm" style={{ marginBottom: 12 }}>
              Name, generic, category, prices, stock, expiry, batch number, location
            </div>
            <button
              className="btn btn-secondary btn-sm w-full"
              onClick={handleExcelMedicines}
              disabled={!!exporting}
            >
              <MdTableChart />
              {exporting === 'excel_med' ? 'Exporting...' : 'Export Medicines.xlsx'}
            </button>
          </div>

          {/* Patients Excel */}
          <div style={{ flex: 1, minWidth: 200, border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div className="stat-icon green" style={{ width: 36, height: 36, fontSize: 16 }}>
                <MdPeople />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Patients List</div>
                <div className="text-muted text-sm">{stats?.patients || 0} records</div>
              </div>
            </div>
            <div className="text-muted text-sm" style={{ marginBottom: 12 }}>
              Name, ID, contact, blood group, doctor, billing totals, medical history
            </div>
            <button
              className="btn btn-secondary btn-sm w-full"
              onClick={handleExcelPatients}
              disabled={!!exporting}
            >
              <MdTableChart />
              {exporting === 'excel_pat' ? 'Exporting...' : 'Export Patients.xlsx'}
            </button>
          </div>

          {/* Full Excel */}
          <div style={{ flex: 1, minWidth: 200, border: '2px solid var(--accent)', borderRadius: 12, padding: 16, background: 'var(--accent-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div className="stat-icon blue" style={{ width: 36, height: 36, fontSize: 16 }}>
                <MdTableChart />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Both in One File</div>
                <div className="text-muted text-sm">2 sheets in one .xlsx</div>
              </div>
            </div>
            <div className="text-muted text-sm" style={{ marginBottom: 12 }}>
              Medicines sheet + Patients sheet — perfect for a full data review
            </div>
            <button
              className="btn btn-primary btn-sm w-full"
              onClick={handleExcelFull}
              disabled={!!exporting}
            >
              <MdTableChart />
              {exporting === 'excel_full' ? 'Exporting...' : 'Export Full Excel.xlsx'}
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Restore from JSON ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdCloudUpload style={{ color: 'var(--warning)' }} /> Restore from Backup
            </div>
            <div className="text-muted text-sm" style={{ marginTop: 3 }}>
              Upload a previously exported .json backup file to restore data.
            </div>
          </div>
        </div>

        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <MdWarning size={18} />
          <div className="alert-text">
            <strong>Important:</strong> Restore will <em>merge</em> data — existing records are
            updated, new records are added. Nothing is deleted. Bills are skipped if the invoice
            number already exists.
          </div>
        </div>

        {/* Step 1: Select file */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
            STEP 1 — Select backup file
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <MdCloudUpload /> Choose .json File
            </button>
            {importFile && (
              <div style={{
                padding: '8px 14px', background: 'var(--success-bg)',
                border: '1px solid var(--success)', borderRadius: 8,
                fontSize: 13, color: 'var(--success)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <MdCheckCircle size={16} /> {importFile.name}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Choose what to restore */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
            STEP 2 — Choose what to restore
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { key: 'medicines',      label: 'Medicines',       icon: <MdMedicalServices />, desc: 'Inventory items, prices, stock'    },
              { key: 'patients',       label: 'Patients',        icon: <MdPeople />,          desc: 'Patient records, contact info'    },
              { key: 'bills',          label: 'Bills / Invoices',icon: <MdReceipt />,         desc: 'Skips if invoice # already exists'},
              { key: 'purchaseOrders', label: 'Purchase Orders', icon: <MdShoppingCart />,    desc: 'Supplier orders history'          },
            ].map(item => (
              <label key={item.key} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${importOptions[item.key] ? 'var(--accent)' : 'var(--border)'}`,
                background: importOptions[item.key] ? 'var(--accent-light)' : 'var(--card-bg)',
                transition: 'var(--transition)',
              }}>
                <input
                  type="checkbox"
                  checked={importOptions[item.key]}
                  onChange={e => setImportOptions(p => ({ ...p, [item.key]: e.target.checked }))}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14 }}>
                    {item.icon} {item.label}
                  </div>
                  <div className="text-muted text-sm">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Step 3: Restore */}
        <div style={{ marginBottom: importResult ? 20 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
            STEP 3 — Restore
          </div>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={!importFile || importing}
          >
            <MdCloudUpload />
            {importing ? 'Restoring...' : 'Restore Selected Data'}
          </button>
        </div>

        {/* Import result */}
        {importResult && (
          <div style={{
            background: 'var(--success-bg)', border: '1px solid var(--success)',
            borderRadius: 12, padding: 16, marginTop: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: 'var(--success)', marginBottom: 12 }}>
              <MdCheckCircle size={20} /> Restore Complete
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {Object.entries(importResult.imported || {}).map(([key, count]) => (
                <div key={key} style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>
                    {count} imported
                    {importResult.skipped?.[key] > 0 && (
                      <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                        ({importResult.skipped[key]} skipped)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}