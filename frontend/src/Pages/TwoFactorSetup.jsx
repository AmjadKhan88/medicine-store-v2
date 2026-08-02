import { useState, useEffect } from 'react';
import { MdShield, MdClose, MdCheck, MdContentCopy, MdWarning, MdRefresh } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

/* ════════════════════════════════
   SETUP FLOW MODAL
════════════════════════════════ */
function SetupModal({ onClose, onEnabled }) {
  const [step,      setStep]      = useState(1);   // 1=scan QR, 2=verify, 3=save codes
  const [qrCode,    setQrCode]    = useState('');
  const [secret,    setSecret]    = useState('');
  const [manual,    setManual]    = useState('');
  const [code,      setCode]      = useState('');
  const [codes,     setCodes]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [copied,    setCopied]    = useState(false);

  useEffect(() => {
    API.post('/auth/2fa/setup')
      .then(({ data }) => {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setManual(data.manualEntry);
      })
      .catch(err => toast.error(err.response?.data?.message || 'Setup failed'));
  }, []);

  const handleVerify = async () => {
    if (!code.trim()) { toast.error('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const { data } = await API.post('/auth/2fa/confirm', { code });
      setCodes(data.recoveryCodes);
      setStep(3);
      toast.success('2FA enabled successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally { setLoading(false); }
  };

  const copyCodes = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Recovery codes copied!');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && step !== 3 && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">
            {step === 1 && 'Step 1 — Scan QR Code'}
            {step === 2 && 'Step 2 — Verify Code'}
            {step === 3 && '✅ 2FA Enabled — Save Recovery Codes'}
          </div>
          {step !== 3 && <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>}
        </div>

        {step === 1 && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
              Open <strong>Google Authenticator</strong> (or Authy) and scan this QR code.
            </div>

            {qrCode ? (
              <div style={{ display:'inline-block', padding:12, background:'#fff', borderRadius:12, border:'1px solid var(--border)', marginBottom:16 }}>
                <img src={qrCode} alt="2FA QR Code" style={{ width:200, height:200, display:'block' }} />
              </div>
            ) : (
              <div style={{ width:200, height:200, background:'var(--bg-tertiary)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:13, color:'var(--text-muted)' }}>
                Generating QR...
              </div>
            )}

            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>
              Can't scan? Enter this code manually:
            </div>
            <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'8px 16px', fontFamily:'monospace', fontWeight:700, fontSize:15, letterSpacing:2, marginBottom:20 }}>
              {manual || '...'}
            </div>

            <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => setStep(2)} disabled={!qrCode}>
              I've scanned the QR code →
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
              Enter the <strong>6-digit code</strong> shown in your authenticator app to confirm setup.
            </div>

            <input
              className="form-control"
              value={code}
              onChange={e => setCode(e.target.value.replace(' ','').slice(0,8))}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              placeholder="0000 0000"
              maxLength={6}
              autoFocus
              style={{ fontSize:28, textAlign:'center', letterSpacing:10, fontWeight:700, marginBottom:16 }}
            />

            <button className="btn btn-primary" style={{ width:'100%', marginBottom:8 }}
              onClick={handleVerify} disabled={loading || code.length < 6}>
              {loading ? 'Verifying...' : 'Enable 2FA'}
            </button>
            <button className="btn btn-ghost" style={{ width:'100%' }} onClick={() => setStep(1)}>
              ← Back
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
              <div style={{ fontWeight:700, color:'#92400e', marginBottom:4 }}>
                ⚠️ Save these recovery codes NOW
              </div>
              <div style={{ fontSize:13, color:'#78350f' }}>
                If you lose access to your authenticator app, these codes are your only way in.
                Each code can only be used once. Store them safely (password manager, printed paper).
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
              {codes.map((c, i) => (
                <div key={i} style={{ background:'var(--bg-tertiary)', borderRadius:8, padding:'8px 12px', fontFamily:'monospace', fontSize:15, fontWeight:700, textAlign:'center', letterSpacing:2 }}>
                  {c}
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
              <button className="btn btn-secondary" onClick={copyCodes}>
                {copied ? <><MdCheck /> Copied!</> : <><MdContentCopy /> Copy All</>}
              </button>
              <button className="btn btn-secondary" onClick={() => {
                const w = window.open('', '_blank');
                w.document.write(`<pre style="font-size:18px;font-family:monospace;padding:20px">MediStore 2FA Recovery Codes\n\n${codes.join('\n')}\n\nGenerated: ${new Date().toLocaleDateString()}\nKeep these safe!</pre>`);
                w.print();
              }}>
                🖨️ Print
              </button>
            </div>

            <button className="btn btn-primary" style={{ width:'100%' }}
              onClick={() => { onEnabled(); onClose(); }}>
              ✓ I've saved my recovery codes — Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   DISABLE 2FA MODAL
════════════════════════════════ */
function DisableModal({ onClose, onDisabled }) {
  const [password, setPassword] = useState('');
  const [code,     setCode]     = useState('');
  const [loading,  setLoading]  = useState(false);

  const handle = async () => {
    if (!password) { toast.error('Enter your password'); return; }
    setLoading(true);
    try {
      await API.post('/auth/2fa/disable', { password, code });
      toast.success('2FA has been disabled');
      onDisabled();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">Disable Two-Factor Authentication</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ background:'#fee2e2', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626' }}>
          ⚠️ Disabling 2FA reduces your account security significantly.
        </div>

        <div className="form-group">
          <label className="form-label required">Current Password</label>
          <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label required">Current 2FA Code</label>
          <input className="form-control" value={code} onChange={e => setCode(e.target.value.replace(' ','').slice(0,8))}
            placeholder="00000000" style={{ fontFamily:'monospace', fontSize:18, letterSpacing:6, textAlign:'center' }} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handle} disabled={loading || !password || !code}>
            {loading ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   REGEN CODES MODAL
════════════════════════════════ */
function RegenModal({ onClose }) {
  const [code,   setCode]   = useState('');
  const [codes,  setCodes]  = useState([]);
  const [loading,setLoading]= useState(false);
  const [done,   setDone]   = useState(false);

  const handle = async () => {
    if (!code.trim()) { toast.error('Enter your 2FA code'); return; }
    setLoading(true);
    try {
      const { data } = await API.post('/auth/2fa/regen', { code });
      setCodes(data.recoveryCodes);
      setDone(true);
      toast.success('New recovery codes generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => !done && e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">Regenerate Recovery Codes</div>
          {!done && <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>}
        </div>

        {!done ? (
          <>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14 }}>
              Old recovery codes will be invalidated. Enter your current 2FA code to confirm.
            </div>
            <div className="form-group">
              <label className="form-label required">Current 2FA Code</label>
              <input className="form-control" value={code} onChange={e => setCode(e.target.value.replace(' ','').slice(0,8))}
                placeholder="00000000" autoFocus style={{ fontFamily:'monospace', fontSize:20, textAlign:'center', letterSpacing:8 }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handle} disabled={loading || code.length < 6}>
                {loading ? 'Generating...' : <><MdRefresh /> Generate New Codes</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
              {codes.map((c,i) => (
                <div key={i} style={{ background:'var(--bg-tertiary)', borderRadius:8, padding:'8px 12px', fontFamily:'monospace', fontSize:14, fontWeight:700, textAlign:'center', letterSpacing:2 }}>
                  {c}
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={onClose}>
              ✓ Saved — Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN 2FA SETTINGS COMPONENT
   (embed in Settings page)
════════════════════════════════ */
export default function TwoFactorSetup() {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);  // 'setup' | 'disable' | 'regen' | 'sessions'
  const [sessions,setSessions]= useState([]);

  const fetchStatus = () => {
    API.get('/auth/2fa/status').then(({ data }) => setStatus(data.status)).catch(() => {}).finally(() => setLoading(false));
  };

  const fetchSessions = () => {
    API.get('/auth/sessions').then(({ data }) => setSessions(data.sessions || [])).catch(() => {});
  };

  useEffect(() => { fetchStatus(); fetchSessions(); }, []);

  if (loading) return <div className="text-muted text-sm">Loading security settings...</div>;

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  return (
    <div style={{ maxWidth: 800 }}>
      {/* 2FA Status Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{
              width:48, height:48, borderRadius:12,
              background: status?.enabled ? '#d1fae5' : '#fee2e2',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
            }}>
              {status?.enabled ? '🔐' : '🔓'}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15 }}>Two-Factor Authentication</div>
              <div style={{ fontSize:13, color: status?.enabled ? '#10b981' : '#ef4444', fontWeight:700, marginTop:2 }}>
                {status?.enabled ? '✓ Enabled' : '✗ Not enabled'}
              </div>
            </div>
          </div>

          {status?.enabled ? (
            <button className="btn btn-danger btn-sm" onClick={() => setModal('disable')}>
              Disable 2FA
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setModal('setup')}>
              <MdShield size={16} /> Enable 2FA
            </button>
          )}
        </div>

        <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
          Two-factor authentication adds an extra layer of security. Even if your password is stolen,
          attackers cannot access your account without your authenticator app.
        </div>

        {status?.enabled && (
          <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13 }}>
                Recovery codes remaining:
                <span style={{ fontWeight:700, color: status.recoveryCodesLeft <= 2 ? '#ef4444' : '#10b981', marginLeft:6 }}>
                  {status.recoveryCodesLeft} / 10
                </span>
              </div>
              {status.recoveryCodesLeft <= 2 && (
                <div style={{ fontSize:11, color:'#ef4444', marginTop:2 }}>
                  ⚠️ Running low! Generate new recovery codes.
                </div>
              )}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setModal('regen')}>
              <MdRefresh size={14} /> New Codes
            </button>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontWeight:700 }}>Active Sessions ({sessions.length})</div>
          <button className="btn btn-danger btn-sm" onClick={async () => {
            if (!confirm('Log out from all other devices?')) return;
            try {
              await API.post('/auth/logout-all');
              toast.success('Logged out from all devices');
              fetchSessions();
            } catch {}
          }}>
            Logout All Devices
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-muted text-sm">No active sessions</div>
        ) : (
          sessions.map((s, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
              <div>
                <div style={{ fontWeight:600 }}>💻 {s.device?.slice(0, 50) || 'Unknown device'}</div>
                <div className="text-muted" style={{ fontSize:11 }}>
                  Started {fmtDate(s.createdAt)} · Expires {fmtDate(s.expiresAt)}
                </div>
              </div>
              {i === 0 && <span style={{ fontSize:11, background:'#d1fae5', color:'#10b981', padding:'2px 8px', borderRadius:99, fontWeight:700 }}>Current</span>}
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {modal === 'setup'   && <SetupModal  onClose={() => setModal(null)} onEnabled={fetchStatus} />}
      {modal === 'disable' && <DisableModal onClose={() => setModal(null)} onDisabled={fetchStatus} />}
      {modal === 'regen'   && <RegenModal  onClose={() => { setModal(null); fetchStatus(); }} />}
    </div>
  );
}