import { useState, useEffect } from 'react';
import {
  MdSave, MdUploadFile, MdDelete, MdVisibility,
  MdPalette, MdPrint, MdCheck,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { printDetailedInvoice, printCompactInvoice, printThermal80Invoice, printThermal58Invoice } from '../utils/invoiceTemplates';
import ShortLoader from '../Components/ShortLoader';

/* ── Sample bill for preview ── */
const SAMPLE_BILL = {
  _id:           'preview',
  billNumber:    'INV-000001',
  patientName:   'Muhammad Ali Khan',
  paymentStatus: 'Partial',
  totalAmount:   1850,
  amountPaid:    1000,
  discount:      150,
  tax:           0,
  subtotal:      2000,
  createdAt:     new Date().toISOString(),
  patient:       { patientId: 'PT-00042', age: 35, gender: 'Male' },
  items: [
    { medicineName: 'Augmentin 625mg', genericName: 'Amoxicillin+Clavulanate', quantity: 14, unitPrice: 85,  totalPrice: 1190 },
    { medicineName: 'Panadol Extra',   genericName: 'Paracetamol',             quantity: 20, unitPrice:  8,  totalPrice: 160  },
    { medicineName: 'ORS Sachet',      genericName: 'ORS',                     quantity: 10, unitPrice: 35,  totalPrice: 350  },
  ],
};

const TEMPLATES = [
  {
    id:    'detailed',
    label: 'Detailed',
    desc:  'Full A4 · Coloured header · Logo · Complete breakdown',
    icon:  '📄',
    size:  'A4',
  },
  {
    id:    'compact',
    label: 'Compact',
    desc:  'A4 · Minimal whitespace · Clean lines · Fast printing',
    icon:  '📋',
    size:  'A4',
  },
  {
    id:    'thermal80',
    label: 'Thermal 80mm',
    desc:  '80mm receipt · For most thermal printers · Auto-height',
    icon:  '🧾',
    size:  '80mm',
  },
  {
    id:    'thermal58',
    label: 'Thermal 58mm',
    desc:  '58mm receipt · Narrow thermal · Most compact',
    icon:  '🖨️',
    size:  '58mm',
  },
];

const ACCENT_PRESETS = [
  '#0ea5e9','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#ec4899','#06b6d4','#64748b',
];

const DARK_PRESETS = [
  '#0f172a','#1e1b4b','#064e3b','#431407',
  '#1e293b','#3b0764','#14532d','#450a0a',
];

function Toggle({ label, desc, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
        {desc && <div className="text-muted text-sm">{desc}</div>}
      </div>
      <div style={{ position: 'relative', width: 44, height: 24, flexShrink: 0 }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
        <div onClick={() => onChange(!checked)} style={{
          position: 'absolute', inset: 0, borderRadius: 99,
          background: checked ? 'var(--accent)' : 'var(--border)',
          transition: 'background 0.2s', cursor: 'pointer',
        }}>
          <div style={{
            position: 'absolute', top: 3,
            left: checked ? 'calc(100% - 21px)' : 3,
            width: 18, height: 18, borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {checked && <MdCheck size={11} style={{ color: 'var(--accent)' }} />}
          </div>
        </div>
      </div>
    </label>
  );
}

export default function InvoiceSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [previewing, setPreviewing] = useState('');
  const [tab, setTab]           = useState('template');

  useEffect(() => {
    API.get('/invoice-settings')
      .then(({ data }) => {
        setSettings(data.settings);
        localStorage.setItem('medistore_invoice_settings', JSON.stringify(data.settings));
      })
      .catch(() => toast.error('Failed to load invoice settings'));
  }, []);

  const set = (key, val) => setSettings(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await API.put('/invoice-settings', settings);
      localStorage.setItem('medistore_invoice_settings', JSON.stringify(data.settings));
      toast.success('Invoice settings saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    const fd = new FormData();
    fd.append('logo', logoFile);
    try {
      const { data } = await API.post('/invoice-settings/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSettings(data.settings);
      localStorage.setItem('medistore_invoice_settings', JSON.stringify(data.settings));
      setLogoFile(null);
      toast.success('Logo uploaded!');
    } catch { toast.error('Upload failed'); }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Remove logo?')) return;
    try {
      await API.delete('/invoice-settings/logo');
      setSettings(p => ({ ...p, logo: null }));
      toast.success('Logo removed');
    } catch { toast.error('Failed'); }
  };

  const handlePreview = async (templateId) => {
    setPreviewing(templateId);
    const bill = { ...SAMPLE_BILL };
    // Temporarily apply settings for preview
    const tempSettings = { ...settings, template: templateId };
    localStorage.setItem('medistore_invoice_settings', JSON.stringify(tempSettings));
    try {
      switch (templateId) {
        case 'compact':   await printCompactInvoice(bill); break;
        case 'thermal80': await printThermal80Invoice(bill); break;
        case 'thermal58': await printThermal58Invoice(bill); break;
        default:          await printDetailedInvoice(bill);
      }
    } catch (e) { toast.error('Preview failed: ' + e.message); }
    // Restore actual settings
    localStorage.setItem('medistore_invoice_settings', JSON.stringify(settings));
    setPreviewing('');
  };

  if (!settings) return (
    <div className="flex-center" style={{ height: 300 }}>
      <ShortLoader text="Loading invoice settings..."/>
    </div>
  );

  const tabs = [
    { id: 'template', label: '🎨 Template & Brand' },
    { id: 'content',  label: '📝 Content & Fields' },
    { id: 'thermal',  label: '🖨️ Thermal Options' },
  ];

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Invoice Templates</h1>
          <p>Customize how your invoices and receipts look</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <MdSave /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" style={{ marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} className={`pill${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── TEMPLATE TAB ── */}
      {tab === 'template' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: template picker */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><div className="card-title">Choose Template</div></div>
              {TEMPLATES.map(t => (
                <div
                  key={t.id}
                  onClick={() => set('template', t.id)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          14,
                    padding:      '14px 16px',
                    marginBottom: 8,
                    border:       `2px solid ${settings.template === t.id ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 12,
                    cursor:       'pointer',
                    background:   settings.template === t.id ? 'var(--accent-light)' : 'var(--card-bg)',
                    transition:   'var(--transition)',
                  }}
                >
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{t.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                    <div className="text-muted text-sm">{t.desc}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                      padding: '2px 8px', borderRadius: 99, display: 'inline-block', marginTop: 4,
                    }}>{t.size}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {settings.template === t.id && (
                      <span className="badge badge-accent" style={{ fontSize: 10 }}>Selected</span>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={e => { e.stopPropagation(); handlePreview(t.id); }}
                      disabled={previewing === t.id}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      <MdVisibility size={12} />
                      {previewing === t.id ? '...' : 'Preview'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Logo upload */}
            <div className="card">
              <div className="card-header"><div className="card-title">Store Logo</div></div>

              {settings.logo?.url ? (
                <div style={{ marginBottom: 16 }}>
                  <img src={settings.logo.url} alt="Store Logo"
                    style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                  <div className="flex gap-2" style={{ marginTop: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('logo-input').click()}>
                      <MdUploadFile /> Replace
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={handleRemoveLogo}>
                      <MdDelete /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 12, cursor: 'pointer' }}
                  onClick={() => document.getElementById('logo-input').click()}>
                  <MdUploadFile size={28} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
                  <div className="text-muted text-sm">Click to upload logo</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG · Recommended: 200×80px</div>
                </div>
              )}

              <input id="logo-input" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => setLogoFile(e.target.files[0])} />

              {logoFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, fontSize: 13 }}>{logoFile.name}</div>
                  <button className="btn btn-primary btn-sm" onClick={handleLogoUpload}>
                    <MdUploadFile /> Upload
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setLogoFile(null)}>✕</button>
                </div>
              )}

              <Toggle label="Show Logo on Invoice" checked={settings.showLogo !== false} onChange={v => set('showLogo', v)} />
            </div>
          </div>

          {/* Right: colors */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdPalette style={{ color: 'var(--accent)' }} />
                  <div className="card-title">Brand Colors</div>
                </div>
              </div>

              {/* Accent color */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Accent / Header Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {ACCENT_PRESETS.map(c => (
                    <div key={c} onClick={() => set('accentColor', c)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer',
                        border: settings.accentColor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                        transition: 'var(--transition)',
                      }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={settings.accentColor || '#0ea5e9'}
                    onChange={e => set('accentColor', e.target.value)}
                    style={{ width: 44, height: 36, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }} />
                  <input className="form-control" value={settings.accentColor || '#0ea5e9'}
                    onChange={e => set('accentColor', e.target.value)}
                    style={{ width: 120, fontFamily: 'monospace' }} />
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: settings.accentColor || '#0ea5e9', border: '1px solid var(--border)' }} />
                </div>
              </div>

              {/* Dark color */}
              <div>
                <label className="form-label">Header Background Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {DARK_PRESETS.map(c => (
                    <div key={c} onClick={() => set('darkColor', c)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer',
                        border: settings.darkColor === c ? '3px solid var(--accent)' : '2px solid transparent',
                        transition: 'var(--transition)',
                      }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={settings.darkColor || '#0f172a'}
                    onChange={e => set('darkColor', e.target.value)}
                    style={{ width: 44, height: 36, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }} />
                  <input className="form-control" value={settings.darkColor || '#0f172a'}
                    onChange={e => set('darkColor', e.target.value)}
                    style={{ width: 120, fontFamily: 'monospace' }} />
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: settings.darkColor || '#0f172a', border: '1px solid var(--border)' }} />
                </div>
              </div>

              {/* Live color preview */}
              <div style={{ marginTop: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ background: settings.darkColor || '#0f172a', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>Your Pharmacy</div>
                    <div style={{ fontSize: 11, color: settings.accentColor || '#0ea5e9' }}>Dr. Ahmad · 0300-1234567</div>
                  </div>
                  <div style={{ background: settings.accentColor || '#0ea5e9', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#fff' }}>
                    INVOICE
                  </div>
                </div>
                <div style={{ padding: '10px 16px', background: '#f8fafc', fontSize: 12, color: '#64748b' }}>
                  Preview of invoice header
                </div>
              </div>
            </div>

            {/* Footer text */}
            <div className="card">
              <div className="card-header"><div className="card-title">Footer Message</div></div>
              <div className="form-group">
                <label className="form-label">Footer Text</label>
                <input className="form-control" value={settings.footerText || ''}
                  onChange={e => set('footerText', e.target.value)}
                  placeholder="Thank you for your visit. Get well soon!" />
              </div>
              <Toggle label="Show Footer Text"        checked={settings.showFooterNote !== false} onChange={v => set('showFooterNote', v)} />
              <Toggle label="Show Powered by MediStore" checked={settings.showPoweredBy !== false}  onChange={v => set('showPoweredBy', v)} />
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT TAB ── */}
      {tab === 'content' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Header Section</div></div>
            <Toggle label="Store Name"      checked={settings.showStoreName     !== false} onChange={v => set('showStoreName', v)} />
            <Toggle label="Doctor Name"     checked={settings.showDoctorName    !== false} onChange={v => set('showDoctorName', v)} />
            <Toggle label="Address"         checked={settings.showAddress       !== false} onChange={v => set('showAddress', v)} />
            <Toggle label="Phone Number"    checked={settings.showPhone         !== false} onChange={v => set('showPhone', v)} />
            <Toggle label="License Number"  checked={settings.showLicenseNumber !== false} onChange={v => set('showLicenseNumber', v)} />
            <Toggle label="Email Address"   checked={!!settings.showEmail}                 onChange={v => set('showEmail', v)} />
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Invoice Body</div></div>
            <Toggle label="Patient ID"      checked={settings.showPatientId   !== false} onChange={v => set('showPatientId', v)} />
            <Toggle label="Patient Age"     checked={!!settings.showPatientAge}           onChange={v => set('showPatientAge', v)} />
            <Toggle label="Generic Name"    checked={settings.showGenericName !== false}  onChange={v => set('showGenericName', v)}
              desc="Show generic name under brand name" />
            <Toggle label="Discount Line"   checked={settings.showDiscount    !== false}  onChange={v => set('showDiscount', v)} />
            <Toggle label="Tax Line"        checked={!!settings.showTax}                  onChange={v => set('showTax', v)} />
            <Toggle label="Savings Badge"   checked={settings.showSavings     !== false}  onChange={v => set('showSavings', v)}
              desc="🎉 You saved Rs. X on this bill" />
          </div>
        </div>
      )}

      {/* ── THERMAL TAB ── */}
      {tab === 'thermal' && (
        <div style={{ maxWidth: 520 }}>
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <div className="alert-text">
              Thermal settings apply to both 58mm and 80mm templates. Print to <strong>PDF → send to thermal printer</strong>,
              or use a PDF-to-thermal converter app.
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">Thermal Font Size</div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
              <input type="range" min={7} max={12} step={0.5}
                value={settings.thermalFontSize || 9}
                onChange={e => set('thermalFontSize', Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)', minWidth: 36 }}>
                {settings.thermalFontSize || 9}pt
              </div>
            </div>
            <div className="text-muted text-sm">Recommended: 8–9pt for 58mm, 9–10pt for 80mm</div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">Line Spacing</div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
              <input type="range" min={4} max={8} step={0.5}
                value={settings.thermalLineSpacing || 5}
                onChange={e => set('thermalLineSpacing', Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)', minWidth: 36 }}>
                {settings.thermalLineSpacing || 5}mm
              </div>
            </div>
          </div>

          {/* Printer setup guide */}
          <div className="card">
            <div className="card-header"><div className="card-title"><MdPrint style={{ marginRight: 6 }} />Thermal Printer Setup</div></div>
            <div style={{ fontSize: 13, lineHeight: 2, color: 'var(--text-secondary)' }}>
              <div><strong>Step 1:</strong> Select Thermal 80mm or 58mm template above</div>
              <div><strong>Step 2:</strong> Print invoice as PDF (click PDF button in billing)</div>
              <div><strong>Step 3:</strong> Open PDF → Print → Set paper size to 80mm or 58mm</div>
              <div><strong>Step 4:</strong> Set margins to None / Borderless</div>
              <div style={{ marginTop: 8, background: 'var(--bg-tertiary)', borderRadius: 8, padding: '8px 12px' }}>
                💡 <strong>Recommended apps:</strong> Print from Chrome with correct paper size,
                or use <em>Foxit PDF Reader</em> for precise thermal printing.
              </div>
            </div>
          </div>

          {/* Quick preview buttons */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><div className="card-title">Preview Thermal Receipts</div></div>
            <div className="flex gap-3">
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => handlePreview('thermal80')} disabled={previewing === 'thermal80'}>
                🖨️ {previewing === 'thermal80' ? 'Generating...' : 'Preview 80mm'}
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => handlePreview('thermal58')} disabled={previewing === 'thermal58'}>
                🧾 {previewing === 'thermal58' ? 'Generating...' : 'Preview 58mm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div style={{
        position:   'fixed',
        bottom:     24,
        right:      24,
        zIndex:     500,
      }}>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}
          style={{ boxShadow: '0 8px 24px rgba(14,165,233,0.4)' }}>
          <MdSave /> {saving ? 'Saving...' : 'Save Invoice Settings'}
        </button>
      </div>
    </div>
  );
}