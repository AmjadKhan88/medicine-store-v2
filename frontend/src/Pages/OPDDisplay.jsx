// public display screen 
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import API from '../utils/api';
import { io } from 'socket.io-client';
import ShortLoader from '../Components/ShortLoader';

export default function OPDDisplay() {
  const { storeId }           = useParams();
  const [display, setDisplay] = useState(null);
  const [flash,   setFlash]   = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef             = useRef(null);

  const fetchDisplay = async () => {
    try {
      const { data } = await API.get(`/opd/display/${storeId}`);
      setDisplay(data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDisplay();
    const iv = setInterval(fetchDisplay, 10000); // poll every 10s as fallback

    // Connect socket for real-time
    const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', {
      auth: { storeId },
    });
    socketRef.current = socket;

    socket.on('opd:update', (data) => {
      setDisplay(prev => prev ? { ...prev, ...data } : data);
    });

    socket.on('opd:called', (data) => {
      setDisplay(prev => prev ? { ...prev, currentlyServing: data.displayToken } : prev);
      // Flash animation
      setFlash(true);
      setTimeout(() => setFlash(false), 2000);
      // Announcement voice
      try {
        const msg = new SpeechSynthesisUtterance(
          `Token ${data.displayToken.split('').join(' ')}, please proceed to ${data.department || 'the doctor'}`
        );
        msg.lang  = 'en-US';
        msg.rate  = 0.85;
        msg.pitch = 1;
        window.speechSynthesis.speak(msg);
      } catch {}
    });

    return () => {
      clearInterval(iv);
      socket.disconnect();
    };
  }, [storeId]);

  if (loading) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShortLoader text="Loading display..."/>
      </div>
    );
  }

  const waiting = display?.waiting || [];
  const stats   = display?.stats   || {};

  return (
    <div style={{
      background:   '#0f172a',
      minHeight:    '100vh',
      fontFamily:   'sans-serif',
      color:        '#fff',
      display:      'flex',
      flexDirection:'column',
      overflow:     'hidden',
    }}>
      {/* Header */}
      <div style={{
        background:    'rgba(255,255,255,0.04)',
        borderBottom:  '1px solid rgba(255,255,255,0.08)',
        padding:       '16px 40px',
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0ea5e9' }}>🏥</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>OPD Queue Display</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              {display?.isOpen ? '🟢 Queue Open' : '🔴 Queue Closed'} ·
              {stats.waiting || 0} waiting · {stats.done || 0} seen today
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
          <Clock />
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0 }}>

        {/* LEFT — Now Serving */}
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        40,
          background:     flash
            ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
            : 'transparent',
          transition:     'background 0.5s',
          borderRight:    '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 16, letterSpacing: 6, fontWeight: 700, opacity: 0.6, marginBottom: 16, textTransform: 'uppercase' }}>
            Now Serving
          </div>

          {display?.currentlyServing ? (
            <>
              <div style={{
                fontSize:      160,
                fontWeight:    900,
                lineHeight:    1,
                color:         flash ? '#fff' : '#0ea5e9',
                letterSpacing: 8,
                textShadow:    flash ? '0 0 60px rgba(255,255,255,0.5)' : '0 0 40px rgba(14,165,233,0.3)',
                transition:    'all 0.5s',
                animation:     'pulse 2s infinite',
              }}>
                {display.currentlyServing}
              </div>
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', marginTop: 20 }}>
                Please proceed to consultation room
              </div>
            </>
          ) : (
            <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              <div style={{ fontSize: 80, marginBottom: 16 }}>⏳</div>
              Waiting for next patient to be called
            </div>
          )}

          {/* Stats bottom */}
          <div style={{ display: 'flex', gap: 32, marginTop: 48, opacity: 0.6 }}>
            {[
              { label: 'Waiting',  value: stats.waiting || 0 },
              { label: 'Seen',     value: stats.done    || 0 },
              { label: 'Avg Wait', value: stats.avgWaitMinutes != null ? `${stats.avgWaitMinutes}m` : '—' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Waiting list */}
        <div style={{ padding: 24, overflowY: 'auto' }}>
          <div style={{ fontSize: 13, letterSpacing: 4, fontWeight: 700, opacity: 0.5, marginBottom: 16, textTransform: 'uppercase' }}>
            Up Next
          </div>
          {waiting.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16, textAlign: 'center', marginTop: 40 }}>
              No patients waiting
            </div>
          ) : (
            waiting.map((t, i) => (
              <div key={i} style={{
                background:   i === 0 ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.04)',
                border:       `1px solid ${i === 0 ? 'rgba(14,165,233,0.4)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12,
                padding:      '14px 16px',
                marginBottom: 8,
                display:      'flex',
                alignItems:   'center',
                gap:          12,
              }}>
                <div style={{
                  minWidth:   52, height: 52, borderRadius: 10,
                  background: i === 0 ? '#0ea5e9' : 'rgba(255,255,255,0.08)',
                  display:    'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>TOKEN</div>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{t.displayToken}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.patientName}</div>
                  {t.priority !== 'Normal' && (
                    <div style={{
                      fontSize: 11, fontWeight: 700,
                      color: t.priority === 'Urgent' ? '#ef4444' : '#8b5cf6',
                      marginTop: 2,
                    }}>
                      {t.priority === 'Urgent' ? '🚨 URGENT' : '⭐ VIP'}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>
                  #{i + 1}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer ticker */}
      <div style={{
        background:    'rgba(14,165,233,0.1)',
        borderTop:     '1px solid rgba(14,165,233,0.2)',
        padding:       '12px 40px',
        display:       'flex',
        alignItems:    'center',
        gap:           16,
        fontSize:      13,
        color:         'rgba(255,255,255,0.5)',
      }}>
        <span>ℹ️</span>
        <span>Please keep your token slip ready · Urgent cases are prioritized · Thank you for your patience</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

/* ── Live clock ── */
function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>
        {time.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        {time.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}