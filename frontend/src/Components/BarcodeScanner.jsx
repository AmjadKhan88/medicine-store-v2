import { useState, useCallback } from 'react';
import { MdQrCodeScanner, MdClose, MdFlipCameraAndroid, MdKeyboard } from 'react-icons/md';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import toast from 'react-hot-toast';

/**
 * BarcodeScanner — reusable modal scanner
 *
 * Props:
 *   onScanned(barcode: string) — called when a barcode is detected
 *   onClose()                  — called when modal is dismissed
 *   title                      — optional heading
 */
export default function BarcodeScanner({ onScanned, onClose, title = 'Scan Barcode' }) {
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastCode, setLastCode]     = useState(null);
  const [cooldown, setCooldown]     = useState(false);  // prevent double-fire

  const handleDetected = useCallback((code) => {
    if (cooldown || code === lastCode) return;
    setLastCode(code);
    setCooldown(true);

    // Beep
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.value = 1000;
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}

    toast.success(`Scanned: ${code}`, { duration: 1500 });
    onScanned(code);

    // 2s cooldown so rapid re-scans don't fire
    setTimeout(() => {
      setCooldown(false);
      setLastCode(null);
    }, 2000);
  }, [cooldown, lastCode, onScanned]);

  const { videoRef, error, cameras, cameraId, setCameraId } = useBarcodeScanner({
    onDetected: handleDetected,
    enabled:    !manualMode,
  });

  const handleManualSubmit = () => {
    if (!manualCode.trim()) { toast.error('Enter a barcode'); return; }
    onScanned(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420, padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MdQrCodeScanner size={22} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Switch camera if multiple */}
            {cameras.length > 1 && !manualMode && (
              <button
                className="btn btn-secondary btn-sm btn-icon"
                title="Switch camera"
                onClick={() => {
                  const idx = cameras.findIndex(c => c.deviceId === cameraId);
                  const next = cameras[(idx + 1) % cameras.length];
                  setCameraId(next.deviceId);
                }}
              >
                <MdFlipCameraAndroid size={18} />
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setManualMode(m => !m)}
              title={manualMode ? 'Switch to camera' : 'Enter manually'}
            >
              <MdKeyboard size={16} /> {manualMode ? 'Use Camera' : 'Manual'}
            </button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <MdClose size={20} />
            </button>
          </div>
        </div>

        {/* Camera view */}
        {!manualMode && (
          <div style={{ position: 'relative', background: '#000', minHeight: 280 }}>
            <video
              ref={videoRef}
              style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }}
              muted
              playsInline
              autoPlay
            />

            {/* Scan guide overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              {/* Corner brackets */}
              {[
                { top: '25%', left: '20%', borderTop: '3px solid #0ea5e9', borderLeft:  '3px solid #0ea5e9', borderRadius: '4px 0 0 0' },
                { top: '25%', right: '20%', borderTop: '3px solid #0ea5e9', borderRight: '3px solid #0ea5e9', borderRadius: '0 4px 0 0' },
                { bottom: '25%', left: '20%', borderBottom: '3px solid #0ea5e9', borderLeft: '3px solid #0ea5e9', borderRadius: '0 0 0 4px' },
                { bottom: '25%', right: '20%', borderBottom: '3px solid #0ea5e9', borderRight: '3px solid #0ea5e9', borderRadius: '0 0 4px 0' },
              ].map((style, i) => (
                <div key={i} style={{ position: 'absolute', width: 24, height: 24, ...style }} />
              ))}

              {/* Scan line animation */}
              <div style={{
                position: 'absolute',
                top: '25%', left: '20%', right: '20%',
                height: 2,
                background: 'linear-gradient(90deg, transparent, #0ea5e9, transparent)',
                animation: 'scanline 1.8s ease-in-out infinite',
              }} />
            </div>

            {/* Error state */}
            {error && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: 24, textAlign: 'center',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>Camera Error</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.6 }}>{error}</div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 16 }}
                  onClick={() => setManualMode(true)}
                >
                  <MdKeyboard /> Enter Code Manually
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual entry */}
        {manualMode && (
          <div style={{ padding: '24px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🔢</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Enter Barcode Manually</div>
              <div className="text-muted text-sm">Type the barcode number printed on the medicine box</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-control"
                placeholder="e.g. 8901234567890"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                autoFocus
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleManualSubmit}>
                Search
              </button>
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div style={{
          padding: '12px 20px',
          background: 'var(--bg-tertiary)',
          borderTop: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          {manualMode
            ? 'Press Enter or click Search after typing the code'
            : 'Point camera at barcode on medicine box — auto-detects'}
        </div>
      </div>

      {/* Scan line CSS animation */}
      <style>{`
        @keyframes scanline {
          0%   { transform: translateY(0);   opacity: 1; }
          50%  { transform: translateY(calc(50vw * 0.5)); opacity: 0.8; }
          100% { transform: translateY(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}