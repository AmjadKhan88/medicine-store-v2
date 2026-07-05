import { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { MdFiberManualRecord, MdPeople } from 'react-icons/md';

export default function RealTimeIndicator() {
  const { connected, onlineCount } = useSocket();
  const [showTip, setShowTip]      = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, cursor: 'default' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      {/* Pulsing dot */}
      <div style={{ position: 'relative', width: 10, height: 10 }}>
        <div style={{
          width:        10,
          height:       10,
          borderRadius: '50%',
          background:   connected ? '#22c55e' : '#ef4444',
        }} />
        {connected && (
          <div style={{
            position:     'absolute',
            inset:        0,
            borderRadius: '50%',
            background:   '#22c55e',
            animation:    'socketPulse 2s ease-out infinite',
          }} />
        )}
      </div>

      {/* Online count */}
      {connected && onlineCount > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          <MdPeople size={13} />
          <span>{onlineCount}</span>
        </div>
      )}

      {/* Tooltip */}
      {showTip && (
        <div style={{
          position:   'absolute',
          bottom:     'calc(100% + 8px)',
          left:       '50%',
          transform:  'translateX(-50%)',
          background: 'var(--card-bg)',
          border:     '1px solid var(--border)',
          borderRadius: 8,
          padding:    '7px 12px',
          fontSize:   12,
          whiteSpace: 'nowrap',
          zIndex:     1000,
          boxShadow:  'var(--shadow-lg)',
        }}>
          {connected
            ? `🟢 Live updates active${onlineCount > 1 ? ` · ${onlineCount} users online` : ''}`
            : '🔴 Reconnecting...'}
          <div style={{
            position:   'absolute',
            top:        '100%',
            left:       '50%',
            transform:  'translateX(-50%)',
            borderTop:  '5px solid var(--border)',
            borderLeft: '5px solid transparent',
            borderRight:'5px solid transparent',
          }} />
        </div>
      )}

      <style>{`
        @keyframes socketPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}